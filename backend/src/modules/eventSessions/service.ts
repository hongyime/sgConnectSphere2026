import { AccessError } from '../eventVisibility/service.js';
import type { ArrangementImpact } from '../changeManagement/arrangementImpact.js';
import type { OverSubscription } from '../changeManagement/eventChange.js';
import { parseSessionBody } from './parseSession.js';
import type { SessionEditScope, SessionInput, SessionOptions, SessionRecord } from './types.js';

// E04-S02 authoring rules. Kept behind a repository so the guards and the
// request parsing are unit-testable without PostgreSQL; the SQL lives in
// repository.ts.
export type SessionEditOptions = { reviewed?: string; preview?: boolean };

export type SessionImpactResult =
  | { status: 'updated'; session: SessionRecord; impact: ArrangementImpact; overSubscription: OverSubscription[]; revision: string }
  | { status: 'preview'; impact: ArrangementImpact; overSubscription: OverSubscription[]; revision: string }
  | { status: 'not_found' }
  | { status: 'not_editable' };

export type SessionRepository = {
  findEditScope(eventId: string): Promise<SessionEditScope | null>;
  listSessions(eventId: string): Promise<SessionRecord[]>;
  listOptions(): Promise<SessionOptions>;
  insertSession(eventId: string, input: SessionInput): Promise<SessionRecord>;
  updateSession(sessionId: string, eventId: string, input: SessionInput): Promise<SessionRecord | null>;
  updateSessionInPlanning(
    sessionId: string, eventId: string, actorId: string, input: SessionInput, options: SessionEditOptions,
  ): Promise<SessionImpactResult>;
  removeSession(
    sessionId: string, eventId: string, actorId: string,
  ): Promise<
    | { status: 'deleted'; releasedBookings: number; releasedReservations: number; notifiedStaff: number }
    | { status: 'not_found' }
    | { status: 'last_session' }
  >;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireSessionId(value: string): string {
  if (!UUID.test(value)) throw new AccessError(400, 'A valid Session id is required.');
  return value;
}

// Only the owning Organiser may read the Sessions; the Event record is the
// authority on ownership, so a missing Event and someone else's Event are both
// 404 (E02-S02 Scenario 1: no cross-Organiser disclosure).
async function requireOwner(repository: SessionRepository, userId: string, eventId: string): Promise<SessionEditScope> {
  const scope = await repository.findEditScope(eventId);
  if (!scope || scope.organiserId !== userId) throw new AccessError(404, 'not_found');
  return scope;
}

// Sessions are authored on the draft. Editing them after submission changes the
// requirements confirmed bookings were approved against, so it belongs with the
// arrangement-impact flow (E10-S02) rather than here. Deleting is allowed in
// Planning because E04-S02 Scenario 5 requires it to release the Session's
// confirmed booking.
async function requireDraft(repository: SessionRepository, userId: string, eventId: string) {
  const scope = await requireOwner(repository, userId, eventId);
  if (scope.status !== 'draft') {
    throw new AccessError(409, 'Sessions can only be changed while the request is a draft.');
  }
  return scope;
}

async function requireDraftOrPlanning(repository: SessionRepository, userId: string, eventId: string) {
  const scope = await requireOwner(repository, userId, eventId);
  if (scope.status !== 'draft' && scope.status !== 'planning') {
    throw new AccessError(409, 'Sessions can only be removed while the event is a draft or in planning.');
  }
  return scope;
}

function toAccessError(error: unknown): never {
  if (error instanceof AccessError) throw error;
  throw new AccessError(400, (error as Error).message || 'invalid_session_payload');
}

export async function getSessions(repository: SessionRepository, userId: string, eventId: string) {
  const scope = await requireOwner(repository, userId, eventId);
  return { sessions: await repository.listSessions(eventId), eventStatus: scope.status, options: await repository.listOptions() };
}

export async function addSession(repository: SessionRepository, userId: string, eventId: string, body: unknown) {
  await requireDraft(repository, userId, eventId);
  let input: SessionInput;
  try {
    input = parseSessionBody(body);
  } catch (error) {
    toAccessError(error);
  }
  return { session: await repository.insertSession(eventId, input) };
}

// Draft edits are free. Once the Event is in planning, the same edit changes the
// requirements its confirmed arrangements were approved against, so it runs
// through E10-S02's arrangement-impact check: `?preview=1` returns the impact
// and revision without saving, and a stale `reviewed` revision is refused.
export async function editSession(
  repository: SessionRepository, userId: string, eventId: string, sessionId: string, body: unknown,
  options: SessionEditOptions = {},
) {
  const scope = await requireOwner(repository, userId, eventId);
  const id = requireSessionId(sessionId);
  let input: SessionInput;
  try {
    input = parseSessionBody(body);
  } catch (error) {
    toAccessError(error);
  }
  if (scope.status === 'draft') {
    const session = await repository.updateSession(id, eventId, input);
    if (!session) throw new AccessError(404, 'Session not found.');
    return { session };
  }
  if (scope.status !== 'planning') {
    throw new AccessError(409, 'Sessions can only be changed while the request is a draft or in planning.');
  }
  const result = await repository.updateSessionInPlanning(id, eventId, userId, input, options);
  if (result.status === 'not_found') throw new AccessError(404, 'Session not found.');
  if (result.status === 'not_editable') {
    throw new AccessError(409, 'Sessions can only be changed while the request is a draft or in planning.');
  }
  const check = { impact: result.impact, overSubscription: result.overSubscription, revision: result.revision };
  if (result.status === 'preview') return { preview: check };
  return { session: result.session, ...check };
}

// E04-S02 Scenario 5: deleting a Session releases the arrangements that were
// approved for it. The release, its audit rows and the Venue Staff notice happen
// in one transaction before the row is removed; an Event must keep at least one
// Session, so deleting the last one is refused rather than silently converting
// the Event.
export async function removeSession(
  repository: SessionRepository, userId: string, eventId: string, sessionId: string,
) {
  await requireDraftOrPlanning(repository, userId, eventId);
  const id = requireSessionId(sessionId);
  const result = await repository.removeSession(id, eventId, userId);
  if (result.status === 'last_session') throw new AccessError(409, 'An Event must keep at least one Session.');
  if (result.status === 'not_found') throw new AccessError(404, 'Session not found.');
  return {
    deleted: true,
    releasedBookings: result.releasedBookings,
    releasedReservations: result.releasedReservations,
    notifiedStaff: result.notifiedStaff,
  };
}

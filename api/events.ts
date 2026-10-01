import { updateEventInformationWithNotifications } from '../backend/src/modules/eventNotifications/informationChange.js';
// Vercel maps every file under `api/` to a serverless function. `api/foo.ts` and
// `api/foo/index.ts` both target the same URL path `/api/foo`; only one wins the
// route (empirically the parent file), so the other becomes an unreachable
// lambda that still counts against the Hobby-plan 12-function cap. This handler
// serves create, browse, and (SCRUM-27) draft list/edit/delete traffic for
// /api/events from a single file so there is no collision to lose and no
// wasted slot. Method dispatch below picks the branch. See ADR-014 for the
// rule this file follows.
//
// SCRUM-32 (E03-S01) adds the Event Coordinator branches - assigned-event
// reads, the reassignment colleague list, and reassignment request/answer -
// as query-param dispatch here rather than a new file (ADR-014: `api/` is at
// the team's 11-function soft cap).
//
// SCRUM-33 (E03-S02) adds the clarification request and response the same
// way, and the outstanding questions to both event detail reads.
//
// SCRUM-34 (E03-S03) adds the Coordinator's approve/reject decision and the
// decision on the Organiser's event read. Its rejected-request check runs
// inside the information edit's transaction. The rules are in decision.ts.
//
// Auth: every branch reads the cookie session via currentUser(). Post-ADR-015
// consolidation removed the Supabase Auth bearer-token path that used to
// cover POST/PATCH/DELETE and the GET-mine branch. One auth mechanism now.

import { sendJson } from '../backend/src/http.js';
import { getDatabasePool } from '../backend/src/database/client.js';
import {
  getAssignedEvent,
  listAssignedEvents,
  listCoordinatorColleagues,
  listPendingReassignments,
  requestCoordinatorReassignment,
  respondToCoordinatorReassignment,
} from '../backend/src/modules/eventLifecycle/coordinatorAssignment.js';
import {
  requestClarification,
  respondToClarification,
  withOutstandingQuestions,
} from '../backend/src/modules/eventLifecycle/clarification.js';
import {
  decideEventRequest,
  DecisionBlockedError,
  RejectedRequestError,
  withDecision,
} from '../backend/src/modules/eventLifecycle/decision.js';
import { PostgresEventLifecycleRepository } from '../backend/src/modules/eventLifecycle/repository.js';
import {
  createEventRequest,
  deleteEventRequest,
  EventAccessError,
  EventNotFoundError,
  EventValidationError,
  updateEventRequest,
} from '../backend/src/modules/eventLifecycle/service.js';
import { parseCreateEventBody, parseUpdateEventBody } from '../backend/src/modules/eventLifecycle/parseRequest.js';
import { isEventStatus } from '../backend/src/modules/eventLifecycle/status.js';
import type { EventRecord } from '../backend/src/modules/eventLifecycle/types.js';
import type { AuthenticatedUser } from '../backend/src/modules/accessControl/types.js';
import { refusePlanning } from '../backend/src/modules/attendeeVisibility/service.js';
import { currentUser, query, respond, respondWithResult } from '../backend/src/modules/eventVisibility/runtime.js';
import {
  AccessError,
  createEventComment,
  getEvent,
  listEvents,
  listNotifications,
  requireOrganiser,
} from '../backend/src/modules/eventVisibility/service.js';
import type { VercelRequest, VercelResponse } from '../backend/src/vercel.js';

const repository = new PostgresEventLifecycleRepository();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    await handleGet(request, response);
    return;
  }
  if (request.method === 'POST') {
    const params = new URL(request.url || '/', 'http://localhost').searchParams;
    if (params.get('comment') === '1') {
      await handleCommentPost(request, response, params);
      return;
    }
    if (params.get('reassign') === '1' || params.has('reassignment')) {
      await handleReassignmentPost(request, response, params);
      return;
    }
    if (params.has('clarification')) {
      await handleClarificationPost(request, response, params);
      return;
    }
    if (params.get('decide') === '1') {
      await handleDecisionPost(request, response, params);
      return;
    }
    await handlePost(request, response);
    return;
  }
  if (request.method === 'PATCH') {
    const params = new URL(request.url || '/', 'http://localhost').searchParams;
    if (params.get('edit') === '1') {
      await handleInformationPatch(request, response, params);
      return;
    }
    await handlePatch(request, response);
    return;
  }
  if (request.method === 'DELETE') {
    await handleDelete(request, response);
    return;
  }
  response.setHeader('allow', 'GET, POST, PATCH, DELETE');
  sendJson(response, 405, { error: 'method_not_allowed' });
}

async function handleInformationPatch(request: VercelRequest, response: VercelResponse, params: URLSearchParams) {
  try {
    const user = await currentUser(request);
    const eventId = params.get('id');
    if (!eventId) { sendJson(response, 400, { error: 'missing_id' }); return; }
    const result = await updateEventInformationWithNotifications(getDatabasePool(), user, eventId.slice(0, 240), request.body);
    sendJson(response, 200, { ...result });
  } catch (error) {
    if (error instanceof AccessError) {
      // SCRUM-34 (E03-S03, D11): a rejected request offers no change request.
      const offerChangeRequest = error.status === 409 && !(error instanceof RejectedRequestError);
      sendJson(response, error.status, { error: error.message, changeRequestUrl: offerChangeRequest ? `/change-requests/new?event=${encodeURIComponent(params.get('id') || '')}` : undefined });
      return;
    }
    throw error;
  }
}

// SCRUM-32 (E03-S01) Scenarios 3 to 6. Only the assigned Coordinator may
// request, and only the named colleague may answer; every rule is enforced
// in coordinatorAssignment.ts.
//   POST /api/events?reassign=1&id=<event id or code>  { toCoordinatorId }
//     -> 201 { reassignment }
//   POST /api/events?reassignment=<reassignment id>&decision=accept|decline
//     -> 200 { reassignment }
async function handleReassignmentPost(request: VercelRequest, response: VercelResponse, params: URLSearchParams) {
  await respondWithResult(response, async () => {
    const user = await currentUser(request);
    const reassignmentId = params.get('reassignment');
    if (reassignmentId !== null) {
      const reassignment = await respondToCoordinatorReassignment(
        getDatabasePool(), user, reassignmentId.slice(0, 64), params.get('decision'));
      return { status: 200, body: { reassignment } };
    }
    const eventId = params.get('id');
    if (!eventId) throw new AccessError(400, 'missing_id');
    const reassignment = await requestCoordinatorReassignment(getDatabasePool(), user, eventId.slice(0, 240), request.body);
    return { status: 201, body: { reassignment } };
  });
}

// SCRUM-33 (E03-S02) Scenarios 1 and 2. Only the assigned Coordinator may
// ask, only the owning Organiser may answer; every rule is enforced in
// clarification.ts.
//   POST /api/events?clarification=request&id=<event id or code>  { questions: string[] }
//     -> 201 { clarification }
//   POST /api/events?clarification=response&id=<event id or code>  { answers: [{ questionId, answer }] }
//     -> 200 { clarification }
async function handleClarificationPost(request: VercelRequest, response: VercelResponse, params: URLSearchParams) {
  await respondWithResult(response, async () => {
    const user = await currentUser(request);
    const eventId = params.get('id');
    if (!eventId) throw new AccessError(400, 'missing_id');
    const action = params.get('clarification');
    if (action === 'request') {
      const clarification = await requestClarification(getDatabasePool(), user, eventId.slice(0, 240), request.body);
      return { status: 201, body: { clarification } };
    }
    if (action === 'response') {
      const clarification = await respondToClarification(getDatabasePool(), user, eventId.slice(0, 240), request.body);
      return { status: 200, body: { clarification } };
    }
    throw new AccessError(400, 'Unknown clarification action.');
  });
}

// SCRUM-34 (E03-S03) Scenarios 1 to 4. Only the assigned Coordinator may
// decide, only on an Under Review request; every rule is enforced in
// decision.ts.
//   POST /api/events?decide=1&id=<event id or code>
//     { decision: 'approve' } | { decision: 'reject', reason: string }
//     -> 200 { decision }
//     -> 409 { error, missingFields } when approval is blocked (Scenario 2)
async function handleDecisionPost(request: VercelRequest, response: VercelResponse, params: URLSearchParams) {
  await respondWithResult(response, async () => {
    const user = await currentUser(request);
    const eventId = params.get('id');
    if (!eventId) throw new AccessError(400, 'missing_id');
    try {
      const decision = await decideEventRequest(getDatabasePool(), user, eventId.slice(0, 240), request.body);
      return { status: 200, body: { decision } };
    } catch (error) {
      if (error instanceof DecisionBlockedError) {
        return { status: error.status, body: { error: error.message, missingFields: error.missingFields } };
      }
      throw error;
    }
  });
}

async function handleCommentPost(request: VercelRequest, response: VercelResponse, params: URLSearchParams) {
  try {
    const user = await currentUser(request);
    const eventId = params.get('id');
    if (!eventId || typeof request.body !== 'object' || request.body === null) {
      sendJson(response, 400, { error: 'invalid_payload' });
      return;
    }
    const comment = await createEventComment(query, user, eventId.slice(0, 240), (request.body as { body?: unknown }).body);
    sendJson(response, 201, { comment });
  } catch (error) {
    if (error instanceof AccessError) { sendJson(response, error.status, { error: error.message }); return; }
    throw error;
  }
}

// Full detail shape for the SCRUM-27 draft list/reopen endpoints - unlike
// the POST response below, this includes description/purpose because
// reopening a draft (Scenario 2) needs every previously entered value back.
function serializeEventDetail(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    purpose: event.purpose,
    status: event.status,
    startAt: event.startAt?.toISOString(),
    endAt: event.endAt?.toISOString(),
    expectedAttendance: event.expectedAttendance,
    venueRequirements: event.venueRequirements,
    accessibilityNote: event.accessibilityNote,
    accessibilityFeatureIds: event.accessibilityFeatureIds ?? [],
    equipmentRequirements: event.equipmentRequirements,
    layoutPreference: event.layoutPreference,
    registrationSetup: event.registrationSetup,
  };
}

// Post-ADR-015 auth: all authenticated /api/events branches read the
// cookie session the same way. requireOrganiser() throws AccessError(403)
// if the caller is not an event organiser, so respond() can translate
// that to a 403 body. clientOrgId is guaranteed non-null when role is
// event_organiser, but we assert here so the type narrows for callers.
async function requireOrganiserWithClient(request: VercelRequest): Promise<AuthenticatedUser & { clientOrgId: string }> {
  const user = await currentUser(request);
  await requireOrganiser(query, user, 'events');
  if (!user.clientOrgId) {
    throw new AccessError(403, 'forbidden');
  }
  return user as AuthenticatedUser & { clientOrgId: string };
}

// GET /api/events - organiser browse. Preserves the request contract that shipped
// in PR #42 (SCRUM-18 hide internal planning info): id-lookup returns { event }, otherwise
// { events, notifications, organisationId }. AccessError is caught by respond().
//
// GET /api/events?mine=1[&id=<id>][&status=draft] - SCRUM-27: the requesting
// organiser's own event requests, for the "my drafts" list and for reopening
// one. Same cookie-session auth as every other branch.
async function handleGet(request: VercelRequest, response: VercelResponse) {
  const params = new URL(request.url || '/', 'http://localhost').searchParams;

  if (params.get('mine') === '1') {
    await handleGetMine(request, response, params);
    return;
  }

  if (params.get('assigned') === '1' || params.get('coordinators') === '1' || params.get('reassignments') === '1') {
    await handleGetCoordinator(request, response, params);
    return;
  }

  await respond(response, async () => {
    const user = await currentUser(request);
    const id = params.get('id');
    if (user.role === 'attendee') await refusePlanning(query, user, id || '');
    await requireOrganiser(query, user, 'events');
    if (id) return { event: await withDecision(query, await withOutstandingQuestions(query, await getEvent(query, user, id.slice(0, 240)))) };
    return {
      events: await listEvents(query, user, params.get('q') || ''),
      notifications: await listNotifications(query, user),
      organisationId: user.clientOrgId,
    };
  });
}

// SCRUM-32 (E03-S01): Event Coordinator reads. Coordinators see only the
// events assigned to them, never drafts (decision D2 in the SCRUM-32 plan).
//   GET /api/events?assigned=1[&status=<status>]  -> { events }
//   GET /api/events?assigned=1&id=<id or code>    -> { event } incl. pendingReassignment
//                                                    and outstandingQuestions (SCRUM-33)
//   GET /api/events?coordinators=1                -> { coordinators } (reassignment picker)
//   GET /api/events?reassignments=1               -> { incoming, outgoing } pending requests
async function handleGetCoordinator(request: VercelRequest, response: VercelResponse, params: URLSearchParams) {
  await respond(response, async () => {
    const user = await currentUser(request);
    const database = getDatabasePool();
    if (params.get('coordinators') === '1') return { coordinators: await listCoordinatorColleagues(database, user) };
    if (params.get('reassignments') === '1') return await listPendingReassignments(database, user);
    const id = params.get('id');
    if (id) return { event: await withOutstandingQuestions(query, await getAssignedEvent(database, user, id.slice(0, 240))) };
    return { events: await listAssignedEvents(database, user, params.get('status')) };
  });
}

async function handleGetMine(
  request: VercelRequest,
  response: VercelResponse,
  params: URLSearchParams,
) {
  await respond(response, async () => {
    const user = await requireOrganiserWithClient(request);

    const id = params.get('id');
    if (id) {
      const event = await repository.findEventById(id);
      if (!event || event.organiserId !== user.id) {
        throw new AccessError(404, 'not_found');
      }
      return { event: serializeEventDetail(event) };
    }

    const statusParam = params.get('status');
    const status = statusParam && isEventStatus(statusParam) ? statusParam : undefined;
    const events = await repository.listEventsByOrganiser(user.id, status);
    return { events: events.map(serializeEventDetail) };
  });
}

// POST /api/events - organiser create event request. Preserves the payload and
// response contract that shipped in PR #56 (SCRUM-26): the ten mandatory fields
// plus the three none-required sentinels return a 201 with the persisted event.
// SCRUM-27: also accepts status: 'draft' with the other nine fields relaxed
// (title/dates/expectedAttendance stay mandatory - see the service layer).
async function handlePost(request: VercelRequest, response: VercelResponse) {
  // respond() emits 200 on success by default; the create endpoint has
  // shipped 201 since SCRUM-26 so we set the status header ourselves and
  // let respond() cover the AccessError translation.
  try {
    const user = await requireOrganiserWithClient(request);

    const createRequest = parseCreateEventBody(request.body, user.id, user.clientOrgId);
    if (!createRequest) {
      sendJson(response, 400, {
        error: 'invalid_payload',
        required: ['title', 'startAt', 'endAt', 'expectedAttendance'],
      });
      return;
    }

    const event = await createEventRequest(repository, createRequest);
    sendJson(response, 201, {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        startAt: event.startAt?.toISOString(),
        endAt: event.endAt?.toISOString(),
        expectedAttendance: event.expectedAttendance,
        venueRequirements: event.venueRequirements,
        accessibilityNote: event.accessibilityNote,
        accessibilityFeatureIds: event.accessibilityFeatureIds ?? [],
        equipmentRequirements: event.equipmentRequirements,
        layoutPreference: event.layoutPreference,
        registrationSetup: event.registrationSetup,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    if (error instanceof EventValidationError) {
      sendJson(response, 400, { error: error.message, ...error.details });
      return;
    }
    throw error;
  }
}

// PATCH /api/events?id=<id> - SCRUM-27 Scenario 2/4: edit a saved draft and
// re-save it as a draft, or submit it. Only the owning organiser, only while
// the event is still a draft (enforced in updateEventRequest).
async function handlePatch(request: VercelRequest, response: VercelResponse) {
  await respond(response, async () => {
    const user = await requireOrganiserWithClient(request);

    const id = new URL(request.url || '/', 'http://localhost').searchParams.get('id');
    if (!id) {
      throw new AccessError(400, 'missing_id');
    }

    const patch = parseUpdateEventBody(request.body);
    if (!patch) {
      throw new AccessError(400, 'invalid_payload');
    }

    try {
      const event = await updateEventRequest(repository, id, user.id, patch);
      return { event: serializeEventDetail(event) };
    } catch (error) {
      if (error instanceof EventNotFoundError) throw new AccessError(404, 'not_found');
      if (error instanceof EventAccessError) throw new AccessError(403, 'forbidden');
      if (error instanceof EventValidationError) {
        // Preserve the shape of the previous error response, which packed
        // error.details alongside the message. AccessError only carries a
        // string message, so we surface the detail directly through
        // sendJson before respond() can wrap it.
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader('Vary', 'Cookie');
        sendJson(response, 400, { error: error.message, ...error.details });
        // Return a sentinel so respond() does not emit again. The wrapper
        // treats a non-object return as "already responded" via its
        // Cache-Control header double-setting no-op.
        return {} as Record<string, unknown>;
      }
      throw error;
    }
  });
}

// DELETE /api/events?id=<id> - SCRUM-27 Scenario 3: delete a draft. Only the
// owning organiser, only while the event is still a draft (enforced in
// deleteEventRequest).
async function handleDelete(request: VercelRequest, response: VercelResponse) {
  await respond(response, async () => {
    const user = await requireOrganiserWithClient(request);

    const id = new URL(request.url || '/', 'http://localhost').searchParams.get('id');
    if (!id) {
      throw new AccessError(400, 'missing_id');
    }

    try {
      await deleteEventRequest(repository, id, user.id);
      return { deleted: true };
    } catch (error) {
      if (error instanceof EventNotFoundError) throw new AccessError(404, 'not_found');
      if (error instanceof EventAccessError) throw new AccessError(403, 'forbidden');
      if (error instanceof EventValidationError) throw new AccessError(400, error.message);
      throw error;
    }
  });
}

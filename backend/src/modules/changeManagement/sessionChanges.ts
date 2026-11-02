import type { PoolClient } from 'pg';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { readSession, writeSessionWith } from '../eventSessions/repository.js';
import { parseSessionBody } from '../eventSessions/parseSession.js';
import type { SessionRecord } from '../eventSessions/types.js';
import { captureEventAudience, notifyEventChange } from '../eventNotifications/service.js';
import { notifyArrangementImpact } from '../eventNotifications/informationChange.js';
import { assessArrangementImpact, loadArrangementSnapshot } from './arrangementImpact.js';
import { applyArrangementImpact, ArrangementsChangedError, loadOverSubscription, withRevision } from './eventChange.js';

export const sessionChangeFields = ['title', 'startAt', 'endAt', 'expectedAttendance', 'layoutId',
  'venueRequirements', 'equipmentRequirements', 'accessibilityNote', 'layoutPreference',
  'accessibilityFeatureIds', 'facilityIds'] as const;

export function sessionSnapshot(session: SessionRecord, keys: readonly string[] = sessionChangeFields) {
  return Object.fromEntries(keys.map(key => {
    const value = session[key as keyof SessionRecord];
    return [key, value instanceof Date ? value.toISOString() : value ?? null];
  }));
}

// Caller holds the Event lock; scope the child before reading its details.
export async function loadRequestSession(client: PoolClient, eventId: string, sessionId: string) {
  if (!(await client.query(`SELECT id FROM sessions WHERE event_id=$1 AND id=$2 FOR UPDATE`,
    [eventId, sessionId])).rowCount) throw new AccessError(409, 'The Session no longer exists on this Event. Submit a fresh request.');
  // A sole Session inherits Event requirements and syncs from Event edits.
  if (Number((await client.query<{ count: string }>('SELECT count(*)::text AS count FROM sessions WHERE event_id=$1',[eventId])).rows[0]!.count) < 2) {
    throw new AccessError(409, 'Use Event-wide details for a single-Session Event. Submit a fresh request.');
  }
  return readSession(client, sessionId);
}

export async function validateSessionChange(client: PoolClient, eventId: string, session: SessionRecord, fields: Record<string, unknown>) {
  let input;
  try { input = parseSessionBody({ ...session, ...fields }); }
  catch (error) { throw new AccessError(400, (error as Error).message); }
  const envelope = (await client.query<{ starts_at: Date; ends_at: Date }>(
    'SELECT lower(event_range) AS starts_at,upper(event_range) AS ends_at FROM events WHERE id=$1', [eventId])).rows[0]!;
  if (input.startAt < envelope.starts_at || input.endAt > envelope.ends_at) {
    throw new AccessError(400, 'Session dates must stay within the Event period.');
  }
  return input;
}

// Reuse the request's transaction: preview rolls back the real Session write;
// apply commits Session, arrangement flags, request status and notices together.
export async function changeSessionWith(client: PoolClient, actorId: string, eventId: string, sessionId: string,
  fields: Record<string, unknown>, preview: boolean, reviewed?: string, decisionRecipientId?: string) {
  const session = await loadRequestSession(client, eventId, sessionId);
  const input = await validateSessionChange(client, eventId, session, fields);
  const query: Query = (sql, values) => client.query(sql, values);
  const before = await loadArrangementSnapshot(query, eventId);
  if (preview) await client.query('SAVEPOINT request_session_preview');
  try {
    const updated = await writeSessionWith(client, sessionId, eventId, input);
    const after = await loadArrangementSnapshot(query, eventId);
    const check = withRevision({ impact: assessArrangementImpact(before, after), overSubscription: await loadOverSubscription(query, eventId) });
    if (preview) return check;
    if (reviewed !== check.revision) throw new ArrangementsChangedError(check);
    await applyArrangementImpact(query, actorId, eventId, check.impact);
    const audit = (await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs
      (actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,'event',$2,$2,'Approved Session Change Applied','session',$3,$4) RETURNING id,occurred_at`,
    [actorId,eventId,JSON.stringify(sessionSnapshot(session,Object.keys(fields))),JSON.stringify(sessionSnapshot(updated!,Object.keys(fields)))])).rows[0]!;
    if (check.impact.affected) await notifyArrangementImpact(client, actorId, eventId, check.impact, audit.id, audit.occurred_at);
    if (fields.startAt !== undefined || fields.endAt !== undefined) {
      const audience = await captureEventAudience(client,eventId);
      const scoped = { ...audience, organiser: audience.organiser.filter(id => id !== decisionRecipientId) };
      await notifyEventChange(client, { changeId: audit.id,occurredAt: audit.occurred_at,actorId,before: scoped,after: scoped,
        change: {kind: 'arrangements',fields: ['date','time'],session: true} });
    }
    return check;
  } finally {
    if (preview) await client.query('ROLLBACK TO SAVEPOINT request_session_preview');
  }
}

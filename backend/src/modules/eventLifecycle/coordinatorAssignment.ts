// E03 review coordination. Newly submitted requests remain unassigned until a
// Lead assigns them; only a Lead can subsequently reassign an active event.
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { canActAsRole, LOCKOUT_FAILURE_THRESHOLD } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, listEventActivity } from '../eventVisibility/service.js';
import { notifyUser } from '../notificationDispatcher/inApp.js';
import { ACTIVE_EVENT_STATUSES, isEventStatus } from './status.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ELIGIBLE_COORDINATOR = `u.role = 'event_coordinator' AND u.is_active
  AND u.failed_login_count < $1 AND (u.locked_until IS NULL OR u.locked_until <= now())`;
const ASSIGNED_EVENT_FIELDS = `e.id, e.event_code, e.title, e.status, e.status_changed_at,
  lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at, e.expected_attendance,
  e.coordinator_assigned_at, o.full_name AS organiser_name`;

export function eventLabel(event: { event_code: string | null; title: string }) {
  return event.event_code ? `${event.event_code} ${event.title}` : event.title;
}

export async function notifyLeadOfQueuedEvent(client: PoolClient, eventId: string, title: string, changeId: string, occurredAt: Date) {
  const leads = await client.query<{ id: string }>(`SELECT id FROM users WHERE role::text = 'event_coordinator_lead' AND is_active ORDER BY id`);
  for (const lead of leads.rows) await notifyUser(client, { userId: lead.id, eventId, changeId: `${changeId}:${lead.id}`, occurredAt, title: 'New request awaiting assignment', message: `${title} is waiting in the unassigned Event Coordinator queue.` });
}

export async function requireCoordinator(database: Pool, user: AuthenticatedUser | undefined, screen: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await database.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value) VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', $2)`, [user.id, screen]);
    throw new AccessError(403, 'Access denied. This action is for Event Coordinators.');
  }
  return user;
}

export async function requireLead(database: Pool, user: AuthenticatedUser | undefined, screen: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator_lead']).allowed) {
    await database.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value) VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', $2)`, [user.id, screen]);
    throw new AccessError(403, 'Access denied. This action is for Event Coordinator Leads.');
  }
  return user;
}

export async function recordEventDenial(database: Pool, user: AuthenticatedUser, identifier: string, attempted: string) {
  await database.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
     SELECT $1, 'event', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', $3, $2
     FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2 OR e.event_code = $2`,
    [user.id, identifier, attempted],
  );
}

export async function listAssignedEvents(database: Pool, user: AuthenticatedUser | undefined, status?: string | null) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_events');
  if (status && !isEventStatus(status)) throw new AccessError(400, 'Unknown status filter.');
  return (await database.query(
    `SELECT ${ASSIGNED_EVENT_FIELDS} FROM events e JOIN users o ON o.id = e.organiser_id
     WHERE e.coordinator_id = $1 AND e.status <> 'draft' AND ($2::event_status IS NULL OR e.status = $2::event_status)
     ORDER BY lower(e.event_range), e.id LIMIT 200`, [coordinator.id, status || null],
  )).rows;
}

export async function listUnassignedEvents(database: Pool, user: AuthenticatedUser | undefined) {
  await requireLead(database, user, 'lead_unassigned_events');
  return (await database.query(
    `SELECT e.id, e.event_code, e.title, e.status, e.created_at, lower(e.event_range) AS starts_at,
       upper(e.event_range) AS ends_at, e.expected_attendance, o.name AS organisation_name
     FROM events e JOIN client_organisations o ON o.id = e.client_org_id
     WHERE e.status = 'submitted' AND e.coordinator_id IS NULL ORDER BY e.created_at ASC, e.id ASC LIMIT 200`,
  )).rows;
}

function coordinatorIdFrom(body: unknown) {
  const value = body && typeof body === 'object' && !Array.isArray(body) ? (body as { coordinator_id?: unknown }).coordinator_id : undefined;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new AccessError(400, 'Choose an Event Coordinator.');
  return value;
}

async function eligibleCoordinator(client: PoolClient, coordinatorId: string) {
  const target = await client.query<{ id: string; full_name: string }>(`SELECT u.id, u.full_name FROM users u WHERE u.id = $2 AND ${ELIGIBLE_COORDINATOR}`, [LOCKOUT_FAILURE_THRESHOLD, coordinatorId]);
  if (!target.rows[0]) throw new AccessError(400, 'That user is not an active Event Coordinator.');
  return target.rows[0];
}

export async function assignQueuedEvent(database: Pool, user: AuthenticatedUser | undefined, identifier: string, body: unknown) {
  const lead = await requireLead(database, user, 'lead_assignment');
  const coordinatorId = coordinatorIdFrom(body);
  return inTransaction(database, async client => {
    const event = (await client.query<{ id: string; event_code: string | null; title: string; status: string; coordinator_id: string | null; organiser_id: string }>(`SELECT id, event_code, title, status, coordinator_id, organiser_id FROM events WHERE id::text = $1 OR event_code = $1 FOR UPDATE`, [identifier])).rows[0];
    if (!event || event.status !== 'submitted' || event.coordinator_id) throw new AccessError(409, 'This request is no longer in the unassigned queue.');
    const target = await eligibleCoordinator(client, coordinatorId);
    // Note: The events table tracks coordinator_id and coordinator_assigned_at;
    // attribution to the acting Lead is recorded in audit_logs (actor_id).
    const updated = await client.query(`UPDATE events SET coordinator_id = $2, coordinator_assigned_at = now(), status = 'under_review'::event_status, status_changed_at = now() WHERE id = $1 AND status = 'submitted' AND coordinator_id IS NULL`, [event.id, coordinatorId]);
    if (!updated.rowCount) throw new AccessError(409, 'This request is no longer in the unassigned queue.');
    const audit = await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value) VALUES ($1, 'event', $2, $2, 'Lead assigned', 'coordinator_id', NULL, $3) RETURNING id, occurred_at`, [lead.id, event.id, coordinatorId]);
    await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value) VALUES ($1, 'event', $2, $2, 'Status changed to under_review', 'status', 'submitted', 'under_review')`, [lead.id, event.id]);
    const change = audit.rows[0]!;
    const label = eventLabel(event);
    await notifyUser(client, { userId: coordinatorId, eventId: event.id, changeId: change.id, occurredAt: change.occurred_at, title: 'New event assigned', message: `You have been assigned to ${label}. It is now Under Review.` });
    await notifyUser(client, { userId: event.organiser_id, eventId: event.id, changeId: `${change.id}:organiser`, occurredAt: change.occurred_at, title: 'Coordinator assigned', message: `${target.full_name} is now coordinating ${label}.` });
    return { eventId: event.id, coordinatorId };
  });
}

export async function reassignEventAsLead(database: Pool, user: AuthenticatedUser | undefined, identifier: string, body: unknown) {
  const lead = await requireLead(database, user, 'lead_reassignment');
  const coordinatorId = coordinatorIdFrom(body);
  return inTransaction(database, async client => {
    const event = (await client.query<{ id: string; event_code: string | null; title: string; status: string; coordinator_id: string | null; organiser_id: string }>(`SELECT id, event_code, title, status, coordinator_id, organiser_id FROM events WHERE id::text = $1 OR event_code = $1 FOR UPDATE`, [identifier])).rows[0];
    if (!event || !event.coordinator_id || !(ACTIVE_EVENT_STATUSES as readonly string[]).includes(event.status)) throw new AccessError(409, 'Only an active assigned event can be reassigned.');
    if (event.coordinator_id === coordinatorId) throw new AccessError(400, 'Choose a different Event Coordinator.');
    const target = await eligibleCoordinator(client, coordinatorId);
    // Note: The events table tracks coordinator_id and coordinator_assigned_at;
    // attribution to the acting Lead is recorded in audit_logs (actor_id).
    await client.query(`UPDATE events SET coordinator_id = $2, coordinator_assigned_at = now() WHERE id = $1`, [event.id, coordinatorId]);
    const audit = await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value) VALUES ($1, 'event', $2, $2, 'Lead reassigned', 'coordinator_id', $3, $4) RETURNING id, occurred_at`, [lead.id, event.id, event.coordinator_id, coordinatorId]);
    const change = audit.rows[0]!;
    const label = eventLabel(event);
    await notifyUser(client, { userId: event.coordinator_id, eventId: event.id, changeId: `${change.id}:outgoing`, occurredAt: change.occurred_at, title: 'Event reassigned', message: `The Lead reassigned ${label} to another Event Coordinator.` });
    await notifyUser(client, { userId: coordinatorId, eventId: event.id, changeId: `${change.id}:incoming`, occurredAt: change.occurred_at, title: 'Event assigned', message: `The Lead assigned ${label} to you.` });
    await notifyUser(client, { userId: event.organiser_id, eventId: event.id, changeId: `${change.id}:organiser`, occurredAt: change.occurred_at, title: 'Coordinator changed', message: `${target.full_name} is now coordinating ${label}.` });
    return { eventId: event.id, coordinatorId };
  });
}

export async function getAssignedEvent(database: Pool, user: AuthenticatedUser | undefined, identifier: string) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_events');
  const event = (await database.query(
    `SELECT ${ASSIGNED_EVENT_FIELDS}, e.description, e.purpose, e.venue_requirements, e.accessibility_note, e.equipment_requirements, e.layout_preference, e.registration_setup, e.coordinator_id, CASE WHEN e.status='cancelled' THEN e.decision_reason END AS cancellation_reason, c.full_name AS coordinator_name, o.email AS organiser_email FROM events e JOIN users o ON o.id = e.organiser_id JOIN users c ON c.id = e.coordinator_id WHERE (e.id::text = $2 OR e.event_code = $2) AND e.coordinator_id = $1 AND e.status <> 'draft'`,
    [coordinator.id, identifier],
  )).rows[0] as Record<string, unknown> & { id: string } | undefined;
  if (!event) { await recordEventDenial(database, coordinator, identifier, 'coordinator_event'); throw new AccessError(403, 'Access denied. This event is not assigned to you.'); }
  const activity = await listEventActivity((sql, values) => database.query(sql, values), event.id, { includeBookings: true });
  return { ...event, activityLog: activity.rows };
}

export async function listAssignableCoordinators(database: Pool, user: AuthenticatedUser | undefined) {
  await requireLead(database, user, 'lead_assignment');
  return (await database.query(`SELECT u.id, u.full_name, u.email, (SELECT count(*)::int FROM events e WHERE e.coordinator_id = u.id AND e.status = ANY($2::event_status[])) AS active_events FROM users u WHERE ${ELIGIBLE_COORDINATOR} ORDER BY active_events, u.full_name, u.id`, [LOCKOUT_FAILURE_THRESHOLD, [...ACTIVE_EVENT_STATUSES]])).rows;
}

export async function listLeadOversight(database: Pool, user: AuthenticatedUser | undefined, filters: { status?: string | null; coordinator?: string | null } = {}) {
  await requireLead(database, user, 'lead_oversight');
  const status = filters.status || null;
  const coordinator = filters.coordinator || null;
  if (status && !(ACTIVE_EVENT_STATUSES as readonly string[]).includes(status)) throw new AccessError(400, 'Unknown active event status filter.');
  if (coordinator && !UUID_PATTERN.test(coordinator)) throw new AccessError(400, 'Invalid Coordinator filter.');
  const events = await database.query(`SELECT e.id, e.event_code, e.title, e.status, lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at, e.expected_attendance, e.coordinator_id, c.full_name AS coordinator_name, o.full_name AS organiser_name FROM events e JOIN users o ON o.id = e.organiser_id LEFT JOIN users c ON c.id = e.coordinator_id WHERE e.status = ANY($1::event_status[]) AND ($2::event_status IS NULL OR e.status = $2::event_status) AND ($3::uuid IS NULL OR e.coordinator_id = $3) ORDER BY lower(e.event_range), e.id LIMIT 500`, [[...ACTIVE_EVENT_STATUSES], status, coordinator]);
  const workloads = await database.query(`SELECT u.id, u.full_name, (SELECT count(*)::int FROM events e WHERE e.coordinator_id = u.id AND e.status = ANY($1::event_status[])) AS active_events FROM users u WHERE u.role = 'event_coordinator' AND u.is_active ORDER BY u.full_name, u.id`, [[...ACTIVE_EVENT_STATUSES]]);
  return { events: events.rows, workloads: workloads.rows };
}

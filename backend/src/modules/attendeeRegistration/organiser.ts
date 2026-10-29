import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { formatEventDates } from '../equipmentSupport/reservations.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { inTransaction } from '../../database/pool.js';
import { eventCapacity, overCapacity, type EventCapacity } from './capacity.js';
import {
  activeRegistration, identifier, INVALID_SESSIONS, parseSessionIds, publicSession, sessionsFor, type SessionChoice,
} from './service.js';

// E09-S02 Organiser side: the Event's capacity, its Pending requests, approval
// and rejection (Scenario 3), and manual additions (Scenarios 6-7, C-58/T-50).
// Approval and manual additions recheck every chosen Session and the Event
// under the same Event row lock as Attendee registration, so neither limit can
// be exceeded by a race (T-85).
// E09-S07: the registration list (registered and waitlisted Attendees with
// name, email and contact number only, T-32) is visible to every Organiser of
// the Event's client organisation, like their events (E01-S02); only the
// Event's own Organiser approves, declines or adds.

type OrganiserEvent = {
  id: string; event_code: string | null; title: string; status: string;
  waitlist_enabled: boolean; organiser_id: string; starts_at: Date; ends_at: Date;
  registration_enabled: boolean; opens_at: Date | null; closes_at: Date | null; withdrawal_deadline: Date | null;
};
type PendingRow = { id: string; full_name: string | null; email: string; registered_at: Date; session_ids: string[] };
type AttendeeRow = PendingRow & { status: 'registered' | 'waitlisted'; contact_number: string | null; manually_added: boolean };
type Result = { status: number; body: Record<string, unknown> };
type Action = { action: 'approve' | 'reject'; registrationId: string } | { action: 'add'; email: string; sessionIds: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_CONFIRMED = 'Registrations can only be managed for a Confirmed event.';
const SESSION_IDS = `array(SELECT rs.session_id::text FROM event_registration_sessions rs
  WHERE rs.registration_id = r.id ORDER BY rs.session_id) AS session_ids`;

const NOT_YOURS = 'Access denied. This event is not available to your organisation.';

// An Event of the Organiser's own client organisation (E01-S02). Any other, or
// an unknown one, gets the same refusal, recorded like getEvent's. Pass the
// pool, not a transaction, so the record survives the refusal.
async function organisationEvent(query: Query, user: AuthenticatedUser, ref: string, lock = false) {
  identifier(ref);
  if (!canActAsRole(user, ['event_organiser']).allowed || !user.clientOrgId) {
    throw new AccessError(403, 'Only Event Organisers can view registrations.');
  }
  const event = (await query(`SELECT id, event_code, title, status, waitlist_enabled, organiser_id,
      lower(event_range) AS starts_at, upper(event_range) AS ends_at, registration_enabled,
      registration_opens_at AS opens_at, registration_closes_at AS closes_at, withdrawal_deadline
    FROM events WHERE (id::text = $1 OR event_code = $1) AND client_org_id = $2 AND status <> 'draft'${lock ? ' FOR UPDATE' : ''}`,
  [ref, user.clientOrgId])).rows[0] as OrganiserEvent | undefined;
  if (!event) {
    if (!lock) {
      await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
        SELECT $1, 'event', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', 'registrations', $2
        FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2 OR e.event_code = $2`, [user.id, ref]);
    }
    throw new AccessError(403, NOT_YOURS);
  }
  return event;
}

function sessionNames(sessions: SessionChoice[]) {
  return new Map(sessions.map((session, index) => [session.id, session.title ? `"${session.title}"` : `Session ${index + 1}`]));
}

function attendee(row: AttendeeRow) {
  return { id: row.id, name: row.full_name, email: row.email, contactNumber: row.contact_number, sessionIds: row.session_ids };
}

function snapshot(event: OrganiserEvent, user: AuthenticatedUser, capacity: EventCapacity, sessions: SessionChoice[],
  pending: PendingRow[], attendees: AttendeeRow[]) {
  const names = sessionNames(sessions);
  const places = new Map(capacity.sessions.map(session => [session.sessionId, session]));
  return {
    event: {
      id: event.id, eventCode: event.event_code, name: event.title, status: event.status, waitlistEnabled: event.waitlist_enabled,
      // Only the Event's own Organiser approves, declines or adds (E09-S02).
      canManage: event.organiser_id === user.id,
      // E09-S03: the registration period the Organiser sets.
      startsAt: event.starts_at.toISOString(), endsAt: event.ends_at.toISOString(), registrationEnabled: event.registration_enabled,
      opensAt: event.opens_at?.toISOString() ?? null, closesAt: event.closes_at?.toISOString() ?? null,
      withdrawalDeadline: event.withdrawal_deadline?.toISOString() ?? null,
    },
    capacity: { capacity: capacity.capacity, registered: capacity.registered, remaining: Math.max(0, capacity.capacity - capacity.registered) },
    sessions: sessions.map(session => ({
      ...publicSession(session),
      capacity: places.get(session.id)?.capacity ?? 0,
      registered: places.get(session.id)?.registered ?? 0,
    })),
    pending: pending.map(row => ({
      id: row.id, name: row.full_name, email: row.email, requestedAt: row.registered_at.toISOString(), sessionIds: row.session_ids,
      overCapacity: overCapacity(capacity, row.session_ids, names),
    })),
    // E09-S07 Scenarios 1 and 4: registered and waitlisted shown apart.
    registered: attendees.filter(row => row.status === 'registered')
      .map(row => ({ ...attendee(row), registeredAt: row.registered_at.toISOString(), manuallyAdded: row.manually_added })),
    waitlisted: attendees.filter(row => row.status === 'waitlisted')
      .map(row => ({ ...attendee(row), joinedAt: row.registered_at.toISOString() })),
  };
}

async function pendingRequests(query: Query, eventId: string) {
  return (await query(`SELECT r.id, u.full_name, u.email, r.registered_at, ${SESSION_IDS}
    FROM event_registrations r JOIN users u ON u.id = r.attendee_id
    WHERE r.event_id = $1 AND r.status = 'pending'
    ORDER BY r.registered_at, r.id`, [eventId])).rows as PendingRow[];
}

// Registered by when they registered; the waiting list by when they joined.
async function attendeeList(query: Query, eventId: string) {
  return (await query(`SELECT r.id, r.status, u.full_name, u.email, u.contact_number, r.registered_at, r.manually_added, ${SESSION_IDS}
    FROM event_registrations r JOIN users u ON u.id = r.attendee_id
    WHERE r.event_id = $1 AND r.status IN ('registered', 'waitlisted')
    ORDER BY r.registered_at, r.id`, [eventId])).rows as AttendeeRow[];
}

async function picture(query: Query, event: OrganiserEvent, user: AuthenticatedUser, sessions?: SessionChoice[]) {
  const [capacity, allSessions, pending, attendees] = await Promise.all([
    eventCapacity(query, event.id), sessions ?? sessionsFor(query, event.id), pendingRequests(query, event.id), attendeeList(query, event.id),
  ]);
  return snapshot(event, user, capacity, allSessions, pending, attendees);
}

// GET: what the Organiser needs to decide (TC_E09S02_11, _12), the registration
// period they set (E09-S03) and the registration list (E09-S07).
export async function getEventRegistrations(query: Query, user: AuthenticatedUser, ref: string) {
  return picture(query, await organisationEvent(query, user, ref), user);
}

export function parseAction(body: unknown): Action | { error: string } {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (raw.action === 'approve' || raw.action === 'reject') {
    return typeof raw.registrationId === 'string' && UUID.test(raw.registrationId)
      ? { action: raw.action, registrationId: raw.registrationId.toLowerCase() }
      : { error: 'Choose a registration request.' };
  }
  if (raw.action === 'add') {
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    if (!EMAIL.test(email) || email.length > 254) return { error: "Enter the attendee's email address." };
    const sessions = parseSessionIds(raw);
    return 'error' in sessions ? sessions : { action: 'add', email, sessionIds: sessions.ids };
  }
  return { error: 'Unknown action.' };
}

async function audit(client: PoolClient, user: AuthenticatedUser, registrationId: string, eventId: string, action: string, from: string | null, to: string) {
  await client.query(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
    VALUES ($1, $2, 'event_registration', $3, $4, $5, 'status', $6, $7)`, [randomUUID(), user.id, registrationId, eventId, action, from, to]);
}

function when(event: OrganiserEvent) {
  return `${event.title}, ${formatEventDates(event.starts_at, event.ends_at)}`;
}

async function decide(client: PoolClient, user: AuthenticatedUser, event: OrganiserEvent, capacity: EventCapacity,
  names: Map<string, string>, input: { action: 'approve' | 'reject'; registrationId: string }): Promise<Result> {
  const row = (await client.query(`SELECT r.id, r.status, r.attendee_id, ${SESSION_IDS}
    FROM event_registrations r WHERE r.id = $1 AND r.event_id = $2 FOR UPDATE OF r`, [input.registrationId, event.id])).rows[0] as
    { id: string; status: string; attendee_id: string; session_ids: string[] } | undefined;
  if (!row) return { status: 404, body: { error: 'Registration request not found.' } };
  if (row.status !== 'pending') return { status: 409, body: { error: 'This request has already been decided. Refresh the list.' } };
  const approve = input.action === 'approve';
  if (approve) {
    // Scenario 3: approval only while both limits still allow the place.
    const reason = overCapacity(capacity, row.session_ids, names);
    if (reason) return { status: 409, body: { error: `Can't approve yet. ${reason}` } };
  }
  const status = approve ? 'registered' : 'rejected';
  const changed = (await client.query(`UPDATE event_registrations SET status = $2 WHERE id = $1 RETURNING clock_timestamp() AS at`,
    [row.id, status])).rows[0] as { at: Date };
  await audit(client, user, row.id, event.id, approve ? 'Registration Approved' : 'Registration Rejected', 'pending', status);
  await writeEventNotification(client, {
    eventId: event.id, changeId: `registration-${status}:${row.id}`, userId: row.attendee_id, occurredAt: changed.at,
    title: approve ? 'Registration confirmed' : 'Registration request declined',
    message: approve
      ? `${when(event)}: the organiser approved your request, so you're registered.`
      : `${when(event)}: the organiser couldn't offer you a place this time.`,
  });
  return { status: 200, body: { registration: { id: row.id, status, sessionIds: row.session_ids } } };
}

async function addAttendee(client: PoolClient, user: AuthenticatedUser, event: OrganiserEvent, capacity: EventCapacity,
  sessions: SessionChoice[], input: { email: string; sessionIds: string[] }): Promise<Result> {
  const query: Query = (sql, values) => client.query(sql, values);
  if (!input.sessionIds.every(id => sessions.some(session => session.id === id))) return { status: 400, body: { error: INVALID_SESSIONS } };
  // Lock order Event -> Account, as in Attendee registration.
  const attendee = (await client.query(`SELECT id FROM users WHERE lower(email) = lower($1) AND role = 'attendee' AND is_active
    FOR SHARE NOWAIT`, [input.email])).rows[0] as { id: string } | undefined;
  if (!attendee) return { status: 404, body: { error: 'No active attendee account uses that email.' } };
  const existing = await activeRegistration(query, event.id, attendee.id);
  if (existing) {
    return { status: 409, body: { error: existing.status === 'pending'
      ? 'They already have a pending request. Approve it from the list instead.'
      : 'They already have a registration for this event.' } };
  }
  // Scenario 7: blocked at either limit; manual additions never overbook.
  const reason = overCapacity(capacity, input.sessionIds, sessionNames(sessions));
  if (reason) return { status: 409, body: { error: `Can't add them. ${reason}` } };
  const registration = (await client.query(`INSERT INTO event_registrations (event_id, attendee_id, status, manually_added)
    VALUES ($1, $2, 'registered', true) RETURNING id, registered_at`, [event.id, attendee.id])).rows[0] as { id: string; registered_at: Date };
  await client.query(`INSERT INTO event_registration_sessions (registration_id, event_id, session_id, selected_at)
    SELECT $1, $2, unnest($3::uuid[]), $4`, [registration.id, event.id, input.sessionIds, registration.registered_at]);
  await audit(client, user, registration.id, event.id, 'Attendee Added Manually', null, 'registered');
  await writeEventNotification(client, {
    eventId: event.id, changeId: `registration-manual:${registration.id}`, userId: attendee.id, occurredAt: registration.registered_at,
    title: 'Registration confirmed', message: `${when(event)}: the organiser registered you for this event.`,
  });
  return { status: 201, body: { registration: { id: registration.id, status: 'registered', manuallyAdded: true, sessionIds: input.sessionIds } } };
}

// POST: { action: 'approve' | 'reject', registrationId } or { action: 'add', email, sessionIds }.
export async function manageRegistrations(database: Pool, user: AuthenticatedUser, ref: string, body: unknown): Promise<Result> {
  identifier(ref);
  const input = parseAction(body);
  if ('error' in input) return { status: 400, body: { error: input.error } };
  // Outside the transaction, so a refusal for another organisation is recorded.
  await organisationEvent((sql, values) => database.query(sql, values), user, ref);
  try {
    return await inTransaction(database, async client => {
      const query: Query = (sql, values) => client.query(sql, values);
      const event = await organisationEvent(query, user, ref, true);
      if (event.organiser_id !== user.id) throw new AccessError(403, "Only this event's Organiser can approve requests or add attendees.");
      if (event.status !== 'confirmed') return { status: 409, body: { error: NOT_CONFIRMED } };
      const capacity = await eventCapacity(query, event.id);
      const sessions = await sessionsFor(query, event.id);
      const result = input.action === 'add'
        ? await addAttendee(client, user, event, capacity, sessions, input)
        : await decide(client, user, event, capacity, sessionNames(sessions), input);
      if (result.status >= 300) return result;
      // Hand back the refreshed picture so the page needn't reload.
      return { status: result.status, body: { ...result.body, ...await picture(query, event, user, sessions) } };
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '55P03') throw new AccessError(409, 'That account is being updated. Please try again.');
    if (code === '23505') return { status: 409, body: { error: 'They already have a registration for this event.' } };
    throw error;
  }
}

import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { requireAttendee } from '../attendeeVisibility/service.js';
import { formatEventDates } from '../equipmentSupport/reservations.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { inTransaction } from '../../database/pool.js';
import { eventCapacity, fullSessionIds, overCapacity } from './capacity.js';

// E09-S01: an Attendee registers once for a published, Confirmed Event and
// selects one or more of its Sessions (T-79, T-85). Responses carry public
// fields only: the published name, dates, venues and the Attendee's own
// account details. Registration details live on the user record, so nothing
// extra is collected or stored at registration (T-32, O-05).

export type RegistrationState = 'open' | 'not_yet_open' | 'closed';

type EventRow = {
  id: string;
  event_code: string | null;
  name: string;
  status: string;
  registration_enabled: boolean;
  waitlist_enabled: boolean;
  opens_at: Date | null;
  closes_at: Date | null;
  starts_at: Date;
  ends_at: Date;
  venue_name: string;
  venue_location: string;
  now: Date;
};

export type SessionChoice = {
  id: string;
  title: string | null;
  starts_at: Date;
  ends_at: Date;
  venue_name: string | null;
  venue_location: string | null;
};

type Details = { full_name: string | null; email: string | null; contact_number: string | null };
export type Existing = { id: string; status: string; registered_at: Date; session_ids: string[] };
type Result = { status: number; body: Record<string, unknown> };

const REQUIRED_DETAILS = [['full_name', 'Name'], ['email', 'Email'], ['contact_number', 'Contact number']] as const;
const MAX_SESSIONS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_OFFERED = 'Registration is only open for confirmed events that take registrations.';
const ACTIVE = "r.status NOT IN ('withdrawn', 'rejected')";

// The primary Confirmed booking is the Event's venue (O-30, T-78); the
// publication's venue is the fallback for events published before 0019.
const EVENT = `SELECT e.id, e.event_code, p.name, e.status, e.registration_enabled, e.waitlist_enabled,
    e.registration_opens_at AS opens_at, e.registration_closes_at AS closes_at,
    lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at,
    coalesce(pv.name, p.venue_name) AS venue_name, coalesce(pv.location, p.venue_location) AS venue_location,
    clock_timestamp() AS now
  FROM events e JOIN event_publications p ON p.event_id = e.id
  LEFT JOIN venue_bookings pb ON pb.event_id = e.id AND pb.is_primary AND pb.status = 'confirmed'
  LEFT JOIN venues pv ON pv.id = pb.venue_id`;

// Both window ends are inclusive (TC_E09S03_07, TC_E09S03_08); an unset end is unbounded.
export function registrationState(event: Pick<EventRow, 'opens_at' | 'closes_at'>, now: Date): RegistrationState {
  if (event.opens_at && now.getTime() < event.opens_at.getTime()) return 'not_yet_open';
  if (event.closes_at && now.getTime() > event.closes_at.getTime()) return 'closed';
  return 'open';
}

export function missingDetails(details: Details): string[] {
  return REQUIRED_DETAILS.filter(([field]) => !details[field]?.trim()).map(([, label]) => label);
}

const NO_SESSION = 'Choose at least one Session.';
export const INVALID_SESSIONS = 'Choose valid Sessions from this event.';

// Nothing chosen and an unusable choice get different messages; more than 50
// or a malformed id can only come from a direct API call, not the form.
export function parseSessionIds(body: unknown): { ids: string[] } | { error: string } {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>).sessionIds : undefined;
  if (!Array.isArray(raw) || raw.length === 0) return { error: NO_SESSION };
  if (raw.length > MAX_SESSIONS || !raw.every(id => typeof id === 'string' && UUID.test(id))) return { error: INVALID_SESSIONS };
  return { ids: [...new Set((raw as string[]).map(id => id.toLowerCase()))] };
}

export function identifier(value: string) {
  if (!value || value.length > 240) throw new AccessError(400, 'An event id or code is required.');
}

function offered(event: EventRow | undefined): event is EventRow {
  return !!event && event.status === 'confirmed' && event.registration_enabled;
}

const MOMENT = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

function closedMessage(event: EventRow, state: RegistrationState) {
  return state === 'not_yet_open' && event.opens_at
    ? `Registration opens on ${MOMENT.format(event.opens_at)}.`
    : 'Registration for this event has closed.';
}

function publicEvent(event: EventRow) {
  const state = registrationState(event, event.now);
  return {
    id: event.id, eventCode: event.event_code, name: event.name,
    startsAt: event.starts_at.toISOString(), endsAt: event.ends_at.toISOString(),
    venueName: event.venue_name, venueLocation: event.venue_location,
    registrationState: state,
    opensAt: event.opens_at?.toISOString() ?? null, closesAt: event.closes_at?.toISOString() ?? null,
  };
}

export function publicSession(session: SessionChoice) {
  return {
    id: session.id, title: session.title,
    startsAt: session.starts_at.toISOString(), endsAt: session.ends_at.toISOString(),
    venueName: session.venue_name, venueLocation: session.venue_location,
  };
}

function publicRegistration(existing: Existing) {
  return { id: existing.id, status: existing.status, registeredAt: existing.registered_at.toISOString(), sessionIds: existing.session_ids };
}

// Each Session shows its own Confirmed venue; a primary booking wins if a
// Session has several (T-78, T-79). Venues are never separate registrations.
export async function sessionsFor(query: Query, eventId: string) {
  const rows = (await query(`SELECT DISTINCT ON (s.id) s.id, s.title, lower(s.session_range) AS starts_at,
      upper(s.session_range) AS ends_at, v.name AS venue_name, v.location AS venue_location
    FROM sessions s
    LEFT JOIN venue_bookings b ON b.session_id = s.id AND b.status = 'confirmed'
    LEFT JOIN venues v ON v.id = b.venue_id
    WHERE s.event_id = $1
    ORDER BY s.id, b.is_primary DESC NULLS LAST, b.created_at`, [eventId])).rows as SessionChoice[];
  return rows.sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime() || a.id.localeCompare(b.id));
}

export async function activeRegistration(query: Query, eventId: string, attendeeId: string) {
  return (await query(`SELECT r.id, r.status, r.registered_at,
      array(SELECT rs.session_id::text FROM event_registration_sessions rs WHERE rs.registration_id = r.id ORDER BY rs.session_id) AS session_ids
    FROM event_registrations r WHERE r.event_id = $1 AND r.attendee_id = $2 AND ${ACTIVE}`, [eventId, attendeeId])).rows[0] as Existing | undefined;
}

// Discovery list: Confirmed, published events that take registrations and have
// not closed. Not-yet-open events stay visible with their opening date (E09-S03).
export async function listOpenEvents(query: Query, user: AuthenticatedUser) {
  await requireAttendee(query, user);
  const rows = (await query(`${EVENT}
    WHERE e.status = 'confirmed' AND e.registration_enabled
      AND (e.registration_closes_at IS NULL OR e.registration_closes_at >= clock_timestamp())
    ORDER BY lower(e.event_range), e.id`, [])).rows as EventRow[];
  const mine = new Map(((await query(`SELECT r.event_id, r.status FROM event_registrations r
    WHERE r.attendee_id = $1 AND ${ACTIVE}`, [user.id])).rows as { event_id: string; status: string }[])
    .map(row => [row.event_id, row.status]));
  return rows.map(event => ({ ...publicEvent(event), myRegistrationStatus: mine.get(event.id) ?? null }));
}

// The registration form: refused outright unless the Event is Confirmed and
// takes registrations (TC_E09S01_05). A not-yet-open or closed window still
// shows the event with its state so the Attendee sees why they can't submit.
export async function getRegistrationForm(query: Query, user: AuthenticatedUser, ref: string) {
  identifier(ref);
  await requireAttendee(query, user);
  const event = (await query(`${EVENT} WHERE e.id::text = $1 OR e.event_code = $1`, [ref])).rows[0] as EventRow | undefined;
  if (!offered(event)) throw new AccessError(409, NOT_OFFERED);
  const details = (await query('SELECT full_name, email, contact_number FROM users WHERE id = $1', [user.id])).rows[0] as Details;
  const existing = await activeRegistration(query, event.id, user.id);
  const capacity = await eventCapacity(query, event.id);
  return {
    event: publicEvent(event),
    // E09-S02: full Sessions and a full Event still accept a request, which
    // waits as Pending for the Organiser; the Event-level waiting list is
    // offered where enabled (T-85, T-98; no per-Session list, O-50).
    capacity: {
      eventFull: capacity.registered >= capacity.capacity,
      waitlistEnabled: event.waitlist_enabled,
      fullSessionIds: fullSessionIds(capacity),
    },
    sessions: (await sessionsFor(query, event.id)).map(publicSession),
    details: { name: details.full_name, email: details.email, contactNumber: details.contact_number },
    missingDetails: missingDetails(details),
    registration: existing ? publicRegistration(existing) : null,
  };
}

async function lockAccount(client: PoolClient, user: AuthenticatedUser) {
  // Lock order Event -> Account; NOWAIT avoids waiting on a deactivation or login update.
  return (await client.query(`SELECT full_name, email, contact_number FROM users
    WHERE id = $1 AND role = 'attendee' AND is_active AND failed_login_count < 5
      AND (locked_until IS NULL OR locked_until <= now())
    FOR SHARE NOWAIT`, [user.id])).rows[0] as Details | undefined;
}

// One Event-level registration selecting Sessions (E09-S01 Scenarios 1-4). The
// Event row lock serialises registrations for the Event, so the E09-S02
// capacity check can't be raced (TC_E09S02_03): a registration that fits every
// chosen Session and the Event is registered, otherwise it waits as Pending for
// the Organiser and takes no place (T-85). The partial unique index backs
// E09-S01 Scenario 2.
export async function registerForEvent(database: Pool, user: AuthenticatedUser, ref: string, body: unknown): Promise<Result> {
  identifier(ref);
  await requireAttendee((sql, values) => database.query(sql, values), user);
  const parsed = parseSessionIds(body);
  if ('error' in parsed) return { status: 400, body: { error: parsed.error } };
  const sessionIds = parsed.ids;
  try {
    return await inTransaction(database, async client => {
      const query: Query = (sql, values) => client.query(sql, values);
      const event = (await client.query(`${EVENT} WHERE e.id::text = $1 OR e.event_code = $1 FOR UPDATE OF e`, [ref])).rows[0] as EventRow | undefined;
      if (!offered(event)) return { status: 409, body: { error: NOT_OFFERED } };
      const state = registrationState(event, event.now);
      if (state !== 'open') return { status: 409, body: { error: closedMessage(event, state), registrationState: state } };
      const details = await lockAccount(client, user);
      if (!details) throw new AccessError(403, 'Your account cannot register for events.');
      const missing = missingDetails(details);
      if (missing.length) {
        return { status: 400, body: { error: `Add your ${missing.join(', ').toLowerCase()} to your profile before registering.`, missingFields: missing } };
      }
      const existing = await activeRegistration(query, event.id, user.id);
      if (existing) {
        return { status: 409, body: { error: "You're already registered for this event.", registration: publicRegistration(existing) } };
      }
      const sessions = (await sessionsFor(query, event.id)).filter(session => sessionIds.includes(session.id));
      if (sessions.length !== sessionIds.length) return { status: 400, body: { error: INVALID_SESSIONS } };
      const pending = overCapacity(await eventCapacity(query, event.id), sessionIds) !== null;
      const registration = (await client.query(`INSERT INTO event_registrations (event_id, attendee_id, status)
        VALUES ($1, $2, $3) RETURNING id, status, registered_at`, [event.id, user.id, pending ? 'pending' : 'registered'])).rows[0] as Existing;
      await client.query(`INSERT INTO event_registration_sessions (registration_id, event_id, session_id, selected_at)
        SELECT $1, $2, unnest($3::uuid[]), $4`, [registration.id, event.id, sessions.map(session => session.id), registration.registered_at]);
      const chosen = sessions.map(session =>
        `${session.title ?? 'Session'} (${formatEventDates(session.starts_at, session.ends_at)}${session.venue_name ? `, ${session.venue_name}` : ''})`);
      await writeEventNotification(client, {
        eventId: event.id, changeId: `registration:${registration.id}`, userId: user.id,
        occurredAt: registration.registered_at,
        title: pending ? 'Registration request received' : 'Registration confirmed',
        message: pending
          ? `${event.name}, ${formatEventDates(event.starts_at, event.ends_at)}: your choice is at capacity, so the organiser will review your request for ${chosen.join('; ')}.`
          : `${event.name}, ${formatEventDates(event.starts_at, event.ends_at)}: you're registered for ${chosen.join('; ')}.`,
      });
      return {
        status: 201,
        body: {
          registration: publicRegistration({ ...registration, session_ids: sessions.map(session => session.id) }),
          event: publicEvent(event),
          sessions: sessions.map(publicSession),
        },
      };
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '55P03') throw new AccessError(409, 'Your account is being updated. Please try again.');
    if (code === '23505') return { status: 409, body: { error: "You're already registered for this event." } };
    throw error;
  }
}

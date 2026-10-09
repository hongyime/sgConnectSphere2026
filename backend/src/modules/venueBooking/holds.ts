// E06-S05 (SCRUM-49) Hold a venue tentatively.
//
// The assigned Event Coordinator holds a free venue for an approved or
// planning event (Scenario 1); a hold overlapping another live hold, a pending
// or confirmed booking, or a maintenance block is refused, naming what is in
// the way (Scenario 2). Submitting a booking request for the hold turns it into
// a pending request and stops its expiry (Scenario 3). The Coordinator can
// release it (Scenario 4). Venue Staff can move the expiry later while it is
// live (Scenario 8). Once expires_at has passed the hold no longer holds the
// venue anywhere; the expiry job marks it expired and tells the Coordinator,
// in-app and by email (Scenarios 6, 7 and 9, with the single at-expiry notice
// Bryan settled on 7 October 2026).
//
// Data: venue_bookings rows with status 'tentative' and expires_at (0013).
// "Live" means status = 'tentative' AND expires_at > now(), so a hold stops
// counting the instant it expires, whether or not the job has run yet.
// Scenario 5 (the venue's setup and turnaround buffer) follows once E05-S05's
// occupied_window() lands (#231).
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';

export const DEFAULT_HOLD_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;
export const MIN_EXPIRY_MS = HOUR_MS;
export const MAX_EXPIRY_MS = 14 * 24 * HOUR_MS;
const HOLDABLE_STATUSES = ['approved', 'planning'];
const NOT_HOLDABLE = 'Venues can only be held while an approved event is being planned.';
const NOT_FOUND = 'That tentative hold was not found.';
const EXPIRED = "This hold has expired, so it can't be changed. Place a new hold if the venue is still needed.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SQL for "this booking holds the venue": pending or confirmed, or a hold
// that hasn't expired. `now` is the SQL for the current time. 'tentative' is
// compared as text so the check also runs in the transaction that added the
// value (PostgreSQL refuses a new enum value there).
export const holdsVenue = (alias: string, now: string) =>
  `(${alias}.status IN ('pending', 'confirmed') OR (${alias}.status::text = 'tentative' AND ${alias}.expires_at > ${now}))`;

type Event = { id: string; eventCode: string | null; title: string; status: string; coordinatorId: string | null; startsAt: Date; endsAt: Date };
type Venue = { id: string; name: string };
export type Hold = {
  id: string; venueId: string; venueName: string; eventId: string; eventCode: string | null; eventTitle: string;
  startsAt: string; endsAt: string; status: 'tentative' | 'expired' | 'pending' | 'released'; expiresAt: string | null;
};

const SGT = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
export const formatSgt = (value: Date) => SGT.format(value);
const eventName = (event: { eventCode: string | null; title: string }) =>
  event.eventCode && !event.title.startsWith(event.eventCode) ? `${event.eventCode} ${event.title}` : event.title;

async function recordDenied(query: Query, user: AuthenticatedUser) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
    VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'venue_holds')`, [user.id]);
}

async function requireRole(query: Query, user: AuthenticatedUser | undefined, roles: Parameters<typeof canActAsRole>[1], message: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, roles).allowed) {
    await recordDenied(query, user);
    throw new AccessError(403, message);
  }
  return user;
}
const COORDINATOR_ONLY = 'Access denied. Only the assigned Coordinator can hold a venue for this event.';
const STAFF_ONLY = 'Access denied. Only Venue Staff can change when a hold expires.';

function eventIdentifier(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 160) throw new AccessError(400, 'An event id or code is required.');
  return id;
}
function uuid(value: unknown, what: string) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!UUID.test(id)) throw new AccessError(400, `A ${what} id is required.`);
  return id;
}

// The assigned Coordinator's event, locked while a hold on it changes: found by
// its id or code, or as the event that owns a booking.
async function lockEvent(client: PoolClient, user: AuthenticatedUser, by: { event: string } | { booking: string }) {
  const where = 'booking' in by ? 'id = (SELECT event_id FROM venue_bookings WHERE id = $1)' : 'id::text = $1 OR event_code = $1';
  const event = (await client.query<Event>(`SELECT id, event_code AS "eventCode", title, status, coordinator_id AS "coordinatorId",
      lower(event_range) AS "startsAt", upper(event_range) AS "endsAt"
    FROM events WHERE ${where} FOR NO KEY UPDATE`, ['booking' in by ? by.booking : by.event])).rows[0];
  if (!event && 'booking' in by) throw new AccessError(404, NOT_FOUND);
  if (!event || event.coordinatorId !== user.id) throw new AccessError(403, 'Access denied. This event is not assigned to you.');
  return event;
}

// Refusals are audited outside the rolled-back transaction, so the entry survives.
async function audited<T>(database: Pool, user: AuthenticatedUser, work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AccessError && error.status === 403) await recordDenied(database.query.bind(database) as Query, user);
    throw error;
  }
}

async function audit(client: PoolClient, input: { actorId: string | null; eventId: string; bookingId: string; action: string; old?: string | null; next?: string | null }) {
  await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
    VALUES ($1, 'event', $2, $2, $3, 'venue_booking', $4, $5)`,
  [input.actorId, input.eventId, input.action, input.old ?? null, input.next ?? input.bookingId]);
}

type Window = { startsAt: Date; endsAt: Date };
export function validateHoldInput(body: Record<string, unknown>, event: Window, now: Date) {
  const errors: Record<string, string[]> = {};
  const parse = (value: unknown) => (typeof value === 'string' && value ? new Date(value) : undefined);
  const start = body.starts_at === undefined ? event.startsAt : parse(body.starts_at);
  const end = body.ends_at === undefined ? event.endsAt : parse(body.ends_at);
  const startOk = start !== undefined && !Number.isNaN(start.getTime());
  if (!startOk) errors.starts_at = ['Enter when the hold starts.'];
  if (!end || Number.isNaN(end.getTime())) errors.ends_at = ['Enter when the hold ends.'];
  else if (startOk && end <= start) errors.ends_at = ['The hold must end after it starts.'];
  // T-78 (O-29): a booking, and so a hold that becomes one, lies within the event.
  else if (startOk && (start < event.startsAt || end > event.endsAt)) {
    errors.ends_at = [`The hold must fall within the event, ${formatSgt(event.startsAt)} to ${formatSgt(event.endsAt)}.`];
  }
  const expires = body.expires_at === undefined ? new Date(now.getTime() + DEFAULT_HOLD_HOURS * HOUR_MS) : parse(body.expires_at);
  const expiryError = checkExpiry(expires, now);
  if (expiryError) errors.expires_at = [expiryError];
  if (Object.keys(errors).length) return { errors };
  return { input: { startsAt: start!, endsAt: end!, expiresAt: expires! } };
}

// O-31: an expiry between 1 hour and 14 days from now.
function checkExpiry(expires: Date | undefined, now: Date) {
  if (!expires || Number.isNaN(expires.getTime())) return 'Enter when the hold expires.';
  const ahead = expires.getTime() - now.getTime();
  if (ahead < MIN_EXPIRY_MS) return 'A hold must last at least 1 hour from now.';
  if (ahead > MAX_EXPIRY_MS) return 'A hold can last at most 14 days from now.';
  return null;
}

// What is in the way of holding this venue for this period, if anything.
async function findClash(client: PoolClient, venueId: string, startsAt: Date, endsAt: Date, now: Date, ignoreBookingId: string | null) {
  const booking = (await client.query<{ status: string; eventCode: string | null; title: string; startsAt: Date; endsAt: Date }>(`
    SELECT vb.status, e.event_code AS "eventCode", e.title, lower(vb.booking_range) AS "startsAt", upper(vb.booking_range) AS "endsAt"
    FROM venue_bookings vb JOIN events e ON e.id = vb.event_id
    WHERE vb.venue_id = $1 AND ${holdsVenue('vb', '$4')}
      AND vb.booking_range && tstzrange($2, $3, '[)') AND ($5::uuid IS NULL OR vb.id <> $5)
    ORDER BY lower(vb.booking_range) LIMIT 1`, [venueId, startsAt, endsAt, now, ignoreBookingId])).rows[0];
  if (booking) {
    const kind = booking.status === 'tentative' ? 'a tentative hold' : booking.status === 'pending' ? 'a pending booking request' : 'a confirmed booking';
    return `This venue already has ${kind} for ${eventName(booking)} from ${formatSgt(booking.startsAt)} to ${formatSgt(booking.endsAt)}.`;
  }
  const block = (await client.query<{ reason: string }>(`SELECT reason FROM venue_blocks
    WHERE venue_id = $1 AND block_range && tstzrange($2, $3, '[)') LIMIT 1`, [venueId, startsAt, endsAt])).rows[0];
  return block ? `This venue is blocked for that period (${block.reason}).` : null;
}

export async function placeHold(database: Pool, user: AuthenticatedUser | undefined, body: unknown, now = new Date()) {
  const actor = await requireRole(database.query.bind(database) as Query, user, ['event_coordinator'], COORDINATOR_ONLY);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const identifier = eventIdentifier(data.event_id);
  const venueId = uuid(data.venue_id, 'venue');
  return audited(database, actor, () => inTransaction(database, async client => {
    const event = await lockEvent(client, actor, { event: identifier });
    if (!HOLDABLE_STATUSES.includes(event.status)) throw new AccessError(409, NOT_HOLDABLE);
    const valid = validateHoldInput(data, event, now);
    if (!valid.input) return { status: 400, body: { error: 'validation_failed', errors: valid.errors } };
    // Lock the venue: holds (and, once E06-S03 does the same, requests) for one
    // venue are decided one at a time, so two can't both see it free.
    const venue = (await client.query<Venue>(`SELECT id, name FROM venues WHERE id = $1 AND is_active FOR NO KEY UPDATE`, [venueId])).rows[0];
    if (!venue) throw new AccessError(404, 'That venue was not found or is no longer in use.');
    const clash = await findClash(client, venue.id, valid.input.startsAt, valid.input.endsAt, now, null);
    if (clash) return { status: 409, body: { error: clash } };
    const id = randomUUID();
    await client.query(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status, expires_at)
      VALUES ($1, $2, $3, tstzrange($4, $5, '[)'), 'tentative', $6)`,
    [id, venue.id, event.id, valid.input.startsAt, valid.input.endsAt, valid.input.expiresAt]);
    await audit(client, { actorId: actor.id, eventId: event.id, bookingId: id, action: `Tentative hold placed on ${venue.name}`, next: valid.input.expiresAt.toISOString() });
    return { status: 201, body: { hold: { id, venueId: venue.id, venueName: venue.name, status: 'tentative', expiresAt: valid.input.expiresAt.toISOString() } } };
  }));
}

type LockedHold = { id: string; eventId: string; venueId: string; venueName: string; status: string; expiresAt: Date | null; startsAt: Date; endsAt: Date };
// Locks a hold (tentative or expired); any other booking is "not found"
// unless `allow` names its status.
async function lockHold(client: PoolClient, bookingId: string, allow: string[] = []) {
  const hold = (await client.query<LockedHold>(`SELECT vb.id, vb.event_id AS "eventId", vb.venue_id AS "venueId", v.name AS "venueName",
      vb.status, vb.expires_at AS "expiresAt", lower(vb.booking_range) AS "startsAt", upper(vb.booking_range) AS "endsAt"
    FROM venue_bookings vb JOIN venues v ON v.id = vb.venue_id
    WHERE vb.id = $1 FOR UPDATE OF vb`, [bookingId])).rows[0];
  if (!hold || !['tentative', 'expired', ...allow].includes(hold.status)) throw new AccessError(404, NOT_FOUND);
  return hold;
}
const isLive = (hold: LockedHold, now: Date) => hold.status === 'tentative' && hold.expiresAt !== null && hold.expiresAt > now;

// Scenario 3 (O-32, T-78): submitting the booking request completes the hold.
// The same row becomes pending. A retry after success returns the booking
// again with no second audit entry (docs/contracts/venue-bookings.md, #244).
export async function convertHold(database: Pool, user: AuthenticatedUser | undefined, body: unknown, now = new Date()) {
  const actor = await requireRole(database.query.bind(database) as Query, user, ['event_coordinator'], COORDINATOR_ONLY);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const bookingId = uuid(data.booking_id, 'booking');
  return audited(database, actor, () => inTransaction(database, async client => {
    const event = await lockEvent(client, actor, { booking: bookingId });
    const hold = await lockHold(client, bookingId, ['pending']);
    if (hold.status === 'pending') return { status: 200, body: { booking: { id: hold.id, status: 'pending' } } };
    if (!HOLDABLE_STATUSES.includes(event.status)) throw new AccessError(409, NOT_HOLDABLE);
    if (!isLive(hold, now)) throw new AccessError(409, EXPIRED);
    await client.query(`UPDATE venue_bookings SET status = 'pending', expires_at = NULL WHERE id = $1`, [hold.id]);
    await audit(client, { actorId: actor.id, eventId: event.id, bookingId: hold.id, action: `Tentative hold on ${hold.venueName} submitted as a booking request` });
    return { status: 200, body: { booking: { id: hold.id, status: 'pending' } } };
  }));
}

// Scenario 4: the period returns to Free.
export async function releaseHold(database: Pool, user: AuthenticatedUser | undefined, body: unknown) {
  const actor = await requireRole(database.query.bind(database) as Query, user, ['event_coordinator'], COORDINATOR_ONLY);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const bookingId = uuid(data.booking_id, 'booking');
  return audited(database, actor, () => inTransaction(database, async client => {
    const event = await lockEvent(client, actor, { booking: bookingId });
    const hold = await lockHold(client, bookingId);
    if (hold.status === 'expired') throw new AccessError(409, EXPIRED);
    await client.query(`UPDATE venue_bookings SET status = 'released', expires_at = NULL WHERE id = $1`, [hold.id]);
    await audit(client, { actorId: actor.id, eventId: event.id, bookingId: hold.id, action: `Tentative hold on ${hold.venueName} released` });
    return { status: 200, body: { released: true } };
  }));
}

// Scenario 8 (O-34): Venue Staff move a live hold's expiry later; logged with who did it.
export async function extendHold(database: Pool, user: AuthenticatedUser | undefined, body: unknown, now = new Date()) {
  const actor = await requireRole(database.query.bind(database) as Query, user, ['venue_staff'], STAFF_ONLY);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const bookingId = uuid(data.booking_id, 'booking');
  const expires = typeof data.expires_at === 'string' && data.expires_at ? new Date(data.expires_at) : undefined;
  return inTransaction(database, async client => {
    const hold = await lockHold(client, bookingId);
    if (!isLive(hold, now)) throw new AccessError(409, EXPIRED);
    const error = checkExpiry(expires, now) ?? (expires! <= hold.expiresAt! ? 'Choose a later expiry than the current one.' : null);
    if (error) return { status: 400, body: { error: 'validation_failed', errors: { expires_at: [error] } } };
    await client.query(`UPDATE venue_bookings SET expires_at = $2 WHERE id = $1`, [hold.id, expires]);
    await audit(client, { actorId: actor.id, eventId: hold.eventId, bookingId: hold.id, action: `Tentative hold on ${hold.venueName} extended`,
      old: hold.expiresAt!.toISOString(), next: expires!.toISOString() });
    return { status: 200, body: { hold: { id: hold.id, expiresAt: expires!.toISOString() } } };
  });
}

// Scenarios 6, 7 and 9: mark holds whose expiry has passed as expired and tell
// their Coordinator once. Run by the scheduled job; `now` is injectable so the
// exact boundary (expires_at <= now) can be tested.
export async function expireHolds(database: Pool, now = new Date()) {
  return inTransaction(database, async client => {
    const expired = (await client.query<{ id: string; eventId: string; eventCode: string | null; title: string; coordinatorId: string | null; venueName: string; expiresAt: Date }>(`
      UPDATE venue_bookings vb SET status = 'expired'
      FROM events e, venues v
      WHERE vb.status = 'tentative' AND vb.expires_at <= $1 AND e.id = vb.event_id AND v.id = vb.venue_id
      RETURNING vb.id, vb.event_id AS "eventId", e.event_code AS "eventCode", e.title, e.coordinator_id AS "coordinatorId",
        v.name AS "venueName", vb.expires_at AS "expiresAt"`, [now])).rows;
    let notified = 0;
    for (const hold of expired) {
      await audit(client, { actorId: null, eventId: hold.eventId, bookingId: hold.id, action: `Tentative hold on ${hold.venueName} expired` });
      if (!hold.coordinatorId) continue;
      const written = await writeEventNotification(client, {
        eventId: hold.eventId, changeId: `${hold.id}:expired`, userId: hold.coordinatorId, occurredAt: now,
        title: 'Tentative hold expired',
        message: `Your tentative hold on ${hold.venueName} for ${eventName(hold)} expired at ${formatSgt(hold.expiresAt)}. The venue is free for other requests.`,
      });
      if (written) notified += 1;
    }
    return { holdsExpired: expired.length, notified };
  });
}

const holdSelect = (now: string) => `SELECT vb.id, vb.venue_id AS "venueId", v.name AS "venueName", vb.event_id AS "eventId",
    e.event_code AS "eventCode", e.title AS "eventTitle", lower(vb.booking_range) AS "startsAt", upper(vb.booking_range) AS "endsAt",
    CASE WHEN vb.status = 'tentative' AND vb.expires_at <= ${now} THEN 'expired' ELSE vb.status::text END AS status,
    vb.expires_at AS "expiresAt"
  FROM venue_bookings vb JOIN venues v ON v.id = vb.venue_id JOIN events e ON e.id = vb.event_id`;

// The assigned Coordinator's live and expired holds for one event.
export async function listEventHolds(query: Query, user: AuthenticatedUser | undefined, identifier: unknown, now = new Date()) {
  const actor = await requireRole(query, user, ['event_coordinator'], COORDINATOR_ONLY);
  const id = eventIdentifier(identifier);
  const event = (await query<Event>(`SELECT id, event_code AS "eventCode", title, status, coordinator_id AS "coordinatorId",
      lower(event_range) AS "startsAt", upper(event_range) AS "endsAt" FROM events WHERE id::text = $1 OR event_code = $1`, [id])).rows[0];
  if (!event || event.coordinatorId !== actor.id) {
    await recordDenied(query, actor);
    throw new AccessError(403, 'Access denied. This event is not assigned to you.');
  }
  const holds = (await query<Hold>(`${holdSelect('$2')} WHERE vb.event_id = $1 AND vb.status IN ('tentative', 'expired')
    ORDER BY lower(vb.booking_range), v.name`, [event.id, now])).rows;
  return { event: { id: event.id, eventCode: event.eventCode, title: event.title, status: event.status,
    startsAt: event.startsAt, endsAt: event.endsAt }, holds, canHold: HOLDABLE_STATUSES.includes(event.status) };
}

// Venue Staff: every live hold, soonest expiry first, to extend from.
export async function listLiveHolds(query: Query, user: AuthenticatedUser | undefined, now = new Date()) {
  await requireRole(query, user, ['venue_staff'], STAFF_ONLY);
  const holds = (await query<Hold>(`${holdSelect('$1')} WHERE vb.status = 'tentative' AND vb.expires_at > $1
    ORDER BY vb.expires_at, v.name`, [now])).rows;
  return { holds };
}

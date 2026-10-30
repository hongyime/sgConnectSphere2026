// SCRUM-242: E08-S04 Scenario 4, Venue Staff reconfirm a Confirmed booking
// flagged requires_reconfirmation, against a real, disposable PostgreSQL
// schema with every repository migration applied.
//
// Proves what venueBookingDecisions.test.ts's stubs cannot: the booking really
// moves to its Session's current time and the flag is cleared, the new time is
// checked against other bookings, blocks and the 0016 guard, the audit row and
// the Coordinator's notice are written in the same transaction, and two Venue
// Staff reconfirming at once cannot both succeed.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { listBookingsToReconfirm, NOTHING_TO_RECONFIRM, ONLY_CONFIRMED_RECONFIRMED, reconfirmBooking } from '../src/modules/venueBooking/decisions.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

const OLD = '[2027-01-15T10:00:00+08:00,2027-01-15T12:00:00+08:00)';
const NEW = '[2027-01-20T10:00:00+08:00,2027-01-20T12:00:00+08:00)';

async function fixture() {
  const f = await loginDatabase();
  const ids = { org: randomUUID(), organiser: randomUUID(), staff: randomUUID(), staffB: randomUUID(), coordinator: randomUUID(), venue: randomUUID() };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, org, name] of [
    [ids.organiser, 'event_organiser', ids.org, 'Organiser A'], [ids.staff, 'venue_staff', null, 'Venue Staff A'],
    [ids.staffB, 'venue_staff', null, 'Venue Staff B'], [ids.coordinator, 'event_coordinator', null, 'Coordinator A'],
  ] as const) {
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', $4, $5)`, [id, org, `${id}@example.test`, name, role]);
  }
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
    VALUES ($1, 'Small Room', 'Test wing', 300, '08:00', '22:00')`, [ids.venue]);
  const user = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser =>
    ({ id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0 });
  const staff = user(ids.staff, 'venue_staff');
  const staffB = user(ids.staffB, 'venue_staff');
  const coordinator = user(ids.coordinator, 'event_coordinator');
  const query: Query = (sql, values) => f.pool.query(sql, values);

  // A Confirmed booking on the event's sole Session, flagged after the event
  // moved from 15 to 20 January (as an E10-S02 date change leaves it).
  async function newVenue(name: string) {
    const id = randomUUID();
    await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
      VALUES ($1, $2, 'Test wing', 300, '08:00', '22:00')`, [id, name]);
    return id;
  }
  async function flaggedBooking(code = 'EVT-6001', venue = ids.venue, status = 'planning') {
    const eventId = randomUUID();
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, $4, $5, 'Product Expo 2026', $6, $7::tstzrange, 150)`,
    [eventId, code, ids.organiser, ids.coordinator, ids.org, status, OLD]);
    const session = (await f.pool.query<{ id: string }>('SELECT id FROM sessions WHERE event_id = $1', [eventId])).rows[0]!.id;
    const bookingId = (await f.pool.query<{ id: string }>(`INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary, requires_reconfirmation)
      VALUES ($1, $2, $3, $4::tstzrange, 'confirmed', true, true) RETURNING id`, [venue, eventId, session, OLD])).rows[0]!.id;
    await f.pool.query('UPDATE events SET event_range = $2::tstzrange WHERE id = $1', [eventId, NEW]);
    return { eventId, bookingId, session };
  }
  const booking = async (bookingId: string) => (await f.pool.query<{ range: string; flagged: boolean }>(
    `SELECT booking_range = $2::tstzrange AS on_new, booking_range::text AS range, requires_reconfirmation AS flagged
     FROM venue_bookings WHERE id = $1`, [bookingId, NEW])).rows[0]! as { range: string; flagged: boolean; on_new: boolean };
  const audits = async (bookingId: string) => (await f.pool.query<{ actor_id: string; action: string; field_changed: string; old_value: string; new_value: string }>(
    `SELECT actor_id, action, field_changed, old_value, new_value FROM audit_logs WHERE entity_id = $1 ORDER BY occurred_at, id`, [bookingId])).rows;
  const notices = async (eventId: string) => (await f.pool.query<{ user_id: string; title: string; message: string; delivery_id: string | null }>(
    `SELECT n.user_id, n.title, n.message, d.id AS delivery_id FROM notifications n
     LEFT JOIN notification_deliveries d ON d.notification_id = n.id WHERE n.event_id = $1 ORDER BY n.created_at, n.id`, [eventId])).rows;
  return { ...f, ids, staff, staffB, coordinator, query, newVenue, flaggedBooking, booking, audits, notices };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

test('reconfirming moves the booking to its Session time, clears the flag, logs it and tells the Coordinator once', () => withFixture(async f => {
  const { eventId, bookingId, session } = await f.flaggedBooking();
  assert.equal((await f.query<{ range: string }>('SELECT session_range = $2::tstzrange AS moved FROM sessions WHERE id = $1', [session, NEW])).rows[0]!.moved, true,
    'the sole Session followed the event (0014)');
  assert.deepEqual((await listBookingsToReconfirm(f.query, f.staff)).bookings.map(row => row.id), [bookingId]);

  const result = await reconfirmBooking(f.pool, f.staff, bookingId);

  assert.equal(result.status, 200);
  const body = result.body as { booking: { requiresReconfirmation: boolean; startsAt: string }; coordinatorNotified: boolean };
  assert.equal(body.booking.requiresReconfirmation, false);
  assert.equal(body.booking.startsAt, '2027-01-20T02:00:00.000Z');
  assert.equal(body.coordinatorNotified, true);
  const stored = await f.booking(bookingId);
  assert.equal(stored.flagged, false);
  assert.equal(stored.on_new, true, `booking moved to the new time, got ${stored.range}`);
  assert.deepEqual((await f.audits(bookingId)).map(row => [row.actor_id, row.action, row.field_changed, row.old_value, row.new_value]),
    [[f.ids.staff, 'Booking Reconfirmed', 'requires_reconfirmation', 'true', 'false']]);
  const sent = await f.notices(eventId);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.user_id, f.ids.coordinator);
  assert.equal(sent[0]!.title, 'Venue booking reconfirmed');
  assert.match(sent[0]!.message, /^Venue Staff A reconfirmed Small Room for "Product Expo 2026" \(.*20.*Jan.*2027.*\)\. It no longer needs reconfirmation\.$/);
  assert.ok(sent[0]!.delivery_id, 'an email delivery is queued with the in-app notice');
  assert.deepEqual((await listBookingsToReconfirm(f.query, f.staff)).bookings, [], 'no longer waiting');
}));

test('reconfirming is refused when another booking holds the venue at the new time, and nothing changes', () => withFixture(async f => {
  const { eventId, bookingId } = await f.flaggedBooking();
  const other = randomUUID();
  await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
    VALUES ($1, 'EVT-6099', $2, $3, $4, 'Gala Dinner', 'planning', $5::tstzrange, 80)`, [other, f.ids.organiser, f.ids.coordinator, f.ids.org, NEW]);
  await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, 'confirmed')`, [f.ids.venue, other, NEW]);

  const result = await reconfirmBooking(f.pool, f.staff, bookingId);

  assert.equal(result.status, 409);
  assert.match((result.body as { error: string }).error, /^This can't be reconfirmed: with setup and turnaround time it overlaps the confirmed booking for "EVT-6099 Gala Dinner"/);
  const stored = await f.booking(bookingId);
  assert.deepEqual([stored.flagged, stored.on_new], [true, false], 'still flagged, still on the old time');
  assert.deepEqual(await f.audits(bookingId), []);
  assert.deepEqual(await f.notices(eventId), []);
}));

test('reconfirming is refused when a maintenance block covers the new time', () => withFixture(async f => {
  const { bookingId } = await f.flaggedBooking();
  await f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason, created_by) VALUES ($1, $2::tstzrange, 'Roof repair', $3)`,
    [f.ids.venue, NEW, f.ids.staff]);
  const result = await reconfirmBooking(f.pool, f.staff, bookingId);
  assert.equal(result.status, 409);
  assert.match((result.body as { error: string }).error, /^This can't be reconfirmed: Small Room is blocked for "Roof repair"/);
  assert.equal((await f.booking(bookingId)).flagged, true);
}));

test('only a flagged Confirmed booking on an open event is reconfirmed, and only by Venue Staff', () => withFixture(async f => {
  const { bookingId } = await f.flaggedBooking();
  await assert.rejects(reconfirmBooking(f.pool, f.coordinator, bookingId), { status: 403 });
  assert.equal((await f.query<{ n: number }>(`SELECT count(*)::int AS n FROM audit_logs WHERE actor_id = $1 AND action = 'Access Denied'`, [f.ids.coordinator])).rows[0]!.n, 1);

  await f.pool.query('UPDATE venue_bookings SET requires_reconfirmation = false WHERE id = $1', [bookingId]);
  assert.deepEqual(await reconfirmBooking(f.pool, f.staff, bookingId), { status: 409, body: { error: NOTHING_TO_RECONFIRM } });

  const pending = await f.flaggedBooking('EVT-6002', await f.newVenue('Room B'));
  await f.pool.query(`UPDATE venue_bookings SET status = 'pending', is_primary = false WHERE id = $1`, [pending.bookingId]);
  assert.deepEqual(await reconfirmBooking(f.pool, f.staff, pending.bookingId), { status: 409, body: { error: ONLY_CONFIRMED_RECONFIRMED } });

  const cancelled = await f.flaggedBooking('EVT-6003', await f.newVenue('Room C'));
  await f.pool.query(`UPDATE events SET status = 'cancelled' WHERE id = $1`, [cancelled.eventId]);
  assert.equal((await reconfirmBooking(f.pool, f.staff, cancelled.bookingId)).status, 409);
  assert.deepEqual((await listBookingsToReconfirm(f.query, f.staff)).bookings, [], 'a cancelled event is not listed; the others are not flagged');
  assert.equal((await reconfirmBooking(f.pool, f.staff, randomUUID())).status, 404);
}));

test('two Venue Staff reconfirming the same booking at once: one succeeds, the other is told nothing is left', () => withFixture(async f => {
  const { eventId, bookingId } = await f.flaggedBooking();
  const results = await Promise.all([reconfirmBooking(f.pool, f.staff, bookingId), reconfirmBooking(f.pool, f.staffB, bookingId)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal((results.find(result => result.status === 409)!.body as { error: string }).error, NOTHING_TO_RECONFIRM);
  assert.equal((await f.audits(bookingId)).length, 1);
  assert.equal((await f.notices(eventId)).length, 1);
}));

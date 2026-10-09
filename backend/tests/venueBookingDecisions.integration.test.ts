// SCRUM-48: E06-S04 "Decide on a venue booking request" against a real,
// disposable PostgreSQL schema with every repository migration applied.
//
// Proves what venueBookingDecisions.test.ts's stubs cannot: the decision is
// stored, the E05-S03 calendar shows the confirmed booking, the Coordinator
// really receives one in-app notice with an email delivery job, the audit
// entry is written in the same transaction, and two Venue Staff deciding at
// the same moment cannot both win.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { decideBooking, getBooking, listPendingBookings } from '../src/modules/venueBooking/decisions.js';
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

const REASON = 'Capacity too small for expected attendance';

type DecisionBody = {
  booking: { id: string; status: string; decisionReason: string | null; suggestedVenue: { id: string; name: string } | null; decidedBy: string | null; decidedAt: string | null };
  coordinatorNotified: boolean;
};

async function fixture() {
  const f = await loginDatabase();
  const ids = {
    org: randomUUID(), organiser: randomUUID(), staff: randomUUID(), staffB: randomUUID(), coordinator: randomUUID(),
    venue: randomUUID(), alternative: randomUUID(), retired: randomUUID(),
  };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, org, name] of [
    [ids.organiser, 'event_organiser', ids.org, 'Organiser A'], [ids.staff, 'venue_staff', null, 'Venue Staff A'],
    [ids.staffB, 'venue_staff', null, 'Venue Staff B'], [ids.coordinator, 'event_coordinator', null, 'Coordinator A'],
  ] as const) {
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', $4, $5)`, [id, org, `${id}@example.test`, name, role]);
  }
  for (const [id, name, active] of [
    [ids.venue, 'Small Room', true], [ids.alternative, 'Riverside Hall', true], [ids.retired, 'Old Annex', false],
  ] as const) {
    await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at, is_active)
      VALUES ($1, $2, 'Test wing', 300, '08:00', '22:00', $3)`, [id, name, active]);
  }

  const user = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser =>
    ({ id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0 });
  const staff = user(ids.staff, 'venue_staff');
  const staffB = user(ids.staffB, 'venue_staff');
  const coordinator = user(ids.coordinator, 'event_coordinator');
  const query: Query = (sql, values) => f.pool.query(sql, values);

  // A Planning event with a Pending request for Small Room on 15 Jan 2027, 10:00-12:00 SGT.
  async function pendingRequest(code = 'EVT-5001') {
    const eventId = randomUUID();
    const bookingId = randomUUID();
    const range = '[2027-01-15T10:00:00+08:00,2027-01-15T12:00:00+08:00)';
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, $4, $5, 'Product Expo 2026', 'planning', $6::tstzrange, 150)`,
    [eventId, code, ids.organiser, ids.coordinator, ids.org, range]);
    await f.pool.query(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status) VALUES ($1, $2, $3, $4::tstzrange, 'pending')`,
      [bookingId, ids.venue, eventId, range]);
    return { eventId, bookingId };
  }

  const now = async () => (await f.pool.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
  const row = async (bookingId: string) => (await f.pool.query<{
    status: string; decision_reason: string | null; suggested_venue_id: string | null; decided_by: string | null; decided_at: Date | null;
  }>('SELECT status, decision_reason, suggested_venue_id, decided_by, decided_at FROM venue_bookings WHERE id = $1', [bookingId])).rows[0]!;
  const audits = async (bookingId: string) => (await f.pool.query<{
    actor_id: string; entity_type: string; event_id: string; action: string; old_value: string; new_value: string; occurred_at: Date;
  }>(`SELECT actor_id, entity_type, event_id, action, old_value, new_value, occurred_at FROM audit_logs
      WHERE entity_id = $1 ORDER BY occurred_at, id`, [bookingId])).rows;
  const notices = async (eventId: string) => (await f.pool.query<{ user_id: string; title: string; message: string; delivery_id: string | null }>(
    `SELECT n.user_id, n.title, n.message, d.id AS delivery_id FROM notifications n
     LEFT JOIN notification_deliveries d ON d.notification_id = n.id WHERE n.event_id = $1 ORDER BY n.created_at, n.id`, [eventId])).rows;

  return { ...f, ids, staff, staffB, coordinator, query, pendingRequest, now, row, audits, notices };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

function within(time: Date, from: Date, to: Date) {
  assert.ok(time >= from && time <= to, `${time.toISOString()} is outside ${from.toISOString()} to ${to.toISOString()}`);
}

test('TC_E06S04_01: approving a pending request confirms it, updates the calendar and notifies the Coordinator once', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();

  const result = await decideBooking(f.pool, f.staff, bookingId, { decision: 'approve' });

  assert.equal(result.status, 200);
  const body = result.body as DecisionBody;
  assert.equal(body.booking.status, 'confirmed');
  assert.equal(body.booking.decidedBy, 'Venue Staff A');
  assert.equal(body.coordinatorNotified, true);
  const stored = await f.row(bookingId);
  assert.deepEqual([stored.status, stored.decision_reason, stored.suggested_venue_id, stored.decided_by], ['confirmed', null, null, f.ids.staff]);
  assert.ok(stored.decided_at);

  const calendar = await getVenueCalendar(f.query, f.staff, f.ids.venue, '2027-01-15', '2027-01-15');
  assert.deepEqual(calendar.entries.filter(entry => entry.kind === 'booking').map(entry => entry.state), ['confirmed']);

  const sent = await f.notices(eventId);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.user_id, f.ids.coordinator);
  assert.equal(sent[0]!.title, 'Venue booking approved');
  assert.match(sent[0]!.message, /^Venue Staff A approved your request for Small Room for "Product Expo 2026" \(15 Jan 2027, 10:00 am – 12:00 pm\)\. The booking is now Confirmed\.$/);
  assert.ok(sent[0]!.delivery_id, 'an email delivery job is queued');
}));

test('TC_E06S04_02: rejecting with a reason and an alternative venue tells the Coordinator both', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();

  const result = await decideBooking(f.pool, f.staff, bookingId,
    { decision: 'reject', reason: `  ${REASON}  `, suggested_venue_id: f.ids.alternative });

  assert.equal(result.status, 200);
  const body = result.body as DecisionBody;
  assert.equal(body.booking.status, 'rejected');
  assert.equal(body.booking.decisionReason, REASON);
  assert.deepEqual(body.booking.suggestedVenue, { id: f.ids.alternative, name: 'Riverside Hall' });
  assert.deepEqual(Object.values(await f.row(bookingId)).slice(0, 4), ['rejected', REASON, f.ids.alternative, f.ids.staff]);

  const sent = await f.notices(eventId);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.title, 'Venue booking rejected');
  assert.match(sent[0]!.message, /Venue Staff A rejected your request for Small Room/);
  assert.match(sent[0]!.message, new RegExp(`Reason: ${REASON}`));
  assert.match(sent[0]!.message, /Suggested alternative: Riverside Hall$/);
}));

test('TC_E06S04_02: a rejection without a suggested venue says nothing about an alternative', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();
  const result = await decideBooking(f.pool, f.staff, bookingId, { decision: 'reject', reason: REASON, suggested_venue_id: '' });
  assert.equal(result.status, 200);
  assert.equal((result.body as DecisionBody).booking.suggestedVenue, null);
  assert.doesNotMatch((await f.notices(eventId))[0]!.message, /Suggested alternative/);
}));

test('TC_E06S04_03: a rejection without a reason is blocked and nothing changes', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();
  for (const reason of [undefined, '', '   ']) {
    const result = await decideBooking(f.pool, f.staff, bookingId, { decision: 'reject', reason });
    assert.equal(result.status, 400);
    assert.deepEqual((result.body as { errors: Record<string, string[]> }).errors.reason, ['Add a reason for rejecting this request.']);
  }
  assert.equal((await f.row(bookingId)).status, 'pending');
  assert.deepEqual(await f.audits(bookingId), []);
  assert.deepEqual(await f.notices(eventId), []);
}));

test('TC_E06S04_05: an approval is recorded with the actor, action, booking, event and time', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();
  const before = await f.now();
  await decideBooking(f.pool, f.staff, bookingId, { decision: 'approve' });
  const after = await f.now();

  const [entry, ...rest] = await f.audits(bookingId);
  assert.equal(rest.length, 0);
  assert.deepEqual([entry!.actor_id, entry!.entity_type, entry!.event_id, entry!.action, entry!.old_value, entry!.new_value],
    [f.ids.staff, 'venue_booking', eventId, 'Booking Approved', 'pending', 'confirmed']);
  within(entry!.occurred_at, before, after);
}));

test('TC_E06S04_06: a rejection is recorded with the actor, action, booking, event and time', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();
  const before = await f.now();
  await decideBooking(f.pool, f.staff, bookingId, { decision: 'reject', reason: 'Venue unavailable for maintenance' });
  const after = await f.now();

  const [entry, ...rest] = await f.audits(bookingId);
  assert.equal(rest.length, 0);
  assert.deepEqual([entry!.actor_id, entry!.entity_type, entry!.event_id, entry!.action, entry!.old_value, entry!.new_value],
    [f.ids.staff, 'venue_booking', eventId, 'Booking Rejected', 'pending', 'rejected']);
  within(entry!.occurred_at, before, after);
}));

test('only Venue Staff can decide; a refusal is audited and leaves the request pending', () => withFixture(async f => {
  const { bookingId } = await f.pendingRequest();
  await assert.rejects(decideBooking(f.pool, f.coordinator, bookingId, { decision: 'approve' }), { status: 403 });
  await assert.rejects(listPendingBookings(f.query, f.coordinator), { status: 403 });
  await assert.rejects(decideBooking(f.pool, undefined, bookingId, { decision: 'approve' }), { status: 401 });
  assert.equal((await f.row(bookingId)).status, 'pending');
  const denials = await f.pool.query(`SELECT actor_id, new_value FROM audit_logs WHERE action = 'Access Denied' ORDER BY occurred_at`);
  assert.deepEqual(denials.rows.map(r => [r.actor_id, r.new_value]),
    [[f.ids.coordinator, 'venue_bookings'], [f.ids.coordinator, 'venue_bookings']]);
}));

test('a decided request cannot be decided again', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();
  await decideBooking(f.pool, f.staff, bookingId, { decision: 'approve' });
  const again = await decideBooking(f.pool, f.staff, bookingId, { decision: 'reject', reason: REASON });
  assert.equal(again.status, 409);
  assert.equal((await f.row(bookingId)).status, 'confirmed');
  assert.equal((await f.audits(bookingId)).length, 1);
  assert.equal((await f.notices(eventId)).length, 1);
}));

test('two Venue Staff deciding the same request at once: one decision wins, the other is refused', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest();
  const results = await Promise.all([
    decideBooking(f.pool, f.staff, bookingId, { decision: 'approve' }),
    decideBooking(f.pool, f.staffB, bookingId, { decision: 'reject', reason: REASON }),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal((await f.audits(bookingId)).length, 1);
  assert.equal((await f.notices(eventId)).length, 1);
}));

test('the suggested venue must be a different, active venue', () => withFixture(async f => {
  const { bookingId } = await f.pendingRequest();
  for (const [suggested, message] of [
    [f.ids.venue, 'Suggest a different venue from the one requested.'],
    [f.ids.retired, 'Choose an active venue from the list.'],
    [randomUUID(), 'Choose an active venue from the list.'],
  ]) {
    const result = await decideBooking(f.pool, f.staff, bookingId, { decision: 'reject', reason: REASON, suggested_venue_id: suggested });
    assert.equal(result.status, 400);
    assert.deepEqual((result.body as { errors: Record<string, string[]> }).errors.suggested_venue_id, [message]);
  }
  assert.equal((await f.row(bookingId)).status, 'pending');
}));

test('an unknown booking is not found', () => withFixture(async f => {
  const result = await decideBooking(f.pool, f.staff, randomUUID(), { decision: 'approve' });
  assert.equal(result.status, 404);
  await assert.rejects(getBooking(f.query, f.staff, randomUUID()), { status: 404 });
}));

test('Venue Staff see pending requests, soonest first, and each booking with its decision', () => withFixture(async f => {
  const first = await f.pendingRequest('EVT-5001');
  const decided = await f.pendingRequest('EVT-5002');
  await f.pool.query(`UPDATE venue_bookings SET booking_range = '[2027-02-01T10:00:00+08:00,2027-02-01T12:00:00+08:00)' WHERE id = $1`, [decided.bookingId]);
  await decideBooking(f.pool, f.staff, decided.bookingId, { decision: 'reject', reason: REASON, suggested_venue_id: f.ids.alternative });

  const list = await listPendingBookings(f.query, f.staff);
  assert.deepEqual(list.bookings.map(booking => booking.id), [first.bookingId]);
  assert.deepEqual([list.bookings[0]!.venue.name, list.bookings[0]!.event.code, list.bookings[0]!.event.coordinatorName],
    ['Small Room', 'EVT-5001', 'Coordinator A']);

  const { booking } = await getBooking(f.query, f.staff, decided.bookingId);
  assert.deepEqual([booking.status, booking.decisionReason, booking.suggestedVenue?.name, booking.decidedBy],
    ['rejected', REASON, 'Riverside Hall', 'Venue Staff A']);
}));

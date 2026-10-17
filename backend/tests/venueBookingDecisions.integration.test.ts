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
import { submitBooking } from '../src/modules/venueBooking/bookingSubmission.js';
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import { getAssignedEvent } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { listEventActivity, type Query } from '../src/modules/eventVisibility/service.js';
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

  // A Planning event with a Pending request for Small Room, 10:00-12:00 SGT on the given day.
  async function pendingRequest(code = 'EVT-5001', day = '2027-01-15', from = '10:00', to = '12:00', title = 'Product Expo 2026') {
    const eventId = randomUUID();
    const bookingId = randomUUID();
    const range = `[${day}T${from}:00+08:00,${day}T${to}:00+08:00)`;
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, $4, $5, $6, 'planning', $7::tstzrange, 150)`,
    [eventId, code, ids.organiser, ids.coordinator, ids.org, title, range]);
    await f.pool.query(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status) VALUES ($1, $2, $3, $4::tstzrange, 'pending')`,
      [bookingId, ids.venue, eventId, range]);
    return { eventId, bookingId };
  }

  const now = async () => (await f.pool.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
  const row = async (bookingId: string) => (await f.pool.query<{
    status: string; decision_reason: string | null; suggested_venue_id: string | null; decided_by: string | null;
    decided_at: Date | null; approval_conflict_booking_id: string | null;
  }>('SELECT status, decision_reason, suggested_venue_id, decided_by, decided_at, approval_conflict_booking_id FROM venue_bookings WHERE id = $1', [bookingId])).rows[0]!;
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

async function withRawOverlapFixture<T>(f: Fixture, work: () => Promise<T>): Promise<T> {
  // Canonical TC_E06S06_01–03 and _05 describe raw overlaps, while the schema
  // already rejects creating those active rows. Seed only the impossible
  // precondition in this disposable schema, then restore the live buffered
  // write guard before exercising approval. The exclusion is not restored
  // because these deliberately overlapping rows remain until this schema drops.
  await f.pool.query('ALTER TABLE venue_bookings DROP CONSTRAINT venue_bookings_no_active_overlap');
  await f.pool.query('ALTER TABLE venue_bookings DISABLE TRIGGER venue_buffer_write_guard');
  try { return await work(); }
  finally { await f.pool.query('ALTER TABLE venue_bookings ENABLE TRIGGER venue_buffer_write_guard'); }
}

type ActivityRow = { action: string; entity_type: string; venue_name: string | null; actor_name: string | null; old_value: string | null; new_value: string | null };

// T-75: the assigned Coordinator reads the decision in the event Activity log;
// the Organiser's view of the same log leaves booking decisions out.
async function activityEntries(f: Fixture, eventId: string) {
  const coordinatorView = (await getAssignedEvent(f.pool, f.coordinator, eventId)).activityLog as ActivityRow[];
  const organiserView = (await listEventActivity(f.query, eventId)).rows as ActivityRow[];
  return { coordinatorView, organiserView };
}

// O-30 (docs/contracts/venue-bookings.md): the first Confirmed booking becomes
// the event's primary venue. An event may hold several venues (C-67, T-68).
async function secondVenueRequest(f: Fixture, eventId: string, day: string) {
  const bookingId = randomUUID();
  await f.pool.query(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status)
    VALUES ($1, $2, $3, $4::tstzrange, 'pending')`,
  [bookingId, f.ids.alternative, eventId, `[${day}T10:00:00+08:00,${day}T12:00:00+08:00)`]);
  return bookingId;
}

const primaries = async (f: Fixture, eventId: string) => (await f.pool.query<{ id: string }>(
  'SELECT id FROM venue_bookings WHERE event_id = $1 AND is_primary', [eventId])).rows.map(r => r.id);

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

// Scenario 2 across E06-S04 and E06-S03: the Coordinator follows the
// suggestion through the shared submission service (replaces_booking_id,
// #274) without a new search; the original stays Rejected (T-96).
test('TC_E06S04_02: the Coordinator switches to the suggested venue in one step, and Venue Staff can approve it', () => withFixture(async f => {
  const { eventId, bookingId } = await f.pendingRequest('EVT-5301', '2027-02-08');
  await decideBooking(f.pool, f.staff, bookingId, { decision: 'reject', reason: REASON, suggested_venue_id: f.ids.alternative });

  const switched = await submitBooking(f.pool, f.coordinator, {
    event_id: eventId, venue_id: f.ids.alternative, replaces_booking_id: bookingId,
    starts_at: '2027-02-08T10:00:00+08:00', ends_at: '2027-02-08T12:00:00+08:00',
  }, randomUUID(), { resolveVenueStaff: async () => [f.ids.staff] });

  assert.equal(switched.status, 201);
  const replacement = (switched.body as { booking: { id: string; status: string; venue_id: string; replaces_booking_id: string } }).booking;
  assert.deepEqual([replacement.status, replacement.venue_id, replacement.replaces_booking_id], ['pending', f.ids.alternative, bookingId]);
  assert.equal((await f.row(bookingId)).status, 'rejected');
  assert.deepEqual((await listPendingBookings(f.query, f.staff)).bookings.map(booking => [booking.id, booking.venue.name]),
    [[replacement.id, 'Riverside Hall']]);

  const approved = await decideBooking(f.pool, f.staff, replacement.id, { decision: 'approve' });
  assert.equal(approved.status, 200);
  assert.deepEqual([(await f.row(replacement.id)).status, (await primaries(f, eventId))], ['confirmed', [replacement.id]]);
}));

// TC_E06S02_04 across E06-S03 and E06-S04: an unsuitable venue may still be
// requested; Venue Staff see the advisory result saved at submission when
// deciding, and it never blocks approval.
test('TC_E06S02_04: an unsuitable request is accepted, Venue Staff see its advisory unmet requirements, and can approve it', () => withFixture(async f => {
  const { eventId } = await f.pendingRequest('EVT-5401', '2027-02-09');
  const smallRoom = randomUUID();
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at, is_active)
    VALUES ($1, 'Box Room', 'Test wing', 20, '08:00', '22:00', true)`, [smallRoom]);

  const submitted = await submitBooking(f.pool, f.coordinator, {
    event_id: eventId, venue_id: smallRoom, starts_at: '2027-02-09T10:00:00+08:00', ends_at: '2027-02-09T12:00:00+08:00',
  }, randomUUID(), { resolveVenueStaff: async () => [f.ids.staff] });
  assert.equal(submitted.status, 201);
  const requestId = (submitted.body as { booking: { id: string } }).booking.id;

  const listed = (await listPendingBookings(f.query, f.staff)).bookings.find(booking => booking.id === requestId)!;
  const { booking } = await getBooking(f.query, f.staff, requestId);
  for (const view of [listed, booking]) {
    assert.ok(view.advisoryMismatches && view.advisoryMismatches.length > 0, 'the saved advisory result reaches Venue Staff');
    assert.ok(view.advisoryMismatches.some(message => /Capacity 20/.test(message)), view.advisoryMismatches.join(' | '));
  }

  const approved = await decideBooking(f.pool, f.staff, requestId, { decision: 'approve' });
  assert.equal(approved.status, 200);
  assert.equal((await f.row(requestId)).status, 'confirmed');
  assert.deepEqual((approved.body as { booking: { advisoryMismatches: string[] } }).booking.advisoryMismatches, booking.advisoryMismatches);
}));

test('a seeded request with no saved assessment reports no advisory result', () => withFixture(async f => {
  const { bookingId } = await f.pendingRequest('EVT-5402', '2027-02-10');
  assert.equal((await getBooking(f.query, f.staff, bookingId)).booking.advisoryMismatches, null);
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

  const { coordinatorView, organiserView } = await activityEntries(f, eventId);
  assert.deepEqual(coordinatorView.filter(row => row.entity_type === 'venue_booking')
    .map(row => [row.action, row.venue_name, row.actor_name, row.old_value, row.new_value]),
  [['Booking Approved', 'Small Room', 'Venue Staff A', 'pending', 'confirmed']]);
  assert.equal(organiserView.some(row => row.entity_type === 'venue_booking'), false);
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

  const { coordinatorView, organiserView } = await activityEntries(f, eventId);
  assert.deepEqual(coordinatorView.filter(row => row.entity_type === 'venue_booking')
    .map(row => [row.action, row.venue_name, row.actor_name, row.old_value, row.new_value]),
  [['Booking Rejected', 'Small Room', 'Venue Staff A', 'pending', 'rejected']]);
  assert.equal(organiserView.some(row => row.entity_type === 'venue_booking'), false);
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

test('TC_E06S06_01: an overlapping approval is blocked with the confirmed booking identified', () => withFixture(async f => {
  const [confirmed, candidate] = await withRawOverlapFixture(f, async () => {
    const first = await f.pendingRequest('EVT-5601', '2027-01-15', '09:00', '17:00', 'Charity Run');
    const second = await f.pendingRequest('EVT-5602', '2027-01-15', '14:00', '18:00');
    await f.pool.query(`UPDATE venue_bookings SET status = 'confirmed' WHERE id = $1`, [first.bookingId]);
    return [first, second] as const;
  });

  const result = await decideBooking(f.pool, f.staff, candidate.bookingId, { decision: 'approve' });

  assert.equal(result.status, 409);
  const body = result.body as { error: string; conflict: { bookingId: string; eventTitle: string; status: string } };
  assert.match(body.error, /confirmed booking for "EVT-5601 Charity Run"/);
  assert.deepEqual([body.conflict.bookingId, body.conflict.eventTitle, body.conflict.status],
    [confirmed.bookingId, 'Charity Run', 'confirmed']);
  assert.equal((await f.row(candidate.bookingId)).status, 'pending');
  assert.deepEqual(await f.audits(candidate.bookingId), []);
}));

test('TC_E06S06_02: approving one pending request flags the other and prevents its approval', () => withFixture(async f => {
  const [winner, other] = await withRawOverlapFixture(f, async () => [
    await f.pendingRequest('EVT-5611', '2027-01-20', '09:00', '12:00', 'Tech Conference 2026'),
    await f.pendingRequest('EVT-5612', '2027-01-20', '09:00', '12:00'),
  ] as const);

  assert.equal((await decideBooking(f.pool, f.staff, winner.bookingId, { decision: 'approve' })).status, 200);
  const flagged = await f.row(other.bookingId);
  assert.equal(flagged.status, 'pending');
  assert.equal(flagged.approval_conflict_booking_id, winner.bookingId);
  const detail = await getBooking(f.query, f.staff, other.bookingId);
  assert.deepEqual(detail.booking.approvalConflict, { bookingId: winner.bookingId, eventTitle: 'Tech Conference 2026' });
  assert.ok((await listPendingBookings(f.query, f.staff)).bookings.some(booking => booking.id === other.bookingId && booking.approvalConflict));

  const secondAttempt = await decideBooking(f.pool, f.staffB, other.bookingId, { decision: 'approve' });
  assert.equal(secondAttempt.status, 409);
  assert.match((secondAttempt.body as { error: string }).error, /This venue was just taken/);
  assert.equal((await f.row(other.bookingId)).status, 'pending');
}));

test('TC_E06S06_03: simultaneous overlapping approvals leave one confirmed and safely report venue just taken', () => withFixture(async f => {
  const [a, b] = await withRawOverlapFixture(f, async () => [
    await f.pendingRequest('EVT-5621', '2027-01-25', '09:00', '12:00'),
    await f.pendingRequest('EVT-5622', '2027-01-25', '09:00', '12:00'),
  ] as const);

  const results = await Promise.all([
    decideBooking(f.pool, f.staff, a.bookingId, { decision: 'approve' }),
    decideBooking(f.pool, f.staffB, b.bookingId, { decision: 'approve' }),
  ]);

  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const rows = [await f.row(a.bookingId), await f.row(b.bookingId)];
  assert.equal(rows.filter(row => row.status === 'confirmed').length, 1);
  const loser = rows.find(row => row.status === 'pending')!;
  assert.ok(loser.approval_conflict_booking_id);
  const refusal = results.find(result => result.status === 409)!;
  assert.match((refusal.body as { error: string }).error, /This venue was just taken/);
  assert.ok((refusal.body as { conflict?: unknown }).conflict);
}));

test('TC_E06S06_04: exactly adjacent booking ranges are allowed', () => withFixture(async f => {
  const first = await f.pendingRequest('EVT-5631', '2027-02-07', '09:00', '11:00');
  assert.equal((await decideBooking(f.pool, f.staff, first.bookingId, { decision: 'approve' })).status, 200);
  const adjacent = await f.pendingRequest('EVT-5632', '2027-02-07', '11:00', '13:00');
  assert.equal((await decideBooking(f.pool, f.staff, adjacent.bookingId, { decision: 'approve' })).status, 200);
  assert.deepEqual([(await f.row(first.bookingId)).status, (await f.row(adjacent.bookingId)).status], ['confirmed', 'confirmed']);
}));

test('TC_E06S06_05: one minute of raw overlap is blocked', () => withFixture(async f => {
  const [confirmed, candidate] = await withRawOverlapFixture(f, async () => {
    const first = await f.pendingRequest('EVT-5641', '2026-11-10', '09:00', '11:00');
    const second = await f.pendingRequest('EVT-5642', '2026-11-10', '10:59', '13:00');
    await f.pool.query(`UPDATE venue_bookings SET status = 'confirmed' WHERE id = $1`, [first.bookingId]);
    return [first, second] as const;
  });

  const result = await decideBooking(f.pool, f.staff, candidate.bookingId, { decision: 'approve' });
  assert.equal(result.status, 409);
  assert.match((result.body as { error: string }).error, /EVT-5641 Product Expo 2026/);
  assert.equal((await f.row(confirmed.bookingId)).status, 'confirmed');
  assert.equal((await f.row(candidate.bookingId)).status, 'pending');
}));

test('TC_E06S06_06: buffered concurrent approvals have at most one winner and leave the loser Pending', () => withFixture(async f => {
  const winner = await f.pendingRequest('EVT-5651', '2027-02-11', '10:00', '12:00');
  const loser = await f.pendingRequest('EVT-5652', '2027-02-11', '12:30', '14:00');
  await f.pool.query('UPDATE venues SET setup_time_minutes = 30, turnaround_time_minutes = 45 WHERE id = $1', [f.ids.venue]);

  const results = await Promise.all([
    decideBooking(f.pool, f.staff, winner.bookingId, { decision: 'approve' }),
    decideBooking(f.pool, f.staffB, loser.bookingId, { decision: 'approve' }),
  ]);

  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const persisted = [await f.row(winner.bookingId), await f.row(loser.bookingId)];
  const pendingIndex = persisted.findIndex(row => row.status === 'pending');
  assert.notEqual(pendingIndex, -1);
  const pending = persisted[pendingIndex]!;
  const pendingId = pendingIndex === 0 ? winner.bookingId : loser.bookingId;
  const confirmedId = pendingIndex === 0 ? loser.bookingId : winner.bookingId;
  assert.equal(pending.approval_conflict_booking_id, confirmedId);
  assert.match((results.find(result => result.status === 409)!.body as { error: string }).error, /This venue was just taken/);

  // ADR-003 remains the final write guard if a caller bypasses the service check.
  await assert.rejects(
    f.pool.query(`UPDATE venue_bookings SET status = 'confirmed' WHERE id = $1`, [pendingId]),
    { code: '23P01' },
  );
  assert.equal((await f.row(pendingId)).status, 'pending');
}));

test('TC_E06S06_07: two requests from the same event can both be confirmed at different venues', () => withFixture(async f => {
  const first = await f.pendingRequest('EVT-5661', '2027-02-13', '14:00', '16:00');
  const secondId = randomUUID();
  const range = '[2027-02-13T14:00:00+08:00,2027-02-13T16:00:00+08:00)';
  await f.pool.query(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status)
    VALUES ($1, $2, $3, $4::tstzrange, 'pending')`, [secondId, f.ids.alternative, first.eventId, range]);

  assert.equal((await decideBooking(f.pool, f.staff, first.bookingId, { decision: 'approve' })).status, 200);
  assert.equal((await decideBooking(f.pool, f.staffB, secondId, { decision: 'approve' })).status, 200);
  assert.deepEqual([(await f.row(first.bookingId)).status,
    (await f.pool.query<{ status: string }>('SELECT status FROM venue_bookings WHERE id = $1', [secondId])).rows[0]!.status],
  ['confirmed', 'confirmed']);
}));

test('the first approved booking becomes the primary venue; a second Confirmed venue does not', () => withFixture(async f => {
  const { eventId, bookingId: first } = await f.pendingRequest('EVT-5201', '2027-02-05');
  const second = await secondVenueRequest(f, eventId, '2027-02-05');

  const a = await decideBooking(f.pool, f.staff, first, { decision: 'approve' });
  const b = await decideBooking(f.pool, f.staff, second, { decision: 'approve' });

  assert.deepEqual([a.status, b.status], [200, 200]);
  assert.equal((a.body as { booking: { isPrimary: boolean } }).booking.isPrimary, true);
  assert.equal((b.body as { booking: { isPrimary: boolean } }).booking.isPrimary, false);
  assert.deepEqual(await primaries(f, eventId), [first]);
}));

test('a rejection leaves the event without a primary venue, and the next approval takes it', () => withFixture(async f => {
  const { eventId, bookingId: first } = await f.pendingRequest('EVT-5202', '2027-02-06');
  const second = await secondVenueRequest(f, eventId, '2027-02-06');
  await decideBooking(f.pool, f.staff, first, { decision: 'reject', reason: REASON });
  assert.deepEqual(await primaries(f, eventId), []);
  await decideBooking(f.pool, f.staff, second, { decision: 'approve' });
  assert.deepEqual(await primaries(f, eventId), [second]);
}));

test('two approvals for one event at the same moment both confirm, with exactly one primary', () => withFixture(async f => {
  const { eventId, bookingId: first } = await f.pendingRequest('EVT-5203', '2027-02-07');
  const second = await secondVenueRequest(f, eventId, '2027-02-07');

  const results = await Promise.all([
    decideBooking(f.pool, f.staff, first, { decision: 'approve' }),
    decideBooking(f.pool, f.staffB, second, { decision: 'approve' }),
  ]);

  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.deepEqual([(await f.row(first)).status, (await f.row(second)).status], ['confirmed', 'confirmed']);
  const primary = await primaries(f, eventId);
  assert.equal(primary.length, 1);
  assert.ok([first, second].includes(primary[0]!));
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
  const decided = await f.pendingRequest('EVT-5002', '2027-02-01');
  const later = await f.pendingRequest('EVT-5003', '2027-03-01');
  await decideBooking(f.pool, f.staff, decided.bookingId, { decision: 'reject', reason: REASON, suggested_venue_id: f.ids.alternative });

  const list = await listPendingBookings(f.query, f.staff);
  assert.deepEqual(list.bookings.map(booking => booking.id), [first.bookingId, later.bookingId]);
  assert.deepEqual([list.bookings[0]!.venue.name, list.bookings[0]!.event.code, list.bookings[0]!.event.coordinatorName],
    ['Small Room', 'EVT-5001', 'Coordinator A']);

  const { booking } = await getBooking(f.query, f.staff, decided.bookingId);
  assert.deepEqual([booking.status, booking.decisionReason, booking.suggestedVenue?.name, booking.decidedBy],
    ['rejected', REASON, 'Riverside Hall', 'Venue Staff A']);
}));

// Scenario 4 (C-65, T-66). Since the 0016 guard no two active bookings can be
// requested with overlapping buffered windows, so a clash at approval arises
// when Venue Staff lengthen the venue's buffers after both were requested.
test('TC_E06S04_04: approval is blocked when the buffered windows overlap a confirmed booking, which is named', () => withFixture(async f => {
  const { bookingId: confirmedId } = await f.pendingRequest('EVT-5101', '2027-02-01');
  await f.pool.query(`UPDATE venue_bookings SET status = 'confirmed' WHERE id = $1`, [confirmedId]);
  // 10:00-12:00 confirmed and 12:30-14:00 pending on the same day: the advertised times don't overlap.
  const { eventId, bookingId: pendingId } = await f.pendingRequest('EVT-5102', '2027-02-01', '12:30', '14:00');
  await f.pool.query('UPDATE venues SET turnaround_time_minutes = 60 WHERE id = $1', [f.ids.venue]);

  const result = await decideBooking(f.pool, f.staff, pendingId, { decision: 'approve' });

  assert.equal(result.status, 409);
  const body = result.body as { error: string; conflict: { bookingId: string; status: string; eventCode: string } };
  assert.match(body.error, /with setup and turnaround time it overlaps the confirmed booking for "EVT-5101 Product Expo 2026" \(1 Feb 2027, 10:00 am – 12:00 pm\) at Small Room\./);
  assert.deepEqual([body.conflict.bookingId, body.conflict.status, body.conflict.eventCode], [confirmedId, 'confirmed', 'EVT-5101']);
  assert.equal((await f.row(pendingId)).status, 'pending');
  assert.deepEqual(await f.audits(pendingId), []);
  assert.deepEqual(await f.notices(eventId), []);

  // Once the buffers are short enough again, the same request can be approved.
  await f.pool.query('UPDATE venues SET turnaround_time_minutes = 15 WHERE id = $1', [f.ids.venue]);
  assert.equal((await decideBooking(f.pool, f.staff, pendingId, { decision: 'approve' })).status, 200);
}));

test('Scenario 4: approval over a maintenance block on the venue is blocked and names the block', () => withFixture(async f => {
  const { bookingId } = await f.pendingRequest('EVT-5103', '2027-02-03');
  await f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
    VALUES ($1, '[2027-02-03T11:00:00+08:00,2027-02-03T15:00:00+08:00)', 'Annual fire safety inspection', $2)`, [f.ids.venue, f.ids.staff]);
  const result = await decideBooking(f.pool, f.staff, bookingId, { decision: 'approve' });
  assert.equal(result.status, 409);
  assert.match((result.body as { error: string }).error, /Small Room is blocked for "Annual fire safety inspection"/);
  assert.equal((await f.row(bookingId)).status, 'pending');
}));

test('Scenario 4: a buffered clash flags the losing pending request; rejecting it frees the winner', () => withFixture(async f => {
  const { bookingId: a } = await f.pendingRequest('EVT-5104', '2027-02-04');
  const { bookingId: b } = await f.pendingRequest('EVT-5105', '2027-02-04', '12:30', '14:00');
  await f.pool.query('UPDATE venues SET setup_time_minutes = 60 WHERE id = $1', [f.ids.venue]);

  // Both requests were valid when submitted. After the setup buffer changes,
  // the decision flow lets one win and records which confirmed request blocks
  // the other; the database guard then permits only that flagged loser.
  const results = await Promise.all([
    decideBooking(f.pool, f.staff, a, { decision: 'approve' }),
    decideBooking(f.pool, f.staffB, b, { decision: 'approve' }),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const rows = [await f.row(a), await f.row(b)];
  assert.equal(rows.filter(row => row.status === 'confirmed').length, 1);
  const loserId = rows[0]!.status === 'pending' ? a : b;
  const loser = await f.row(loserId);
  assert.ok(loser.approval_conflict_booking_id);
  assert.match((results.find(r => r.status === 409)!.body as { error: string }).error, /This venue was just taken/);

  // Rejecting the flagged pending request clears the conflict marker.
  assert.equal((await decideBooking(f.pool, f.staff, loserId, { decision: 'reject', reason: 'Clashes with another request after the setup time changed' })).status, 200);
  assert.equal((await f.row(loserId)).status, 'rejected');
}));

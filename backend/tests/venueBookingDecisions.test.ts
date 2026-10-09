// SCRUM-48: unit tests for E06-S04 "Decide on a venue booking request".
//
// validateDecision is exercised directly; the entry points run against a
// scripted fake database so every branch (refusal, not found, already
// decided, suggested venue checks, no assigned Coordinator) is covered
// without PostgreSQL. venueBookingDecisions.integration.test.ts proves the
// same rules, the stored rows and the notices against a real database.

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import {
  decideBooking, getBooking, listPendingBookings, REASON_MAX, toBooking, validateDecision,
} from '../src/modules/venueBooking/decisions.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const staff: AuthenticatedUser = { id: '00000000-0000-4000-8000-0000000000f1', email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
const coordinator: AuthenticatedUser = { ...staff, id: '00000000-0000-4000-8000-0000000000c1', role: 'event_coordinator' };
const bookingId = '00000000-0000-4000-8000-0000000000b1';
const venueId = '00000000-0000-4000-8000-0000000000a1';
const otherVenueId = '00000000-0000-4000-8000-0000000000a2';

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: bookingId, status: 'pending', starts_at: new Date('2027-01-15T02:00:00Z'), ends_at: new Date('2027-01-15T04:00:00Z'),
    venue_id: venueId, venue_name: 'Small Room', event_id: '00000000-0000-4000-8000-0000000000e1', event_code: 'EVT-5001',
    event_title: 'Product Expo 2026', expected_attendance: 150, coordinator_id: coordinator.id, coordinator_name: 'Coordinator A',
    decision_reason: null, suggested_venue_id: null, suggested_venue_name: null, decided_by_name: null, decided_at: null,
    created_at: new Date('2027-01-01T00:00:00Z'), ...overrides,
  };
}

type Script = (sql: string, values?: unknown[]) => unknown[] | undefined;

// One call log shared by pool-level and transaction queries.
function fakeDatabase(script: Script) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const run = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    let rows = script(sql, values);
    if (rows === undefined) {
      if (sql.includes('INSERT INTO audit_logs') && sql.includes('RETURNING')) rows = [{ id: '00000000-0000-4000-8000-0000000000d1', occurred_at: new Date('2027-01-02T00:00:00Z') }];
      else if (sql.includes('INSERT INTO notifications')) rows = [{ id: String(values?.[4]) }];
      else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: '00000000-0000-4000-8000-0000000000d2' }];
      else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'recipient@example.test', title: 'Venue notice', message: 'Synthetic notice' }];
      else rows = [];
    }
    return { rows, rowCount: rows.length };
  };
  const pool = { query: run, async connect() { return { query: run, release() {} }; } } as unknown as Pool;
  const query: Query = (sql, values) => run(sql, values) as never;
  return { pool, query, calls };
}

const has = (calls: { sql: string }[], fragment: string) => calls.some(call => call.sql.includes(fragment));

test('validateDecision accepts an approval as is', () => {
  assert.deepEqual(validateDecision({ decision: 'approve', reason: 'ignored' }).decision, { decision: 'approve' });
});

test('validateDecision needs an object and a known decision', () => {
  for (const body of [null, [], 'approve']) assert.ok(validateDecision(body).errors?.form);
  assert.deepEqual(validateDecision({}).errors?.decision, ["Choose 'approve' or 'reject'."]);
  assert.ok(validateDecision({ decision: 'maybe' }).errors?.decision);
});

test('TC_E06S04_03: validateDecision refuses a rejection without a reason', () => {
  for (const reason of [undefined, '', '   ', 42]) {
    assert.deepEqual(validateDecision({ decision: 'reject', reason }).errors?.reason, ['Add a reason for rejecting this request.']);
  }
});

test('validateDecision keeps the reason within the limit, at the limit and just above', () => {
  assert.equal(validateDecision({ decision: 'reject', reason: 'x'.repeat(REASON_MAX) }).errors, undefined);
  assert.deepEqual(validateDecision({ decision: 'reject', reason: 'x'.repeat(REASON_MAX + 1) }).errors?.reason,
    [`The reason must be ${REASON_MAX} characters or fewer.`]);
});

test('validateDecision trims the reason and reads an optional suggested venue', () => {
  assert.deepEqual(validateDecision({ decision: 'reject', reason: '  Too small  ' }).decision,
    { decision: 'reject', reason: 'Too small', suggestedVenueId: null });
  for (const empty of [null, '']) {
    assert.equal(validateDecision({ decision: 'reject', reason: 'Too small', suggested_venue_id: empty }).decision?.decision, 'reject');
  }
  assert.deepEqual(validateDecision({ decision: 'reject', reason: 'Too small', suggested_venue_id: otherVenueId }).decision,
    { decision: 'reject', reason: 'Too small', suggestedVenueId: otherVenueId });
  for (const bad of ['Riverside Hall', 7]) {
    assert.deepEqual(validateDecision({ decision: 'reject', reason: 'Too small', suggested_venue_id: bad }).errors?.suggested_venue_id,
      ['Choose a venue from the list.']);
  }
});

test('toBooking shows a decided booking with its reason, suggestion and decider', () => {
  const booking = toBooking(bookingRow({
    status: 'rejected', decision_reason: 'Too small', suggested_venue_id: otherVenueId, suggested_venue_name: 'Riverside Hall',
    decided_by_name: 'Venue Staff A', decided_at: new Date('2027-01-03T00:00:00Z'),
  }));
  assert.deepEqual(booking.suggestedVenue, { id: otherVenueId, name: 'Riverside Hall' });
  assert.equal(booking.decidedAt, '2027-01-03T00:00:00.000Z');
  assert.equal(booking.startsAt, '2027-01-15T02:00:00.000Z');
});

test('only Venue Staff reach the decision, the list and the detail; refusals are audited before any read', async () => {
  const { pool, query, calls } = fakeDatabase(() => undefined);
  await assert.rejects(decideBooking(pool, coordinator, bookingId, { decision: 'approve' }), { status: 403 });
  await assert.rejects(listPendingBookings(query, coordinator), { status: 403 });
  await assert.rejects(getBooking(query, coordinator, bookingId), { status: 403 });
  await assert.rejects(decideBooking(pool, undefined, bookingId, { decision: 'approve' }), { status: 401 });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.sql.includes("'Access Denied', 'venue_bookings'")));
});

test('an invalid booking id or decision is refused before a transaction opens', async () => {
  const { pool, calls } = fakeDatabase(() => undefined);
  assert.equal((await decideBooking(pool, staff, 'not-an-id', { decision: 'approve' })).status, 400);
  assert.equal((await decideBooking(pool, staff, undefined, { decision: 'approve' })).status, 400);
  const blank = await decideBooking(pool, staff, bookingId, { decision: 'reject', reason: ' ' });
  assert.equal(blank.status, 400);
  assert.equal(has(calls, 'BEGIN'), false);
});

test('an unknown booking is not found, and the transaction is left without changes', async () => {
  const { pool, query, calls } = fakeDatabase(() => undefined);
  assert.equal((await decideBooking(pool, staff, bookingId, { decision: 'approve' })).status, 404);
  assert.equal(has(calls, 'UPDATE venue_bookings'), false);
  await assert.rejects(getBooking(query, staff, 'not-an-id'), { status: 404 });
  await assert.rejects(getBooking(query, staff, bookingId), { status: 404 });
});

test('a booking that is no longer pending cannot be decided', async () => {
  const { pool, calls } = fakeDatabase(sql => (sql.includes('FOR UPDATE OF vb') ? [bookingRow({ status: 'confirmed' })] : undefined));
  const result = await decideBooking(pool, staff, bookingId, { decision: 'reject', reason: 'Too small' });
  assert.equal(result.status, 409);
  assert.equal(has(calls, 'UPDATE venue_bookings'), false);
});

test('the suggested venue must differ from the requested one and be active', async () => {
  const pending = fakeDatabase(sql => (sql.includes('FOR UPDATE OF vb') ? [bookingRow()] : undefined));
  const same = await decideBooking(pending.pool, staff, bookingId, { decision: 'reject', reason: 'Too small', suggested_venue_id: venueId });
  assert.deepEqual((same.body as { errors: Record<string, string[]> }).errors.suggested_venue_id, ['Suggest a different venue from the one requested.']);
  const missing = await decideBooking(pending.pool, staff, bookingId, { decision: 'reject', reason: 'Too small', suggested_venue_id: otherVenueId });
  assert.deepEqual((missing.body as { errors: Record<string, string[]> }).errors.suggested_venue_id, ['Choose an active venue from the list.']);
  assert.equal(has(pending.calls, 'UPDATE venue_bookings'), false);
});

test('TC_E06S04_01: an approval updates the booking, audits it and notifies the assigned Coordinator', async () => {
  const { pool, calls } = fakeDatabase(sql => {
    if (sql.includes('FOR UPDATE OF vb')) return [bookingRow()];
    if (sql.includes('SELECT full_name FROM users')) return [{ full_name: 'Venue Staff A' }];
    return undefined;
  });
  const result = await decideBooking(pool, staff, bookingId, { decision: 'approve' });
  assert.equal(result.status, 200);
  assert.equal((result.body as { coordinatorNotified: boolean }).coordinatorNotified, true);
  const update = calls.find(call => call.sql.includes('UPDATE venue_bookings'))!;
  assert.deepEqual(update.values, [bookingId, 'confirmed', staff.id, null, null]);
  const audit = calls.find(call => call.sql.includes('INSERT INTO audit_logs'))!;
  assert.deepEqual(audit.values, [staff.id, bookingId, bookingRow().event_id, 'Booking Approved', 'confirmed']);
  const notice = calls.find(call => call.sql.includes('INSERT INTO notifications'))!;
  assert.equal(notice.values?.[0], coordinator.id);
  assert.equal(notice.values?.[2], 'Venue booking approved');
});

test('TC_E06S04_02: a rejection stores the reason and the suggested venue and names both in the notice', async () => {
  const { pool, calls } = fakeDatabase(sql => {
    if (sql.includes('FOR UPDATE OF vb')) return [bookingRow()];
    if (sql.includes('FROM venues WHERE id = $1 AND is_active')) return [{ name: 'Riverside Hall' }];
    if (sql.includes('SELECT full_name FROM users')) return [];
    return undefined;
  });
  const result = await decideBooking(pool, staff, bookingId, { decision: 'reject', reason: 'Too small', suggested_venue_id: otherVenueId });
  assert.equal(result.status, 200);
  assert.deepEqual(calls.find(call => call.sql.includes('UPDATE venue_bookings'))!.values, [bookingId, 'rejected', staff.id, 'Too small', otherVenueId]);
  const message = String(calls.find(call => call.sql.includes('INSERT INTO notifications'))!.values?.[3]);
  // No display name stored for the actor: the notice falls back to the role.
  assert.match(message, /^Venue Staff rejected your request for Small Room/);
  assert.match(message, /Reason: Too small\n\nSuggested alternative: Riverside Hall$/);
});

test('an event with no assigned Coordinator is decided without a notice', async () => {
  const { pool, calls } = fakeDatabase(sql => (sql.includes('FOR UPDATE OF vb') ? [bookingRow({ coordinator_id: null, coordinator_name: null })] : undefined));
  const result = await decideBooking(pool, staff, bookingId, { decision: 'approve' });
  assert.equal(result.status, 200);
  assert.equal((result.body as { coordinatorNotified: boolean }).coordinatorNotified, false);
  assert.equal(has(calls, 'INSERT INTO notifications'), false);
  assert.ok(has(calls, 'INSERT INTO audit_logs'));
});

test('the pending list reads only pending bookings, soonest first', async () => {
  const { query, calls } = fakeDatabase(sql => (sql.includes("vb.status = 'pending'") ? [bookingRow()] : undefined));
  const { bookings } = await listPendingBookings(query, staff);
  assert.deepEqual(bookings.map(booking => booking.event.code), ['EVT-5001']);
  assert.match(calls.at(-1)!.sql, /ORDER BY lower\(vb\.booking_range\), vb\.id/);
});

test('the booking detail returns one booking', async () => {
  const { query } = fakeDatabase(sql => (sql.includes('WHERE vb.id = $1') ? [bookingRow()] : undefined));
  assert.equal((await getBooking(query, staff, bookingId)).booking.venue.name, 'Small Room');
});

test('a rejection without a suggested venue says nothing about an alternative', async () => {
  const { pool, calls } = fakeDatabase(sql => (sql.includes('FOR UPDATE OF vb') ? [bookingRow()] : undefined));
  const result = await decideBooking(pool, staff, bookingId, { decision: 'reject', reason: 'Too small' });
  assert.equal(result.status, 200);
  assert.equal(has(calls, 'FROM venues WHERE id = $1 AND is_active'), false);
  const message = String(calls.find(call => call.sql.includes('INSERT INTO notifications'))!.values?.[3]);
  assert.match(message, /Reason: Too small$/);
});

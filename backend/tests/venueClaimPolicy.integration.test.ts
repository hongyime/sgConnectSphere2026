// T100 / E06-S06 prospective cases, kept untagged until canonical case IDs land.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideBooking } from '../src/modules/venueBooking/decisions.js';
import { venueClaimPolicyFixture } from './helpers/venueClaimPolicyFixture.js';

function hasStatus(error: unknown, status: number) {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
}

// T100 / E06-S06: the first accepted Pending request holds the buffered claim.
test('an accepted pending request refuses its competitor without business, audit or outbox changes', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const firstEvent = await f.createEvent();
    const competitor = await f.createEvent();
    const first = await f.request(firstEvent, f.ids.venueA, f.period('2027-02-01', '10:00', '12:00'));
    assert.equal(first.status, 201);
    assert.ok('booking' in first.body);
    assert.equal(first.body.booking.status, 'pending');
    const beforeRefusal = await f.effectSnapshot();
    await assert.rejects(f.request(competitor, f.ids.venueA, f.period('2027-02-01', '10:00', '12:00')), { status: 409 });
    assert.deepEqual(await f.effectSnapshot(), beforeRefusal);
  } finally {
    await f.close();
  }
});

// T100 / E06-S06: hold-first and request-first order both preserve the claim.
test('a hold blocks a later request, and a pending request blocks a later hold', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const heldEvent = await f.createEvent();
    const refusedRequestEvent = await f.createEvent();
    assert.equal((await f.hold(heldEvent, f.ids.venueA, f.period('2027-02-02', '10:00', '12:00'))).status, 201);
    const afterHold = await f.effectSnapshot();
    await assert.rejects(f.request(refusedRequestEvent, f.ids.venueA, f.period('2027-02-02', '10:00', '12:00')), { status: 409 });
    assert.deepEqual(await f.effectSnapshot(), afterHold);

    const requestedEvent = await f.createEvent();
    const refusedHoldEvent = await f.createEvent();
    assert.equal((await f.request(requestedEvent, f.ids.venueA, f.period('2027-02-03', '10:00', '12:00'))).status, 201);
    const afterRequest = await f.effectSnapshot();
    assert.equal((await f.hold(refusedHoldEvent, f.ids.venueA, f.period('2027-02-03', '10:00', '12:00'))).status, 409);
    assert.deepEqual(await f.effectSnapshot(), afterRequest);
  } finally {
    await f.close();
  }
});

// T100 / E06-S06: concurrent callers cannot both claim one buffered slot.
test('concurrent overlapping requests leave exactly one accepted claim', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const eventA = await f.createEvent();
    const eventB = await f.createEvent(f.otherCoordinator);
    const results = await Promise.allSettled([
      f.request(eventA, f.ids.venueA, f.period('2027-02-04', '10:00', '12:00')),
      f.requestAsOtherCoordinator(eventB, f.ids.venueA, f.period('2027-02-04', '10:00', '12:00')),
    ]);
    const accepted = results.filter(result => result.status === 'fulfilled');
    const refused = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    assert.equal(accepted.length, 1);
    assert.equal(accepted[0]?.status === 'fulfilled' ? accepted[0].value.status : null, 201);
    assert.equal(refused.length, 1);
    assert.ok(refused[0]?.status === 'rejected' && hasStatus(refused[0].reason, 409));
    const pending = await f.pool.query<{ count: number }>("SELECT count(*)::int AS count FROM venue_bookings WHERE status='pending'");
    assert.equal(pending.rows[0]?.count, 1);
    const events = await f.pool.query<{ id: string; status: string; claims: number }>(
      `SELECT e.id,e.status,count(b.id)::int AS claims FROM events e
       LEFT JOIN venue_bookings b ON b.event_id=e.id WHERE e.id=ANY($1::uuid[])
       GROUP BY e.id,e.status ORDER BY e.status`, [[eventA, eventB]]);
    assert.deepEqual(events.rows.map(({ status, claims }) => ({ status, claims })), [
      { status: 'approved', claims: 0 }, { status: 'planning', claims: 1 },
    ]);
    const losingEvent = events.rows.find(event => event.status === 'approved');
    assert.ok(losingEvent);
    const losingEffects = await f.pool.query<{
      audit_count: number; notification_count: number; delivery_count: number;
    }>(`SELECT
      (SELECT count(*)::int FROM audit_logs WHERE event_id=$1) AS audit_count,
      (SELECT count(*)::int FROM notifications WHERE event_id=$1) AS notification_count,
      (SELECT count(*)::int FROM notification_deliveries d
       JOIN notifications n ON n.id=d.notification_id WHERE n.event_id=$1) AS delivery_count`, [losingEvent.id]);
    assert.deepEqual(losingEffects.rows[0], { audit_count: 0, notification_count: 0, delivery_count: 0 });
  } finally {
    await f.close();
  }
});

// T100 / E06-S06: exact buffered adjacency remains free; one minute of overlap does not.
test('buffered adjacency is accepted while a one-minute overlap is refused', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    await f.setBuffers(f.ids.venueA, 30, 30);
    const firstEvent = await f.createEvent();
    const adjacentEvent = await f.createEvent();
    const overlapEvent = await f.createEvent();
    const first = await f.request(firstEvent, f.ids.venueA, f.period('2027-03-01', '09:00', '10:00'));
    assert.ok('booking' in first.body);
    const adjacent = await f.request(adjacentEvent, f.ids.venueA, f.period('2027-03-01', '11:00', '12:00'));
    assert.equal(adjacent.status, 201);
    assert.ok('booking' in adjacent.body);
    assert.equal((await decideBooking(f.pool, f.staff, adjacent.body.booking.id, {
      decision: 'reject', reason: 'Free the adjacency control slot',
    })).status, 200);
    await assert.rejects(f.request(overlapEvent, f.ids.venueA, f.period('2027-03-01', '10:59', '11:59')), { status: 409 });
  } finally {
    await f.close();
  }
});

// T100 / E06-S06: later buffer growth is rechecked at approval until rejection resolves it.
test('later buffer growth blocks both approvals until Venue Staff rejects one active request', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    await f.setBuffers(f.ids.venueA, 0, 0);
    const eventA = await f.createEvent();
    const eventB = await f.createEvent();
    const first = await f.request(eventA, f.ids.venueA, f.period('2027-03-02', '09:00', '10:00'));
    const second = await f.request(eventB, f.ids.venueA, f.period('2027-03-02', '10:00', '11:00'));
    assert.ok('booking' in first.body);
    assert.ok('booking' in second.body);
    await f.setBuffers(f.ids.venueA, 1, 0);

    const approvals = await Promise.all([
      decideBooking(f.pool, f.staff, first.body.booking.id, { decision: 'approve' }),
      decideBooking(f.pool, f.staff, second.body.booking.id, { decision: 'approve' }),
    ]);
    assert.deepEqual(approvals.map(result => result.status), [409, 409]);
    const stillPending = await f.pool.query<{ status: string }>('SELECT status FROM venue_bookings ORDER BY id');
    assert.deepEqual(stillPending.rows.map(row => row.status), ['pending', 'pending']);

    assert.equal((await decideBooking(f.pool, f.staff, first.body.booking.id, {
      decision: 'reject', reason: 'Resolve the overlap after buffer growth',
    })).status, 200);
    assert.equal((await decideBooking(f.pool, f.staff, second.body.booking.id, { decision: 'approve' })).status, 200);
  } finally {
    await f.close();
  }
});

// T100 / E06-S06: one event may confirm overlapping bookings at separate venues.
test('one event can confirm overlapping requests at different venues', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const eventId = await f.createEvent();
    const atA = await f.request(eventId, f.ids.venueA, f.period('2027-04-01', '10:00', '12:00'));
    const atB = await f.request(eventId, f.ids.venueB, f.period('2027-04-01', '10:00', '12:00'));
    assert.ok('booking' in atA.body);
    assert.ok('booking' in atB.body);
    assert.equal((await decideBooking(f.pool, f.staff, atA.body.booking.id, { decision: 'approve' })).status, 200);
    assert.equal((await decideBooking(f.pool, f.staff, atB.body.booking.id, { decision: 'approve' })).status, 200);
    const confirmed = await f.pool.query<{ status: string }>(
      'SELECT status FROM venue_bookings WHERE event_id=$1 ORDER BY venue_id', [eventId]);
    assert.deepEqual(confirmed.rows.map(row => row.status), ['confirmed', 'confirmed']);
  } finally {
    await f.close();
  }
});

// T100 / E06-S06: converting a live Tentative hold preserves its claim as Pending.
test('converting a hold keeps its venue claim active against another request', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const holdEvent = await f.createEvent();
    const competitorEvent = await f.createEvent();
    const held = await f.hold(holdEvent, f.ids.venueA, f.period('2027-04-02', '10:00', '12:00'));
    assert.equal(held.status, 201);
    assert.ok('hold' in held.body);
    const hold = held.body.hold;
    assert.ok(hold);
    const converted = await f.convert(hold.id);
    assert.equal(converted.status, 200);
    assert.ok('booking' in converted.body);
    assert.equal(converted.body.booking.status, 'pending');
    const beforeRefusal = await f.effectSnapshot();
    await assert.rejects(f.request(competitorEvent, f.ids.venueA, f.period('2027-04-02', '10:00', '12:00')), { status: 409 });
    assert.deepEqual(await f.effectSnapshot(), beforeRefusal);
  } finally {
    await f.close();
  }
});

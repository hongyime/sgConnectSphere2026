// E06-S06 / T-100: the first accepted claim holds the venue's buffered slot
// (TC_E06S06_01 to _07 in docs/testing/cases/E06.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideBooking } from '../src/modules/venueBooking/decisions.js';
import { venueClaimPolicyFixture } from './helpers/venueClaimPolicyFixture.js';

function hasStatus(error: unknown, status: number) {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
}

// Scenario 2: the Coordinator learns which buffered window is taken, never whose event holds it.
function refusedWithoutDisclosure(otherTitle: string, from: string, to: string) {
  return (error: unknown) => {
    assert.ok(hasStatus(error, 409));
    const message = (error as Error).message;
    assert.equal(message, `This venue is unavailable from ${from} to ${to}, including setup and turnaround.`);
    assert.ok(!message.includes(otherTitle) && !message.includes('EVT-'), message);
    return true;
  };
}

// TC_E06S06_01: a Confirmed booking keeps priority; the Pending one is flagged and cannot be approved.
test('TC_E06S06_01: approval rechecks a confirmed booking after buffer growth and keeps both bookings', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const charityRun = await f.createEvent(f.coordinator, 'Charity Run');
    const productExpo = await f.createEvent(f.coordinator, 'Product Expo');
    const confirmed = await f.request(charityRun, f.ids.venueA, f.period('2027-02-08', '09:00', '11:00'));
    assert.ok('booking' in confirmed.body);
    assert.equal((await decideBooking(f.pool, f.staff, confirmed.body.booking.id, { decision: 'approve' })).status, 200);
    const pending = await f.request(productExpo, f.ids.venueA, f.period('2027-02-08', '11:00', '13:00'));
    assert.ok('booking' in pending.body);

    assert.equal((await f.editBuffers(f.ids.venueA, 30, 0)).status, 200);
    assert.deepEqual(await f.bookingRows([charityRun, productExpo]), [
      { status: 'confirmed', buffer_conflict: false }, { status: 'pending', buffer_conflict: true },
    ]);

    const refused = await decideBooking(f.pool, f.staff, pending.body.booking.id, { decision: 'approve' });
    assert.equal(refused.status, 409);
    assert.equal((refused.body as { conflict?: { status?: string } }).conflict?.status, 'confirmed');
    assert.deepEqual(await f.bookingRows([charityRun, productExpo]), [
      { status: 'confirmed', buffer_conflict: false }, { status: 'pending', buffer_conflict: true },
    ]);
  } finally {
    await f.close();
  }
});

// TC_E06S06_02: the first accepted Pending request holds the buffered claim.
test('TC_E06S06_02: an accepted pending request refuses its competitor without disclosure or side effects', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    await f.setBuffers(f.ids.venueA, 30, 45);
    const firstEvent = await f.createEvent(f.coordinator, 'Charity Run');
    const competitor = await f.createEvent(f.coordinator, 'Product Expo');
    const first = await f.request(firstEvent, f.ids.venueA, f.period('2027-02-01', '09:00', '11:00'));
    assert.equal(first.status, 201);
    assert.ok('booking' in first.body);
    assert.equal(first.body.booking.status, 'pending');
    const beforeRefusal = await f.effectSnapshot();
    // Charity Run's buffered window: 09:00-11:00 widened by 30 and 45 minutes.
    await assert.rejects(f.request(competitor, f.ids.venueA, f.period('2027-02-01', '10:00', '12:00')),
      refusedWithoutDisclosure('Charity Run', '1 Feb 2027, 8:30 am', '1 Feb 2027, 11:45 am'));
    assert.deepEqual(await f.effectSnapshot(), beforeRefusal);
  } finally {
    await f.close();
  }
});

// TC_E06S06_02: hold-first and request-first order both preserve the claim.
test('TC_E06S06_02: a hold blocks a later request, and a pending request blocks a later hold', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const heldEvent = await f.createEvent(f.coordinator, 'Charity Run');
    const refusedRequestEvent = await f.createEvent();
    assert.equal((await f.hold(heldEvent, f.ids.venueA, f.period('2027-02-02', '10:00', '12:00'))).status, 201);
    const afterHold = await f.effectSnapshot();
    await assert.rejects(f.request(refusedRequestEvent, f.ids.venueA, f.period('2027-02-02', '10:00', '12:00')),
      refusedWithoutDisclosure('Charity Run', '2 Feb 2027, 10:00 am', '2 Feb 2027, 12:00 pm'));
    assert.deepEqual(await f.effectSnapshot(), afterHold);

    const requestedEvent = await f.createEvent(f.coordinator, 'Product Expo');
    const refusedHoldEvent = await f.createEvent();
    assert.equal((await f.request(requestedEvent, f.ids.venueA, f.period('2027-02-03', '10:00', '12:00'))).status, 201);
    const afterRequest = await f.effectSnapshot();
    // T-102: a refused hold gets the same window-only sentence as a refused request.
    const refusedHold = await f.hold(refusedHoldEvent, f.ids.venueA, f.period('2027-02-03', '10:00', '12:00'));
    assert.equal(refusedHold.status, 409);
    assert.ok(refusedWithoutDisclosure('Product Expo', '3 Feb 2027, 10:00 am', '3 Feb 2027, 12:00 pm')(Object.assign(new Error((refusedHold.body as { error: string }).error), { status: 409 })));
    assert.deepEqual(await f.effectSnapshot(), afterRequest);
  } finally {
    await f.close();
  }
});

// TC_E06S06_03: concurrent callers cannot both claim one buffered slot.
test('TC_E06S06_03: concurrent overlapping requests leave exactly one accepted claim', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    await f.setBuffers(f.ids.venueA, 30, 45);
    const eventA = await f.createEvent();
    const eventB = await f.createEvent(f.otherCoordinator);
    const results = await Promise.allSettled([
      f.request(eventA, f.ids.venueA, f.period('2027-02-04', '09:00', '11:00')),
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

// TC_E06S06_04: with zero buffers the shared half-open boundary is adjacency, not overlap.
test('TC_E06S06_04: a pending request exactly adjacent to a confirmed booking can be approved', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const charityRun = await f.createEvent(f.coordinator, 'Charity Run');
    const productExpo = await f.createEvent(f.coordinator, 'Product Expo');
    const existing = await f.request(charityRun, f.ids.venueA, f.period('2027-02-09', '09:00', '11:00'));
    assert.ok('booking' in existing.body);
    assert.equal((await decideBooking(f.pool, f.staff, existing.body.booking.id, { decision: 'approve' })).status, 200);
    const adjacent = await f.request(productExpo, f.ids.venueA, f.period('2027-02-09', '11:00', '13:00'));
    assert.ok('booking' in adjacent.body);
    assert.equal((await decideBooking(f.pool, f.staff, adjacent.body.booking.id, { decision: 'approve' })).status, 200);
    assert.deepEqual(await f.bookingRows([charityRun, productExpo]), [
      { status: 'confirmed', buffer_conflict: false }, { status: 'confirmed', buffer_conflict: false },
    ]);
  } finally {
    await f.close();
  }
});

// TC_E06S06_05: one minute of overlap is refused at submission, so no conflicting row exists.
test('TC_E06S06_05: a one-minute overlap is refused at submission without disclosure or a new row', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const charityRun = await f.createEvent(f.coordinator, 'Charity Run');
    const productExpo = await f.createEvent(f.coordinator, 'Product Expo');
    const existing = await f.request(charityRun, f.ids.venueA, f.period('2027-02-10', '09:00', '11:00'));
    assert.ok('booking' in existing.body);
    assert.equal((await decideBooking(f.pool, f.staff, existing.body.booking.id, { decision: 'approve' })).status, 200);
    const beforeRefusal = await f.effectSnapshot();
    await assert.rejects(f.request(productExpo, f.ids.venueA, f.period('2027-02-10', '10:59', '13:00')),
      refusedWithoutDisclosure('Charity Run', '10 Feb 2027, 9:00 am', '10 Feb 2027, 11:00 am'));
    assert.deepEqual(await f.effectSnapshot(), beforeRefusal);
    assert.deepEqual(await f.bookingRows([charityRun, productExpo]), [{ status: 'confirmed', buffer_conflict: false }]);
  } finally {
    await f.close();
  }
});

// Scenario 4 checklist: with non-zero buffers, buffered adjacency stays free and one minute more does not.
test('buffered adjacency is accepted and approved while a one-minute buffered overlap is refused', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    await f.setBuffers(f.ids.venueA, 30, 30);
    const firstEvent = await f.createEvent();
    const adjacentEvent = await f.createEvent();
    const overlapEvent = await f.createEvent();
    // 09:00-10:00 occupies 08:30-10:30; 11:00-12:00 occupies 10:30-12:30: they touch at 10:30.
    const first = await f.request(firstEvent, f.ids.venueA, f.period('2027-03-01', '09:00', '10:00'));
    assert.ok('booking' in first.body);
    const adjacent = await f.request(adjacentEvent, f.ids.venueA, f.period('2027-03-01', '11:00', '12:00'));
    assert.equal(adjacent.status, 201);
    assert.ok('booking' in adjacent.body);
    for (const id of [first.body.booking.id, adjacent.body.booking.id]) {
      assert.equal((await decideBooking(f.pool, f.staff, id, { decision: 'approve' })).status, 200);
    }
    assert.deepEqual((await f.bookingRows([firstEvent, adjacentEvent])).map(row => row.status), ['confirmed', 'confirmed']);
    // 12:59-13:59 occupies 12:29-14:29: one minute into the adjacent booking's window.
    await assert.rejects(f.request(overlapEvent, f.ids.venueA, f.period('2027-03-01', '12:59', '13:59')), { status: 409 });
    assert.deepEqual(await f.bookingRows([overlapEvent]), []);
  } finally {
    await f.close();
  }
});

// TC_E06S06_06 shared setup: two Pending requests accepted while adjacent, then a
// Venue Staff buffer edit (30/45) makes their buffered windows overlap 11:30-12:45.
async function bufferGrowthConflict(f: Awaited<ReturnType<typeof venueClaimPolicyFixture>>) {
  const charityRun = await f.createEvent(f.coordinator, 'Charity Run');
  const alumniDinner = await f.createEvent(f.coordinator, 'Alumni Dinner');
  const charity = await f.request(charityRun, f.ids.venueA, f.period('2027-03-02', '10:00', '12:00'));
  const alumni = await f.request(alumniDinner, f.ids.venueA, f.period('2027-03-02', '12:00', '14:00'));
  assert.ok('booking' in charity.body);
  assert.ok('booking' in alumni.body);
  assert.equal((await f.editBuffers(f.ids.venueA, 30, 45)).status, 200);
  // Equal status: the earlier booking keeps priority, the later one is flagged; both are retained.
  assert.deepEqual(await f.bookingRows([charityRun, alumniDinner]), [
    { status: 'pending', buffer_conflict: false }, { status: 'pending', buffer_conflict: true },
  ]);
  // Both approvals run at once: each rechecks the current buffers, and neither wins.
  const approvals = await Promise.all([charity.body.booking.id, alumni.body.booking.id]
    .map(id => decideBooking(f.pool, f.staff, id, { decision: 'approve' })));
  assert.deepEqual(approvals.map(result => result.status), [409, 409]);
  assert.deepEqual(await f.bookingRows([charityRun, alumniDinner]), [
    { status: 'pending', buffer_conflict: false }, { status: 'pending', buffer_conflict: true },
  ]);
  return { charityRun, alumniDinner, charityId: charity.body.booking.id, alumniId: alumni.body.booking.id };
}

// TC_E06S06_06 primary path: Venue Staff rejection resolves the conflict; a Rejected row stays terminal.
test('TC_E06S06_06: buffer growth blocks both approvals until Venue Staff rejects one request', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const conflict = await bufferGrowthConflict(f);
    assert.equal((await decideBooking(f.pool, f.staff, conflict.charityId, {
      decision: 'reject', reason: 'Resolve the overlap after buffer growth',
    })).status, 200);
    assert.equal((await decideBooking(f.pool, f.staff, conflict.alumniId, { decision: 'approve' })).status, 200);
    assert.equal((await decideBooking(f.pool, f.staff, conflict.charityId, { decision: 'approve' })).status, 409);
    const statuses = await f.bookingRows([conflict.charityRun, conflict.alumniDinner]);
    assert.deepEqual(statuses.map(row => row.status), ['rejected', 'confirmed']);
  } finally {
    await f.close();
  }
});

// TC_E06S06_06 alternative path: the Coordinator withdraws and replans one request instead.
test('TC_E06S06_06: a Coordinator withdrawal and replan resolves the conflict so both can be approved', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const conflict = await bufferGrowthConflict(f);
    assert.equal((await f.withdraw(conflict.charityId)).status, 200);
    assert.equal((await decideBooking(f.pool, f.staff, conflict.alumniId, { decision: 'approve' })).status, 200);
    // Replanned period 15:30-17:00 occupies 15:00-17:45, clear of Alumni Dinner's 11:30-14:45.
    const replanned = await f.request(conflict.charityRun, f.ids.venueA, f.period('2027-03-02', '15:30', '17:00'));
    assert.ok('booking' in replanned.body);
    assert.equal((await decideBooking(f.pool, f.staff, replanned.body.booking.id, { decision: 'approve' })).status, 200);
    const charityRows = await f.pool.query<{ status: string }>(
      'SELECT status::text AS status FROM venue_bookings WHERE event_id=$1 ORDER BY status', [conflict.charityRun]);
    assert.deepEqual(charityRows.rows.map(row => row.status).sort(), ['confirmed', 'released']);
    assert.deepEqual((await f.bookingRows([conflict.alumniDinner])).map(row => row.status), ['confirmed']);
  } finally {
    await f.close();
  }
});

// TC_E06S06_07: one event may confirm overlapping bookings at separate venues.
test('TC_E06S06_07: one event can confirm overlapping requests at different venues', async () => {
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

// Scenario 1: converting a live Tentative hold preserves its claim as Pending.
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

// Scenario 1: only an unexpired Tentative hold is an active claim. Once its expiry
// passes (before the expiry job runs) a booking request for the slot is accepted.
test('an expired hold no longer claims the venue, so a later overlapping request is accepted', async () => {
  const f = await venueClaimPolicyFixture();
  try {
    const holdEvent = await f.createEvent();
    const laterEvent = await f.createEvent();
    const held = await f.hold(holdEvent, f.ids.venueA, f.period('2027-04-03', '10:00', '12:00'));
    assert.ok('hold' in held.body && held.body.hold);
    await assert.rejects(f.request(laterEvent, f.ids.venueA, f.period('2027-04-03', '10:00', '12:00')), { status: 409 });
    // Time passing, as in the E06-S05 expiry tests: the hold's expiry is now in the past.
    await f.pool.query("UPDATE venue_bookings SET expires_at = now() - interval '1 minute' WHERE id = $1", [held.body.hold.id]);
    const accepted = await f.request(laterEvent, f.ids.venueA, f.period('2027-04-03', '10:00', '12:00'));
    assert.equal(accepted.status, 201);
    assert.ok('booking' in accepted.body);
    assert.equal(accepted.body.booking.status, 'pending');
  } finally {
    await f.close();
  }
});

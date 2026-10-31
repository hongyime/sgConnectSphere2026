// SCRUM-242: E08-S04 Scenarios 3 and 5 against a real, disposable PostgreSQL
// schema with every repository migration applied, through the real
// Technical Support and Venue Staff actions.
//
// - TC_E08S04_03 (Scenario 3): a Technical Support failure on a Confirmed
//   event flags the arrangement and tells the Coordinator, and the event
//   stays Confirmed.
// - TC_E08S04_06 (Scenario 5, C-120, T-81): a venue block over a Confirmed
//   event's booking returns it to Planning and tells its Coordinator, without
//   cancelling it (E05-S06's blocks.ts). Once Venue Staff approve a
//   replacement and the Coordinator releases the lost booking (E10-S05), it is
//   back in Safety Review (Scenario 4).
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createVenueBlock } from '../src/modules/venueBooking/blocks.js';
import { decideBooking } from '../src/modules/venueBooking/decisions.js';
import { cancelLostVenueBooking } from '../src/modules/venueBooking/lostVenueRecovery.js';
import { markUnavailable } from '../src/modules/equipmentSupport/unavailability.js';
import { applyEventStatusChange } from '../src/modules/eventLifecycle/repository.js';
import { AUTO_SAFETY_REVIEW_ACTION } from '../src/modules/eventReadiness/autoSafetyReview.js';
import { inTransaction } from '../src/database/pool.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

const RANGE = '[2027-03-12T09:00:00+08:00,2027-03-12T17:00:00+08:00)';

async function fixture() {
  const f = await loginDatabase();
  const q = (sql: string, values: unknown[] = []) => f.pool.query(sql, values);
  const org = randomUUID();
  await q(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [org]);
  const user = async (role: string, name: string): Promise<AuthenticatedUser> => {
    const id = randomUUID();
    await q(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, 'unused', $4, $5::user_role)`,
      [id, role === 'event_organiser' ? org : null, `${id}@example.test`, name, role]);
    return { id, email: `${id}@example.test`, role: role as AuthenticatedUser['role'], isActive: true, failedLoginCount: 0 };
  };
  const organiser = await user('event_organiser', 'Organiser A');
  const coordinator = await user('event_coordinator', 'Coordinator One');
  const staff = await user('venue_staff', 'Venue Staff A');
  const tech = await user('technical_support_staff', 'Tech A');
  const officer = await user('safety_officer', 'Safety Officer A');
  const venue = randomUUID();
  await q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Summit Hall', 'Level 1', 300, '07:00', '23:00')`, [venue]);

  // Leadership Summit in Planning with its venue booked.
  async function plannedEvent() {
    const event = randomUUID();
    await q(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance, equipment_requirements)
      VALUES ($1, 'EVT-LEADER', $2, $3, $4, 'Leadership Summit', 'planning', $5::tstzrange, 150, 'none_required')`, [event, organiser.id, coordinator.id, org, RANGE]);
    const session = (await q('SELECT id FROM sessions WHERE event_id = $1', [event])).rows[0].id as string;
    const booking = (await q(`INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
      VALUES ($1, $2, $3, $4::tstzrange, 'confirmed', true) RETURNING id`, [venue, event, session, RANGE])).rows[0].id as string;
    return { event, session, booking };
  }
  // The same event Confirmed through the gate.
  async function confirmedEvent() {
    const made = await plannedEvent();
    await inTransaction(f.pool, client => applyEventStatusChange(client, made.event, 'safety_review', coordinator.id));
    await inTransaction(f.pool, client => applyEventStatusChange(client, made.event, 'confirmed', officer.id));
    return made;
  }
  const status = async (event: string) => (await q('SELECT status::text AS status FROM events WHERE id = $1', [event])).rows[0].status as string;
  const statusHistory = async (event: string) => (await q(`SELECT action, old_value, new_value FROM audit_logs
    WHERE event_id = $1 AND entity_type = 'event' AND field_changed = 'status' ORDER BY occurred_at, id`, [event])).rows as
    { action: string; old_value: string; new_value: string }[];
  const notices = async (event: string, userId: string) => (await q(`SELECT title, message FROM notifications
    WHERE event_id = $1 AND user_id = $2 ORDER BY created_at, id`, [event, userId])).rows as { title: string; message: string }[];
  return { ...f, q, organiser, coordinator, staff, tech, officer, venue, plannedEvent, confirmedEvent, status, statusHistory, notices };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

test('TC_E08S04_03: a Technical Support equipment failure on a Confirmed event is flagged and the event stays Confirmed', () => withFixture(async f => {
  const { event, session, booking } = await f.confirmedEvent();
  const equipment = randomUUID(), request = randomUUID();
  await f.q(`INSERT INTO equipment (id, name, category, total_quantity) VALUES ($1, 'Projector', 'AV', 2)`, [equipment]);
  await f.q(`INSERT INTO equipment_requests (id, event_id, session_id, equipment_id, quantity_requested, requested_by) VALUES ($1, $2, $3, $4, 2, $5)`,
    [request, event, session, equipment, f.coordinator.id]);
  const reservation = (await f.q(`INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
    VALUES ($1, $2, $3, $4, 2, $5::tstzrange, $6) RETURNING id`, [request, event, session, equipment, RANGE, f.tech.id])).rows[0].id as string;
  const historyBefore = await f.statusHistory(event);

  const result = await markUnavailable(f.pool, f.tech, equipment, { from: '2027-03-12', to: '2027-03-12', quantity: 1, reason: 'Lamp failed' });

  assert.equal(result.status, 201);
  assert.equal(await f.status(event), 'confirmed', 'no automatic status change under Scenario 3');
  assert.deepEqual(await f.statusHistory(event), historyBefore);
  assert.equal((await f.q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id = $1', [reservation])).rows[0].requires_reconfirmation, true,
    'the technical arrangement is flagged for review');
  assert.equal((await f.q('SELECT requires_reconfirmation FROM venue_bookings WHERE id = $1', [booking])).rows[0].requires_reconfirmation, false,
    'the venue booking stays confirmed and unflagged');
  assert.ok((await f.notices(event, f.coordinator.id)).some(notice => notice.message.includes('Projector')), 'the Coordinator is told');
}));

test('TC_E08S04_06: a venue block over a Confirmed booking returns the event to Planning, tells its Coordinator and does not cancel it', () => withFixture(async f => {
  const { event, booking } = await f.confirmedEvent();

  const result = await createVenueBlock(f.pool, f.staff, f.venue, { from: '2027-03-12', to: '2027-03-12', reason: 'Burst pipe' });

  assert.equal(result.status, 201);
  const affected = (result.body as { affectedEvents: { eventId: string; returnedToPlanning: boolean; coordinatorNotified: boolean }[] }).affectedEvents;
  assert.deepEqual(affected.map(row => [row.eventId, row.returnedToPlanning, row.coordinatorNotified]), [[event, true, true]]);
  assert.equal(await f.status(event), 'planning', 'not Cancelled');
  assert.deepEqual((await f.statusHistory(event)).at(-1), { action: (await f.statusHistory(event)).at(-1)!.action, old_value: 'confirmed', new_value: 'planning' });
  const told = (await f.notices(event, f.coordinator.id)).filter(notice => notice.title === 'Venue unavailable');
  assert.equal(told.length, 1);
  assert.match(told[0]!.message, /The event has returned to Planning\.$/);
  assert.notEqual((await f.q('SELECT status::text AS status FROM venue_bookings WHERE id = $1', [booking])).rows[0].status, 'confirmed',
    'the blocked booking no longer holds the venue');
}));

test('after a venue loss, the event waits for the replacement and the lost booking, then enters Safety Review (Scenarios 5 then 4)', () => withFixture(async f => {
  const { event, booking } = await f.confirmedEvent();
  await createVenueBlock(f.pool, f.staff, f.venue, { from: '2027-03-12', to: '2027-03-12', reason: 'Burst pipe' });
  assert.equal(await f.status(event), 'planning');
  const replacementVenue = randomUUID();
  await f.q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Garden Hall', 'Level 2', 300, '07:00', '23:00')`, [replacementVenue]);
  // E10-S05's recovery request: the replacement names the lost booking.
  const replacement = (await f.q(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, replaces_booking_id) VALUES ($1, $2, $3::tstzrange, 'pending', $4) RETURNING id`,
    [replacementVenue, event, RANGE, booking])).rows[0].id as string;

  // Approving the replacement leaves the lost booking Conflicting (E10-S05),
  // which readiness still lists, so the event waits.
  const approved = await decideBooking(f.pool, f.staff, replacement, { decision: 'approve' });
  assert.equal((approved.body as { enteredSafetyReview: boolean }).enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning');

  // The Coordinator releases the lost booking: nothing is outstanding now.
  const cancelled = await cancelLostVenueBooking(f.pool, f.coordinator, { booking_id: booking });
  assert.equal(cancelled.status, 200);
  assert.equal((cancelled.body as { enteredSafetyReview: boolean }).enteredSafetyReview, true);
  assert.equal(await f.status(event), 'safety_review');
  const history = await f.statusHistory(event);
  assert.deepEqual(history.map(row => row.new_value), ['safety_review', 'confirmed', 'planning', 'safety_review']);
  assert.equal(history.at(-1)!.action, AUTO_SAFETY_REVIEW_ACTION);
  assert.equal((await f.notices(event, f.officer.id)).filter(notice => notice.title === 'Safety check needed').length, 1);
}));

test('after a venue loss on an event that was never Confirmed, cancelling the lost booking leaves it for the Coordinator to submit', () => withFixture(async f => {
  const { event, booking } = await f.plannedEvent();
  await createVenueBlock(f.pool, f.staff, f.venue, { from: '2027-03-12', to: '2027-03-12', reason: 'Burst pipe' });
  assert.equal(await f.status(event), 'planning', 'a Planning event stays in Planning');
  const replacementVenue = randomUUID();
  await f.q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Garden Hall', 'Level 2', 300, '07:00', '23:00')`, [replacementVenue]);
  const replacement = (await f.q(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, replaces_booking_id) VALUES ($1, $2, $3::tstzrange, 'pending', $4) RETURNING id`,
    [replacementVenue, event, RANGE, booking])).rows[0].id as string;
  await decideBooking(f.pool, f.staff, replacement, { decision: 'approve' });
  const cancelled = await cancelLostVenueBooking(f.pool, f.coordinator, { booking_id: booking });
  assert.equal(cancelled.status, 200);
  assert.equal((cancelled.body as { enteredSafetyReview: boolean }).enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning');
  assert.deepEqual(await f.statusHistory(event), []);
}));

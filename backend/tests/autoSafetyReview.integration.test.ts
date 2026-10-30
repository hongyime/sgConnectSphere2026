// SCRUM-242: E08-S04 Scenario 4 (C-132, T-82) against a real, disposable
// PostgreSQL schema with every repository migration applied. A Confirmed
// event is reverted to Planning (Bryan's #377 path), its arrangements are
// confirmed again through the real Venue Staff and Technical Support
// actions, and the event enters Safety Review by itself on the last one.
//
// Traceability: story E08-S04 / SCRUM-61, case TC_E08S04_05 in
// docs/testing/cases/E08.md, code in eventReadiness/autoSafetyReview.ts.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { decideBooking, reconfirmBooking } from '../src/modules/venueBooking/decisions.js';
import { changeReservation } from '../src/modules/equipmentSupport/reservations.js';
import { assignTechnician } from '../src/modules/equipmentSupport/staffAssignments.js';
import { revertEventToPlanning } from '../src/modules/eventReadiness/submission.js';
import { AUTO_SAFETY_REVIEW_ACTION } from '../src/modules/eventReadiness/autoSafetyReview.js';
import { applyEventStatusChange, ConfirmationRefusedError } from '../src/modules/eventLifecycle/repository.js';
import { inTransaction } from '../src/database/pool.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

const OLD = '[2027-03-12T09:00:00+08:00,2027-03-12T17:00:00+08:00)';
const NEW = '[2027-03-19T09:00:00+08:00,2027-03-19T17:00:00+08:00)';

async function fixture() {
  const f = await loginDatabase();
  const q = (sql: string, values: unknown[] = []) => f.pool.query(sql, values);
  const org = randomUUID();
  await q(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [org]);
  const user = async (role: string, name: string): Promise<AuthenticatedUser> => {
    const id = randomUUID();
    await q(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, 'unused', $4, $5::user_role)`,
      [id, role === 'event_organiser' ? org : null, `${id}@example.test`, name, role]);
    return { id, email: `${id}@example.test`, role: role as AuthenticatedUser['role'], clientOrgId: role === 'event_organiser' ? org : undefined, isActive: true, failedLoginCount: 0 };
  };
  const organiser = await user('event_organiser', 'Organiser A');
  const coordinator = await user('event_coordinator', 'Coordinator A');
  const staff = await user('venue_staff', 'Venue Staff A');
  const tech = await user('technical_support_staff', 'Tech A');
  const officer = await user('safety_officer', 'Safety Officer A');
  const venue = randomUUID();
  await q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Charity Hall', 'Level 1', 300, '07:00', '23:00')`, [venue]);

  // A Planning event with a Confirmed booking on its sole Session.
  async function plannedEvent(code: string) {
    const event = randomUUID();
    await q(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance, equipment_requirements)
      VALUES ($1, $2, $3, $4, $5, 'Charity Run', 'planning', $6::tstzrange, 150, 'none_required')`, [event, code, organiser.id, coordinator.id, org, OLD]);
    const session = (await q('SELECT id FROM sessions WHERE event_id = $1', [event])).rows[0].id as string;
    const booking = (await q(`INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
      VALUES ($1, $2, $3, $4::tstzrange, 'confirmed', true) RETURNING id`, [venue, event, session, OLD])).rows[0].id as string;
    return { event, session, booking };
  }
  // Through the gate (E08-S03, then the Safety Officer), then reverted by
  // the Coordinator with a reason (#377), as TC_E08S04_05 describes.
  async function revertedEvent(code: string) {
    const made = await plannedEvent(code);
    await inTransaction(f.pool, client => applyEventStatusChange(client, made.event, 'safety_review', coordinator.id));
    await inTransaction(f.pool, client => applyEventStatusChange(client, made.event, 'confirmed', officer.id));
    await revertEventToPlanning(f.pool, coordinator, made.event, { reason: 'The date has to move a week' });
    return made;
  }
  // The date moved a week: the booking is flagged and left on the old time.
  async function moveDate(event: string, booking: string) {
    await q('UPDATE events SET event_range = $2::tstzrange WHERE id = $1', [event, NEW]);
    await q('UPDATE venue_bookings SET requires_reconfirmation = true WHERE id = $1', [booking]);
  }
  const status = async (event: string) => (await q('SELECT status::text AS status FROM events WHERE id = $1', [event])).rows[0].status as string;
  const statusHistory = async (event: string) => (await q(`SELECT action, old_value, new_value, actor_id FROM audit_logs
    WHERE event_id = $1 AND entity_type = 'event' AND field_changed = 'status' ORDER BY occurred_at, id`, [event])).rows as
    { action: string; old_value: string; new_value: string; actor_id: string }[];
  const noticesFor = async (event: string, title: string) => (await q(`SELECT user_id, message FROM notifications
    WHERE event_id = $1 AND title = $2 ORDER BY user_id`, [event, title])).rows as { user_id: string; message: string }[];
  return { ...f, q, organiser, coordinator, staff, tech, officer, venue, plannedEvent, revertedEvent, moveDate, status, statusHistory, noticesFor };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

test('TC_E08S04_05: reconfirming the last booking of a reverted event puts it in Safety Review and tells the Safety Officer', () => withFixture(async f => {
  const { event, booking } = await f.revertedEvent('EVT-8401');
  await f.moveDate(event, booking);

  const result = await reconfirmBooking(f.pool, f.staff, booking);

  assert.equal(result.status, 200);
  assert.equal((result.body as { enteredSafetyReview: boolean }).enteredSafetyReview, true);
  assert.equal(await f.status(event), 'safety_review', 'no Coordinator submission was needed');
  const history = await f.statusHistory(event);
  assert.deepEqual(history.map(row => [row.old_value, row.new_value]),
    [['planning', 'safety_review'], ['safety_review', 'confirmed'], ['confirmed', 'planning'], ['planning', 'safety_review']],
    'the earlier approval stays in the history');
  assert.deepEqual([history.at(-1)!.action, history.at(-1)!.actor_id], [AUTO_SAFETY_REVIEW_ACTION, f.staff.id]);

  const officers = await f.noticesFor(event, 'Safety check needed');
  assert.deepEqual(officers.map(row => row.user_id), [f.officer.id]);
  assert.match(officers[0]!.message, /^EVT-8401 Charity Run's arrangements are confirmed again, so it is back in Safety Review\. It needs a new Operational Safety Check: the earlier approval does not carry over\.$/);
  assert.deepEqual((await f.noticesFor(event, 'Back in Safety Review')).map(row => row.user_id), [f.coordinator.id]);
  const organiser = (await f.noticesFor(event, 'Awaiting safety check')).filter(row => row.message.includes('confirmed again'));
  assert.deepEqual(organiser.map(row => row.user_id), [f.organiser.id]);
}));

test('the earlier safety approval is not reused: only a Safety Officer can confirm the event again', () => withFixture(async f => {
  const { event, booking } = await f.revertedEvent('EVT-8402');
  await f.moveDate(event, booking);
  await reconfirmBooking(f.pool, f.staff, booking);
  await assert.rejects(inTransaction(f.pool, client => applyEventStatusChange(client, event, 'confirmed', f.coordinator.id)), ConfirmationRefusedError);
  assert.equal(await f.status(event), 'safety_review');
  await inTransaction(f.pool, client => applyEventStatusChange(client, event, 'confirmed', f.officer.id));
  assert.equal(await f.status(event), 'confirmed', 'a new approval confirms it');
}));

test('the event waits until the last arrangement: booking, then equipment, then Technical Support staff', () => withFixture(async f => {
  const { event, session, booking } = await f.revertedEvent('EVT-8403');
  await f.moveDate(event, booking);
  // A flagged equipment reservation and an unstaffed support request as well.
  const equipment = randomUUID(), request = randomUUID(), support = randomUUID();
  await f.q(`INSERT INTO equipment (id, name, category, total_quantity) VALUES ($1, 'Projector', 'AV', 10)`, [equipment]);
  await f.q(`INSERT INTO equipment_requests (id, event_id, session_id, equipment_id, quantity_requested, requested_by) VALUES ($1, $2, $3, $4, 2, $5)`,
    [request, event, session, equipment, f.coordinator.id]);
  const reservation = (await f.q(`INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by, requires_reconfirmation)
    VALUES ($1, $2, $3, $4, 2, $5::tstzrange, $6, true) RETURNING id`, [request, event, session, equipment, OLD, f.tech.id])).rows[0].id as string;
  await f.q(`INSERT INTO tech_support_requests (id, event_id, support_range, requested_by, support_description, support_required) VALUES ($1, $2, $3::tstzrange, $4, 'Sound desk operator', true)`,
    [support, event, NEW, f.coordinator.id]);

  const venueDone = await reconfirmBooking(f.pool, f.staff, booking);
  assert.equal((venueDone.body as { enteredSafetyReview: boolean }).enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning', 'equipment and support are still outstanding');

  const equipmentDone = await changeReservation(f.pool, f.tech, event, { reservationId: reservation, quantity: 2 });
  assert.equal(equipmentDone.status, 200);
  assert.equal(equipmentDone.body.enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning', 'support is still outstanding');

  const supportDone = await assignTechnician(f.pool, f.tech, { request: support, staff: f.tech.id });
  assert.equal(supportDone.status, 201);
  assert.equal((supportDone.body as { enteredSafetyReview: boolean }).enteredSafetyReview, true);
  assert.equal(await f.status(event), 'safety_review');
  assert.equal((await f.statusHistory(event)).at(-1)!.actor_id, f.tech.id);
}));

test('re-reserving the last flagged equipment puts a reverted event in Safety Review', () => withFixture(async f => {
  const { event, session } = await f.revertedEvent('EVT-8404');
  const equipment = randomUUID(), request = randomUUID();
  await f.q(`INSERT INTO equipment (id, name, category, total_quantity) VALUES ($1, 'Microphone', 'AV', 10)`, [equipment]);
  await f.q(`INSERT INTO equipment_requests (id, event_id, session_id, equipment_id, quantity_requested, requested_by) VALUES ($1, $2, $3, $4, 1, $5)`,
    [request, event, session, equipment, f.coordinator.id]);
  const reservation = (await f.q(`INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by, requires_reconfirmation)
    VALUES ($1, $2, $3, $4, 1, $5::tstzrange, $6, true) RETURNING id`, [request, event, session, equipment, OLD, f.tech.id])).rows[0].id as string;
  const result = await changeReservation(f.pool, f.tech, event, { reservationId: reservation, quantity: 1 });
  assert.equal(result.body.enteredSafetyReview, true);
  assert.equal(await f.status(event), 'safety_review');
}));

test('approving the last pending booking of a reverted event puts it in Safety Review', () => withFixture(async f => {
  const { event, booking } = await f.revertedEvent('EVT-8405');
  // The original booking was released (as after a venue loss); a replacement waits.
  await f.q(`UPDATE venue_bookings SET status = 'released', is_primary = false WHERE id = $1`, [booking]);
  const replacement = randomUUID();
  await f.q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Garden Hall', 'Level 2', 300, '07:00', '23:00')`, [replacement]);
  const pending = (await f.q(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, 'pending') RETURNING id`,
    [replacement, event, OLD])).rows[0].id as string;
  assert.equal(await f.status(event), 'planning');
  const result = await decideBooking(f.pool, f.staff, pending, { decision: 'approve' });
  assert.equal(result.status, 200);
  assert.equal((result.body as { enteredSafetyReview: boolean }).enteredSafetyReview, true);
  assert.equal(await f.status(event), 'safety_review');
}));

test('an event that was never Confirmed stays in Planning for its Coordinator to submit', () => withFixture(async f => {
  const { event, booking } = await f.plannedEvent('EVT-8406');
  await f.moveDate(event, booking);
  const result = await reconfirmBooking(f.pool, f.staff, booking);
  assert.equal(result.status, 200);
  assert.equal((result.body as { enteredSafetyReview: boolean }).enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning');
  assert.deepEqual(await f.statusHistory(event), []);
  assert.deepEqual(await f.noticesFor(event, 'Safety check needed'), []);
}));

test('rejecting a booking never moves a reverted event, even with nothing left outstanding', () => withFixture(async f => {
  const { event } = await f.revertedEvent('EVT-8407');
  const other = randomUUID();
  await f.q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Annex', 'Level 3', 300, '07:00', '23:00')`, [other]);
  const pending = (await f.q(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, 'pending') RETURNING id`,
    [other, event, OLD])).rows[0].id as string;
  const rejected = await decideBooking(f.pool, f.staff, pending, { decision: 'reject', reason: 'Room is too small' });
  assert.equal((rejected.body as { enteredSafetyReview: boolean }).enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning', 'a rejection confirms nothing, even though nothing is outstanding now');
}));

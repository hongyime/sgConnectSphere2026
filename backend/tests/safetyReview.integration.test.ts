// SCRUM-158 / SCRUM-247: E08-S06 "Conduct the Operational Safety Check as the
// Safety Officer" against a real, disposable PostgreSQL schema with every
// repository migration applied: the queue's order, the per-Session review
// detail, each decision's status, flags, audit rows and notices, the
// "sent back" read (D109) and that a returned Event waits for its Coordinator
// to resubmit (D118).
//
// Traceability: story E08-S06 / SCRUM-158, cases TC_E08S06_01 to _06 in
// docs/testing/cases/E08.md, code in eventReadiness/submission.ts,
// safetyCheck.ts and safetyReturn.ts.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { reconfirmBooking } from '../src/modules/venueBooking/decisions.js';
import { SAFETY_FACTORS } from '../src/modules/eventReadiness/safetyCheck.js';
import { decideSafetyReview, getEventReadiness, getSafetyReviewEvent, listSafetyReviewEvents, submitForSafetyReview } from '../src/modules/eventReadiness/submission.js';
import { getEvent } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

// Each Event gets its own day, so their bookings of the same venues don't overlap.
const at = (day: number, from: string, to: string) => `[2027-03-${day}T${from}:00+08:00,2027-03-${day}T${to}:00+08:00)`;
const DAY = at(19, '09:00', '18:00');

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
  const lead = await user('event_coordinator_lead', 'Lead A');
  const staff = await user('venue_staff', 'Venue Staff A');
  const tech = await user('technical_support_staff', 'Tech A');
  const officer = await user('safety_officer', 'Safety Officer A');
  const layout = (await q(`INSERT INTO room_layouts (code, label) VALUES ('theatre-e08s06', 'Theatre') RETURNING id`)).rows[0].id as string;
  const banquet = (await q(`INSERT INTO room_layouts (code, label) VALUES ('banquet-e08s06', 'Banquet') RETURNING id`)).rows[0].id as string;
  const ramp = (await q(`INSERT INTO accessibility_features (code, label) VALUES ('ramp-e08s06', 'Step-free access') RETURNING id`)).rows[0].id as string;
  const venue = async (name: string) => {
    const id = randomUUID();
    await q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, $2, 'Level 1', 500, '07:00', '23:00')`, [id, name]);
    return id;
  };
  const riverside = await venue('Riverside Hall');
  const annex = await venue('Annex Room');
  await q(`INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity) VALUES ($1, $2, 400), ($3, $4, 120)`, [riverside, layout, annex, banquet]);
  // A maintenance block still in force, and a lifted one that isn't a restriction.
  await q(`INSERT INTO venue_blocks (venue_id, block_range, reason) VALUES ($1, '[2027-06-01T00:00:00+08:00,2027-06-02T00:00:00+08:00)', 'East exit repairs')`, [riverside]);
  await q(`INSERT INTO venue_blocks (venue_id, block_range, reason, lifted_at) VALUES ($1, '[2027-07-01T00:00:00+08:00,2027-07-02T00:00:00+08:00)', 'Old block', now())`, [riverside]);
  const rig = randomUUID();
  await q(`INSERT INTO equipment (id, name, category, total_quantity) VALUES ($1, 'Stage rig', 'AV', 10)`, [rig]);

  // An Event in Safety Review: a morning Session in Riverside Hall (Theatre,
  // step-free access) with a stage rig, and an afternoon Session in the Annex.
  async function reviewedEvent(code: string, enteredAt = '2027-03-01T10:00:00+08:00', day = 19) {
    const event = randomUUID();
    const MORNING = at(day, '09:00', '12:00'), AFTERNOON = at(day, '13:00', '18:00');
    await q(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, status_changed_at, event_range, expected_attendance, equipment_requirements, accessibility_note)
      VALUES ($1, $2, $3, $4, $5, 'Charity Run', 'safety_review', $6, $7::tstzrange, 300, 'Stage rig', 'Two wheelchair users')`,
    [event, code, organiser.id, coordinator.id, org, enteredAt, at(day, '09:00', '18:00')]);
    const morning = (await q('SELECT id FROM sessions WHERE event_id = $1', [event])).rows[0].id as string;
    await q(`UPDATE sessions SET title = 'Morning', session_range = $2::tstzrange, layout_id = $3 WHERE id = $1`, [morning, MORNING, layout]);
    const afternoon = (await q(`INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id)
      VALUES ($1, 'Afternoon', $2::tstzrange, 100, $3) RETURNING id`, [event, AFTERNOON, banquet])).rows[0].id as string;
    await q('INSERT INTO session_accessibility_needs (session_id, feature_id) VALUES ($1, $2)', [morning, ramp]);
    const booking = (await q(`INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary)
      VALUES ($1, $2, $3, $4::tstzrange, 'confirmed', true) RETURNING id`, [riverside, event, morning, MORNING])).rows[0].id as string;
    await q(`INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status)
      VALUES ($1, $2, $3, $4::tstzrange, 'confirmed')`, [annex, event, afternoon, AFTERNOON]);
    const request = randomUUID();
    await q(`INSERT INTO equipment_requests (id, event_id, session_id, equipment_id, quantity_requested, technical_notes, requested_by)
      VALUES ($1, $2, $3, $4, 1, 'Stage left, clear of the east exit', $5)`, [request, event, morning, rig, coordinator.id]);
    const reservation = (await q(`INSERT INTO equipment_reservations (request_id, event_id, session_id, equipment_id, quantity_reserved, reservation_range, reserved_by)
      VALUES ($1, $2, $3, $4, 1, $5::tstzrange, $6) RETURNING id`, [request, event, morning, rig, MORNING, tech.id])).rows[0].id as string;
    return { event, morning, afternoon, booking, reservation };
  }
  const status = async (event: string) => (await q('SELECT status::text AS status FROM events WHERE id = $1', [event])).rows[0].status as string;
  const noticesFor = async (event: string) => (await q(`SELECT user_id, title, message FROM notifications WHERE event_id = $1 ORDER BY created_at, user_id`, [event])).rows as
    { user_id: string; title: string; message: string }[];
  const decisionRows = async (event: string) => (await q(`SELECT id, actor_id, action, new_value FROM audit_logs
    WHERE event_id = $1 AND field_changed = 'safety_check'`, [event])).rows as { id: string; actor_id: string; action: string; new_value: string }[];
  return { ...f, q, organiser, coordinator, lead, staff, tech, officer, reviewedEvent, status, noticesFor, decisionRows };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

const factors = (unsatisfactory: string[] = []) => Object.fromEntries(SAFETY_FACTORS.map(key =>
  [key, { satisfactory: !unsatisfactory.includes(key), comment: unsatisfactory.includes(key) ? 'Stage rig blocks the east exit' : 'Checked' }]));

test('TC_E08S06_01: the queue lists Safety Review Events oldest entry first, and the detail groups arrangements by Session', () => withFixture(async f => {
  const later = await f.reviewedEvent('EVT-8601', '2027-03-02T10:00:00+08:00', 20);
  const earlier = await f.reviewedEvent('EVT-8602', '2027-03-01T10:00:00+08:00');
  assert.deepEqual((await listSafetyReviewEvents(f.pool, f.officer)).map(row => row.event_code), ['EVT-8602', 'EVT-8601']);

  const detail = await getSafetyReviewEvent(f.pool, f.officer, 'EVT-8601');
  assert.equal(detail.event.id, later.event);
  assert.deepEqual(detail.sessions.map(s => [s.id, s.title, s.expected_attendance, s.layout, s.accessibility, s.accessibility_note]), [
    [later.morning, 'Morning', 300, 'Theatre', ['Step-free access'], 'Two wheelchair users'],
    [later.afternoon, 'Afternoon', 100, 'Banquet', [], 'Two wheelchair users'],
  ]);
  assert.deepEqual(detail.venues.map(v => [v.session_id, v.name, v.capacity, v.restrictions]), [
    [later.morning, 'Riverside Hall', 400, ['East exit repairs']],
    [later.afternoon, 'Annex Room', 120, []],
  ]);
  assert.deepEqual(detail.equipment.map(e => [e.session_id, e.name, e.requested, e.reserved, e.placement]),
    [[later.morning, 'Stage rig', 1, 1, 'Stage left, clear of the east exit']]);
  assert.notEqual(earlier.event, later.event);
}));

test('TC_E08S06_02: approval confirms the Event, keeps one immutable checklist row and sends "Event confirmed" with the details', () => withFixture(async f => {
  const { event } = await f.reviewedEvent('EVT-8603');
  await decideSafetyReview(f.pool, f.officer, 'EVT-8603', { decision: 'approve', factors: factors() });
  assert.equal(await f.status(event), 'confirmed');

  const [row] = await f.decisionRows(event);
  assert.deepEqual([row!.actor_id, row!.action], [f.officer.id, 'Safety check approved']);
  assert.deepEqual(JSON.parse(row!.new_value), { decision: 'approve', factors: factors() });
  // E14-S02: the decision can't be edited or deleted afterwards.
  await assert.rejects(f.q(`UPDATE audit_logs SET new_value = 'x' WHERE id = $1`, [row!.id]), /cannot be edited or deleted/);
  await assert.rejects(f.q('DELETE FROM audit_logs WHERE id = $1', [row!.id]), /cannot be edited or deleted/);

  const notices = await f.noticesFor(event);
  assert.deepEqual(notices.map(n => [n.user_id, n.title]).sort(), [[f.coordinator.id, 'Event confirmed'], [f.organiser.id, 'Event confirmed']].sort());
  assert.equal(notices[0]!.message, 'EVT-8603 Charity Run passed the Operational Safety Check and is now Confirmed. '
    + 'When: 19 Mar 2027, 9:00 am to 19 Mar 2027, 6:00 pm. Venues: Riverside Hall, Annex Room. Equipment: 1 × Stage rig.');
}));

test('TC_E08S06_03: requesting changes flags the equipment only, and the Event waits for its Coordinator to resubmit', () => withFixture(async f => {
  const { event, reservation } = await f.reviewedEvent('EVT-8604');
  // It was Confirmed once before, so automatic re-entry (T-82) would otherwise apply.
  await f.q(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
    VALUES ($1, 'event', $2, $2, 'Safety check approved', 'status', 'safety_review', 'confirmed')`, [f.officer.id, event]);
  await decideSafetyReview(f.pool, f.officer, 'EVT-8604',
    { decision: 'request_changes', factors: factors(['equipment_placement']), reason: 'Move the rig' });
  assert.equal(await f.status(event), 'planning');
  assert.deepEqual((await f.q('SELECT requires_reconfirmation FROM venue_bookings WHERE event_id = $1', [event])).rows.map(r => r.requires_reconfirmation), [false, false]);
  assert.equal((await f.q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id = $1', [reservation])).rows[0].requires_reconfirmation, true);
  const notices = await f.noticesFor(event);
  assert.equal(notices.length, 2);
  assert.equal(notices[0]!.message, 'The Safety Officer requested changes, so EVT-8604 Charity Run is back in Planning. Reason: Move the rig. '
    + 'Items to address: Equipment placement: Stage rig blocks the east exit.');
  assert.deepEqual((await getEventReadiness(f.pool, f.coordinator, 'EVT-8604')).safetyReturn?.decision, 'request_changes');

  // D118: reconfirming the flagged reservation leaves it in Planning.
  await f.q('UPDATE equipment_reservations SET requires_reconfirmation = false WHERE id = $1', [reservation]);
  const booking = (await f.q(`SELECT id FROM venue_bookings WHERE event_id = $1 AND is_primary`, [event])).rows[0].id as string;
  await f.q('UPDATE venue_bookings SET requires_reconfirmation = true WHERE id = $1', [booking]);
  const reconfirmed = await reconfirmBooking(f.pool, f.staff, booking);
  assert.equal((reconfirmed.body as { enteredSafetyReview: boolean }).enteredSafetyReview, false);
  assert.equal(await f.status(event), 'planning', 'no automatic re-entry after a safety decision');

  await submitForSafetyReview(f.pool, f.coordinator, 'EVT-8604');
  assert.equal(await f.status(event), 'safety_review');
  assert.equal((await getEventReadiness(f.pool, f.coordinator, 'EVT-8604')).safetyReturn, null);
}));

test('TC_E08S06_04: rejecting keeps the Event and its arrangements and shows the rejection to the Coordinator and Organiser', () => withFixture(async f => {
  const { event } = await f.reviewedEvent('EVT-8605');
  await decideSafetyReview(f.pool, f.officer, 'EVT-8605', { decision: 'reject', factors: factors(['crowd_movement']), reason: 'Unsafe overall' });
  assert.equal(await f.status(event), 'planning');
  assert.deepEqual((await f.q(`SELECT status::text AS s, requires_reconfirmation AS r FROM venue_bookings WHERE event_id = $1`, [event])).rows,
    [{ s: 'confirmed', r: false }, { s: 'confirmed', r: false }]);
  assert.deepEqual((await f.q(`SELECT status::text AS s FROM equipment_reservations WHERE event_id = $1`, [event])).rows, [{ s: 'reserved' }]);

  const readiness = await getEventReadiness(f.pool, f.coordinator, 'EVT-8605');
  assert.deepEqual([readiness.safetyReturn?.decision, readiness.safetyReturn?.reason], ['reject', 'Unsafe overall']);
  const organiserView = await getEvent((sql, values) => f.pool.query(sql, values) as never, f.organiser, 'EVT-8605');
  assert.deepEqual([organiserView.safetyReturn?.decision, organiserView.safetyReturn?.reason], ['reject', 'Unsafe overall']);
  assert.ok((await f.noticesFor(event)).every(n => n.title === 'Safety arrangement rejected'));
}));

test('TC_E08S06_05: other roles are refused the queue, the detail and every decision, each with an Access Denied row', () => withFixture(async f => {
  const { event } = await f.reviewedEvent('EVT-8606');
  for (const actor of [f.coordinator, f.lead, f.staff]) {
    await assert.rejects(listSafetyReviewEvents(f.pool, actor), { status: 403 });
    await assert.rejects(getSafetyReviewEvent(f.pool, actor, 'EVT-8606'), { status: 403 });
    await assert.rejects(decideSafetyReview(f.pool, actor, 'EVT-8606', { decision: 'approve', factors: factors() }), { status: 403 });
  }
  assert.equal(await f.status(event), 'safety_review');
  assert.equal((await f.q(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'Access Denied'`)).rows[0].n, 9);
  await assert.rejects(decideSafetyReview(f.pool, f.officer, 'EVT-8606', { decision: 'reject', factors: factors(), reason: ' ' }), { status: 400 });
  assert.equal(await f.status(event), 'safety_review');
}));

test('TC_E08S06_06: an Event Confirmed before the check has no safety record and is not in the queue', () => withFixture(async f => {
  const event = randomUUID();
  await f.q(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
    SELECT $1, 'EVT-8607', $2, $3, client_org_id, 'Old Gala', 'confirmed', $4::tstzrange, 50 FROM users WHERE id = $2`,
  [event, f.organiser.id, f.coordinator.id, DAY]);
  assert.deepEqual(await listSafetyReviewEvents(f.pool, f.officer), []);
  assert.deepEqual(await f.decisionRows(event), []);
  assert.equal(await f.status(event), 'confirmed');
}));

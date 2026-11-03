// SCRUM-158 (E08-S06) unit tests: the Safety Officer's review detail, each
// decision and what it writes, the notices (D115) and the "sent back" read
// (D109, D118), against a scripted database double that answers each
// statement by its SQL. The real statements are proved against PostgreSQL in
// safetyReview.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { SAFETY_FACTORS } from '../src/modules/eventReadiness/safetyCheck.js';
import { latestSafetyReturn, SAFETY_ACTIONS } from '../src/modules/eventReadiness/safetyReturn.js';
import { decideSafetyReview, getEventReadiness, getSafetyReviewEvent } from '../src/modules/eventReadiness/submission.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';

const START = new Date('2027-03-19T01:00:00Z');
const END = new Date('2027-03-19T09:00:00Z');
const user = (role: string, id = `${role}-1`): AuthenticatedUser =>
  ({ id, email: `${role}@example.test`, role, isActive: true, failedLoginCount: 0 }) as AuthenticatedUser;
const officer = user('safety_officer');

type Script = {
  status?: string; coordinator?: string | null; lastAction?: string;
  venues?: unknown[]; equipment?: unknown[];
};

function scriptedDatabase(script: Script = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const notices: unknown[][] = [];
  let status = script.status ?? 'safety_review';
  const coordinator = script.coordinator === undefined ? 'coordinator-1' : script.coordinator;
  const venues = script.venues ?? [{ id: 'b-1', session_id: 's-1', name: 'Riverside Hall', capacity: 400, restrictions: [] }];
  const equipment = script.equipment ?? [
    { id: 'q-1', session_id: 's-1', name: 'Stage rig', requested: 1, reserved: 1, placement: 'Stage left' },
    { id: 'q-2', session_id: 's-1', name: 'Lectern', requested: 1, reserved: 0, placement: null },
  ];
  const answer = (sql: string, values: unknown[] = []): unknown[] => {
    if (sql.includes('FROM events WHERE (id::text = $1 OR event_code = $1)'))
      return [{ id: 'event-1', event_code: 'EVT-1', title: 'Charity Run', status, coordinator_id: coordinator,
        organiser_id: 'organiser-1', starts_at: START, ends_at: END, equipment_requirements: 'Stage rig' }];
    if (sql.includes("AND e.status='safety_review'"))
      return status === 'safety_review' ? [{ id: 'event-1', event_code: 'EVT-1', title: 'Charity Run', status }] : [];
    if (sql.includes('FROM sessions s JOIN events e'))
      return [{ id: 's-1', title: null, starts_at: START, ends_at: END, expected_attendance: 300, layout: 'Theatre',
        accessibility_note: 'Two wheelchair users', accessibility: ['Step-free access'] }];
    if (sql.includes('FROM venue_bookings b JOIN venues v ON v.id=b.venue_id')) return venues;
    if (sql.includes('FROM equipment_requests req')) return equipment;
    if (sql.includes("COALESCE(support_description,'')")) return [{ id: 't-1', description: 'Sound desk', status: 'staffed' }];
    if (sql.includes('JOIN LATERAL'))
      return script.lastAction ? [{ action: script.lastAction, occurred_at: START, reason: 'Exit blocked' }] : [];
    if (sql.startsWith('SELECT status FROM events WHERE id = $1 FOR UPDATE')) return [{ status }];
    if (sql.includes('UPDATE events')) {
      status = values[1] as string;
      return [{ id: 'event-1', title: 'Charity Run', status, status_changed_at: START, start_at: START, end_at: END,
        organiser_id: 'organiser-1', coordinator_id: coordinator, client_org_id: 'org-1', expected_attendance: 300 }];
    }
    if (sql.includes("role::text AS role FROM users")) return [{ role: 'safety_officer' }];
    if (sql.includes('INSERT INTO audit_logs')) return [{ id: 'audit-1', occurred_at: START }];
    // applyEventStatusChange's audience read: nobody linked, so no generic notice.
    if (sql.includes('AS public_name')) return [{ id: 'event-1', title: 'Charity Run', public_name: null, status, starts_at: START, ends_at: END, organiser_id: null, coordinator_id: null }];
    if (sql.includes('INSERT INTO notifications')) { notices.push(values); return [{ id: String(values[4] ?? 'n') }]; }
    if (sql.includes('INSERT INTO notification_deliveries')) return [{ id: '00000000-0000-4000-8000-0000000000d2' }];
    if (sql.includes('SELECT d.delivery_status')) return [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'recipient@example.test', title: 'Notice', message: 'Synthetic notice' }];
    return [];
  };
  const query = async (sql: string, values?: unknown[]) => { calls.push({ sql, values }); const rows = answer(sql, values); return { rows, rowCount: rows.length }; };
  const pool = { query, connect: async () => ({ query, release: () => undefined }) } as unknown as Pool;
  return { pool, calls, notices };
}

const factors = (unsatisfactory: string[] = []) => Object.fromEntries(SAFETY_FACTORS.map(key =>
  [key, { satisfactory: !unsatisfactory.includes(key), comment: unsatisfactory.includes(key) ? 'Stage rig blocks the east exit' : 'Checked' }]));
const ran = (calls: { sql: string }[], pattern: RegExp) => calls.filter(call => pattern.test(call.sql));

test('TC_E08S06_01: the review detail lists Sessions, confirmed venues, equipment and support for a Safety Officer', async () => {
  const { pool, calls } = scriptedDatabase();
  const detail = await getSafetyReviewEvent(pool, officer, 'EVT-1');
  assert.equal(detail.event.id, 'event-1');
  assert.deepEqual(detail.sessions.map(session => [session.layout, session.accessibility]), [['Theatre', ['Step-free access']]]);
  assert.deepEqual(detail.venues.map(venue => venue.name), ['Riverside Hall']);
  assert.deepEqual(detail.equipment.map(item => item.placement), ['Stage left', null]);
  assert.deepEqual(detail.support, [{ id: 't-1', description: 'Sound desk', status: 'staffed' }]);
  assert.deepEqual(detail.factors, SAFETY_FACTORS);
  // #412 review: cancelled support is left out, as readiness leaves it out.
  assert.match(ran(calls, /COALESCE\(support_description/)[0]!.sql, /status <> 'cancelled'/);
});

test('TC_E08S06_05: the review detail refuses other roles with an audit row, and needs an id and an Event in Safety Review', async () => {
  await assert.rejects(getSafetyReviewEvent(scriptedDatabase().pool, undefined, 'EVT-1'), { status: 401 });
  for (const role of ['event_coordinator', 'event_coordinator_lead', 'event_organiser']) {
    const { pool, calls } = scriptedDatabase();
    await assert.rejects(getSafetyReviewEvent(pool, user(role), 'EVT-1'), (error: unknown) => error instanceof AccessError && error.status === 403);
    assert.equal(ran(calls, /Access Denied/).length, 1, role);
  }
  await assert.rejects(getSafetyReviewEvent(scriptedDatabase().pool, officer, ''), { status: 400 });
  await assert.rejects(getSafetyReviewEvent(scriptedDatabase({ status: 'planning' }).pool, officer, 'EVT-1'), { status: 404 });
});

test('TC_E08S06_02: approval confirms the Event, records the checklist and sends "Event confirmed" with the confirmed details', async () => {
  const { pool, calls, notices } = scriptedDatabase();
  const result = await decideSafetyReview(pool, officer, 'EVT-1', { decision: 'approve', factors: factors(), reason: 'Left over' });
  assert.deepEqual(result, { eventId: 'event-1', eventCode: 'EVT-1', status: 'confirmed', decision: 'approve', reason: undefined });
  // #412 review: approval keeps the Event's decision_reason (COALESCE(null, decision_reason)).
  assert.equal(ran(calls, /UPDATE events/)[0]!.values![2], null);
  const audits = ran(calls, /INSERT INTO audit_logs/);
  assert.deepEqual(audits[0]!.values, [officer.id, 'event-1', SAFETY_ACTIONS.approve, 'safety_review', 'confirmed']);
  assert.equal(audits[1]!.values![2], SAFETY_ACTIONS.approve);
  assert.deepEqual(JSON.parse(audits[1]!.values![3] as string), { decision: 'approve', factors: factors() });
  assert.equal(ran(calls, /requires_reconfirmation=true/).length, 0);
  assert.equal(notices.length, 2);
  for (const values of notices) {
    assert.ok(values.includes('Event confirmed'));
    assert.ok(values.includes('EVT-1 Charity Run passed the Operational Safety Check and is now Confirmed. '
      + 'When: 19 Mar 2027, 9:00 am to 19 Mar 2027, 5:00 pm. Venues: Riverside Hall. Equipment: 1 × Stage rig.'));
  }
});

test('TC_E08S06_02: an approval with nothing booked says so, and reaches only the Organiser without a Coordinator', async () => {
  const { pool, notices } = scriptedDatabase({ coordinator: null, venues: [], equipment: [] });
  await decideSafetyReview(pool, officer, 'EVT-1', { decision: 'approve', factors: factors() });
  assert.equal(notices.length, 1);
  assert.ok(notices[0]!.some(value => typeof value === 'string' && value.endsWith('Venues: none. Equipment: none.')));
});

test('TC_E08S06_03: requesting changes returns the Event to Planning, flags what the factors touch and lists the items to address', async () => {
  const { pool, calls, notices } = scriptedDatabase();
  const result = await decideSafetyReview(pool, officer, 'EVT-1',
    { decision: 'request_changes', factors: factors(['equipment_placement']), reason: 'Move the rig' });
  assert.equal(result.status, 'planning');
  // D111: equipment placement flags live reservations only; no venue factor failed.
  const flagged = (list: { sql: string }[]) => ran(list, /requires_reconfirmation=true/).map(call => /UPDATE (\w+)/.exec(call.sql)![1]);
  assert.deepEqual(flagged(calls), ['equipment_reservations']);
  const flag = ran(calls, /UPDATE equipment_reservations/)[0]!;
  assert.match(flag.sql, /status <> 'released'/);
  // #412 review: each flagged reservation gets its "Reconfirmation required" activity entry.
  assert.match(flag.sql, /INSERT INTO audit_logs[\s\S]*'Reconfirmation required: safety check changes requested'/);
  assert.deepEqual(flag.values, ['event-1', officer.id, 'equipment_reservation']);
  assert.equal(notices.length, 2);
  assert.ok(notices[0]!.includes('Safety check: changes requested'));
  assert.ok(notices[0]!.includes('The Safety Officer requested changes, so EVT-1 Charity Run is back in Planning. Reason: Move the rig. '
    + 'Items to address: Equipment placement: Stage rig blocks the east exit.'));

  const venue = scriptedDatabase();
  await decideSafetyReview(venue.pool, officer, 'EVT-1', { decision: 'request_changes', factors: factors(['emergency_access']), reason: 'Exit' });
  assert.deepEqual(flagged(venue.calls), ['venue_bookings']);
  assert.deepEqual(ran(venue.calls, /UPDATE venue_bookings/)[0]!.values, ['event-1', officer.id, 'venue_booking']);

  const attendance = scriptedDatabase();
  await decideSafetyReview(attendance.pool, officer, 'EVT-1', { decision: 'request_changes', factors: factors(['attendance_capacity']), reason: 'Too many' });
  assert.equal(ran(attendance.calls, /requires_reconfirmation=true/).length, 0);
});

test('TC_E08S06_04: rejecting returns the Event to Planning, flags nothing and sends "Safety arrangement rejected" with the reason', async () => {
  const { pool, calls, notices } = scriptedDatabase();
  const result = await decideSafetyReview(pool, officer, 'EVT-1', { decision: 'reject', factors: factors(), reason: 'Unsafe overall' });
  assert.deepEqual([result.status, result.reason], ['planning', 'Unsafe overall']);
  assert.equal(ran(calls, /requires_reconfirmation=true|cancelled/).length, 0);
  assert.deepEqual(ran(calls, /INSERT INTO audit_logs/)[0]!.values, [officer.id, 'event-1', SAFETY_ACTIONS.reject, 'safety_review', 'planning']);
  assert.ok(notices[0]!.includes('Safety arrangement rejected'));
  assert.ok(notices[0]!.includes('The Safety Officer rejected its safety arrangement, so EVT-1 Charity Run is back in Planning. Reason: Unsafe overall.'));
});

test('TC_E08S06_05: a decision needs a signed-in Safety Officer, a valid body and an Event in Safety Review', async () => {
  await assert.rejects(decideSafetyReview(scriptedDatabase().pool, undefined, 'EVT-1', {}), { status: 401 });
  const coordinator = scriptedDatabase();
  await assert.rejects(decideSafetyReview(coordinator.pool, user('event_coordinator'), 'EVT-1', { decision: 'approve', factors: factors() }), { status: 403 });
  assert.equal(ran(coordinator.calls, /Access Denied/).length, 1);
  // #412 review: the role is checked before the id, so a bad id still gets 403 and an audit row.
  const badId = scriptedDatabase();
  await assert.rejects(decideSafetyReview(badId.pool, user('event_coordinator'), '', {}), { status: 403 });
  assert.equal(ran(badId.calls, /Access Denied/).length, 1);
  await assert.rejects(decideSafetyReview(scriptedDatabase().pool, officer, '', {}), { status: 400 });
  await assert.rejects(decideSafetyReview(scriptedDatabase().pool, officer, 'EVT-1', { decision: 'reject', factors: factors() }), { status: 400 });
  for (const status of ['draft', 'planning']) {
    const { pool, calls } = scriptedDatabase({ status });
    await assert.rejects(decideSafetyReview(pool, officer, 'EVT-1', { decision: 'approve', factors: factors() }),
      { status: status === 'draft' ? 404 : 409 });
    assert.equal(ran(calls, /UPDATE events|INSERT INTO audit_logs/).length, 0, status);
    assert.equal(ran(calls, /ROLLBACK/).length, 1, status);
  }
});

test('D109 / D118: latestSafetyReturn reports a rejection or a request for changes, and nothing else', async () => {
  const read = async (lastAction?: string) => latestSafetyReturn(
    (sql, values) => scriptedDatabase({ lastAction }).pool.query(sql, values) as never, 'event-1');
  assert.deepEqual(await read(SAFETY_ACTIONS.reject), { decision: 'reject', reason: 'Exit blocked', decidedAt: START });
  assert.deepEqual(await read(SAFETY_ACTIONS.request_changes), { decision: 'request_changes', reason: 'Exit blocked', decidedAt: START });
  assert.equal(await read('Reverted to Planning'), null);
  assert.equal(await read(), null);
});

test('TC_E08S06_04: the Coordinator\'s readiness read carries the rejection (D109)', async () => {
  const { pool } = scriptedDatabase({ status: 'planning', lastAction: SAFETY_ACTIONS.reject });
  const readiness = await getEventReadiness(pool, user('event_coordinator', 'coordinator-1'), 'EVT-1');
  assert.deepEqual(readiness.safetyReturn, { decision: 'reject', reason: 'Exit blocked', decidedAt: START });
});

test('TC_E08S06_04: a reason that already ends a sentence is not given a second full stop', async () => {
  const { pool, notices } = scriptedDatabase();
  await decideSafetyReview(pool, officer, 'EVT-1', { decision: 'reject', factors: factors(), reason: 'Unsafe overall.' });
  assert.ok(notices[0]!.some(value => typeof value === 'string' && value.endsWith('Reason: Unsafe overall.')));
});

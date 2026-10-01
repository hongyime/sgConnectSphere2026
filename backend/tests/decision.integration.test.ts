// SCRUM-34 (E03-S03): real PostgreSQL proof of the decision rules,
// TC_E03S03_01 to _12. Each test gets its own random schema with every
// migration applied (helpers/loginDatabase.ts), so the status change, the
// decision reason, the audit entries, the notices and their email-outbox rows
// are all checked as PostgreSQL stores them.
//
// Requires TEST_DATABASE_URL pointing at a disposable local database named
// connectsphere_notification_test, never the live Supabase project.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import {
  decideEventRequest,
  DecisionBlockedError,
  rejectedEditRefusal,
  withDecision,
} from '../src/modules/eventLifecycle/decision.js';
import { AccessError, getEvent, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const REASON = 'Requested date unavailable across all venues';
const NOT_ASSIGNED = 'Only the assigned Coordinator can decide on this request.';
const NOT_UNDER_REVIEW = 'A decision can only be made while the request is Under Review.';

// Every required request field, as a complete submission stores them.
const COMPLETE = {
  description: 'An evening of talks and networking',
  purpose: 'Bring the community together',
  venue_requirements: 'Auditorium for 200 with a stage',
  accessibility_note: 'Step-free access to the stage',
  equipment_requirements: 'none_required',
  layout_preference: 'Theatre',
  registration_setup: 'Free registration, opens one month before',
};

async function fixture() {
  const f = await loginDatabase();
  const ids = {
    orgA: randomUUID(), orgB: randomUUID(),
    organiserA: randomUUID(), organiserB: randomUUID(), organiserC: randomUUID(),
    coordA: randomUUID(), coordB: randomUUID(),
  };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A'), ($2, 'Client B')`, [ids.orgA, ids.orgB]);
  const people: [string, string | null, string, string][] = [
    [ids.organiserA, ids.orgA, 'Organiser A', 'event_organiser'],
    [ids.organiserB, ids.orgA, 'Organiser B', 'event_organiser'],
    [ids.organiserC, ids.orgB, 'Organiser C', 'event_organiser'],
    [ids.coordA, null, 'Coordinator A', 'event_coordinator'],
    [ids.coordB, null, 'Coordinator B', 'event_coordinator'],
  ];
  for (const [id, org, name, role] of people) {
    await f.pool.query(
      `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'unused', $4, $5)`,
      [id, org, `${id}@example.test`, name, role],
    );
  }
  const user = (id: string): AuthenticatedUser => {
    const person = people.find(([personId]) => personId === id)!;
    return {
      id, email: `${id}@example.test`, role: person[3] as AuthenticatedUser['role'], clientOrgId: person[1],
      isActive: true, failedLoginCount: 0,
    };
  };
  // Complete by default; pass a field as null to leave it missing.
  const event = async (
    code: string, organiser: string, coordinator: string | null, status: string,
    fields: Partial<Record<keyof typeof COMPLETE, string | null>> = {}, range = "tstzrange('2027-03-01 09:00+00', '2027-03-01 12:00+00', '[)')",
  ) => {
    const org = people.find(([id]) => id === organiser)![1];
    const id = randomUUID();
    const values = { ...COMPLETE, ...fields };
    await f.pool.query(
      `INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance,
         description, purpose, venue_requirements, accessibility_note, equipment_requirements, layout_preference, registration_setup)
       VALUES ($1, $2, $3, $4, $5, $6, $7::event_status, ${range}, 40, $8, $9, $10, $11, $12, $13, $14)`,
      [id, code, organiser, coordinator, org, `Event ${code}`, status, values.description, values.purpose,
        values.venue_requirements, values.accessibility_note, values.equipment_requirements, values.layout_preference,
        values.registration_setup],
    );
    return id;
  };
  const query: Query = (sql, values) => f.pool.query(sql, values);
  const row = async (eventId: string) => (await f.pool.query<{ status: string; decision_reason: string | null; title: string; description: string | null }>(
    'SELECT status, decision_reason, title, description FROM events WHERE id = $1', [eventId])).rows[0]!;
  const notices = async (eventId: string) => (await f.pool.query<{
    user_id: string; title: string; message: string; delivery_id: string | null;
  }>(`SELECT n.user_id, n.title, n.message, d.id AS delivery_id
      FROM notifications n LEFT JOIN notification_deliveries d ON d.notification_id = n.id
      WHERE n.event_id = $1 ORDER BY n.created_at, n.id`, [eventId])).rows;
  const audits = async (eventId: string) => (await f.pool.query<{
    id: string; actor_id: string | null; action: string; field_changed: string | null; old_value: string | null; new_value: string | null;
  }>(`SELECT id, actor_id, action, field_changed, old_value, new_value FROM audit_logs WHERE event_id = $1 ORDER BY occurred_at, id`, [eventId])).rows;
  return { ...f, ids, user, event, query, row, notices, audits };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

async function refused(action: Promise<unknown>, status: number, message: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof AccessError, `expected AccessError, got ${String(error)}`);
    assert.equal(error.status, status);
    assert.equal(error.message, message);
    return true;
  });
}

async function blocked(action: Promise<unknown>, missingFields: string[]) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof DecisionBlockedError, `expected DecisionBlockedError, got ${String(error)}`);
    assert.equal(error.status, 409);
    assert.equal(error.message, "This request can't be approved until its required information is complete.");
    assert.deepEqual(error.missingFields, missingFields);
    return true;
  });
}

test('TC_E03S03_01: approving a complete Under Review request makes it Approved, audits it and notifies the Organiser once', () => withFixture(async f => {
  const eventId = await f.event('EVT-4001', f.ids.organiserA, f.ids.coordA, 'under_review');

  const result = await decideEventRequest(f.pool, f.user(f.ids.coordA), 'EVT-4001', { decision: 'approve' });

  assert.equal(result.status, 'approved');
  assert.equal(result.decisionReason, null);
  assert.deepEqual(await f.row(eventId), { status: 'approved', decision_reason: null, title: 'Event EVT-4001', description: COMPLETE.description });
  assert.deepEqual((await f.audits(eventId)).map(row => [row.actor_id, row.action, row.field_changed, row.old_value, row.new_value]), [
    [f.ids.coordA, 'Status changed to approved', 'status', 'under_review', 'approved'],
  ]);
  const sent = await f.notices(eventId);
  assert.equal(sent.length, 1, 'one notice in total: no generic duplicate, nothing to the deciding Coordinator');
  assert.equal(sent[0]!.user_id, f.ids.organiserA);
  assert.equal(sent[0]!.title, 'Request approved');
  assert.equal(sent[0]!.message, 'Coordinator A approved EVT-4001 Event EVT-4001. The request is now Approved and moves to planning.');
  assert.ok(sent[0]!.delivery_id, 'the notice has an email-outbox row');
}));

test('TC_E03S03_01: a failed email-outbox write leaves the request Under Review with no audit entry or notice', () => withFixture(async f => {
  const eventId = await f.event('EVT-4001', f.ids.organiserA, f.ids.coordA, 'under_review');
  await f.pool.query(`CREATE FUNCTION fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_outbox_failure'; END $$;
    CREATE TRIGGER fail_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_outbox()`);

  await assert.rejects(decideEventRequest(f.pool, f.user(f.ids.coordA), eventId, { decision: 'reject', reason: REASON }), /synthetic_outbox_failure/);

  assert.deepEqual(await f.row(eventId), { status: 'under_review', decision_reason: null, title: 'Event EVT-4001', description: COMPLETE.description });
  assert.equal((await f.notices(eventId)).length, 0);
  assert.equal((await f.audits(eventId)).length, 0);
}));

test('TC_E03S03_02: approval is blocked while Venue requirements is missing, the item is listed and nothing changes', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review', { venue_requirements: null });

  await blocked(decideEventRequest(f.pool, f.user(f.ids.coordB), 'EVT-2003', { decision: 'approve' }), ['Venue requirements']);

  assert.equal((await f.row(eventId)).status, 'under_review');
  assert.equal((await f.notices(eventId)).length, 0);
  assert.equal((await f.audits(eventId)).length, 0);
}));

test('TC_E03S03_02: every missing item is listed, in the order the request form shows them', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review', {
    description: null, venue_requirements: '   ', accessibility_note: null, registration_setup: null,
  });

  await blocked(decideEventRequest(f.pool, f.user(f.ids.coordB), eventId, { decision: 'approve' }),
    ['Description', 'Venue requirements', 'Accessibility needs', 'Registration setup']);
  assert.equal((await f.row(eventId)).status, 'under_review');
}));

test('SCRUM-34 D10: a start date already in the past does not block approval', () => withFixture(async f => {
  const eventId = await f.event('EVT-4002', f.ids.organiserA, f.ids.coordA, 'under_review', {},
    "tstzrange('2020-03-01 09:00+00', '2020-03-01 12:00+00', '[)')");

  await decideEventRequest(f.pool, f.user(f.ids.coordA), eventId, { decision: 'approve' });
  assert.equal((await f.row(eventId)).status, 'approved');
}));

test('TC_E03S03_03: rejecting with a reason makes the request Rejected, stores the reason and notifies the Organiser once, with the reason', () => withFixture(async f => {
  const eventId = await f.event('EVT-4003', f.ids.organiserA, f.ids.coordA, 'under_review');

  const result = await decideEventRequest(f.pool, f.user(f.ids.coordA), 'EVT-4003', { decision: 'reject', reason: `  ${REASON}  ` });

  assert.equal(result.status, 'rejected');
  assert.equal(result.decisionReason, REASON);
  const stored = await f.row(eventId);
  assert.deepEqual([stored.status, stored.decision_reason], ['rejected', REASON]);
  assert.deepEqual((await f.audits(eventId)).map(row => [row.actor_id, row.action, row.old_value, row.new_value]), [
    [f.ids.coordA, 'Status changed to rejected', 'under_review', 'rejected'],
  ]);
  const sent = await f.notices(eventId);
  assert.equal(sent.length, 1, 'one notice in total: no generic duplicate, nothing to the deciding Coordinator');
  assert.equal(sent[0]!.user_id, f.ids.organiserA);
  assert.equal(sent[0]!.title, 'Request rejected');
  assert.equal(sent[0]!.message, 'Coordinator A rejected EVT-4003 Event EVT-4003. The request is now Rejected and can no longer be changed.'
    + `\n\nReason: ${REASON}`);
  assert.ok(sent[0]!.delivery_id, 'the notice has an email-outbox row');
}));

test('TC_E03S03_04: a rejection without a reason is refused and the request stays Under Review', () => withFixture(async f => {
  const eventId = await f.event('EVT-4003', f.ids.organiserA, f.ids.coordA, 'under_review');

  for (const body of [{ decision: 'reject' }, { decision: 'reject', reason: '' }, { decision: 'reject', reason: '    ' }]) {
    await refused(decideEventRequest(f.pool, f.user(f.ids.coordA), eventId, body), 400, 'Add a reason for rejecting this request.');
  }

  assert.deepEqual(await f.row(eventId), { status: 'under_review', decision_reason: null, title: 'Event EVT-4003', description: COMPLETE.description });
  assert.equal((await f.notices(eventId)).length, 0);
  assert.equal((await f.audits(eventId)).length, 0);
}));

test('TC_E03S03_05: the Organiser sees a rejected request\'s reason and decision date, cannot edit it, and the edit is refused', () => withFixture(async f => {
  const eventId = await f.event('EVT-4003', f.ids.organiserA, f.ids.coordA, 'under_review');
  await decideEventRequest(f.pool, f.user(f.ids.coordA), eventId, { decision: 'reject', reason: REASON });
  await f.pool.query(`UPDATE audit_logs SET occurred_at = '2026-09-10T02:00:00Z' WHERE event_id = $1 AND field_changed = 'status'`, [eventId]);
  // A later status_changed_at must not move the decision date.
  await f.pool.query(`UPDATE events SET status_changed_at = '2026-09-20T02:00:00Z' WHERE id = $1`, [eventId]);

  const before = await getEvent(f.query, f.user(f.ids.organiserA), 'EVT-4003');
  assert.equal(before.canEdit, true, 'getEvent alone still offers editing; the wrapper is what makes it read-only');
  const view = await withDecision(f.query, before);
  assert.equal(view.decision?.outcome, 'rejected');
  assert.equal(view.decision?.reason, REASON);
  assert.equal(view.decision?.decidedAt.toISOString(), '2026-09-10T02:00:00.000Z');
  assert.equal(view.canEdit, false);
  assert.deepEqual(view.editableFields, []);

  assert.equal(await rejectedEditRefusal(f.query, f.user(f.ids.organiserA), 'EVT-4003'),
    'This request is rejected, so it can no longer be changed.');
}));

test('TC_E03S03_05: an approved request shows its decision date with no reason and keeps its edit rules', () => withFixture(async f => {
  const eventId = await f.event('EVT-4001', f.ids.organiserA, f.ids.coordA, 'under_review');
  await decideEventRequest(f.pool, f.user(f.ids.coordA), eventId, { decision: 'approve' });

  const before = await getEvent(f.query, f.user(f.ids.organiserA), eventId);
  const view = await withDecision(f.query, before);
  assert.equal(view.decision?.outcome, 'approved');
  assert.equal(view.decision?.reason, null);
  assert.equal(view.canEdit, before.canEdit);
  assert.deepEqual(view.editableFields, before.editableFields);
  assert.equal(await rejectedEditRefusal(f.query, f.user(f.ids.organiserA), eventId), null);

  const undecided = await f.event('EVT-4005', f.ids.organiserA, f.ids.coordA, 'under_review');
  assert.equal((await withDecision(f.query, await getEvent(f.query, f.user(f.ids.organiserA), undecided))).decision, null);
}));

test('TC_E03S03_06: a Coordinator not assigned to the request is refused for both decisions; nothing changes, the attempts are audited and hidden from the Organiser', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  await refused(decideEventRequest(f.pool, f.user(f.ids.coordA), 'EVT-2003', { decision: 'approve' }), 403, NOT_ASSIGNED);
  await refused(decideEventRequest(f.pool, f.user(f.ids.coordA), 'EVT-2003', { decision: 'reject', reason: REASON }), 403, NOT_ASSIGNED);

  assert.deepEqual([(await f.row(eventId)).status, (await f.row(eventId)).decision_reason], ['under_review', null]);
  assert.equal((await f.notices(eventId)).length, 0);
  assert.deepEqual((await f.audits(eventId)).map(row => [row.actor_id, row.action, row.field_changed]), [
    [f.ids.coordA, 'Access Denied', 'event_decision'],
    [f.ids.coordA, 'Access Denied', 'event_decision'],
  ]);
  const organiserView = await getEvent(f.query, f.user(f.ids.organiserC), eventId);
  assert.ok((organiserView.activityLog as { action: string }[]).every(entry => entry.action !== 'Access Denied'));
}));

test('TC_E03S03_07: a decision is refused while the request is Awaiting Clarification or already Approved', () => withFixture(async f => {
  const waiting = await f.event('EVT-3002', f.ids.organiserB, f.ids.coordB, 'awaiting_clarification');
  const approved = await f.event('EVT-3001', f.ids.organiserA, f.ids.coordA, 'approved');

  await refused(decideEventRequest(f.pool, f.user(f.ids.coordB), 'EVT-3002', { decision: 'approve' }), 409, NOT_UNDER_REVIEW);
  await refused(decideEventRequest(f.pool, f.user(f.ids.coordA), 'EVT-3001', { decision: 'reject', reason: 'Budget not confirmed' }), 409, NOT_UNDER_REVIEW);

  assert.equal((await f.row(waiting)).status, 'awaiting_clarification');
  assert.deepEqual([(await f.row(approved)).status, (await f.row(approved)).decision_reason], ['approved', null]);
  assert.equal((await f.notices(waiting)).length + (await f.notices(approved)).length, 0);
}));

test('TC_E03S03_08: the request\'s own Organiser cannot approve it, and the attempt is audited', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  await refused(decideEventRequest(f.pool, f.user(f.ids.organiserC), 'EVT-2003', { decision: 'approve' }), 403, NOT_ASSIGNED);

  assert.equal((await f.row(eventId)).status, 'under_review');
  assert.equal((await f.notices(eventId)).length, 0);
  assert.deepEqual((await f.audits(eventId)).map(row => [row.actor_id, row.action, row.field_changed]),
    [[f.ids.organiserC, 'Access Denied', 'event_decision']]);
}));

test('TC_E03S03_09: a rejected request cannot be decided again', () => withFixture(async f => {
  const eventId = await f.event('EVT-3005', f.ids.organiserB, f.ids.coordB, 'rejected');

  await refused(decideEventRequest(f.pool, f.user(f.ids.coordB), 'EVT-3005', { decision: 'approve' }), 409, NOT_UNDER_REVIEW);
  await refused(decideEventRequest(f.pool, f.user(f.ids.coordB), 'EVT-3005', { decision: 'reject', reason: REASON }), 409, NOT_UNDER_REVIEW);

  assert.equal((await f.row(eventId)).status, 'rejected');
  assert.equal((await f.notices(eventId)).length, 0);
}));

test('TC_E03S03_10: a 2001-character reason is refused and a 2000-character reason is stored in full', () => withFixture(async f => {
  const eventId = await f.event('EVT-2003', f.ids.organiserC, f.ids.coordB, 'under_review');

  await refused(decideEventRequest(f.pool, f.user(f.ids.coordB), eventId, { decision: 'reject', reason: 'x'.repeat(2001) }),
    400, 'The reason must be 2000 characters or fewer.');
  assert.deepEqual([(await f.row(eventId)).status, (await f.row(eventId)).decision_reason], ['under_review', null]);

  await decideEventRequest(f.pool, f.user(f.ids.coordB), eventId, { decision: 'reject', reason: 'x'.repeat(2000) });
  const stored = await f.row(eventId);
  assert.equal(stored.status, 'rejected');
  assert.equal(stored.decision_reason!.length, 2000);
  const sent = await f.notices(eventId);
  assert.deepEqual(sent.map(row => [row.user_id, row.title]), [[f.ids.organiserC, 'Request rejected']]);
}));

test('TC_E03S03_11: the Organiser of a rejected request is refused an edit with no change-request offer; others keep their usual refusal', () => withFixture(async f => {
  const eventId = await f.event('EVT-3005', f.ids.organiserB, f.ids.coordB, 'rejected');

  assert.equal(await rejectedEditRefusal(f.query, f.user(f.ids.organiserB), 'EVT-3005'),
    'This request is rejected, so it can no longer be changed.');
  assert.equal(await rejectedEditRefusal(f.query, f.user(f.ids.organiserB), eventId),
    'This request is rejected, so it can no longer be changed.');
  // Not theirs: the check stays silent, so a rejected request's status isn't
  // revealed and updateEventInformation gives its own refusal.
  for (const other of [f.ids.organiserA, f.ids.organiserC, f.ids.coordB]) {
    assert.equal(await rejectedEditRefusal(f.query, f.user(other), 'EVT-3005'), null);
  }
  assert.deepEqual(await f.row(eventId), { status: 'rejected', decision_reason: null, title: 'Event EVT-3005', description: COMPLETE.description });
}));

test('TC_E03S03_12: a request whose accessibility needs are given only as predefined features can be approved', () => withFixture(async f => {
  const feature = (await f.pool.query<{ id: string }>(
    `INSERT INTO accessibility_features (code, label) VALUES ('wheelchair_access', 'Wheelchair access') RETURNING id`)).rows[0]!.id;
  const featuresOnly = await f.event('EVT-4012', f.ids.organiserA, f.ids.coordA, 'under_review', { accessibility_note: null });
  await f.pool.query('INSERT INTO event_accessibility_needs (event_id, feature_id) VALUES ($1, $2)', [featuresOnly, feature]);
  const neither = await f.event('EVT-4013', f.ids.organiserA, f.ids.coordA, 'under_review', { accessibility_note: null });

  await blocked(decideEventRequest(f.pool, f.user(f.ids.coordA), neither, { decision: 'approve' }), ['Accessibility needs']);
  const result = await decideEventRequest(f.pool, f.user(f.ids.coordA), 'EVT-4012', { decision: 'approve' });

  assert.equal(result.status, 'approved');
  assert.equal((await f.row(featuresOnly)).status, 'approved');
  assert.deepEqual((await f.notices(featuresOnly)).map(row => [row.user_id, row.title]), [[f.ids.organiserA, 'Request approved']]);
}));

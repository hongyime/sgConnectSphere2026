// SCRUM-86 (E14-S02): real PostgreSQL proof of the activity log, TC_E14S02_01,
// _02, _04 and _08 (TC_E14S02_05 is in auditLogImmutability.integration.test.ts).
// Each test gets its own random schema with every migration applied
// (helpers/loginDatabase.ts), so the entries are checked as PostgreSQL stores
// them and as the Organiser and the assigned Coordinator read them (T-75).
//
// Requires TEST_DATABASE_URL pointing at a disposable local database named
// connectsphere_notification_test, never the live Supabase project.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { decideEventRequest } from '../src/modules/eventLifecycle/decision.js';
import {
  getAssignedEvent, requestCoordinatorReassignment, respondToCoordinatorReassignment,
} from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { deactivateAccount } from '../src/modules/accessControl/deactivation.js';
import { getEvent, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

// Every required request field, so a Coordinator can approve the request.
const COMPLETE = {
  description: 'An evening of talks and networking',
  purpose: 'Bring the community together',
  venue_requirements: 'Auditorium for 200 with a stage',
  accessibility_note: 'Step-free access to the stage',
  equipment_requirements: 'none_required',
  layout_preference: 'Theatre',
  registration_setup: 'Free registration, opens one month before',
};

type ActivityEntry = { occurred_at: Date; action: string; field_changed: string | null;
  old_value: string | null; new_value: string | null; actor_name: string | null };
type AuditRow = { actor_id: string | null; entity_type: string; entity_id: string; event_id: string | null;
  action: string; new_value: string | null; occurred_at: Date };

async function fixture() {
  const f = await loginDatabase();
  const ids = {
    orgA: randomUUID(), orgB: randomUUID(),
    organiserA: randomUUID(), organiserC: randomUUID(),
    coordA: randomUUID(), coordB: randomUUID(),
  };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A'), ($2, 'Client B')`, [ids.orgA, ids.orgB]);
  const people: [string, string | null, string, string][] = [
    [ids.organiserA, ids.orgA, 'Organiser A', 'event_organiser'],
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
      id, email: `${id}@example.test`, role: person[3] as AuthenticatedUser['role'], clientOrgId: person[1] ?? undefined,
      isActive: true, failedLoginCount: 0,
    };
  };
  // EVT-2003 as seeded: Client B's request, Under Review, assigned to Coordinator B.
  const eventId = randomUUID();
  await f.pool.query(
    `INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance,
       description, purpose, venue_requirements, accessibility_note, equipment_requirements, layout_preference, registration_setup)
     VALUES ($1, 'EVT-2003', $2, $3, $4, 'Event EVT-2003', 'under_review',
       tstzrange('2027-03-01 09:00+00', '2027-03-01 12:00+00', '[)'), 40, $5, $6, $7, $8, $9, $10, $11)`,
    [eventId, ids.organiserC, ids.coordB, ids.orgB, ...Object.values(COMPLETE)],
  );
  const query: Query = (sql, values) => f.pool.query(sql, values);
  const now = async () => (await f.pool.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
  const audits = async (where: string, values: unknown[]) => (await f.pool.query<AuditRow>(
    `SELECT actor_id, entity_type, entity_id, event_id, action, new_value, occurred_at
     FROM audit_logs WHERE ${where} ORDER BY occurred_at, id`, values)).rows;
  return { ...f, ids, user, eventId, query, now, audits };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

const activityOf = (event: { activityLog: unknown }) => event.activityLog as ActivityEntry[];

function within(time: Date, from: Date, to: Date) {
  assert.ok(time >= from && time <= to, `${time.toISOString()} is outside ${from.toISOString()} to ${to.toISOString()}`);
}

test('TC_E14S02_01: a status change is recorded and the assigned Coordinator reads it in the event Activity log', () => withFixture(async f => {
  const before = await f.now();
  await decideEventRequest(f.pool, f.user(f.ids.coordB), 'EVT-2003', { decision: 'approve' });
  const after = await f.now();

  const [stored] = await f.audits('event_id = $1', [f.eventId]);
  assert.equal(stored!.actor_id, f.ids.coordB);
  assert.equal(stored!.action, 'Status changed to approved');
  within(stored!.occurred_at, before, after);

  const coordinatorView = activityOf(await getAssignedEvent(f.pool, f.user(f.ids.coordB), 'EVT-2003'));
  assert.deepEqual(coordinatorView, [{
    occurred_at: stored!.occurred_at, action: 'Status changed to approved', field_changed: 'status',
    old_value: 'under_review', new_value: 'approved', actor_name: 'Coordinator B',
  }]);
  const organiserView = activityOf(await getEvent(f.query, f.user(f.ids.organiserC), 'EVT-2003'));
  assert.deepEqual(organiserView, coordinatorView, 'both readers see the same log');
}));

test('TC_E14S02_01: a Coordinator not assigned to the event cannot read its Activity log', () => withFixture(async f => {
  await assert.rejects(getAssignedEvent(f.pool, f.user(f.ids.coordA), 'EVT-2003'), { status: 403 });
}));

test('TC_E14S02_02: a refused event read is recorded with the user, the target and the time', () => withFixture(async f => {
  const before = await f.now();
  await assert.rejects(getEvent(f.query, f.user(f.ids.organiserA), 'EVT-2003'), { status: 403 });
  const after = await f.now();

  const denials = await f.audits(`action = 'Access Denied'`, []);
  assert.equal(denials.length, 1);
  assert.equal(denials[0]!.actor_id, f.ids.organiserA);
  assert.equal(denials[0]!.event_id, f.eventId);
  assert.equal(denials[0]!.new_value, 'EVT-2003');
  within(denials[0]!.occurred_at, before, after);
}));

test('TC_E14S02_04: an account deactivation is recorded with the actor and the time', () => withFixture(async f => {
  const before = await f.now();
  await deactivateAccount(f.pool, f.user(f.ids.organiserA), { confirm: true });
  const after = await f.now();

  const rows = await f.audits('entity_id = $1', [f.ids.organiserA]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.actor_id, f.ids.organiserA);
  assert.equal(rows[0]!.entity_type, 'user');
  assert.equal(rows[0]!.action, 'Account Deactivated');
  within(rows[0]!.occurred_at, before, after);
}));

test('TC_E14S02_08: access-denial entries and the refused users are not shown in the Coordinator Activity log', () => withFixture(async f => {
  await assert.rejects(getEvent(f.query, f.user(f.ids.organiserA), 'EVT-2003'), { status: 403 });
  await assert.rejects(getAssignedEvent(f.pool, f.user(f.ids.coordA), 'EVT-2003'), { status: 403 });
  await decideEventRequest(f.pool, f.user(f.ids.coordB), 'EVT-2003', { decision: 'approve' });

  const stored = await f.audits(`event_id = $1 AND action = 'Access Denied'`, [f.eventId]);
  assert.deepEqual(stored.map(row => row.actor_id), [f.ids.organiserA, f.ids.coordA], 'both refusals are stored against the event');

  const log = activityOf(await getAssignedEvent(f.pool, f.user(f.ids.coordB), 'EVT-2003'));
  assert.deepEqual(log.map(entry => entry.action), ['Status changed to approved']);
  const shown = JSON.stringify(log);
  for (const hidden of ['Access Denied', 'Organiser A', 'Coordinator A', f.ids.organiserA, f.ids.coordA, 'example.test']) {
    assert.equal(shown.includes(hidden), false, `${hidden} must not appear in the Activity log`);
  }
}));

test('TC_E14S02_01: Coordinator reassignment entries name the Coordinators instead of their account IDs', () => withFixture(async f => {
  const request = await requestCoordinatorReassignment(f.pool, f.user(f.ids.coordB), 'EVT-2003', { toCoordinatorId: f.ids.coordA });
  await respondToCoordinatorReassignment(f.pool, f.user(f.ids.coordA), request.id, 'accept');

  const log = activityOf(await getAssignedEvent(f.pool, f.user(f.ids.coordA), 'EVT-2003'));
  const coordinatorRows = log.filter(entry => entry.field_changed === 'coordinator_id');
  assert.ok(coordinatorRows.length >= 2, 'the request and the acceptance are both logged');
  for (const entry of coordinatorRows) {
    assert.deepEqual([entry.old_value, entry.new_value], ['Coordinator B', 'Coordinator A'], entry.action);
  }
  const shown = JSON.stringify(log);
  assert.equal(shown.includes(f.ids.coordA) || shown.includes(f.ids.coordB), false, 'no account IDs are shown');

  // A value that is not an account ID is shown as written.
  await f.pool.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
     VALUES (NULL, 'event', $1, $1, 'Coordinator assignment pending', 'coordinator_id', 'No eligible Event Coordinator')`, [f.eventId]);
  const pending = activityOf(await getAssignedEvent(f.pool, f.user(f.ids.coordA), 'EVT-2003')).at(-1)!;
  assert.deepEqual([pending.action, pending.old_value, pending.new_value, pending.actor_name],
    ['Coordinator assignment pending', null, 'No eligible Event Coordinator', null]);
}));

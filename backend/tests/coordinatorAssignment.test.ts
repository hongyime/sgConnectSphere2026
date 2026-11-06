// Retained assigned-Coordinator read and audit coverage; retired request workflows are not restored.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { getAssignedEvent, listAssignedEvents } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { SAFETY_ACTIONS } from '../src/modules/eventReadiness/safetyReturn.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

type Call = { sql: string; values?: unknown[] };
type Script = (sql: string, values?: unknown[]) => unknown[] | Error | undefined;
function fakeDatabase(script: Script) {
  const calls: Call[] = [];
  const run = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const outcome = script(sql, values);
    if (outcome instanceof Error) throw outcome;
    const rows = outcome ?? [];
    return { rows, rowCount: rows.length };
  };
  return { pool: { query: run } as unknown as Pool, calls };
}

const coordA: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-00000000000a', email: 'coord_a@example.test', role: 'event_coordinator',
  isActive: true, failedLoginCount: 0,
};
const organiser: AuthenticatedUser = { ...coordA, id: '00000000-0000-4000-8000-0000000000aa', role: 'event_organiser' };
const eventId = '00000000-0000-4000-8000-0000000000e1';

const has = (calls: Call[], fragment: string) => calls.some(call => call.sql.includes(fragment));
const find = (calls: Call[], fragment: string) => calls.find(call => call.sql.includes(fragment));


// --- Coordinator reads (D2: assigned events only, never drafts) ------------

test('the assigned-event list is limited to the caller and never includes drafts', async () => {
  const { pool, calls } = fakeDatabase(() => []);
  await listAssignedEvents(pool, coordA, 'awaiting_clarification');
  const list = find(calls, 'FROM events e')!;
  assert.match(list.sql, /e\.coordinator_id = \$1 AND e\.status <> 'draft'/);
  assert.deepEqual(list.values, [coordA.id, 'awaiting_clarification']);
  await assert.rejects(listAssignedEvents(pool, coordA, 'not_a_status'), { status: 400 });
  await assert.rejects(listAssignedEvents(pool, organiser), { status: 403 });
});

test('an event not assigned to the caller is refused like an unknown one, and audited', async () => {
  const { pool, calls } = fakeDatabase(() => []);
  await assert.rejects(getAssignedEvent(pool, coordA, 'EVT-2001'), { status: 403 });
  assert.ok(has(calls, "'Access Denied'"));
});

// E14-S02 Scenario 1 (T-75): the assigned Coordinator reads the event's
// Activity log; access-denial rows never appear in it (#161, TC_E14S02_08).
test('TC_E14S02_01: the assigned Coordinator reads the event Activity log without access denials', async () => {
  const entry = { occurred_at: new Date('2027-01-02T00:00:00Z'), action: 'Status Changed', field_changed: 'status',
    old_value: 'under_review', new_value: 'approved', actor_name: 'Coordinator A' };
  const { pool, calls } = fakeDatabase(sql => {
    if (sql.includes('FROM events e JOIN users o')) return [{ id: eventId, event_code: 'EVT-2001', coordinator_id: coordA.id }];
    if (sql.includes('FROM audit_logs a')) return [entry];
    return undefined;
  });
  const event = await getAssignedEvent(pool, coordA, 'EVT-2001') as { activityLog: unknown[] };
  assert.deepEqual(event.activityLog, [entry]);
  const activity = find(calls, 'FROM audit_logs a')!;
  // E08-S06: a safety decision's status row is left out; its checklist row is the entry.
  assert.deepEqual(activity.values, [eventId, Object.values(SAFETY_ACTIONS)]);
  assert.match(activity.sql, /NOT \(a\.field_changed = 'status' AND a\.action = ANY\(\$2\)\)/);
  // E06-S04 Scenario 5: the Coordinator view also includes venue booking
  // decisions, and T-104 (SCRUM-244) Technical Support reconfirmations.
  assert.match(activity.sql, /\(a\.entity_type IN \('event', 'venue_booking'\) OR \(a\.entity_type = 'tech_support_request' AND a\.action = 'Support Reconfirmed'\)\) AND a\.action <> 'Access Denied'/);
  assert.doesNotMatch(activity.sql, /email/);
  assert.equal(has(calls, "'Access Denied', "), false);
});

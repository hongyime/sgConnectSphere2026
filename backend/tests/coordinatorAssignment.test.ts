// E03 coordinator reassignment unit tests: permission rules, validation and
// the exact writes each path makes against a scripted fake database.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import {
  getAssignedEvent,
  listAssignedEvents,
  requestCoordinatorReassignment,
  respondToCoordinatorReassignment,
} from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { ACTIVE_EVENT_STATUSES } from '../src/modules/eventLifecycle/status.js';
import { DEACTIVATION_BLOCKING_STATUSES } from '../src/modules/accessControl/deactivation.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import { SAFETY_ACTIONS } from '../src/modules/eventReadiness/safetyReturn.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

type Call = { sql: string; values?: unknown[] };
type Script = (sql: string, values?: unknown[]) => unknown[] | Error | undefined;

// A Pool whose pool-level queries (committed on their own) and transaction
// queries share one ordered call log, so tests can assert what happened
// inside versus after a ROLLBACK.
function fakeDatabase(script: Script) {
  const calls: Call[] = [];
  const insertedNotifications = new Set<string>();
  const run = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const outcome = script(sql, values);
    if (outcome instanceof Error) throw outcome;
    let fallback: unknown[] = [];
    if (sql.includes('FROM events e LEFT JOIN event_publications')) fallback = [{
      id:eventId,title:'Annual Tech Summit',public_name:null,status:'under_review',
      starts_at:new Date('2027-01-01T09:00:00Z'),ends_at:new Date('2027-01-01T12:00:00Z'),
      organiser_id:organiser.id,coordinator_id:coordA.id,
    }];
    if (sql.includes('INSERT INTO audit_logs')) fallback = [{id:'00000000-0000-4000-8000-0000000000d1',occurred_at:new Date('2027-01-01T00:00:00Z')}];
    if (sql.includes('INSERT INTO notifications')) {
      const id=String(values?.[4]);
      if (!insertedNotifications.has(id)) { fallback=[{id}]; insertedNotifications.add(id); }
    }
    if (sql.includes('INSERT INTO notification_deliveries')) fallback=[{id:'00000000-0000-4000-8000-0000000000d2'}];
    if (sql.includes('SELECT d.delivery_status')) fallback=[{delivery_status:'queued',dispatch_state:'pending',recipient_email:null,email:'recipient@example.test',title:'Event notice',message:'Synthetic notice'}];
    const rows = outcome ?? fallback;
    return { rows, rowCount: rows.length };
  };
  const pool = {
    query: run,
    async connect() { return { query: run, release() {} }; },
  } as unknown as Pool;
  return { pool, calls };
}

const coordA: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-00000000000a', email: 'coord_a@example.test', role: 'event_coordinator',
  isActive: true, failedLoginCount: 0,
};
const coordB: AuthenticatedUser = { ...coordA, id: '00000000-0000-4000-8000-00000000000b', email: 'coord_b@example.test' };
const organiser: AuthenticatedUser = { ...coordA, id: '00000000-0000-4000-8000-0000000000aa', role: 'event_organiser' };
const eventId = '00000000-0000-4000-8000-0000000000e1';
const reassignmentId = '00000000-0000-4000-8000-0000000000f1';

const has = (calls: Call[], fragment: string) => calls.some(call => call.sql.includes(fragment));
const find = (calls: Call[], fragment: string) => calls.find(call => call.sql.includes(fragment));
const indexOf = (calls: Call[], fragment: string) => calls.findIndex(call => call.sql.includes(fragment));

test('the active statuses used by Coordinator workflows match the T-52 deactivation list', () => {
  assert.deepEqual([...ACTIVE_EVENT_STATUSES], [...DEACTIVATION_BLOCKING_STATUSES]);
});

// --- Scenario 3 and 6: requesting a reassignment ---------------------------

function reassignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: reassignmentId, event_id: eventId, event_code: 'EVT-1004', event_title: 'Annual Tech Summit', status: 'pending',
    requested_at: new Date('2026-09-26T08:00:00Z'), decided_at: null,
    from_coordinator_id: coordA.id, from_coordinator_name: 'Coordinator A',
    to_coordinator_id: coordB.id, to_coordinator_name: 'Coordinator B',
    ...overrides,
  };
}

function requestScript(overrides: { event?: Record<string, unknown> | null; target?: boolean; pending?: boolean; insertError?: Error } = {}): Script {
  return (sql) => {
    if (sql.includes('FROM events') && sql.includes('FOR UPDATE')) {
      return overrides.event === null ? [] : [{ id: eventId, event_code: 'EVT-1004', title: 'Annual Tech Summit', status: 'under_review', coordinator_id: coordA.id, ...overrides.event }];
    }
    if (sql.includes('SELECT u.id FROM users u')) return overrides.target === false ? [] : [{ id: coordB.id }];
    if (sql.includes("FROM coordinator_reassignments WHERE event_id")) return overrides.pending ? [{ id: 'existing' }] : [];
    if (sql.includes('INSERT INTO coordinator_reassignments')) return overrides.insertError ?? [{ id: reassignmentId }];
    if (sql.includes('FROM coordinator_reassignments r')) return [reassignmentRow()];
    return undefined;
  };
}

test('S3: the assigned Coordinator names a colleague; the request is recorded and the colleague notified, and ownership does not move', async () => {
  const { pool, calls } = fakeDatabase(requestScript());
  const reassignment = await requestCoordinatorReassignment(pool, coordA, 'EVT-1004', { toCoordinatorId: coordB.id });

  assert.equal(reassignment.status, 'pending');
  assert.deepEqual(reassignment.toCoordinator, { id: coordB.id, name: 'Coordinator B' });
  assert.deepEqual(find(calls, 'INSERT INTO coordinator_reassignments')!.values, [eventId, coordA.id, coordB.id]);
  assert.ok(has(calls, "'Coordinator reassignment requested'"));
  const notification = find(calls, 'INSERT INTO notifications')!;
  assert.equal(notification.values?.[0], coordB.id);
  assert.equal(notification.values?.[2], 'Reassignment requested');
  assert.equal(has(calls, 'UPDATE events'), false, 'the requester stays assigned until the colleague accepts');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('S6: a Coordinator who is not assigned is refused, with the denial committed after the rollback', async () => {
  const { pool, calls } = fakeDatabase(requestScript({ event: { coordinator_id: coordB.id } }));
  await assert.rejects(
    requestCoordinatorReassignment(pool, coordA, 'EVT-1004', { toCoordinatorId: coordB.id }),
    (error: unknown) => error instanceof AccessError && error.status === 403 && /Only the assigned Coordinator/.test(error.message),
  );
  const rollback = calls.findIndex(call => call.sql === 'ROLLBACK' || call.sql === 'COMMIT');
  const denial = indexOf(calls, "'Access Denied'");
  assert.ok(denial > rollback, 'the denial is written outside the refused transaction');
  assert.equal(has(calls, 'INSERT INTO coordinator_reassignments'), false);
});

test('S6: an unknown event is refused exactly like one assigned to someone else', async () => {
  const { pool, calls } = fakeDatabase(requestScript({ event: null }));
  await assert.rejects(requestCoordinatorReassignment(pool, coordA, 'EVT-NOPE', { toCoordinatorId: coordB.id }), { status: 403 });
  assert.ok(has(calls, "'Access Denied'"));
});

test('non-Coordinators cannot request a reassignment, and the attempt is audited against the screen', async () => {
  const { pool, calls } = fakeDatabase(() => undefined);
  await assert.rejects(requestCoordinatorReassignment(pool, organiser, 'EVT-1004', { toCoordinatorId: coordB.id }), { status: 403 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /'screen', gen_random_uuid\(\), 'Access Denied'/);
  await assert.rejects(requestCoordinatorReassignment(pool, undefined, 'EVT-1004', {}), { status: 401 });
});

test('a reassignment must name a valid colleague other than the requester', async () => {
  const { pool } = fakeDatabase(requestScript());
  for (const body of [undefined, {}, { toCoordinatorId: 'not-a-uuid' }, { toCoordinatorId: 42 }, []]) {
    await assert.rejects(requestCoordinatorReassignment(pool, coordA, 'EVT-1004', body), { status: 400 });
  }
  await assert.rejects(
    requestCoordinatorReassignment(pool, coordA, 'EVT-1004', { toCoordinatorId: coordA.id }),
    { status: 400, message: 'Choose a colleague other than yourself.' },
  );
});

test('an ineligible colleague, an inactive event and a second pending request are all refused without writing', async () => {
  const cases: [Parameters<typeof requestScript>[0], number][] = [
    [{ target: false }, 400],
    [{ event: { status: 'completed' } }, 409],
    [{ pending: true }, 409],
    [{ insertError: Object.assign(new Error('duplicate'), { code: '23505' }) }, 409],
  ];
  for (const [overrides, status] of cases) {
    const { pool, calls } = fakeDatabase(requestScript(overrides));
    await assert.rejects(requestCoordinatorReassignment(pool, coordA, 'EVT-1004', { toCoordinatorId: coordB.id }), { status });
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
    assert.equal(has(calls, 'INSERT INTO notifications'), false);
  }
});

// --- Scenario 4 and 5: answering a reassignment ----------------------------

function respondScript(overrides: Record<string, unknown> = {}): Script {
  return (sql) => {
    if (sql.includes('FOR UPDATE OF r, e')) {
      return [{ ...reassignmentRow(), event_status: 'under_review', event_coordinator_id: coordA.id, ...overrides }];
    }
    if (sql.includes('FROM coordinator_reassignments r')) {
      return [reassignmentRow({ status: 'accepted', decided_at: new Date() })];
    }
    return undefined;
  };
}

test('S4: accepting moves ownership to the colleague, ends the request and logs the change', async () => {
  const { pool, calls } = fakeDatabase(respondScript());
  await respondToCoordinatorReassignment(pool, coordB, reassignmentId, 'accept');

  assert.deepEqual(find(calls, 'UPDATE events SET coordinator_id')!.values, [eventId, coordB.id]);
  assert.match(find(calls, 'UPDATE coordinator_reassignments')!.sql, /status = 'accepted', decided_at = now\(\)/);
  const audit = find(calls, "'Coordinator reassigned'")!;
  assert.deepEqual(audit.values, [coordB.id, eventId, coordA.id, coordB.id]);
  const notification = find(calls, 'INSERT INTO notifications')!;
  assert.equal(notification.values?.[0], coordA.id);
  assert.equal(notification.values?.[2], 'Reassignment accepted');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('S5: declining leaves the original Coordinator assigned and tells them', async () => {
  const { pool, calls } = fakeDatabase(respondScript());
  await respondToCoordinatorReassignment(pool, coordB, reassignmentId, 'decline');

  assert.equal(has(calls, 'UPDATE events'), false);
  assert.match(find(calls, 'UPDATE coordinator_reassignments')!.sql, /status = 'declined'/);
  assert.ok(has(calls, "'Coordinator reassignment declined'"));
  const notification = find(calls, 'INSERT INTO notifications')!;
  assert.equal(notification.values?.[0], coordA.id);
  assert.equal(notification.values?.[2], 'Reassignment declined');
  assert.match(String(notification.values?.[3]), /remain its assigned Coordinator/);
});

test('only the named colleague may answer; anyone else is refused and audited', async () => {
  const third: AuthenticatedUser = { ...coordA, id: '00000000-0000-4000-8000-00000000000c' };
  for (const actor of [third, coordA]) {
    const { pool, calls } = fakeDatabase(respondScript());
    await assert.rejects(respondToCoordinatorReassignment(pool, actor, reassignmentId, 'accept'), { status: 403 });
    assert.equal(has(calls, 'UPDATE events'), false);
    assert.ok(indexOf(calls, "'Access Denied'") > calls.findIndex(call => call.sql === 'COMMIT'));
  }
});

test('a request can be answered only once, and not after the event changed hands or ended', async () => {
  const cases: [Record<string, unknown>, number][] = [
    [{ status: 'accepted' }, 409],
    [{ status: 'declined' }, 409],
    [{ event_coordinator_id: '00000000-0000-4000-8000-00000000000c' }, 409],
    [{ event_status: 'cancelled' }, 409],
  ];
  for (const [overrides, status] of cases) {
    const { pool, calls } = fakeDatabase(respondScript(overrides));
    await assert.rejects(respondToCoordinatorReassignment(pool, coordB, reassignmentId, 'accept'), { status });
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('an unknown request, an invalid id or a missing decision is rejected', async () => {
  const { pool } = fakeDatabase(() => []);
  await assert.rejects(respondToCoordinatorReassignment(pool, coordB, reassignmentId, 'accept'), { status: 404 });
  await assert.rejects(respondToCoordinatorReassignment(pool, coordB, 'nope', 'accept'), { status: 404 });
  await assert.rejects(respondToCoordinatorReassignment(pool, coordB, reassignmentId, null), { status: 400 });
  await assert.rejects(respondToCoordinatorReassignment(pool, coordB, reassignmentId, 'maybe'), { status: 400 });
});

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

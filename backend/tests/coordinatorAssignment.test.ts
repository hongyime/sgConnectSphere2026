// SCRUM-32 (E03-S01) unit tests: permission rules, validation and the exact
// writes each path makes, against a scripted fake database. The real SQL
// (ordering, locking, constraints) is proven against PostgreSQL in
// coordinatorAssignment.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import {
  assignCoordinatorOnSubmit,
  getAssignedEvent,
  listAssignedEvents,
  requestCoordinatorReassignment,
  respondToCoordinatorReassignment,
} from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { ACTIVE_EVENT_STATUSES } from '../src/modules/eventLifecycle/status.js';
import { DEACTIVATION_BLOCKING_STATUSES } from '../src/modules/accessControl/deactivation.js';
import { LOCKOUT_FAILURE_THRESHOLD } from '../src/modules/accessControl/service.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

type Call = { sql: string; values?: unknown[] };
type Script = (sql: string, values?: unknown[]) => unknown[] | Error | undefined;

// A Pool whose pool-level queries (committed on their own) and transaction
// queries share one ordered call log, so tests can assert what happened
// inside versus after a ROLLBACK.
function fakeDatabase(script: Script) {
  const calls: Call[] = [];
  const run = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const outcome = script(sql, values);
    if (outcome instanceof Error) throw outcome;
    const rows = outcome ?? [];
    return { rows, rowCount: rows.length };
  };
  const pool = {
    query: run,
    async connect() { return { query: run, release() {} }; },
  } as unknown as Pool;
  return { pool, calls, client: { query: run } as unknown as Pool };
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

test('the active statuses used for assignment match the T-52 list deactivation uses', () => {
  assert.deepEqual([...ACTIVE_EVENT_STATUSES], [...DEACTIVATION_BLOCKING_STATUSES]);
});

// --- Scenario 1 and 2: automatic assignment on submission ------------------

function submittedEvent(overrides: Record<string, unknown> = {}) {
  return { id: eventId, event_code: null, title: 'Annual Tech Summit', status: 'submitted', coordinator_id: null, ...overrides };
}

test('S1: a submitted request gets exactly one Coordinator, moves to Under Review, is audited and the Coordinator is notified', async () => {
  const { client, calls } = fakeDatabase(sql => {
    if (sql.includes('FROM events WHERE id = $1 FOR UPDATE')) return [submittedEvent()];
    if (sql.includes('FROM users u')) return [{ id: coordA.id, full_name: 'Coordinator A' }];
    return undefined;
  });

  const assignment = await assignCoordinatorOnSubmit(client, eventId);

  assert.deepEqual(assignment, { coordinatorId: coordA.id, coordinatorName: 'Coordinator A' });
  assert.equal(indexOf(calls, 'pg_advisory_xact_lock'), 0, 'the assignment lock is taken before anything is read');
  const update = find(calls, 'UPDATE events')!;
  assert.match(update.sql, /coordinator_id = \$2/);
  assert.match(update.sql, /status = 'under_review'/);
  assert.deepEqual(update.values, [eventId, coordA.id]);
  const assigned = find(calls, "'Coordinator assigned'")!;
  assert.deepEqual(assigned.values, [eventId, coordA.id]);
  assert.ok(has(calls, "'Status changed to under_review', 'status', 'submitted', 'under_review'"));
  const notification = find(calls, 'INSERT INTO notifications')!;
  assert.equal(notification.values?.[0], coordA.id);
  assert.equal(notification.values?.[2], 'New event assigned');
  assert.match(String(notification.values?.[3]), /Annual Tech Summit/);
});

test('S2: the pick orders by fewest active events, then least recently assigned, then id, among eligible Coordinators only', async () => {
  const { client, calls } = fakeDatabase(sql => {
    if (sql.includes('FOR UPDATE')) return [submittedEvent()];
    return [];
  });
  await assignCoordinatorOnSubmit(client, eventId);
  const pick = find(calls, 'FROM users u')!;
  assert.match(pick.sql, /u\.role = 'event_coordinator' AND u\.is_active/);
  assert.match(pick.sql, /u\.failed_login_count < \$1/);
  assert.match(pick.sql, /u\.locked_until IS NULL OR u\.locked_until <= now\(\)/);
  assert.match(pick.sql, /count\(\*\)[\s\S]*ASC,[\s\S]*max\(e\.coordinator_assigned_at\)[\s\S]*ASC NULLS FIRST,[\s\S]*u\.id ASC/);
  assert.deepEqual(pick.values, [LOCKOUT_FAILURE_THRESHOLD, [...ACTIVE_EVENT_STATUSES]]);
});

test('D4: with no eligible Coordinator the request stays Submitted and unassigned, and the gap is audited', async () => {
  const { client, calls } = fakeDatabase(sql => (sql.includes('FOR UPDATE') ? [submittedEvent()] : []));
  assert.equal(await assignCoordinatorOnSubmit(client, eventId), null);
  assert.ok(has(calls, "'Coordinator assignment pending'"));
  assert.equal(has(calls, 'UPDATE events'), false);
  assert.equal(has(calls, 'INSERT INTO notifications'), false);
});

test('a request that is not Submitted, or already has a Coordinator, is left alone', async () => {
  for (const event of [submittedEvent({ status: 'draft' }), submittedEvent({ coordinator_id: coordB.id })]) {
    const { client, calls } = fakeDatabase(sql => (sql.includes('FOR UPDATE') ? [event] : []));
    assert.equal(await assignCoordinatorOnSubmit(client, eventId), null);
    assert.equal(has(calls, 'FROM users u'), false);
    assert.equal(has(calls, 'UPDATE events'), false);
  }
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

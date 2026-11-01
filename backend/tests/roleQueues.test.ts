// E01-S13: role-specific landing queues. These unit tests keep the role
// boundary and queue ordering explicit; PostgreSQL integration tests cover the
// joins and enum casts used by the real queries.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { listUnassignedEvents } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { listSafetyReviewEvents } from '../src/modules/eventReadiness/submission.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

function database(rows: unknown[] = []) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = { query: async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    return { rows, rowCount: rows.length };
  } } as unknown as Pool;
  return { pool, calls };
}

const lead: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001', email: 'lead@example.test',
  role: 'event_coordinator_lead', isActive: true, failedLoginCount: 0,
};
const officer: AuthenticatedUser = { ...lead, id: '00000000-0000-4000-8000-000000000002', role: 'safety_officer' };
const coordinator: AuthenticatedUser = { ...lead, id: '00000000-0000-4000-8000-000000000003', role: 'event_coordinator' };

test('unauthenticated users cannot read either role queue', async () => {
  const leadDb = database();
  await assert.rejects(listUnassignedEvents(leadDb.pool, undefined), (error: unknown) =>
    error instanceof AccessError && error.status === 401);
  assert.equal(leadDb.calls.length, 0);

  const safetyDb = database();
  await assert.rejects(listSafetyReviewEvents(safetyDb.pool, undefined), (error: unknown) =>
    error instanceof AccessError && error.status === 401);
  assert.equal(safetyDb.calls.length, 0);
});

test('Lead queue requires the Lead role and returns submitted unassigned events oldest first', async () => {
  const { pool, calls } = database([{ id: 'event-1', status: 'submitted' }]);
  assert.deepEqual(await listUnassignedEvents(pool, lead), [{ id: 'event-1', status: 'submitted' }]);
  assert.match(calls[0]!.sql, /status = 'submitted'/);
  assert.match(calls[0]!.sql, /coordinator_id IS NULL/);
  assert.match(calls[0]!.sql, /ORDER BY e\.created_at ASC/);
});

test('non-Leads cannot read the unassigned queue and the attempt is audited', async () => {
  const { pool, calls } = database();
  await assert.rejects(listUnassignedEvents(pool, coordinator), (error: unknown) =>
    error instanceof AccessError && error.status === 403);
  assert.match(calls[0]!.sql, /Access Denied/);
});

test('Safety Officer queue requires the Safety Officer role and lists Safety Review events', async () => {
  const { pool, calls } = database([{ id: 'event-2', status: 'safety_review' }]);
  assert.deepEqual(await listSafetyReviewEvents(pool, officer), [{ id: 'event-2', status: 'safety_review' }]);
  assert.match(calls[0]!.sql, /status = 'safety_review'/);
  assert.match(calls[0]!.sql, /ORDER BY lower\(e\.event_range\)/);
});

test('non-Safety Officers cannot read the Safety Review queue and the attempt is audited', async () => {
  const { pool, calls } = database();
  await assert.rejects(listSafetyReviewEvents(pool, coordinator), (error: unknown) =>
    error instanceof AccessError && error.status === 403);
  assert.match(calls[0]!.sql, /Access Denied/);
});

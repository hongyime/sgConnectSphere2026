// E03-S10: Lead oversight covers every active event and workload.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { listLeadOversight } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const lead: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001', email: 'lead@example.test',
  role: 'event_coordinator_lead', isActive: true, failedLoginCount: 0,
};
const coordinator: AuthenticatedUser = { ...lead, id: '00000000-0000-4000-8000-000000000002', role: 'event_coordinator' };

function database() {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes('FROM users u')) return { rows: [{ id: coordinator.id, full_name: 'Coordinator A', active_events: 1 }], rowCount: 1 };
      if (sql.includes('SELECT e.id')) return { rows: [{ id: 'event-1', status: 'planning', coordinator_id: coordinator.id }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
  } as unknown as Pool;
  return { pool, calls };
}

test('E03-S10 Lead oversight returns active events and workload counts with filters', async () => {
  const { pool, calls } = database();
  const result = await listLeadOversight(pool, lead, { status: 'planning', coordinator: coordinator.id });
  assert.deepEqual(result.events, [{ id: 'event-1', status: 'planning', coordinator_id: coordinator.id }]);
  assert.deepEqual(result.workloads, [{ id: coordinator.id, full_name: 'Coordinator A', active_events: 1 }]);
  assert.deepEqual(calls[0]!.values, [['submitted', 'under_review', 'awaiting_clarification', 'approved', 'planning', 'safety_review', 'confirmed'], 'planning', coordinator.id]);
  assert.match(calls[0]!.sql, /coordinator_id = \$3/);
});

test('E03-S10 non-Leads cannot read oversight', async () => {
  const { pool, calls } = database();
  await assert.rejects(listLeadOversight(pool, coordinator), (error: unknown) => error instanceof AccessError && error.status === 403);
  assert.equal(calls.length, 1);
});

test('E03-S10 invalid filters are rejected before reading events', async () => {
  const { pool, calls } = database();
  await assert.rejects(listLeadOversight(pool, lead, { status: 'completed' }), { status: 400 });
  await assert.rejects(listLeadOversight(pool, lead, { coordinator: 'not-a-uuid' }), { status: 400 });
  assert.equal(calls.length, 0);
});

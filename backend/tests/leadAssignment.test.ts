// E03-S08: Lead assignment is transactional and replaces automatic assignment.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import { assignQueuedEvent, notifyLeadOfQueuedEvent } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const lead: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001', email: 'lead@example.test',
  role: 'event_coordinator_lead', isActive: true, failedLoginCount: 0,
};
const coordinator: AuthenticatedUser = {
  ...lead, id: '00000000-0000-4000-8000-000000000002',
  email: 'coordinator@example.test', role: 'event_coordinator',
};

function database(event: Record<string, unknown> | null = {
  id: '00000000-0000-4000-8000-000000000010', event_code: 'EVT-1', title: 'Charity Run', status: 'submitted',
  coordinator_id: null, organiser_id: 'organiser-1',
}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes('FROM events') && sql.includes('FOR UPDATE')) return { rows: event ? [event] : [], rowCount: event ? 1 : 0 };
      if (sql.includes('SELECT u.id, u.full_name')) return { rows: [{ id: coordinator.id, full_name: 'Coordinator' }], rowCount: 1 };
      if (sql.includes("role::text = 'event_coordinator_lead'")) return { rows: [{ id: lead.id }], rowCount: 1 };
      if (sql.includes('UPDATE events')) return { rows: [], rowCount: 1 };
      if (sql.includes('SELECT id FROM users WHERE id = $1')) return { rows: [{ id: 'organiser-1' }], rowCount: 1 };
      if (sql.includes('RETURNING id, occurred_at')) return { rows: [{ id: 'audit-1', occurred_at: new Date('2026-11-01T00:00:00Z') }], rowCount: 1 };
      if (sql.includes('INSERT INTO notifications')) return { rows: [{ id: 'notification-1' }], rowCount: 1 };
      if (sql.includes('INSERT INTO notification_deliveries')) return { rows: [{ id: '00000000-0000-4000-8000-000000000011' }], rowCount: 1 };
      if (sql.includes('SELECT d.delivery_status')) return { rows: [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'recipient@example.test', title: 'Event notice', message: 'Assigned' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    async connect() { return { query: this.query, release() {} }; },
  } as unknown as Pool;
  return { pool, calls };
}

test('E03-S08 Lead assignment moves a queued event to Under Review and notifies both parties', async () => {
  const { pool, calls } = database();
  const result = await assignQueuedEvent(pool, lead, 'EVT-1', { coordinator_id: coordinator.id });

  assert.deepEqual(result, { eventId: '00000000-0000-4000-8000-000000000010', coordinatorId: coordinator.id });
  const update = calls.find(call => call.sql.includes('UPDATE events'))!;
  assert.match(update.sql, /assigned_by = \$3/);
  assert.deepEqual(update.values, ['00000000-0000-4000-8000-000000000010', coordinator.id, lead.id]);
  assert.ok(calls.some(call => call.sql.includes("'Lead assigned'")));
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO notifications')).length, 2);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('E03-S08 submitted requests notify every active Lead', async () => {
  const { pool, calls } = database();
  await notifyLeadOfQueuedEvent(pool as unknown as PoolClient, '00000000-0000-4000-8000-000000000010', 'Charity Run', '00000000-0000-4000-8000-000000000012', new Date());
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO notifications')).length, 1);
});

test('E03-S08 non-Leads cannot assign a queued event', async () => {
  const { pool, calls } = database();
  await assert.rejects(assignQueuedEvent(pool, coordinator, 'EVT-1', { coordinator_id: coordinator.id }),
    (error: unknown) => error instanceof AccessError && error.status === 403);
  assert.equal(calls.length, 1);
  assert.match(calls[0]!.sql, /'Access Denied'/);
});

test('E03-S08 invalid targets and non-queued events are refused', async () => {
  await assert.rejects(assignQueuedEvent(database().pool, lead, 'EVT-1', {}), { status: 400 });
  await assert.rejects(assignQueuedEvent(database({
    id: '00000000-0000-4000-8000-000000000010', event_code: 'EVT-1', title: 'Charity Run', status: 'under_review',
    coordinator_id: coordinator.id, organiser_id: 'organiser-1',
  }).pool, lead, 'EVT-1', { coordinator_id: coordinator.id }), { status: 409 });
});

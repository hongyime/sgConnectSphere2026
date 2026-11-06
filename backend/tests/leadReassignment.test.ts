// E03-S09: a Lead replacement is immediate, audited and notified.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { reassignEventAsLead } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const lead: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001', email: 'lead@example.test',
  role: 'event_coordinator_lead', isActive: true, failedLoginCount: 0,
};
const outgoing: AuthenticatedUser = { ...lead, id: '00000000-0000-4000-8000-000000000002', role: 'event_coordinator' };
const incoming: AuthenticatedUser = { ...lead, id: '00000000-0000-4000-8000-000000000003', role: 'event_coordinator' };

function database(event: Record<string, unknown> | null = {
  id: '00000000-0000-4000-8000-000000000010', event_code: 'EVT-1', title: 'Charity Run',
  status: 'approved', coordinator_id: outgoing.id, organiser_id: '00000000-0000-4000-8000-000000000004',
}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes('FROM events') && sql.includes('FOR UPDATE')) return { rows: event ? [event] : [], rowCount: event ? 1 : 0 };
      if (sql.includes('SELECT u.id, u.full_name')) return { rows: [{ id: incoming.id, full_name: 'Incoming Coordinator' }], rowCount: 1 };
      if (sql.includes('UPDATE events')) return { rows: [], rowCount: 1 };
      if (sql.includes('RETURNING id, occurred_at')) return { rows: [{ id: '00000000-0000-4000-8000-000000000011', occurred_at: new Date() }], rowCount: 1 };
      if (sql.includes('INSERT INTO notifications')) return { rows: [{ id: 'notification-1' }], rowCount: 1 };
      if (sql.includes('INSERT INTO notification_deliveries')) return { rows: [{ id: '00000000-0000-4000-8000-000000000012' }], rowCount: 1 };
      if (sql.includes('SELECT d.delivery_status')) return { rows: [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'user@example.test', title: 'Event update', message: 'Changed' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    async connect() { return { query: this.query, release() {} }; },
  } as unknown as Pool;
  return { pool, calls };
}

test('E03-S09 Lead reassignment changes ownership immediately and notifies three parties', async () => {
  const { pool, calls } = database();
  const result = await reassignEventAsLead(pool, lead, 'EVT-1', { coordinator_id: incoming.id });

  assert.deepEqual(result, { eventId: '00000000-0000-4000-8000-000000000010', coordinatorId: incoming.id });
  assert.deepEqual(calls.find(call => call.sql.includes('UPDATE events'))?.values,
    ['00000000-0000-4000-8000-000000000010', incoming.id, lead.id]);
  assert.ok(calls.some(call => call.sql.includes("'Lead reassigned'")));
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO notifications')).length, 3);
});

test('E03-S09 non-Leads cannot reassign an event', async () => {
  const { pool, calls } = database();
  await assert.rejects(reassignEventAsLead(pool, outgoing, 'EVT-1', { coordinator_id: incoming.id }),
    (error: unknown) => error instanceof AccessError && error.status === 403);
  assert.equal(calls.length, 1);
});

test('E03-S09 unknown events, same target and inactive stages are refused', async () => {
  await assert.rejects(reassignEventAsLead(database(null).pool, lead, 'EVT-1', { coordinator_id: incoming.id }), { status: 409 });
  await assert.rejects(reassignEventAsLead(database().pool, lead, 'EVT-1', { coordinator_id: outgoing.id }), { status: 400 });
  await assert.rejects(reassignEventAsLead(database({
    id: '00000000-0000-4000-8000-000000000010', event_code: 'EVT-1', title: 'Charity Run',
    status: 'completed', coordinator_id: outgoing.id, organiser_id: '00000000-0000-4000-8000-000000000004',
  }).pool, lead, 'EVT-1', { coordinator_id: incoming.id }), { status: 409 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { requestLeadReassignment, respondToLeadReassignment } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const coordinator: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000002', email: 'coordinator@example.test',
  role: 'event_coordinator', isActive: true, failedLoginCount: 0,
};
const lead: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001', email: 'lead@example.test',
  role: 'event_coordinator_lead', isActive: true, failedLoginCount: 0,
};
const otherCoordinator: AuthenticatedUser = { ...coordinator, id: '00000000-0000-4000-8000-000000000003' };
const event = {
  id: '00000000-0000-4000-8000-000000000010', event_code: 'EVT-1', title: 'Charity Run',
  status: 'approved', coordinator_id: coordinator.id, organiser_id: '00000000-0000-4000-8000-000000000004',
};

function database(eventRow = event) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes('FROM events') && sql.includes('FOR UPDATE')) return { rows: [eventRow], rowCount: 1 };
      if (sql.includes('FROM users') && sql.includes("role::text = 'event_coordinator_lead'")) return { rows: [{ id: lead.id }], rowCount: 1 };
      if (sql.includes('INSERT INTO lead_reassignment_requests')) return { rows: [{ id: '00000000-0000-4000-8000-000000000011' }], rowCount: 1 };
      if (sql.includes('FROM lead_reassignment_requests r')) return { rows: [{
        id: '00000000-0000-4000-8000-000000000011', event_id: event.id, event_code: event.event_code,
        event_title: event.title, status: 'pending', requested_at: new Date(), decided_at: null,
        coordinator_id: coordinator.id, coordinator_name: 'Coordinator', reason: 'On leave', decision_note: null,
      }], rowCount: 1 };
      if (sql.includes('INSERT INTO notifications')) return { rows: [{ id: '00000000-0000-4000-8000-000000000012' }], rowCount: 1 };
      if (sql.includes('INSERT INTO notification_deliveries')) return { rows: [{ id: '00000000-0000-4000-8000-000000000013' }], rowCount: 1 };
      if (sql.includes('SELECT d.delivery_status')) return { rows: [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'lead@example.test', title: 'Request', message: 'Request' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    async connect() { return { query: this.query, release() {} }; },
  } as unknown as Pool;
  return { pool, calls };
}

test('E03-S09 assigned Coordinator can ask the Lead to reassign with a reason', async () => {
  const { pool, calls } = database();
  const result = await requestLeadReassignment(pool, coordinator, 'EVT-1', { reason: 'On leave 15-20 Jan' });

  assert.equal(result.reason, 'On leave');
  assert.deepEqual(calls.find(call => call.sql.includes('INSERT INTO lead_reassignment_requests'))?.values,
    [event.id, coordinator.id, 'On leave 15-20 Jan']);
  assert.ok(calls.some(call => call.sql.includes("'Lead reassignment requested'")));
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO notifications')).length, 1);
});

test('E03-S09 Lead can decline a pending request and the Coordinator is notified', async () => {
  const { pool, calls } = database();
  await respondToLeadReassignment(pool, lead, '00000000-0000-4000-8000-000000000011', 'decline', 'Coverage is available.');

  assert.ok(calls.some(call => call.sql.includes("status = 'declined'")));
  assert.ok(calls.some(call => call.sql.includes("'Lead reassignment declined'")));
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO notifications')).length, 1);
});

test('E03-S09 a non-assigned Coordinator cannot ask the Lead to reassign', async () => {
  const { pool } = database({ ...event, coordinator_id: otherCoordinator.id });
  await assert.rejects(
    requestLeadReassignment(pool, coordinator, 'EVT-1', { reason: 'Not my event' }),
    { status: 403 },
  );
});

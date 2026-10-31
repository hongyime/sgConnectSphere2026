// Unit tests for E08-S04 Scenario 4 (SCRUM-242): enterSafetyReviewIfReady
// against a scripted client double that answers each statement by its SQL.
// The real transitions, history and notices are proved against PostgreSQL in
// autoSafetyReview.integration.test.ts; these cover every branch and what is
// written, in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { AUTO_SAFETY_REVIEW_ACTION, CHANGE_REQUEST_REPLANNING_ACTION, enterSafetyReviewIfReady } from '../src/modules/eventReadiness/autoSafetyReview.js';

const range = { starts_at: new Date('2027-03-19T01:00:00Z'), ends_at: new Date('2027-03-19T09:00:00Z') };
type Script = { status?: string; confirmedBefore?: boolean; bookingFlagged?: boolean; coordinator?: string | null; officers?: string[] };

function scriptedClient(script: Script = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const notices: unknown[][] = [];
  let status = script.status ?? 'planning';
  const answer = (sql: string, values: unknown[] = []): unknown[] => {
    if (sql.includes('FROM events WHERE id::text = $1 OR event_code = $1 FOR NO KEY UPDATE'))
      return [{ id: 'event-1', event_code: 'EVT-1', title: 'Charity Run', status, coordinator_id: script.coordinator === undefined ? 'coordinator-1' : script.coordinator,
        organiser_id: 'organiser-1', equipment_requirements: 'none_required', ...range }];
    if (sql.includes("new_value = 'confirmed'")) return script.confirmedBefore === false ? [] : [{ '?column?': 1 }];
    if (sql.includes('FROM venue_bookings b JOIN venues v'))
      return [{ id: 'booking-1', venue_name: 'Charity Hall', status: 'confirmed', purpose: null, ...range, buffer_conflict: false,
        requires_reconfirmation: script.bookingFlagged ?? false, live_hold: false }];
    if (sql.includes('FROM equipment_requests r') || sql.includes('FROM tech_support_requests')) return [];
    if (sql.startsWith('SELECT status FROM events WHERE id = $1 FOR UPDATE')) return [{ status }];
    if (sql.includes('UPDATE events')) {
      status = values[1] as string;
      return [{ id: 'event-1', title: 'Charity Run', status, status_changed_at: new Date('2027-03-01T00:00:00Z'), start_at: range.starts_at, end_at: range.ends_at,
        organiser_id: 'organiser-1', coordinator_id: 'coordinator-1', client_org_id: 'org-1', expected_attendance: 150 }];
    }
    if (sql.includes('INSERT INTO audit_logs')) return [{ id: 'audit-1', occurred_at: new Date('2027-03-01T00:00:00Z') }];
    // applyEventStatusChange's audience read: nobody linked, so no generic notice.
    if (sql.includes('AS public_name')) return [{ id: 'event-1', title: 'Charity Run', public_name: null, status, ...range, organiser_id: null, coordinator_id: null }];
    if (sql.includes("role::text = 'safety_officer'")) return (script.officers ?? ['officer-1']).map(id => ({ id }));
    if (sql.includes('INSERT INTO notifications')) { notices.push(values); return [{ id: String(values[4] ?? 'n') }]; }
    if (sql.includes('INSERT INTO notification_deliveries')) return [{ id: '00000000-0000-4000-8000-0000000000d2' }];
    if (sql.includes('SELECT d.delivery_status')) return [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'recipient@example.test', title: 'Notice', message: 'Synthetic notice' }];
    return [];
  };
  const client = {
    query: async (sql: string, values?: unknown[]) => { calls.push({ sql, values }); const rows = answer(sql, values); return { rows, rowCount: rows.length }; },
  } as unknown as PoolClient;
  return { client, calls, notices };
}

const titled = (notices: unknown[][], title: string) => notices.filter(values => values.includes(title));

test('a reverted Planning event with nothing outstanding enters Safety Review, with every notice under the status change', async () => {
  const { client, calls, notices } = scriptedClient();
  assert.equal(await enterSafetyReviewIfReady(client, 'EVT-1', 'staff-1'), true);
  const eligibility = calls.find(call => call.sql.includes("new_value = 'confirmed'"));
  assert.deepEqual(eligibility?.values, ['event-1', CHANGE_REQUEST_REPLANNING_ACTION]);
  assert.match(eligibility!.sql, /old_value = 'safety_review' AND new_value = 'planning' AND action = \$2/);
  const audit = calls.find(call => call.sql.includes('INSERT INTO audit_logs'));
  assert.deepEqual(audit?.values, ['staff-1', 'event-1', AUTO_SAFETY_REVIEW_ACTION, 'planning', 'safety_review']);
  assert.equal(titled(notices, 'Awaiting safety check').length, 1);
  assert.equal(titled(notices, 'Back in Safety Review').length, 1);
  assert.equal(titled(notices, 'Safety check needed').length, 1);
  assert.ok(titled(notices, 'Safety check needed')[0]!.some(value => typeof value === 'string'
    && value === "EVT-1 Charity Run's arrangements are confirmed again, so it is back in Safety Review. It needs a new Operational Safety Check: the earlier approval does not carry over."));
});

test('without an assigned Coordinator only the Organiser and the Safety Officers are told', async () => {
  const { client, notices } = scriptedClient({ coordinator: null, officers: ['officer-1', 'officer-2'] });
  assert.equal(await enterSafetyReviewIfReady(client, 'EVT-1', 'staff-1'), true);
  assert.equal(titled(notices, 'Back in Safety Review').length, 0);
  assert.equal(titled(notices, 'Safety check needed').length, 2);
});

test('nothing moves for an event that is not in Planning, was never Confirmed, or still has something outstanding', async () => {
  for (const [name, script] of [
    ['in Safety Review', { status: 'safety_review' }],
    ['never Confirmed', { confirmedBefore: false }],
    ['a booking still flagged', { bookingFlagged: true }],
  ] as [string, Script][]) {
    const { client, calls } = scriptedClient(script);
    assert.equal(await enterSafetyReviewIfReady(client, 'EVT-1', 'staff-1'), false, name);
    assert.ok(!calls.some(call => call.sql.includes('UPDATE events') || call.sql.includes('INSERT INTO audit_logs')), name);
  }
  const missing = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as PoolClient;
  assert.equal(await enterSafetyReviewIfReady(missing, 'nope', 'staff-1'), false);
});

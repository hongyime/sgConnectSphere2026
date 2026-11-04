import test from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from 'pg';
import { provisionVenueStaffRoster, TARGET_ROSTER } from '../../scripts/provision_venue_staff_roster.js';

type MockQueryRule = [RegExp, (values?: unknown[]) => { rows: unknown[]; rowCount?: number }];

function createFakeClient(rules: MockQueryRule[]) {
  const executedQueries: Array<{ sql: string; values?: unknown[] }> = [];

  const query = async (sqlOrConfig: string | { text: string; values?: unknown[] }, values?: unknown[]) => {
    const sql = typeof sqlOrConfig === 'string' ? sqlOrConfig : sqlOrConfig.text;
    const vals = typeof sqlOrConfig === 'string' ? values : sqlOrConfig.values;
    executedQueries.push({ sql, values: vals });

    for (const [pattern, handler] of rules) {
      if (pattern.test(sql)) {
        const result = handler(vals);
        return { rowCount: result.rowCount ?? result.rows.length, rows: result.rows };
      }
    }
    return { rowCount: 0, rows: [] };
  };

  return { client: { query } as unknown as Client, executedQueries };
}

test('provisionVenueStaffRoster precheck validates is_active boolean on users', async () => {
  // Test case where user has is_active = false
  const fake = createFakeClient([
    [/information_schema\.tables/, () => ({ rows: [{ exists: true }] })],
    [/SELECT id, name FROM venues/, () => ({
      rows: [
        { id: 'v1', name: 'Orchid Hall' },
        { id: 'v2', name: 'Lotus Room' },
        { id: 'v3', name: 'Maple Room' },
        { id: 'v4', name: 'Jasmine Hall' },
        { id: 'v5', name: 'Cedar Auditorium' },
      ],
    })],
    [/SELECT id, email, role, is_active FROM users/, () => ({
      rows: [
        { id: 'u1', email: 'venue_staff@connectsphere.com', role: 'venue_staff', is_active: false },
        { id: 'u2', email: 'venue_staff_b@connectsphere.com', role: 'venue_staff', is_active: true },
      ],
    })],
  ]);

  await assert.rejects(
    async () => provisionVenueStaffRoster(fake.client, false),
    /is inactive \(is_active = false\)/,
  );
});

test('provisionVenueStaffRoster runs insert with ON CONFLICT (venue_id, staff_id) and handles idempotency', async () => {
  const assignmentsTable: Array<{ venue_id: string; staff_id: string; active_until: string | null }> = [];

  const fake = createFakeClient([
    [/information_schema\.tables/, () => ({ rows: [{ exists: true }] })],
    [/SELECT id, name FROM venues/, () => ({
      rows: [
        { id: 'v1', name: 'Orchid Hall' },
        { id: 'v2', name: 'Lotus Room' },
        { id: 'v3', name: 'Maple Room' },
        { id: 'v4', name: 'Jasmine Hall' },
        { id: 'v5', name: 'Cedar Auditorium' },
      ],
    })],
    [/SELECT id, email, role, is_active FROM users/, () => ({
      rows: [
        { id: 'u1', email: 'venue_staff@connectsphere.com', role: 'venue_staff', is_active: true },
        { id: 'u2', email: 'venue_staff_b@connectsphere.com', role: 'venue_staff', is_active: true },
      ],
    })],
    [/^BEGIN$/, () => ({ rows: [] })],
    [/INSERT INTO venue_staff_assignments/, (values?: unknown[]) => {
      const venueId = values?.[0] as string;
      const staffId = values?.[1] as string;
      const existing = assignmentsTable.find(r => r.venue_id === venueId && r.staff_id === staffId);
      if (existing) {
        if (existing.active_until !== null) {
          existing.active_until = null;
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      assignmentsTable.push({ venue_id: venueId, staff_id: staffId, active_until: null });
      return { rows: [], rowCount: 1 };
    }],
    [/^COMMIT$/, () => ({ rows: [] })],
    [/SELECT v\.name AS venue_name/, () => ({
      rows: [
        { venue_name: 'Orchid Hall', venue_id: 'v1', staff_email: 'venue_staff@connectsphere.com', staff_id: 'u1' },
        { venue_name: 'Lotus Room', venue_id: 'v2', staff_email: 'venue_staff@connectsphere.com', staff_id: 'u1' },
        { venue_name: 'Maple Room', venue_id: 'v3', staff_email: 'venue_staff@connectsphere.com', staff_id: 'u1' },
        { venue_name: 'Jasmine Hall', venue_id: 'v4', staff_email: 'venue_staff_b@connectsphere.com', staff_id: 'u2' },
        { venue_name: 'Cedar Auditorium', venue_id: 'v5', staff_email: 'venue_staff_b@connectsphere.com', staff_id: 'u2' },
      ],
    })],
    [/SELECT DISTINCT venue_id, staff_id FROM venue_staff_assignments/, () => ({
      rows: [
        { venue_id: 'v1', staff_id: 'u1' },
        { venue_id: 'v2', staff_id: 'u1' },
        { venue_id: 'v3', staff_id: 'u1' },
        { venue_id: 'v4', staff_id: 'u2' },
        { venue_id: 'v5', staff_id: 'u2' },
      ],
    })],
    [/SELECT DISTINCT staff_id FROM venue_staff_assignments\s+WHERE venue_id = \$1::uuid/, (vals) => {
      return { rows: [] };
    }],
  ]);

  // First execution: should insert all 5
  await provisionVenueStaffRoster(fake.client, false);
  assert.equal(assignmentsTable.length, 5);

  // Rerun (idempotency): should not throw, row count unaffected
  await provisionVenueStaffRoster(fake.client, false);
  assert.equal(assignmentsTable.length, 5);
});

test('provisionVenueStaffRoster rejects when unexpected assignees exist on a target venue', async () => {
  const fake = createFakeClient([
    [/information_schema\.tables/, () => ({ rows: [{ exists: true }] })],
    [/SELECT id, name FROM venues/, () => ({
      rows: [
        { id: 'v1', name: 'Orchid Hall' },
        { id: 'v2', name: 'Lotus Room' },
        { id: 'v3', name: 'Maple Room' },
        { id: 'v4', name: 'Jasmine Hall' },
        { id: 'v5', name: 'Cedar Auditorium' },
      ],
    })],
    [/SELECT id, email, role, is_active FROM users/, () => ({
      rows: [
        { id: 'u1', email: 'venue_staff@connectsphere.com', role: 'venue_staff', is_active: true },
        { id: 'u2', email: 'venue_staff_b@connectsphere.com', role: 'venue_staff', is_active: true },
      ],
    })],
    [/SELECT v\.name AS venue_name/, () => ({
      rows: [
        { venue_name: 'Orchid Hall', venue_id: 'v1', staff_email: 'venue_staff@connectsphere.com', staff_id: 'u1' },
        { venue_name: 'Orchid Hall', venue_id: 'v1', staff_email: 'rogue@connectsphere.com', staff_id: 'u9' },
        { venue_name: 'Lotus Room', venue_id: 'v2', staff_email: 'venue_staff@connectsphere.com', staff_id: 'u1' },
        { venue_name: 'Maple Room', venue_id: 'v3', staff_email: 'venue_staff@connectsphere.com', staff_id: 'u1' },
        { venue_name: 'Jasmine Hall', venue_id: 'v4', staff_email: 'venue_staff_b@connectsphere.com', staff_id: 'u2' },
        { venue_name: 'Cedar Auditorium', venue_id: 'v5', staff_email: 'venue_staff_b@connectsphere.com', staff_id: 'u2' },
      ],
    })],
  ]);

  await assert.rejects(
    async () => provisionVenueStaffRoster(fake.client, true),
    /Target venue 'Orchid Hall' has multiple active assignees/,
  );
});

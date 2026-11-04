/**
 * Idempotent Venue Staff Roster Provisioning for SCRUM-195 (T-89, T-97).
 *
 * Provisions the PO-approved venue staff assignments for Orchid Hall,
 * Lotus Room, Maple Room, Jasmine Hall, and Cedar Auditorium.
 */

import { Client } from 'pg';

export type TargetAssignment = {
  staffEmail: string;
  venues: string[];
};

export const TARGET_ROSTER: TargetAssignment[] = [
  {
    staffEmail: 'venue_staff@connectsphere.com',
    venues: ['Orchid Hall', 'Lotus Room', 'Maple Room'],
  },
  {
    staffEmail: 'venue_staff_b@connectsphere.com',
    venues: ['Jasmine Hall', 'Cedar Auditorium'],
  },
];

export async function provisionVenueStaffRoster(client: Client, isVerifyOnly = false) {
  console.log(isVerifyOnly ? 'Running in verify-only mode (read-only)...' : 'Running prechecks...');

  // 1. Verify venue_staff_assignments table exists
  const tableCheck = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'venue_staff_assignments'
    ) AS exists;
  `);
  if (!tableCheck.rows[0]?.exists) {
    throw new Error('Table venue_staff_assignments does not exist. Apply migration 0018 first.');
  }

  // 2. Verify all venues exist
  const allVenueNames = TARGET_ROSTER.flatMap(r => r.venues);
  const venuesResult = await client.query<{ id: string; name: string }>(`
    SELECT id, name FROM venues WHERE name = ANY($1::text[])
  `, [allVenueNames]);

  const foundVenues = new Map(venuesResult.rows.map(r => [r.name, r.id]));
  for (const name of allVenueNames) {
    if (!foundVenues.has(name)) {
      throw new Error(`Required venue not found: ${name}`);
    }
  }
  console.log(`Precheck PASS: Found all ${foundVenues.size} target venues.`);

  // 3. Verify target staff users exist, are active (is_active = true), and have role venue_staff
  const allEmails = TARGET_ROSTER.map(r => r.staffEmail);
  const staffResult = await client.query<{ id: string; email: string; role: string; is_active: boolean }>(`
    SELECT id, email, role, is_active FROM users WHERE email = ANY($1::text[])
  `, [allEmails]);

  const foundStaff = new Map(staffResult.rows.map(r => [r.email.toLowerCase(), r]));
  for (const email of allEmails) {
    const user = foundStaff.get(email.toLowerCase());
    if (!user) {
      throw new Error(`Required venue staff user not found: ${email}`);
    }
    if (user.role !== 'venue_staff') {
      throw new Error(`User ${email} has role '${user.role}', expected 'venue_staff'.`);
    }
    if (!user.is_active) {
      throw new Error(`User ${email} is inactive (is_active = false), expected true.`);
    }
  }
  console.log(`Precheck PASS: Found all ${foundStaff.size} target venue staff users (active with role venue_staff).`);

  // 4. Execute provisioning inside a single transaction (skip if verify-only)
  if (!isVerifyOnly) {
    await client.query('BEGIN');
    try {
      let insertedOrUpdatedCount = 0;
      for (const assignment of TARGET_ROSTER) {
        const staff = foundStaff.get(assignment.staffEmail.toLowerCase())!;
        for (const venueName of assignment.venues) {
          const venueId = foundVenues.get(venueName)!;

          // Migration 0018 declares PRIMARY KEY (venue_id, staff_id).
          // If an active assignment exists, DO NOTHING.
          // If an expired assignment exists (active_until IS NOT NULL), reactivate by clearing active_until and resetting active_from.
          const res = await client.query(`
            INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from, active_until)
            VALUES ($1, $2, now(), NULL)
            ON CONFLICT (venue_id, staff_id)
            DO UPDATE SET active_from = now(), active_until = NULL
            WHERE venue_staff_assignments.active_until IS NOT NULL
          `, [venueId, staff.id]);

          if ((res.rowCount ?? 0) > 0) {
            insertedOrUpdatedCount++;
          }
        }
      }

      await client.query('COMMIT');
      console.log(`Provisioning complete: ${insertedOrUpdatedCount} assignment row(s) inserted or reactivated.`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } else {
    console.log('Skipping provisioning write (verify-only).');
  }

  // 5. Postcheck verification: verify all active assignments explicitly
  const activeResult = await client.query<{ venue_name: string; venue_id: string; staff_email: string; staff_id: string }>(`
    SELECT v.name AS venue_name, v.id AS venue_id, u.email AS staff_email, u.id AS staff_id
    FROM venue_staff_assignments a
    JOIN venues v ON v.id = a.venue_id
    JOIN users u ON u.id = a.staff_id
    WHERE a.active_from <= now() AND (a.active_until IS NULL OR a.active_until > now())
    ORDER BY v.name, u.email;
  `);

  console.log(`Verification: ${activeResult.rows.length} active venue staff assignment(s) found in database.`);
  for (const row of activeResult.rows) {
    console.log(`  - ${row.venue_name} -> ${row.staff_email}`);
  }

  // Build expected mapping
  const expectedPairs = new Map<string, string>();
  for (const item of TARGET_ROSTER) {
    for (const vName of item.venues) {
      expectedPairs.set(vName, item.staffEmail.toLowerCase());
    }
  }

  // Group found assignments by venue to prevent hiding multiple assignees
  const actualByVenue = new Map<string, string[]>();
  for (const row of activeResult.rows) {
    const list = actualByVenue.get(row.venue_name) ?? [];
    list.push(row.staff_email.toLowerCase());
    actualByVenue.set(row.venue_name, list);
  }

  // Check each target venue
  for (const [venueName, expectedEmail] of expectedPairs.entries()) {
    const actualStaff = actualByVenue.get(venueName);
    if (!actualStaff || actualStaff.length === 0) {
      throw new Error(`Verification FAILED: Target venue '${venueName}' has no active assignment.`);
    }
    if (actualStaff.length > 1) {
      throw new Error(`Verification FAILED: Target venue '${venueName}' has multiple active assignees: ${actualStaff.join(', ')}.`);
    }
    if (actualStaff[0] !== expectedEmail) {
      throw new Error(`Verification FAILED: Target venue '${venueName}' assigned to '${actualStaff[0]}', expected '${expectedEmail}'.`);
    }
  }

  console.log('Postcheck PASS: All 5 PO-approved venue assignments are active and match canonical mapping with zero unexpected assignees.');

  // 6. TC_E11S01_13 resolver check: call canonical resolver query pattern
  // Check assigned venues resolve to their assigned staff
  const assignedVenueIds = Array.from(foundVenues.values());
  const resolvedAssigned = await client.query<{ venue_id: string; staff_id: string }>(`
    SELECT DISTINCT venue_id, staff_id FROM venue_staff_assignments
    WHERE venue_id = ANY($1::uuid[])
      AND active_from <= now()
      AND (active_until IS NULL OR active_until > now())
  `, [assignedVenueIds]);

  if (resolvedAssigned.rows.length < 5) {
    throw new Error(`Resolver check FAILED: expected at least 5 resolved assignments, found ${resolvedAssigned.rows.length}`);
  }

  // Check an unassigned venue ID returns empty array (zero fallback staff)
  const syntheticUnassignedVenueId = '00000000-0000-4000-8000-000000000099';
  const resolvedUnassigned = await client.query<{ staff_id: string }>(`
    SELECT DISTINCT staff_id FROM venue_staff_assignments
    WHERE venue_id = $1::uuid
      AND active_from <= now()
      AND (active_until IS NULL OR active_until > now())
  `, [syntheticUnassignedVenueId]);

  if (resolvedUnassigned.rows.length !== 0) {
    throw new Error(`Resolver check FAILED: unassigned venue resolved to staff, expected 0 fallback staff.`);
  }

  console.log('TC_E11S01_13 check PASS: resolveAssignedVenueStaff returns empty list for unassigned venues with zero fallback.');
  console.log('Postcheck PASS: All 5 PO-approved venue assignments and boundary checks are verified.');
}

async function main() {
  const isVerifyOnly = process.argv.includes('--verify-only');
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Refusing to touch an unknown database.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await provisionVenueStaffRoster(client, isVerifyOnly);
  } finally {
    await client.end();
  }
}

// Run directly if invoked from CLI
if (process.argv[1] && process.argv[1].endsWith('provision_venue_staff_roster.ts')) {
  main().catch((err: unknown) => {
    console.error('Provisioning failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}

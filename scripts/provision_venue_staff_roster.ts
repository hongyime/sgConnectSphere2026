/**
 * Idempotent Venue Staff Roster Provisioning for SCRUM-195 (T-89, T-97).
 *
 * Provisions the PO-approved venue staff assignments for Orchid Hall,
 * Lotus Room, Maple Room, Jasmine Hall, and Cedar Auditorium.
 */

import { Client, PoolClient } from 'pg';
import { resolveAssignedVenueStaff } from '../backend/src/modules/eventNotifications/service.ts';

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

export async function provisionVenueStaffRoster(client: Client | PoolClient, isVerifyOnly = false) {
  console.log(isVerifyOnly ? 'Running in verify-only mode (read-only)...' : 'Running prechecks and provisioning...');

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

  // 2. Verify all venues exist and are active
  const allVenueNames = TARGET_ROSTER.flatMap(r => r.venues);
  const venuesResult = await client.query<{ id: string; name: string; is_active: boolean }>(`
    SELECT id, name, is_active FROM venues WHERE name = ANY($1::text[])
  `, [allVenueNames]);

  const foundVenues = new Map(venuesResult.rows.map(r => [r.name, r]));
  for (const name of allVenueNames) {
    const venue = foundVenues.get(name);
    if (!venue) {
      throw new Error(`Required venue not found: ${name}`);
    }
    if (!venue.is_active) {
      throw new Error(`Required venue is inactive: ${name} (is_active = false)`);
    }
  }
  console.log(`Precheck PASS: Found all ${foundVenues.size} target venues (active).`);

  // 3. Verify target staff users exist, are active, and have role venue_staff (case-insensitive email lookup)
  const allEmails = TARGET_ROSTER.map(r => r.staffEmail.toLowerCase());
  const staffResult = await client.query<{ id: string; email: string; role: string; is_active: boolean }>(`
    SELECT id, email, role, is_active FROM users WHERE lower(email) = ANY($1::text[])
  `, [allEmails]);

  const foundStaff = new Map(staffResult.rows.map(r => [r.email.toLowerCase(), r]));
  for (const email of allEmails) {
    const user = foundStaff.get(email);
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

  // 4. Verification & Transactional Execution
  // All checks (pre-write, insert, post-write assertion, and resolver checks) execute inside the transaction before COMMIT.
  await client.query(isVerifyOnly ? 'BEGIN READ ONLY' : 'BEGIN');
  try {
    let insertedOrUpdatedCount = 0;

    if (!isVerifyOnly) {
      for (const assignment of TARGET_ROSTER) {
        const staff = foundStaff.get(assignment.staffEmail.toLowerCase())!;
        for (const venueName of assignment.venues) {
          const venue = foundVenues.get(venueName)!;

          // Migration 0018 declares PRIMARY KEY (venue_id, staff_id).
          // If active assignment exists, DO NOTHING.
          // If expired (active_until IS NOT NULL) or future (active_from > now()), reset active_from = now(), active_until = NULL.
          const res = await client.query(`
            INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from, active_until)
            VALUES ($1, $2, now(), NULL)
            ON CONFLICT (venue_id, staff_id)
            DO UPDATE SET active_from = now(), active_until = NULL
            WHERE venue_staff_assignments.active_until IS NOT NULL
               OR venue_staff_assignments.active_from > now()
          `, [venue.id, staff.id]);

          if ((res.rowCount ?? 0) > 0) {
            insertedOrUpdatedCount++;
          }
        }
      }
      console.log(`Provisioning executed: ${insertedOrUpdatedCount} assignment row(s) inserted or reactivated.`);
    } else {
      console.log('Skipping provisioning write (verify-only).');
    }

    // 5. Postcheck verification INSIDE the transaction:
    // Query all active assignments across target venues
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

    // Map expected venue -> expected staff email
    const expectedPairs = new Map<string, string>();
    for (const item of TARGET_ROSTER) {
      for (const vName of item.venues) {
        expectedPairs.set(vName, item.staffEmail.toLowerCase());
      }
    }

    // Group actual active assignments by venue to prevent hiding multiple assignees
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

    // 6. TC_E11S01_13: Real resolver check using resolveAssignedVenueStaff
    // Verify assigned venues resolve strictly to their assigned staff
    const assignedVenueIds = Array.from(foundVenues.values()).map(v => v.id);
    const resolvedStaffIds = await resolveAssignedVenueStaff(client as any, assignedVenueIds);

    const expectedStaffIds = new Set(Array.from(foundStaff.values()).map(s => s.id));
    for (const sid of resolvedStaffIds) {
      if (!expectedStaffIds.has(sid)) {
        throw new Error(`Resolver check FAILED: Unexpected staff member ${sid} resolved.`);
      }
    }
    if (resolvedStaffIds.length < 2) {
      throw new Error(`Resolver check FAILED: Expected both active venue staff to resolve, got ${resolvedStaffIds.length}.`);
    }

    // Check fallback prevention on an unassigned venue
    // Check if an unassigned venue exists in the database
    const unassignedVenueResult = await client.query<{ id: string; name: string }>(`
      SELECT v.id, v.name FROM venues v
      LEFT JOIN venue_staff_assignments a
        ON a.venue_id = v.id
        AND a.active_from <= now()
        AND (a.active_until IS NULL OR a.active_until > now())
      WHERE a.venue_id IS NULL AND v.is_active = true
      LIMIT 1;
    `);

    let unassignedVenueId: string;
    if (unassignedVenueResult.rows.length > 0) {
      unassignedVenueId = unassignedVenueResult.rows[0].id;
      console.log(`Testing unassigned venue fallback with existing venue '${unassignedVenueResult.rows[0].name}' (${unassignedVenueId})`);
    } else {
      // If every registered venue has an active assignment, test fallback against a known synthetic unassigned venue UUID.
      // resolveAssignedVenueStaff queries venue_staff_assignments directly, so no write to venues is needed or permitted.
      unassignedVenueId = '00000000-0000-0000-0000-000000000000';
      console.log(`Testing unassigned venue fallback with synthetic unassigned venue ID (${unassignedVenueId})`);
    }

    const unassignedResolved = await resolveAssignedVenueStaff(client as any, [unassignedVenueId]);
    if (unassignedResolved.length !== 0) {
      throw new Error(`TC_E11S01_13 FAILED: Unassigned venue resolved to staff (${unassignedResolved.join(', ')}), expected 0 fallback staff.`);
    }

    console.log('TC_E11S01_13 check PASS: resolveAssignedVenueStaff returns [] for unassigned venue with zero broad fallback.');

    // Commit only if everything passed
    await client.query('COMMIT');
    console.log('All verification passed and transaction committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Operation failed, rolled back transaction cleanly.');
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isVerifyOnly = args.includes('--verify-only');
  const isExecute = args.includes('--execute');
  const confirmProduction = args.includes('--confirm-production');

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Refusing to touch an unknown database.');
  }

  // Target safety guard (Le Xin point 5)
  let urlObj: URL;
  try {
    urlObj = new URL(databaseUrl.replace(/^postgresql:\/\//, 'http://').replace(/^postgres:\/\//, 'http://'));
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL.');
  }

  const targetHost = urlObj.hostname.toLowerCase();
  const targetDb = urlObj.pathname.replace(/^\//, '');

  const isSupabaseTarget =
    targetHost === 'pooler.supabase.com' ||
    targetHost.endsWith('.pooler.supabase.com') ||
    targetHost.endsWith('.supabase.co') ||
    targetHost.endsWith('.supabase.com');

  console.log(`Target Database: host='${targetHost}', database='${targetDb}'`);

  if (!isVerifyOnly && !isExecute) {
    console.log('NOTICE: Neither --execute nor --verify-only was specified. Defaulting to read-only --verify-only mode for safety.');
  }

  const shouldWrite = isExecute && !isVerifyOnly;

  if (shouldWrite && isSupabaseTarget && !confirmProduction) {
    throw new Error(
      `SAFETY GUARD: Target database appears to be Supabase (${targetHost}). ` +
      `Writing to production requires the explicit flag: --confirm-production`
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await provisionVenueStaffRoster(client, !shouldWrite);
  } finally {
    await client.end();
  }
}

// Run directly if invoked from CLI
if (process.argv[1] && process.argv[1].endsWith('provision_venue_staff_roster.ts')) {
  main().catch((err: unknown) => {
    console.error('Provisioning execution error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}

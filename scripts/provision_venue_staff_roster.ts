/**
 * Idempotent Venue Staff Roster Provisioning for SCRUM-195 (T-89, T-97).
 *
 * Provisions the PO-approved venue staff assignments for Orchid Hall,
 * Lotus Room, Maple Room, Jasmine Hall, and Cedar Auditorium.
 */

import { Client } from 'pg';

type TargetAssignment = {
  staffEmail: string;
  venues: string[];
};

const TARGET_ROSTER: TargetAssignment[] = [
  {
    staffEmail: 'venue_staff@connectsphere.com',
    venues: ['Orchid Hall', 'Lotus Room', 'Maple Room'],
  },
  {
    staffEmail: 'venue_staff_b@connectsphere.com',
    venues: ['Jasmine Hall', 'Cedar Auditorium'],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Refusing to touch an unknown database.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log('Running prechecks...');

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

    // 3. Verify target staff users exist and have role venue_staff
    const allEmails = TARGET_ROSTER.map(r => r.staffEmail);
    const staffResult = await client.query<{ id: string; email: string; role: string; status: string }>(`
      SELECT id, email, role, status FROM users WHERE email = ANY($1::text[])
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
      if (user.status !== 'active') {
        throw new Error(`User ${email} has status '${user.status}', expected 'active'.`);
      }
    }
    console.log(`Precheck PASS: Found all ${foundStaff.size} target venue staff users.`);

    // 4. Execute provisioning inside a single transaction
    await client.query('BEGIN');
    try {
      let insertedCount = 0;
      for (const assignment of TARGET_ROSTER) {
        const staff = foundStaff.get(assignment.staffEmail.toLowerCase())!;
        for (const venueName of assignment.venues) {
          const venueId = foundVenues.get(venueName)!;

          // Check if active assignment already exists
          const existing = await client.query<{ id: string }>(`
            SELECT venue_id FROM venue_staff_assignments
            WHERE venue_id = $1 AND staff_id = $2
              AND active_from <= now()
              AND (active_until IS NULL OR active_until > now())
          `, [venueId, staff.id]);

          if (existing.rows.length === 0) {
            await client.query(`
              INSERT INTO venue_staff_assignments (venue_id, staff_id, active_from)
              VALUES ($1, $2, now())
              ON CONFLICT (venue_id, staff_id, active_from) DO NOTHING
            `, [venueId, staff.id]);
            insertedCount++;
          }
        }
      }

      await client.query('COMMIT');
      console.log(`Provisioning complete: ${insertedCount} new assignment row(s) inserted.`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // 5. Postcheck verification
    const activeResult = await client.query<{ venue_name: string; staff_email: string }>(`
      SELECT v.name AS venue_name, u.email AS staff_email
      FROM venue_staff_assignments a
      JOIN venues v ON v.id = a.venue_id
      JOIN users u ON u.id = a.staff_id
      WHERE a.active_from <= now() AND (a.active_until IS NULL OR a.active_until > now())
      ORDER BY v.name;
    `);

    console.log(`Postcheck: ${activeResult.rows.length} active venue staff assignment(s) found:`);
    for (const row of activeResult.rows) {
      console.log(`  - ${row.venue_name} -> ${row.staff_email}`);
    }

    // Confirm all 5 venues are mapped
    const mappedVenues = new Set(activeResult.rows.map(r => r.venue_name));
    for (const name of allVenueNames) {
      if (!mappedVenues.has(name)) {
        throw new Error(`Postcheck FAILED: Venue ${name} has no active assignment.`);
      }
    }
    console.log('Postcheck PASS: All 5 PO-approved venue assignments are active.');
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('Provisioning failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

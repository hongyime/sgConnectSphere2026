// E02-S03: integration tests for the accessibility matching primitive and
// searchVenues()'s accessibility filter against a real, disposable
// PostgreSQL schema. See venueAccessibility.test.ts / venueCatalogue.test.ts
// for the stubbed-query unit coverage of the same behaviour.
//
// Requires TEST_DATABASE_URL; run via `npm run test:db --workspace backend`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client, Pool } from 'pg';
import { createVenue, searchVenues } from '../src/modules/venueBooking/catalogue';
import { listAccessibilityFeatures, matchVenuesByAccessibility } from '../src/modules/venueBooking/matchAccessibility';
import type { Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';

type VenueBody = { id: string; accessibility_features: string[] };

function expectVenue(result: { status: number; body: unknown }): VenueBody {
  const body = result.body as Record<string, unknown>;
  assert.ok('venue' in body, `expected a venue in the response, got ${JSON.stringify(body)}`);
  return body.venue as VenueBody;
}

test('E02-S03 Scenario 3: venue search excludes venues missing a recorded predefined accessibility requirement', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const schema = `accessibility_${randomUUID().replaceAll('-', '')}`;
  const org = randomUUID(), organiserId = randomUUID();
  let pool: Pool | undefined;
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET search_path TO ${schema}, public`);
    await db.query(await readFile(new URL('../database/migrations/0001_connectsphere_schema.sql', import.meta.url), 'utf8'));
    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Test client']);
    await db.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser')`, [organiserId, org]);

    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    pool.on('connect', client => { void client.query(`SET search_path TO ${schema}, public`); });
    const query: Query = (sql, values) => pool!.query(sql, values);

    const staffUser: AuthenticatedUser = { id: randomUUID(), email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
    const coordinatorUser: AuthenticatedUser = { id: randomUUID(), email: 'coordinator@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };
    const organiserUser: AuthenticatedUser = { id: organiserId, email: 'organiser@example.test', role: 'event_organiser', isActive: true, failedLoginCount: 0 };

    // Venue X: no wheelchair access. Venue Y: wheelchair accessible (matches
    // the Jira test data for TC_E02S03_03 exactly).
    const venueX = expectVenue(await createVenue(pool, staffUser, {
      name: 'Venue X', location: 'Wing A', max_capacity: 100,
      opens_at: '08:00', closes_at: '18:00',
      facilities: ['Wifi'], accessibility_features: ['Hearing Loop'],
      supported_layouts: [{ label: 'Theatre', capacity: 80 }],
    }));
    const venueY = expectVenue(await createVenue(pool, staffUser, {
      name: 'Venue Y', location: 'Wing B', max_capacity: 100,
      opens_at: '08:00', closes_at: '18:00',
      facilities: ['Wifi'], accessibility_features: ['Wheelchair Access', 'Hearing Loop'],
      supported_layouts: [{ label: 'Theatre', capacity: 80 }],
    }));

    const wheelchairAccessId = (await db.query(`SELECT id FROM accessibility_features WHERE code = 'wheelchair_access'`)).rows[0].id;

    // The organiser-facing checklist endpoint's data source: any signed-in
    // user, including an organiser (not just venue staff/coordinators), can
    // read the vocabulary.
    const features = await listAccessibilityFeatures(query, organiserUser);
    assert.ok(features.some(feature => feature.id === wheelchairAccessId && feature.label === 'Wheelchair Access'));

    // The standalone matching primitive.
    const matchedVenueIds = await matchVenuesByAccessibility(query, [wheelchairAccessId]);
    assert.deepEqual(matchedVenueIds, [venueY.id]);

    // Wired into the actual search endpoint's filter (AC3 / TC_E02S03_03):
    // Venue X is excluded, Venue Y appears as a normal match.
    const searchResults = await searchVenues(query, coordinatorUser, '', undefined, undefined, [wheelchairAccessId]);
    assert.deepEqual(searchResults.map(venue => venue.id), [venueY.id]);

    // A search with no accessibility ids requested is unaffected - both venues match.
    const unfiltered = await searchVenues(query, coordinatorUser, '');
    assert.deepEqual(unfiltered.map(venue => venue.id).sort(), [venueX.id, venueY.id].sort());
  } finally {
    if (pool) await pool.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

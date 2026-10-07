// SCRUM-40/SCRUM-41: integration tests for the venue catalogue module
// against a real, disposable PostgreSQL schema (E05-S01 "Maintain the venue
// catalogue", E05-S02 "Match layout requirements to venue capacity").
//
// Each numbered Scenario exercises one of the two stories' Given/When/Then
// acceptance criteria end to end against real migrations, real rows and real
// transactions, proving what venueCatalogue.test.ts's stubs cannot:
// capacity-drop notification delivery, booking-conflict blocking, and the
// layout duplicate/last-layout/search-boundary rules.
//
// Requires TEST_DATABASE_URL; run via `npm run test:db --workspace backend`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client, Pool } from 'pg';
import {
  addVenueLayout, createVenue, getVenue, removeVenueLayout, retireVenue,
  searchVenues, updateVenue, updateVenueLayout,
} from '../src/modules/venueBooking/catalogue';
import type { Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';

type VenueBody = {
  id: string; max_capacity: number; is_active: boolean; facilities: string[];
  supported_layouts: Array<{ label: string; capacity: number }>;
};

function expectVenue(result: { status: number; body: unknown }): VenueBody {
  const body = result.body as Record<string, unknown>;
  assert.ok('venue' in body, `expected a venue in the response, got ${JSON.stringify(body)}`);
  return body.venue as VenueBody;
}

test(
  'E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S02_02 TC_E05S02_03 TC_E05S02_04 TC_E05S02_05 TC_E05S02_06 TC_E05S02_07 TC_E05S02_08: venue catalogue and layout scenarios against real PostgreSQL',
  async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const schema = `venues_${randomUUID().replaceAll('-', '')}`;
  const org = randomUUID(), organiser = randomUUID(), coordinatorId = randomUUID();
  let pool: Pool | undefined;
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET search_path TO ${schema}, public`);
    // Exercise the actual repository migrations, not an approximation of the schema.
    // 0002_durable_notification_dispatch adds the dispatch_state/recipient_email
    // columns that insertNotificationDelivery (used by the capacity-drop flag path) needs.
    for (const migration of ['0001_connectsphere_schema.sql', '0002_durable_notification_dispatch.sql']) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Test client']);
    await db.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role) VALUES
      ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser'),
      ($3, $2, 'coordinator@example.test', 'unused', 'Coordinator', 'event_coordinator')`, [organiser, org, coordinatorId]);

    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    // Every new physical connection the pool opens must be told to use the
    // disposable schema by running an actual SET command, not by passing
    // `options=-c search_path=...` on the connection string: poolers like
    // Supabase's silently drop that startup option, which previously let
    // writes land in the real public schema instead of the disposable one
    // (confirmed against a live Supabase project). This SET is not awaited
    // (pg's Pool does not wait for 'connect' listeners before reusing the
    // client), but that's safe here: client.query() writes its bytes to the
    // socket synchronously when called, and this listener and whatever
    // query the pool goes on to run both execute in the same tick with no
    // `await` between them, so the SET's bytes always reach Postgres first
    // and are processed in that order on this one connection.
    pool.on('connect', client => { void client.query(`SET search_path TO ${schema}, public`); });
    // A Pool, not the single setup Client, because attachDetails() fires its
    // facility/accessibility/layout lookups concurrently via Promise.all.
    const query: Query = (sql, values) => pool!.query(sql, values);

    const staffUser: AuthenticatedUser = { id: randomUUID(), email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
    const coordinatorUser: AuthenticatedUser = { id: coordinatorId, email: 'coordinator@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };

    async function insertConfirmedBooking(eventCode: string, expectedAttendance: number, venueId: string, range: string) {
      const eventId = randomUUID();
      await db.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, event_range, expected_attendance)
        VALUES ($1, $2, $3, $4, $5, $6, $7::tstzrange, $8)`,
      [eventId, eventCode, organiser, coordinatorId, org, `${eventCode} title`, range, expectedAttendance]);
      await db.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, 'confirmed')`,
        [venueId, eventId, range]);
      return eventId;
    }

    // Scenario 1: a saved venue becomes searchable by Event Coordinators.
    const created = await createVenue(pool, staffUser, {
      name: 'Grand Ballroom', location: '123 Marina Blvd', max_capacity: 300,
      opens_at: '08:00', closes_at: '22:00',
      facilities: ['Stage', 'AV system'], accessibility_features: ['Wheelchair Access'],
      supported_layouts: [{ label: 'Theatre', capacity: 280 }, { label: 'Banquet', capacity: 200 }],
    });
    assert.equal(created.status, 201);
    const grandBallroom = expectVenue(created);
    assert.deepEqual([...grandBallroom.facilities].sort(), ['AV system', 'Stage']);
    const found = await searchVenues(query, coordinatorUser, 'Grand Ballroom');
    assert.equal(found.length, 1);
    assert.equal(found[0].id, grandBallroom.id);

    // Regression: two supported_layouts entries that normalize to the same
    // code (case/spacing-insensitive, matching the store's own slugify)
    // must be rejected as a validation error, not misreported as the venue
    // name being taken (createVenue) or crash unhandled (updateVenue) —
    // both previously happened because the primary-key violation only
    // surfaced once linkLookups() tried to insert both. Confirmed this bug
    // live against Supabase before this fix landed.
    const duplicateOnCreate = await createVenue(pool, staffUser, {
      name: 'Duplicate Layout Test Venue', location: 'Somewhere', max_capacity: 300,
      opens_at: '08:00', closes_at: '22:00',
      facilities: ['Wifi'], accessibility_features: ['Ramp'],
      supported_layouts: [{ label: 'Theatre', capacity: 200 }, { label: 'theatre', capacity: 250 }],
    });
    assert.equal(duplicateOnCreate.status, 400);
    const duplicateOnCreateBody = duplicateOnCreate.body as { error: string; errors: Record<string, string[]> };
    assert.equal(duplicateOnCreateBody.error, 'validation_failed');
    assert.ok(duplicateOnCreateBody.errors.supported_layouts);
    const noVenueCreated = await db.query(`SELECT id FROM venues WHERE name = 'Duplicate Layout Test Venue'`);
    assert.equal(noVenueCreated.rows.length, 0, 'the rejected create must not have written a venue row');

    const duplicateOnUpdate = await updateVenue(pool, staffUser, grandBallroom.id, {
      supported_layouts: [{ label: 'Banquet', capacity: 100 }, { label: 'BANQUET', capacity: 120 }],
    });
    assert.equal(duplicateOnUpdate.status, 400);
    const duplicateOnUpdateBody = duplicateOnUpdate.body as { error: string; errors: Record<string, string[]> };
    assert.equal(duplicateOnUpdateBody.error, 'validation_failed');
    assert.ok(duplicateOnUpdateBody.errors.supported_layouts);
    const unchangedAfterRejectedUpdate = await getVenue(query, staffUser, grandBallroom.id);
    assert.deepEqual(
      [...unchangedAfterRejectedUpdate.supported_layouts].sort((a, b) => a.label.localeCompare(b.label)),
      [{ label: 'Banquet', capacity: 200 }, { label: 'Theatre', capacity: 280 }],
    );

    // Same bug class, found in a follow-up audit: the duplicate-code check
    // above was only ever added for supported_layouts, not generalised to
    // facilities/accessibility_features, which have the identical
    // venue_facilities/venue_accessibility_features primary-key collision
    // shape. Confirmed live against Supabase before this fix landed.
    const duplicateFacilityOnCreate = await createVenue(pool, staffUser, {
      name: 'Duplicate Facility Test Venue', location: 'Somewhere', max_capacity: 300,
      opens_at: '08:00', closes_at: '22:00',
      facilities: ['Stage', 'STAGE'], accessibility_features: ['Ramp'],
      supported_layouts: [{ label: 'Theatre', capacity: 200 }],
    });
    assert.equal(duplicateFacilityOnCreate.status, 400);
    const duplicateFacilityBody = duplicateFacilityOnCreate.body as { error: string; errors: Record<string, string[]> };
    assert.equal(duplicateFacilityBody.error, 'validation_failed');
    assert.ok(duplicateFacilityBody.errors.facilities);
    const noDuplicateFacilityVenueCreated = await db.query(`SELECT id FROM venues WHERE name = 'Duplicate Facility Test Venue'`);
    assert.equal(noDuplicateFacilityVenueCreated.rows.length, 0);

    const duplicateFeatureOnUpdate = await updateVenue(pool, staffUser, grandBallroom.id, {
      accessibility_features: ['Wheelchair Access', 'wheelchair access'],
    });
    assert.equal(duplicateFeatureOnUpdate.status, 400);
    const duplicateFeatureBody = duplicateFeatureOnUpdate.body as { error: string; errors: Record<string, string[]> };
    assert.equal(duplicateFeatureBody.error, 'validation_failed');
    assert.ok(duplicateFeatureBody.errors.accessibility_features);
    const unchangedAfterRejectedFeatureUpdate = await getVenue(query, staffUser, grandBallroom.id);
    assert.deepEqual([...unchangedAfterRejectedFeatureUpdate.accessibility_features], ['Wheelchair Access']);

    // Scenario 2: reducing capacity below a confirmed booking's expected attendance
    // flags that booking and notifies the assigned coordinator.
    const eventA2 = await insertConfirmedBooking('EVT-A2', 250, grandBallroom.id, '[2027-01-01 09:00+08,2027-01-01 12:00+08)');
    const droppedCapacity = await updateVenue(pool, staffUser, grandBallroom.id, { max_capacity: 200 });
    assert.equal(droppedCapacity.status, 200);
    const flaggedBooking = (await db.query('SELECT requires_reconfirmation FROM venue_bookings WHERE event_id = $1', [eventA2])).rows[0];
    assert.equal(flaggedBooking.requires_reconfirmation, true);
    const delivery = (await db.query(`SELECT n.message, nd.channel FROM notifications n
      JOIN notification_deliveries nd ON nd.notification_id = n.id WHERE n.user_id = $1 AND n.event_id = $2`, [coordinatorId, eventA2])).rows[0];
    assert.ok(delivery, 'expected a notification delivery for the assigned coordinator');
    assert.equal(delivery.channel, 'email');
    assert.match(delivery.message, /200/);

    // Exact-capacity boundary: capacity equal to the booked attendance is sufficient
    // and must not flag or notify (TC_E05S01_07), one below it must (TC_E05S01_06).
    const boundaryVenue = expectVenue(await createVenue(pool, staffUser, {
      name: 'Boundary Hall', location: 'Level 2', max_capacity: 200,
      opens_at: '08:00', closes_at: '22:00', facilities: ['Wifi'], accessibility_features: ['Ramp'],
      supported_layouts: [{ label: 'Boardroom', capacity: 150 }],
    }));
    const boundaryEvent = await insertConfirmedBooking('EVT-BOUND', 150, boundaryVenue.id, '[2027-02-01 09:00+08,2027-02-01 12:00+08)');

    await updateVenue(pool, staffUser, boundaryVenue.id, { max_capacity: 150 });
    let boundaryBooking = (await db.query('SELECT requires_reconfirmation FROM venue_bookings WHERE event_id = $1', [boundaryEvent])).rows[0];
    assert.equal(boundaryBooking.requires_reconfirmation, false);
    let notificationCount = (await db.query('SELECT count(*)::int AS count FROM notifications WHERE event_id = $1', [boundaryEvent])).rows[0].count;
    assert.equal(notificationCount, 0);

    await updateVenue(pool, staffUser, boundaryVenue.id, { max_capacity: 149 });
    boundaryBooking = (await db.query('SELECT requires_reconfirmation FROM venue_bookings WHERE event_id = $1', [boundaryEvent])).rows[0];
    assert.equal(boundaryBooking.requires_reconfirmation, true);
    notificationCount = (await db.query('SELECT count(*)::int AS count FROM notifications WHERE event_id = $1', [boundaryEvent])).rows[0].count;
    assert.equal(notificationCount, 1);

    // Checklist: updating a single attribute (e.g. facilities) saves the change
    // and leaves the rest of the venue record untouched.
    const facilityUpdate = await updateVenue(pool, staffUser, boundaryVenue.id, { facilities: ['Wifi', 'Catering'] });
    assert.equal(facilityUpdate.status, 200);
    const updatedVenue = expectVenue(facilityUpdate);
    assert.deepEqual([...updatedVenue.facilities].sort(), ['Catering', 'Wifi']);
    assert.equal(updatedVenue.max_capacity, 149);

    // Scenario 3: retiring a venue with no future bookings removes it from
    // search results while its past bookings are retained.
    const oldHall = expectVenue(await createVenue(pool, staffUser, {
      name: 'Old Hall', location: 'Archive Wing', max_capacity: 80,
      opens_at: '08:00', closes_at: '18:00', facilities: ['Storage'], accessibility_features: ['Ramp'],
      supported_layouts: [{ label: 'Boardroom', capacity: 60 }],
    }));
    const pastEvent = await insertConfirmedBooking('EVT-PAST', 50, oldHall.id, '[2020-01-01 09:00+08,2020-01-01 12:00+08)');
    const retired = await retireVenue(pool, staffUser, oldHall.id);
    assert.equal(retired.status, 200);
    assert.deepEqual(retired.body, { retired: true });
    assert.deepEqual(await searchVenues(query, coordinatorUser, 'Old Hall'), []);
    const retainedBooking = (await db.query('SELECT id FROM venue_bookings WHERE event_id = $1', [pastEvent])).rows[0];
    assert.ok(retainedBooking, 'past bookings must be retained after retirement');

    // Scenario 4: retirement is blocked while a future booking exists, and the
    // blocking booking is identified in the response.
    const expoCenter = expectVenue(await createVenue(pool, staffUser, {
      name: 'Expo Center', location: 'Waterfront', max_capacity: 500,
      opens_at: '08:00', closes_at: '23:00', facilities: ['Loading dock'], accessibility_features: ['Ramp'],
      supported_layouts: [{ label: 'Theatre', capacity: 400 }],
    }));
    await insertConfirmedBooking('EVT-FUTURE', 100, expoCenter.id, '[2027-12-20 09:00+08,2027-12-20 17:00+08)');
    const blocked = await retireVenue(pool, staffUser, expoCenter.id);
    assert.equal(blocked.status, 409);
    const blockedBody = blocked.body as { retired: boolean; blockingBookings: Array<{ eventCode: string }> };
    assert.equal(blockedBody.retired, false);
    assert.deepEqual(blockedBody.blockingBookings.map(booking => booking.eventCode), ['EVT-FUTURE']);
    const stillListed = await getVenue(query, staffUser, expoCenter.id);
    assert.equal(stillListed.is_active, true);

    // Scenario 5: adding a new layout stores it against the venue without
    // disturbing its existing layouts (TC_E05S02_01).
    const layoutCapacity = (venue: VenueBody, label: string) =>
      venue.supported_layouts.find(layout => layout.label === label)?.capacity;
    const addedLayout = await addVenueLayout(pool, staffUser, grandBallroom.id, { label: 'Boardroom', capacity: 60 });
    assert.equal(addedLayout.status, 201);
    const withBoardroom = expectVenue(addedLayout);
    assert.equal(layoutCapacity(withBoardroom, 'Boardroom'), 60);
    assert.equal(layoutCapacity(withBoardroom, 'Theatre'), 280);
    assert.equal(layoutCapacity(withBoardroom, 'Banquet'), 200);

    // Venue Staff can view every layout supported by a venue with its
    // maximum capacity (TC_E05S02_04).
    const viewedLayouts = await getVenue(query, staffUser, grandBallroom.id) as unknown as VenueBody;
    assert.deepEqual(
      [...viewedLayouts.supported_layouts].sort((a, b) => a.label.localeCompare(b.label)),
      [{ label: 'Banquet', capacity: 200 }, { label: 'Boardroom', capacity: 60 }, { label: 'Theatre', capacity: 280 }],
    );

    // Scenario 6: adding a layout that already exists (case-insensitive,
    // via the same normalized code the venue was created with) warns
    // instead of creating a duplicate row or overwriting its capacity
    // (TC_E05S02_03).
    const duplicateLayout = await addVenueLayout(pool, staffUser, grandBallroom.id, { label: 'theatre', capacity: 999 });
    assert.equal(duplicateLayout.status, 200);
    const duplicateBody = duplicateLayout.body as { warning: string };
    assert.equal(duplicateBody.warning, 'layout_already_exists');
    const theatreRowCount = (await db.query(`
      SELECT count(*)::int AS count FROM venue_supported_layouts vl
      JOIN room_layouts r ON r.id = vl.layout_id
      WHERE vl.venue_id = $1 AND lower(r.label) = 'theatre'
    `, [grandBallroom.id])).rows[0].count;
    assert.equal(theatreRowCount, 1);
    const unchangedVenue = await getVenue(query, staffUser, grandBallroom.id) as unknown as VenueBody;
    assert.equal(layoutCapacity(unchangedVenue, 'Theatre'), 280);

    // Scenario 7: editing a layout's capacity saves the new value, leaving
    // its other layouts untouched (TC_E05S02_05).
    const editedLayout = await updateVenueLayout(pool, staffUser, grandBallroom.id, 'Boardroom', { capacity: 55 });
    assert.equal(editedLayout.status, 200);
    const reopenedAfterEdit = await getVenue(query, staffUser, grandBallroom.id) as unknown as VenueBody;
    assert.equal(layoutCapacity(reopenedAfterEdit, 'Boardroom'), 55);
    assert.equal(layoutCapacity(reopenedAfterEdit, 'Theatre'), 280);
    await assert.rejects(updateVenueLayout(pool, staffUser, grandBallroom.id, 'Nonexistent Layout', { capacity: 10 }), { status: 404 });

    // Scenario 8: removing a layout drops it from the venue's list while its
    // other layouts remain (TC_E05S02_06).
    const removedLayout = await removeVenueLayout(pool, staffUser, grandBallroom.id, 'Boardroom');
    assert.equal(removedLayout.status, 200);
    const reopenedAfterRemove = await getVenue(query, staffUser, grandBallroom.id) as unknown as VenueBody;
    assert.equal(layoutCapacity(reopenedAfterRemove, 'Boardroom'), undefined);
    assert.equal(layoutCapacity(reopenedAfterRemove, 'Theatre'), 280);
    assert.equal(layoutCapacity(reopenedAfterRemove, 'Banquet'), 200);
    await assert.rejects(removeVenueLayout(pool, staffUser, grandBallroom.id, 'Boardroom'), { status: 404 });

    // A venue must always keep at least one supported layout, the same
    // invariant validateVenueInput enforces on create/full-update — removing
    // a venue's last remaining layout is blocked rather than leaving it with
    // zero, even though the removal endpoint bypasses that validator.
    const removedBanquet = await removeVenueLayout(pool, staffUser, grandBallroom.id, 'Banquet');
    assert.equal(removedBanquet.status, 200);
    const lastLayoutBlocked = await removeVenueLayout(pool, staffUser, grandBallroom.id, 'Theatre');
    assert.equal(lastLayoutBlocked.status, 409);
    const lastLayoutBody = lastLayoutBlocked.body as { error: string };
    assert.equal(lastLayoutBody.error, 'last_layout');
    const stillHasTheatre = await getVenue(query, staffUser, grandBallroom.id) as unknown as VenueBody;
    assert.equal(layoutCapacity(stillHasTheatre, 'Theatre'), 280);

    // Scenario 9: a Coordinator's search for a layout + attendance excludes
    // venues whose matching layout capacity falls short. Grand Ballroom's
    // Theatre seats 280, Expo Center's seats 400.
    const exactFit = await searchVenues(query, coordinatorUser, '', 'Theatre', 280);
    assert.deepEqual(exactFit.map(venue => venue.id).sort(), [expoCenter.id, grandBallroom.id].sort());

    // One seat over Grand Ballroom's Theatre capacity excludes it, but not
    // Expo Center (TC_E05S02_08, the just-below boundary).
    const oneOverGrandBallroom = await searchVenues(query, coordinatorUser, '', 'Theatre', 281);
    assert.deepEqual(oneOverGrandBallroom.map(venue => venue.id), [expoCenter.id]);

    // TC_E05S02_02: a clearly undersized Theatre requirement excludes Grand
    // Ballroom, keeping only the venue that can actually seat it.
    const undersized = await searchVenues(query, coordinatorUser, '', 'Theatre', 300);
    assert.deepEqual(undersized.map(venue => venue.id), [expoCenter.id]);

    // Venues with no Theatre layout at all (Boundary Hall only has Boardroom)
    // never match a Theatre search, regardless of attendance.
    const noTheatreLayout = await searchVenues(query, coordinatorUser, '', 'Theatre', 1);
    assert.ok(!noTheatreLayout.some(venue => venue.id === boundaryVenue.id));

    // Scenario 10 (regression): a suitable venue must still be found even
    // when the name search matches more than 100 active venues. An earlier
    // version of searchVenues fetched only the first 100 name-sorted rows
    // via SQL and filtered THAT page for suitability in JavaScript, so a
    // suitable venue ranked past the 100th name match was silently dropped
    // by the LIMIT before its capacity was ever checked. Inserted directly
    // (not via createVenue) so this proves the actual SQL join, not a JS
    // simulation of it.
    const theatreLayoutId = (await db.query(`SELECT id FROM room_layouts WHERE code = 'theatre'`)).rows[0].id;
    const overflowTotal = 101;
    for (let i = 1; i <= overflowTotal; i++) {
      const venueId = randomUUID();
      await db.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
        VALUES ($1, $2, 'Test wing', 500, '08:00', '22:00')`, [venueId, `Overflow Venue ${String(i).padStart(3, '0')}`]);
      // Only the alphabetically-last (101st) venue can actually seat 200.
      await db.query(`INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity) VALUES ($1, $2, $3)`,
        [venueId, theatreLayoutId, i === overflowTotal ? 300 : 50]);
    }
    const overflowMatches = await searchVenues(query, coordinatorUser, 'Overflow Venue', 'Theatre', 200);
    assert.deepEqual(overflowMatches.map(venue => venue.name), ['Overflow Venue 101']);
  } finally {
    if (pool) await pool.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

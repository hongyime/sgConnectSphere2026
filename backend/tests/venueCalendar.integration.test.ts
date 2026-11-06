// SCRUM-42: integration test for the venue availability calendar against a
// real, disposable PostgreSQL schema (E05-S03 "View the venue availability
// calendar").
//
// Builds TC_E05S03's "Grand Ballroom" fixture from real migrations and rows,
// proving what venueCalendar.test.ts's stubs cannot: the tstzrange overlap
// queries, the booking-status filter and the Singapore day boundaries.
//
// Requires TEST_DATABASE_URL; run via `npm run test:db --workspace backend`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client, Pool } from 'pg';
import { getVenueCalendar, type CalendarEntry } from '../src/modules/venueBooking/calendar';
import { getVenue } from '../src/modules/venueBooking/catalogue';
import { AccessError, type Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';

const local = (iso: string) => new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
const summary = (entries: CalendarEntry[]) =>
  entries.map(entry => [entry.state, local(entry.start), local(entry.end), entry.event?.title ?? entry.reason ?? null]);

test(
  'TC_E05S03_01 TC_E05S03_02 TC_E05S03_03 TC_E05S03_04 TC_E05S03_05 TC_E01S12_03 E05-S03: venue availability calendar against real PostgreSQL',
  async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const schema = `calendar_${randomUUID().replaceAll('-', '')}`;
  const org = randomUUID(), organiser = randomUUID(), coordinatorId = randomUUID(), otherCoordinatorId = randomUUID();
  const venueId = randomUUID();
  let pool: Pool | undefined;
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET search_path TO ${schema}, public`);
    await db.query(await readFile(new URL('../database/migrations/0001_connectsphere_schema.sql', import.meta.url), 'utf8'));
    // 0011 adds the venue buffer columns and occupied_window() that the
    // calendar's occupancy queries (E05-S05) depend on.
    await db.query(await readFile(new URL('../database/migrations/0011_venue_setup_turnaround_buffers.sql', import.meta.url), 'utf8'));
  await db.query(await readFile(new URL('../database/migrations/0013_tentative_venue_holds.sql', import.meta.url), 'utf8'));
  await db.query(await readFile(new URL('../database/migrations/0016_venue_buffer_write_guard.sql', import.meta.url), 'utf8'));
  await db.query(await readFile(new URL('../database/migrations/0019_venue_bookings_contract.sql', import.meta.url), 'utf8'));
  await db.query(await readFile(new URL('../database/migrations/0025_venue_unavailability.sql', import.meta.url), 'utf8'));

    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Test client']);
    await db.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role) VALUES
      ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser'),
      ($3, $2, 'coordinator_1@example.test', 'unused', 'Coordinator One', 'event_coordinator'),
      ($4, $2, 'coordinator_2@example.test', 'unused', 'Coordinator Two', 'event_coordinator')`,
    [organiser, org, coordinatorId, otherCoordinatorId]);
    await db.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
      VALUES ($1, 'Grand Ballroom', '123 Marina Blvd', 300, '08:00', '22:00')`, [venueId]);

    async function insertBooking(title: string, coordinator: string, range: string, status: string) {
      const eventId = randomUUID();
      await db.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, event_range, expected_attendance)
        VALUES ($1, $2, $3, $4, $5, $6, $7::tstzrange, 100)`,
      [eventId, `EVT-${title.replace(/\W+/g, '-')}`, organiser, coordinator, org, title, range]);
      await db.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, $4)`,
        [venueId, eventId, range, status]);
    }

    // TC_E05S03 fixture: 10/11 Free, 11/11 Tentative, 12/11 Confirmed for an
    // event coordinator_1 is assigned to, 13/11 Blocked for maintenance.
    await insertBooking('Pending Workshop', coordinatorId, '[2026-11-11 09:00+08,2026-11-11 12:00+08)', 'pending');
    await insertBooking('Annual Tech Summit', coordinatorId, '[2026-11-12 09:00+08,2026-11-12 12:00+08)', 'confirmed');
    await insertBooking('Spring Networking Night', otherCoordinatorId, '[2026-11-12 14:00+08,2026-11-12 17:00+08)', 'confirmed');
    await db.query(`INSERT INTO venue_blocks (venue_id, block_range, reason) VALUES ($1, '[2026-11-13 00:00+08,2026-11-14 00:00+08)', 'Scheduled maintenance')`, [venueId]);
    // Requests that no longer hold the venue must leave their period Free.
    await insertBooking('Rejected Request', coordinatorId, '[2026-11-10 09:00+08,2026-11-10 12:00+08)', 'rejected');
    await insertBooking('Released Hold', coordinatorId, '[2026-11-10 13:00+08,2026-11-10 15:00+08)', 'released');
    // Outside the requested period: must not appear.
    await insertBooking('December Gala', coordinatorId, '[2026-12-06 18:00+08,2026-12-06 21:00+08)', 'confirmed');

    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    // See venueCatalogue.integration.test.ts: an explicit SET per connection,
    // because poolers drop the search_path startup option.
    pool.on('connect', client => { void client.query(`SET search_path TO ${schema}, public`); });
    const query: Query = (sql, values) => pool!.query(sql, values);
    const coordinator: AuthenticatedUser = { id: coordinatorId, email: 'coordinator_1@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };
    const otherCoordinator: AuthenticatedUser = { ...coordinator, id: otherCoordinatorId, email: 'coordinator_2@example.test' };
    const staff: AuthenticatedUser = { ...coordinator, id: randomUUID(), email: 'staff@example.test', role: 'venue_staff' };

    // TC_E05S03_01 / TC_E05S03_03 / TC_E05S03_05, from coordinator_1's view.
    const november = await getVenueCalendar(query, coordinator, venueId, '2026-11-10', '2026-11-13');
    assert.deepEqual(summary(november.entries), [
      ['free', '2026-11-10T08:00', '2026-11-10T22:00', null],
      ['free', '2026-11-11T08:00', '2026-11-11T09:00', null],
      ['tentative', '2026-11-11T09:00', '2026-11-11T12:00', 'Pending Workshop'],
      ['free', '2026-11-11T12:00', '2026-11-11T22:00', null],
      ['free', '2026-11-12T08:00', '2026-11-12T09:00', null],
      ['confirmed', '2026-11-12T09:00', '2026-11-12T12:00', 'Annual Tech Summit'],
      ['free', '2026-11-12T12:00', '2026-11-12T14:00', null],
      ['unavailable', '2026-11-12T14:00', '2026-11-12T17:00', null],
      ['free', '2026-11-12T17:00', '2026-11-12T22:00', null],
      ['blocked', '2026-11-13T00:00', '2026-11-14T00:00', 'Scheduled maintenance'],
    ]);
    const summit = november.entries.find(entry => entry.event?.title === 'Annual Tech Summit')!;
    assert.equal(summit.event?.code, 'EVT-Annual-Tech-Summit');
    assert.equal(november.entries.find(entry => entry.state === 'blocked')!.kind, 'block');

    // TC_E05S03_02: the event coordinator_1 is not assigned to reveals nothing.
    const serialised = JSON.stringify(november);
    assert.ok(!serialised.includes('Spring Networking Night') && !serialised.includes('EVT-Spring'));
    const hidden = november.entries.find(entry => entry.state === 'unavailable')!;
    assert.deepEqual(Object.keys(hidden).sort(), ['end', 'kind', 'start', 'state']);

    // ...while coordinator_2 sees their own event and not coordinator_1's.
    const otherView = await getVenueCalendar(query, otherCoordinator, venueId, '2026-11-12', '2026-11-12');
    assert.deepEqual(otherView.entries.filter(entry => entry.kind === 'booking').map(entry => [entry.state, entry.event?.title ?? null]), [
      ['unavailable', null],
      ['confirmed', 'Spring Networking Night'],
    ]);

    // Venue Staff maintain every booking, so they see every event's details.
    const staffView = await getVenueCalendar(query, staff, venueId, '2026-11-12', '2026-11-12');
    assert.deepEqual(staffView.entries.filter(entry => entry.kind === 'booking').map(entry => entry.event?.title),
      ['Annual Tech Summit', 'Spring Networking Night']);

    // TC_E05S03_04: navigate to December, then narrow to a custom range.
    const december = await getVenueCalendar(query, coordinator, venueId, '2026-12-01', '2026-12-31');
    assert.equal(december.from, '2026-12-01');
    assert.equal(december.to, '2026-12-31');
    assert.deepEqual(december.entries.filter(entry => entry.state !== 'free').map(entry => entry.event?.title), ['December Gala']);
    const custom = await getVenueCalendar(query, coordinator, venueId, '2026-12-05', '2026-12-10');
    const customDays = new Set(custom.entries.map(entry => local(entry.start).slice(0, 10)));
    assert.deepEqual([...customDays], ['2026-12-05', '2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10']);

    // A role outside the calendar is refused and the denial is audited (E14-S02).
    const attendee: AuthenticatedUser = { ...coordinator, id: organiser, role: 'event_organiser' };
    await assert.rejects(getVenueCalendar(query, attendee, venueId, '2026-11-10', '2026-11-13'),
      (error: AccessError) => error.status === 403);
    const denial = await db.query(`SELECT new_value FROM audit_logs WHERE actor_id = $1 AND action = 'Access Denied'`, [organiser]);
    assert.deepEqual(denial.rows.map(row => row.new_value), ['venue_calendar']);

    await assert.rejects(getVenueCalendar(query, coordinator, randomUUID(), '2026-11-10', '2026-11-13'),
      (error: AccessError) => error.status === 404);

    // An open-ended block (no known end) is clipped to the requested window
    // instead of surfacing a NULL upper bound as 1970.
    await db.query(`INSERT INTO venue_blocks (venue_id, block_range, reason) VALUES ($1, '[2027-01-05 12:00+08,)', 'Closed until further notice')`, [venueId]);
    const openEnded = await getVenueCalendar(query, coordinator, venueId, '2027-01-05', '2027-01-06');
    assert.deepEqual(summary(openEnded.entries), [
      ['free', '2027-01-05T08:00', '2027-01-05T12:00', null],
      ['blocked', '2027-01-05T12:00', '2027-01-07T00:00', 'Closed until further notice'],
    ]);

    // A retired venue keeps its history but offers no Free time.
    await db.query('UPDATE venues SET is_active = false WHERE id = $1', [venueId]);
    const retired = await getVenueCalendar(query, coordinator, venueId, '2026-11-10', '2026-11-13');
    assert.equal(retired.venue.is_active, false);
    assert.ok(retired.entries.every(entry => entry.state !== 'free'));
    assert.equal(retired.entries.length, 4);
  } finally {
    if (pool) await pool.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

// TC_E05S05_06 (E05-S05 Scenarios 1 and 3, T-74): a venue and its bookings
// created before 0011 added buffers read 0 and 0 afterwards, and its calendar
// shows each Confirmed, Tentative and Blocked period at exactly its advertised
// times, with no setup or turnaround portion.
test('TC_E05S05_06: a venue created before buffers existed defaults to 0 and 0 and its calendar periods match the advertised times', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const schema = `calendar_legacy_${randomUUID().replaceAll('-', '')}`;
  const org = randomUUID(), organiser = randomUUID(), coordinatorId = randomUUID(), venueId = randomUUID();
  const migration = async (name: string) => db.query(await readFile(new URL(`../database/migrations/${name}`, import.meta.url), 'utf8'));
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET search_path TO ${schema}, public`);
    await migration('0001_connectsphere_schema.sql');
    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Test client']);
    await db.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role) VALUES
      ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser'),
      ($3, $2, 'coordinator_1@example.test', 'unused', 'Coordinator One', 'event_coordinator')`, [organiser, org, coordinatorId]);
    const insertEvent = async (title: string, range: string) => {
      const id = randomUUID();
      await db.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, event_range, expected_attendance)
        VALUES ($1, $2, $3, $4, $5, $6, $7::tstzrange, 100)`, [id, `EVT-${title.replace(/\W+/g, '-')}`, organiser, coordinatorId, org, title, range]);
      return id;
    };
    // Before buffers existed: the venue, a Confirmed booking and a maintenance block.
    await db.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
      VALUES ($1, 'Grand Ballroom', '123 Marina Blvd', 300, '08:00', '22:00')`, [venueId]);
    const confirmedRange = '[2030-02-02 10:00+08,2030-02-02 12:00+08)';
    await db.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, 'confirmed')`,
      [venueId, await insertEvent('Annual Tech Summit', confirmedRange), confirmedRange]);
    await db.query(`INSERT INTO venue_blocks (venue_id, block_range, reason) VALUES ($1, '[2030-02-04 00:00+08,2030-02-05 00:00+08)', 'Scheduled maintenance')`, [venueId]);
    for (const name of ['0011_venue_setup_turnaround_buffers.sql', '0013_tentative_venue_holds.sql', '0016_venue_buffer_write_guard.sql',
      '0019_venue_bookings_contract.sql', '0025_venue_unavailability.sql']) await migration(name);
    // A Tentative hold placed afterwards on the untouched venue.
    const holdRange = '[2030-02-03 14:00+08,2030-02-03 16:00+08)';
    await db.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, expires_at) VALUES ($1, $2, $3::tstzrange, 'tentative', '2030-02-01 00:00+08')`,
      [venueId, await insertEvent('Spring Workshop', holdRange), holdRange]);

    const query: Query = (sql, values) => db.query(sql, values);
    const coordinator: AuthenticatedUser = { id: coordinatorId, email: 'coordinator_1@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };
    const venue = await getVenue(query, coordinator, venueId) as unknown as Record<string, unknown>;
    assert.deepEqual([venue.setup_time_minutes, venue.turnaround_time_minutes], [0, 0]);

    const week = await getVenueCalendar(query, coordinator, venueId, '2030-02-01', '2030-02-07');
    assert.deepEqual(summary(week.entries.filter(entry => entry.state !== 'free')), [
      ['confirmed', '2030-02-02T10:00', '2030-02-02T12:00', 'Annual Tech Summit'],
      ['tentative', '2030-02-03T14:00', '2030-02-03T16:00', 'Spring Workshop'],
      ['blocked', '2030-02-04T00:00', '2030-02-05T00:00', 'Scheduled maintenance'],
    ]);
    assert.ok(week.entries.every(entry => entry.reason !== 'Setup time' && entry.reason !== 'Turnaround time'));
    // Free time meets each booking exactly at its advertised start and end.
    assert.deepEqual(summary(week.entries.filter(entry => local(entry.start).startsWith('2030-02-02'))), [
      ['free', '2030-02-02T08:00', '2030-02-02T10:00', null],
      ['confirmed', '2030-02-02T10:00', '2030-02-02T12:00', 'Annual Tech Summit'],
      ['free', '2030-02-02T12:00', '2030-02-02T22:00', null],
    ]);
  } finally {
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

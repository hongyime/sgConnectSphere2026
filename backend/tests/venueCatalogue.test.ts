// SCRUM-40/SCRUM-41: unit tests for the venue catalogue module (E05-S01
// "Maintain the venue catalogue", E05-S02 "Match layout requirements to
// venue capacity").
//
// No database is touched: validateVenueInput and the layout-mutation
// validators are exercised directly, and every guarded or mutating function
// is checked against denyPool/denyQuery stubs that throw if a query is
// attempted, proving each one rejects unauthorised or invalid input before
// opening a transaction.
//
// See venueCatalogue.integration.test.ts for the real-Postgres behavioural
// scenarios (E05-S01 TC_E05S01_01..07, E05-S02 TC_E05S02_01..08).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addVenueLayout, createVenue, getVenue, removeVenueLayout, requireCatalogueViewer, requireVenueStaff,
  retireVenue, searchVenues, updateVenue, updateVenueLayout, validateVenueInput,
} from '../src/modules/venueBooking/catalogue';
import type { Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import type { Pool } from 'pg';

const venueStaff: AuthenticatedUser = { id: 'staff-1', email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
const coordinator: AuthenticatedUser = { ...venueStaff, id: 'coord-1', role: 'event_coordinator' };
const attendee: AuthenticatedUser = { ...venueStaff, id: 'attendee-1', role: 'attendee' };
const denyQuery: Query = async () => { throw new Error('Unauthorised database read'); };
const denyPool = {} as Pool;

function validBody() {
  return {
    name: 'Grand Ballroom', location: '123 Marina Blvd', max_capacity: 300,
    opens_at: '08:00', closes_at: '22:00',
    facilities: ['Stage', 'AV system'], accessibility_features: ['Wheelchair Access'],
    supported_layouts: [{ label: 'Theatre', capacity: 280 }],
  };
}

test('validateVenueInput rejects a non-object submission', () => {
  assert.deepEqual(validateVenueInput(null).errors, { form: ['Submit an object containing the required venue fields.'] });
  assert.deepEqual(validateVenueInput([]).errors, { form: ['Submit an object containing the required venue fields.'] });
});

test('validateVenueInput reports every missing required field', () => {
  const result = validateVenueInput({});
  assert.deepEqual(Object.keys(result.errors!).sort(), [
    'accessibility_features', 'closes_at', 'facilities', 'location', 'max_capacity', 'name', 'opens_at', 'supported_layouts',
  ]);
});

test('validateVenueInput enforces a positive whole-number capacity', () => {
  assert.ok(validateVenueInput({ ...validBody(), max_capacity: 0 }).errors?.max_capacity);
  assert.ok(validateVenueInput({ ...validBody(), max_capacity: -5 }).errors?.max_capacity);
  assert.ok(validateVenueInput({ ...validBody(), max_capacity: 10.5 }).errors?.max_capacity);
  assert.ok(validateVenueInput({ ...validBody(), max_capacity: '300' }).errors?.max_capacity);
});

test('validateVenueInput enforces HH:MM operating hours with opens before closes', () => {
  assert.ok(validateVenueInput({ ...validBody(), opens_at: '8:00' }).errors?.opens_at);
  assert.ok(validateVenueInput({ ...validBody(), closes_at: '24:00' }).errors?.closes_at);
  assert.ok(validateVenueInput({ ...validBody(), opens_at: '22:00', closes_at: '08:00' }).errors?.closes_at);
  assert.ok(validateVenueInput({ ...validBody(), opens_at: '09:00', closes_at: '09:00' }).errors?.closes_at);
});

test('validateVenueInput requires non-empty facility, accessibility and layout lists', () => {
  assert.ok(validateVenueInput({ ...validBody(), facilities: [] }).errors?.facilities);
  assert.ok(validateVenueInput({ ...validBody(), facilities: ['   '] }).errors?.facilities);
  assert.ok(validateVenueInput({ ...validBody(), accessibility_features: [] }).errors?.accessibility_features);
  assert.ok(validateVenueInput({ ...validBody(), supported_layouts: [] }).errors?.supported_layouts);
  assert.ok(validateVenueInput({ ...validBody(), supported_layouts: [{ label: 'Theatre', capacity: 0 }] }).errors?.supported_layouts);
  assert.ok(validateVenueInput({ ...validBody(), supported_layouts: [{ capacity: 100 }] }).errors?.supported_layouts);
});

test('validateVenueInput trims text and accepts a fully valid submission', () => {
  const result = validateVenueInput({
    name: '  Grand Ballroom  ', location: ' 123 Marina Blvd ', max_capacity: 300,
    opens_at: '08:00', closes_at: '22:00',
    facilities: [' Stage ', 'AV system'], accessibility_features: ['Wheelchair Access'],
    supported_layouts: [{ label: ' Theatre ', capacity: 280 }],
  });
  assert.equal(result.errors, undefined);
  assert.deepEqual(result.input, {
    name: 'Grand Ballroom', location: '123 Marina Blvd', max_capacity: 300,
    opens_at: '08:00', closes_at: '22:00',
    facilities: ['Stage', 'AV system'], accessibility_features: ['Wheelchair Access'],
    supported_layouts: [{ label: 'Theatre', capacity: 280 }],
  });
});

test('catalogue role gates admit only venue staff to maintain venues, and staff or coordinators to view them', () => {
  assert.throws(() => requireVenueStaff(undefined), { status: 401 });
  assert.throws(() => requireVenueStaff(attendee), { status: 403 });
  assert.throws(() => requireVenueStaff(coordinator), { status: 403 });
  assert.throws(() => requireVenueStaff({ ...venueStaff, isActive: false }), { status: 403 });
  assert.doesNotThrow(() => requireVenueStaff(venueStaff));

  assert.throws(() => requireCatalogueViewer(undefined), { status: 401 });
  assert.throws(() => requireCatalogueViewer(attendee), { status: 403 });
  assert.doesNotThrow(() => requireCatalogueViewer(venueStaff));
  assert.doesNotThrow(() => requireCatalogueViewer(coordinator));
});

test('read operations reject unauthorised viewers before querying the database', async () => {
  await assert.rejects(searchVenues(denyQuery, attendee), { status: 403 });
  await assert.rejects(searchVenues(denyQuery, undefined), { status: 401 });
  await assert.rejects(getVenue(denyQuery, attendee, 'venue-1'), { status: 403 });
});

test('mutating operations reject anyone but venue staff before opening a transaction', async () => {
  await assert.rejects(createVenue(denyPool, attendee, {}), { status: 403 });
  await assert.rejects(createVenue(denyPool, coordinator, {}), { status: 403 });
  await assert.rejects(updateVenue(denyPool, attendee, 'venue-1', {}), { status: 403 });
  await assert.rejects(retireVenue(denyPool, attendee, 'venue-1'), { status: 403 });
});

test('createVenue reports validation errors without opening a transaction', async () => {
  const result = await createVenue(denyPool, venueStaff, { name: '' });
  assert.equal(result.status, 400);
  const body = result.body as { error: string; errors: Record<string, string[]> };
  assert.equal(body.error, 'validation_failed');
  assert.ok(body.errors.name);
});

test('addVenueLayout rejects unauthorised callers before opening a transaction', async () => {
  await assert.rejects(addVenueLayout(denyPool, attendee, 'venue-1', { label: 'Theatre', capacity: 100 }), { status: 403 });
  await assert.rejects(addVenueLayout(denyPool, coordinator, 'venue-1', { label: 'Theatre', capacity: 100 }), { status: 403 });
  await assert.rejects(addVenueLayout(denyPool, undefined, 'venue-1', { label: 'Theatre', capacity: 100 }), { status: 401 });
});

test('addVenueLayout reports validation errors without opening a transaction', async () => {
  const nonObject = await addVenueLayout(denyPool, venueStaff, 'venue-1', null);
  assert.equal(nonObject.status, 400);

  const missingLabel = await addVenueLayout(denyPool, venueStaff, 'venue-1', { capacity: 100 });
  assert.equal(missingLabel.status, 400);
  const missingLabelBody = missingLabel.body as { errors: Record<string, string[]> };
  assert.ok(missingLabelBody.errors.label);

  const badCapacity = await addVenueLayout(denyPool, venueStaff, 'venue-1', { label: 'Theatre', capacity: 0 });
  assert.equal(badCapacity.status, 400);
  const badCapacityBody = badCapacity.body as { errors: Record<string, string[]> };
  assert.ok(badCapacityBody.errors.capacity);
});

test('updateVenueLayout and removeVenueLayout reject unauthorised callers before opening a transaction', async () => {
  await assert.rejects(updateVenueLayout(denyPool, attendee, 'venue-1', 'Theatre', { capacity: 100 }), { status: 403 });
  await assert.rejects(updateVenueLayout(denyPool, undefined, 'venue-1', 'Theatre', { capacity: 100 }), { status: 401 });
  await assert.rejects(removeVenueLayout(denyPool, attendee, 'venue-1', 'Theatre'), { status: 403 });
  await assert.rejects(removeVenueLayout(denyPool, undefined, 'venue-1', 'Theatre'), { status: 401 });
});

test('updateVenueLayout reports validation errors without opening a transaction', async () => {
  const nonObject = await updateVenueLayout(denyPool, venueStaff, 'venue-1', 'Theatre', null);
  assert.equal(nonObject.status, 400);

  const badCapacity = await updateVenueLayout(denyPool, venueStaff, 'venue-1', 'Theatre', { capacity: -1 });
  assert.equal(badCapacity.status, 400);
  const badCapacityBody = badCapacity.body as { errors: Record<string, string[]> };
  assert.ok(badCapacityBody.errors.capacity);
});

type FakeVenueRow = { id: string; name: string; location: string; max_capacity: number; opens_at: string; closes_at: string; is_active: boolean };

// Simulates the two SQL shapes searchVenues issues, closely enough to prove
// the *ordering* of filter-then-limit is correct: a plain name search, and
// (when a layout + attendance filter is given) a join against
// venue_supported_layouts/room_layouts whose WHERE clause narrows the rows
// BEFORE `ORDER BY v.name LIMIT 100` runs — this is what makes it safe for
// a suitable venue to rank past the 100th name match (see the regression
// test below). A real Postgres slugify-by-code join is mirrored here with a
// plain lower-case compare, which is close enough for these ASCII labels.
function makeFakeCatalogueQuery(
  venueRows: FakeVenueRow[],
  layoutsByVenue: Record<string, Array<{ label: string; capacity: number }>>,
): Query {
  const matchesLayout = (venueId: string, code: string, attendance: number) =>
    (layoutsByVenue[venueId] ?? []).some(layout => layout.label.toLowerCase() === code && layout.capacity >= attendance);

  return async (sql, values) => {
    if (sql.includes('JOIN venue_supported_layouts') && sql.includes('FROM venues v')) {
      const [search, code, attendance] = values as [string, string, number];
      const rows = venueRows
        .filter(venue => venue.is_active && venue.name.toLowerCase().includes(search.toLowerCase()))
        .filter(venue => matchesLayout(venue.id, code, attendance))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 100);
      return { rows: rows as never[] };
    }
    if (sql.includes('FROM venues v')) {
      const [search] = values as [string];
      const rows = venueRows
        .filter(venue => venue.is_active && venue.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 100);
      return { rows: rows as never[] };
    }
    if (sql.includes('FROM venue_facilities')) return { rows: [] };
    if (sql.includes('FROM venue_accessibility_features')) return { rows: [] };
    if (sql.includes('FROM venue_supported_layouts')) return { rows: (layoutsByVenue[values![0] as string] ?? []) as never[] };
    throw new Error(`Unexpected query: ${sql}`);
  };
}

// Mirrors TC_E05S02_07/_08 (exact-fit suitable, one-below excluded) at the
// unit level with a hand-rolled Query stub that branches on the SQL string,
// since attachDetails() issues three follow-up queries per venue that a
// simple denyQuery/denyPool stub can't answer. The authoritative,
// real-database version of this boundary lives in
// venueCatalogue.integration.test.ts.
test('searchVenues excludes venues whose matching layout capacity is below the required attendance, boundary at exactly-equal', async () => {
  const venueRows: FakeVenueRow[] = [
    { id: 'v-fits', name: 'Grand Ballroom', location: '', max_capacity: 300, opens_at: '08:00', closes_at: '22:00', is_active: true },
    { id: 'v-short', name: 'Small Room', location: '', max_capacity: 300, opens_at: '08:00', closes_at: '22:00', is_active: true },
    { id: 'v-no-layout', name: 'No Theatre Here', location: '', max_capacity: 300, opens_at: '08:00', closes_at: '22:00', is_active: true },
  ];
  const layoutsByVenue: Record<string, Array<{ label: string; capacity: number }>> = {
    'v-fits': [{ label: 'Theatre', capacity: 120 }],
    'v-short': [{ label: 'Theatre', capacity: 119 }],
    'v-no-layout': [{ label: 'Banquet', capacity: 500 }],
  };

  const matches = await searchVenues(makeFakeCatalogueQuery(venueRows, layoutsByVenue), coordinator, '', 'Theatre', 120);
  assert.deepEqual(matches.map(venue => venue.id), ['v-fits']);
});

// Regression test for a real bug: an earlier version of searchVenues fetched
// only the first 100 name-sorted matches via SQL, then filtered THAT page
// for layout suitability in JavaScript. Whenever a name search matched more
// than 100 active venues, any suitable venue ranked past the 100th name
// match was silently discarded by the LIMIT before its capacity was ever
// checked, so the search could report zero results even though a suitable
// venue existed. The fix pushes the suitability check into the SQL WHERE
// clause so LIMIT 100 applies to the already-filtered set.
test('searchVenues finds a suitable venue even when it ranks alphabetically past the first 100 name matches', async () => {
  const venueRows: FakeVenueRow[] = Array.from({ length: 101 }, (_, i) => ({
    id: `v-${i + 1}`, name: `Venue ${String(i + 1).padStart(3, '0')}`, location: '', max_capacity: 300,
    opens_at: '08:00', closes_at: '22:00', is_active: true,
  }));
  const layoutsByVenue: Record<string, Array<{ label: string; capacity: number }>> = {};
  for (const venue of venueRows) layoutsByVenue[venue.id] = [{ label: 'Theatre', capacity: 50 }];
  // Only the alphabetically-last (101st) venue can actually seat 200.
  layoutsByVenue['v-101'] = [{ label: 'Theatre', capacity: 300 }];

  const matches = await searchVenues(makeFakeCatalogueQuery(venueRows, layoutsByVenue), coordinator, '', 'Theatre', 200);
  assert.deepEqual(matches.map(venue => venue.id), ['v-101']);
});

// Generalises the test above beyond a single suitable venue squeezed past
// the cutoff: with 150 venues where 120 are actually suitable (itself more
// than the LIMIT 100 page size), the result must be capped at exactly 100
// AND be the alphabetically-first 100 among the suitable ones — proving
// LIMIT 100 is applied to the already-filtered set, not to the raw name
// match before filtering (which would have returned fewer than 100, or the
// wrong 100, under the original bug).
test('searchVenues caps at 100 results drawn from the suitable venues, not the raw name matches', async () => {
  const venueRows: FakeVenueRow[] = Array.from({ length: 150 }, (_, i) => ({
    id: `v-${i + 1}`, name: `Venue ${String(i + 1).padStart(3, '0')}`, location: '', max_capacity: 300,
    opens_at: '08:00', closes_at: '22:00', is_active: true,
  }));
  const layoutsByVenue: Record<string, Array<{ label: string; capacity: number }>> = {};
  for (const venue of venueRows) {
    // Venues 001-030 are undersized; 031-150 (120 venues) can seat 200.
    const index = Number(venue.id.slice(2));
    layoutsByVenue[venue.id] = [{ label: 'Theatre', capacity: index <= 30 ? 50 : 300 }];
  }

  const matches = await searchVenues(makeFakeCatalogueQuery(venueRows, layoutsByVenue), coordinator, '', 'Theatre', 200);
  assert.equal(matches.length, 100);
  assert.deepEqual(matches.map(venue => venue.id), Array.from({ length: 100 }, (_, i) => `v-${i + 31}`));
});

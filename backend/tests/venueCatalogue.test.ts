import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVenue, getVenue, requireCatalogueViewer, requireVenueStaff,
  retireVenue, searchVenues, updateVenue, validateVenueInput,
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

// SCRUM-43: unit tests for venue maintenance blocks (E05-S04 "Block a venue
// for maintenance").
//
// validateBlockInput is exercised directly, and every entry point is checked
// against denyPool/denyQuery stubs that throw on any query other than the
// E14-S02 audit-denial write, proving each one rejects an unauthorised caller
// or invalid input before opening a transaction.
//
// See venueBlocks.integration.test.ts for the real-PostgreSQL scenarios
// (TC_E05S04_01..04).

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import {
  createVenueBlock, listVenueBlocks, removeVenueBlock, shortenVenueBlock, validateBlockInput, validateUnavailabilityInput,
} from '../src/modules/venueBooking/blocks.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const venueStaff: AuthenticatedUser = { id: 'staff-1', email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
const coordinator: AuthenticatedUser = { ...venueStaff, id: 'coord-1', role: 'event_coordinator' };
const attendee: AuthenticatedUser = { ...venueStaff, id: 'attendee-1', role: 'attendee' };
const audited: string[] = [];
const denyQuery: Query = async (sql, values) => {
  if (sql.includes('INSERT INTO audit_logs')) {
    audited.push(String(values?.[1]));
    return { rows: [] };
  }
  throw new Error('Unauthorised database read');
};
const denyPool = { query: denyQuery, connect: () => { throw new Error('Unexpected transaction'); } } as unknown as Pool;

const valid = { from: '2027-01-05', to: '2027-01-10', reason: 'Annual fire safety inspection' };

test('validateBlockInput stores whole Singapore days with an exclusive end', () => {
  const { input } = validateBlockInput(valid);
  assert.equal(input!.start.toISOString(), '2027-01-04T16:00:00.000Z');
  // 10 January is blocked in full, so the range ends at 11 January 00:00 SGT.
  assert.equal(input!.end.toISOString(), '2027-01-10T16:00:00.000Z');
  assert.equal(input!.reason, 'Annual fire safety inspection');
});

test('validateBlockInput accepts a single-day block', () => {
  const { input } = validateBlockInput({ ...valid, to: valid.from });
  assert.equal(input!.end.getTime() - input!.start.getTime(), 24 * 60 * 60 * 1000);
});

test('validateBlockInput rejects a non-object submission', () => {
  assert.ok(validateBlockInput(null).errors?.form);
  assert.ok(validateBlockInput([]).errors?.form);
});

test('validateBlockInput requires a reason (E05-S04 checklist: recorded reason)', () => {
  assert.ok(validateBlockInput({ ...valid, reason: undefined }).errors?.reason);
  assert.ok(validateBlockInput({ ...valid, reason: '   ' }).errors?.reason);
  assert.ok(validateBlockInput({ ...valid, reason: 'x'.repeat(256) }).errors?.reason);
  assert.equal(validateBlockInput({ ...valid, reason: 'x'.repeat(255) }).errors, undefined);
});

test('validateBlockInput rejects malformed, impossible and reversed dates', () => {
  assert.ok(validateBlockInput({ ...valid, from: '05/01/2027' }).errors?.from);
  assert.ok(validateBlockInput({ ...valid, from: '2027-02-31' }).errors?.from);
  assert.ok(validateBlockInput({ ...valid, to: 20270110 }).errors?.to);
  assert.deepEqual(validateBlockInput({ ...valid, from: '2027-01-10', to: '2027-01-05' }).errors,
    { to: ['End date must be on or after the start date.'] });
});

test('validateBlockInput makes the reason optional only when shortening', () => {
  const { input } = validateBlockInput({ from: valid.from, to: '2027-01-07' }, false);
  assert.equal(input!.reason, undefined);
  assert.ok(validateBlockInput({ from: valid.from, to: '2027-01-07', reason: '' }, false).errors?.reason);
});

// E05-S06 Scenarios 1 and 5: exact times, a reason category, an optional note
// and an optional end (T-80).
test('validateUnavailabilityInput reads a timed, categorised period with a note', () => {
  const result = validateUnavailabilityInput({
    starts_at: '2027-01-20T08:00:00+08:00', ends_at: '2027-01-20T18:00:00+08:00',
    reason_category: 'equipment_failure', reason: '  Projector rig fault  ',
  });
  assert.deepEqual(result.input, {
    start: new Date('2027-01-20T00:00:00Z'), end: new Date('2027-01-20T10:00:00Z'),
    category: 'equipment_failure', reason: 'Projector rig fault',
  });
});

test('validateUnavailabilityInput leaves the end open when it is missing, null or empty, and the note optional', () => {
  for (const ends_at of [undefined, null, '']) {
    const result = validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', ends_at, reason_category: 'renovation' });
    assert.deepEqual(result.input, { start: new Date('2027-01-20T08:00:00Z'), end: null, category: 'renovation', reason: '' }, String(ends_at));
  }
  assert.equal(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', reason_category: 'other', reason: null }).input?.reason, '');
});

test('validateUnavailabilityInput reads the E05-S04 whole-day form as maintenance', () => {
  assert.deepEqual(validateUnavailabilityInput({ from: '2027-01-05', to: '2027-01-06', reason: 'Inspection' }).input, {
    start: new Date('2027-01-04T16:00:00Z'), end: new Date('2027-01-06T16:00:00Z'), category: 'maintenance', reason: 'Inspection',
  });
  assert.deepEqual(validateUnavailabilityInput({ from: '2027-01-05', to: '2027-01-06' }).errors, { reason: ['A reason for the block is required.'] });
});

test('validateUnavailabilityInput refuses a missing object, bad times, a reversed or zero-length period, an unknown category and a bad note', () => {
  assert.deepEqual(Object.keys(validateUnavailabilityInput('nope').errors!), ['form']);
  for (const starts_at of ['2027-01-20T08:00:00', '20/01/2027 08:00', '2027-01-20T99:00:00+08:00', 42]) {
    assert.deepEqual(Object.keys(validateUnavailabilityInput({ starts_at, reason_category: 'other' }).errors!), ['starts_at'], String(starts_at));
  }
  assert.match(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', ends_at: 'tomorrow', reason_category: 'other' }).errors!.ends_at![0]!, /left empty/);
  for (const ends_at of ['2027-01-20T08:00:00Z', '2027-01-20T07:59:00Z']) {
    assert.deepEqual(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', ends_at, reason_category: 'other' }).errors,
      { ends_at: ['End must be after the start.'] }, ends_at);
  }
  // A bad start leaves nothing to compare a valid end against.
  assert.deepEqual(Object.keys(validateUnavailabilityInput({ starts_at: 'x', ends_at: '2027-01-20T08:00:00Z', reason_category: 'other' }).errors!), ['starts_at']);
  for (const reason_category of [undefined, 'flood', 'Maintenance']) {
    assert.deepEqual(Object.keys(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', reason_category }).errors!), ['reason_category'], String(reason_category));
  }
  assert.deepEqual(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', reason_category: 'other', reason: 7 }).errors, { reason: ['The note must be text.'] });
  assert.deepEqual(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', reason_category: 'other', reason: 'x'.repeat(255) }).input?.reason.length, 255);
  assert.deepEqual(validateUnavailabilityInput({ starts_at: '2027-01-20T08:00:00Z', reason_category: 'other', reason: 'x'.repeat(256) }).errors,
    { reason: ['The note must be at most 255 characters.'] });
});

test('block changes require a signed-in Venue Staff member', async () => {
  audited.length = 0;
  for (const user of [coordinator, attendee]) {
    await assert.rejects(createVenueBlock(denyPool, user, 'venue-1', valid), { status: 403 });
    await assert.rejects(shortenVenueBlock(denyPool, user, 'venue-1', 'block-1', valid), { status: 403 });
    await assert.rejects(removeVenueBlock(denyPool, user, 'venue-1', 'block-1'), { status: 403 });
  }
  // E14-S02: each wrong-role attempt is audited.
  assert.equal(audited.length, 6);
  await assert.rejects(createVenueBlock(denyPool, undefined, 'venue-1', valid), { status: 401 });
  await assert.rejects(removeVenueBlock(denyPool, undefined, 'venue-1', 'block-1'), { status: 401 });
});

test('listing blocks is limited to the venue catalogue roles', async () => {
  await assert.rejects(listVenueBlocks(denyQuery, attendee, 'venue-1'), { status: 403 });
  await assert.rejects(listVenueBlocks(denyQuery, undefined, 'venue-1'), { status: 401 });
});

test('invalid input is rejected before a transaction opens', async () => {
  const created = await createVenueBlock(denyPool, venueStaff, 'venue-1', { ...valid, reason: '' });
  assert.equal(created.status, 400);
  const shortened = await shortenVenueBlock(denyPool, venueStaff, 'venue-1', 'block-1', { from: 'bad', to: valid.to });
  assert.equal(shortened.status, 400);
});

// E05-S05 Scenario 5: venue setup/turnaround buffers must NOT be applied to
// the booking-versus-maintenance-block check. Proves at the SQL-shape level
// that neither the block-creation conflict check nor the coordinator
// notification query wraps the booking range in occupied_window(); the
// real-database boundary (a block ending before the advertised event start
// but overlapping setup time) is covered in venueBufferConflicts.integration.test.ts.
test('createVenueBlock finds affected bookings on the raw advertised booking range, not the buffered window (T-80)', async () => {
  const affectedSql: string[] = [];
  const client = {
    query: async (sql: string) => {
      if (sql.includes('FROM venues WHERE id::text')) return { rows: [{ id: 'v1', name: 'Riverside Hall' }] };
      if (sql.includes('FROM venue_bookings vb')) {
        affectedSql.push(sql);
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO venue_blocks')) {
        return { rows: [{ id: 'b1', venue_id: 'v1', reason_category: 'maintenance', reason: valid.reason,
          starts_at: new Date('2027-01-04T16:00:00.000Z'), ends_at: new Date('2027-01-10T16:00:00.000Z'),
          created_at: new Date('2027-01-01T00:00:00.000Z') }] };
      }
      return { rows: [] };
    },
    release: () => {},
  };
  const pool = { query: client.query, connect: async () => client } as unknown as Pool;

  const result = await createVenueBlock(pool, venueStaff, 'v1', valid);
  assert.equal(result.status, 201);
  // Read once before the locks and again under them.
  assert.equal(affectedSql.length, 2);
  for (const sql of affectedSql) assert.ok(!sql.includes('occupied_window'), `affected bookings must not use buffers: ${sql}`);
});

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
  createVenueBlock, listVenueBlocks, removeVenueBlock, shortenVenueBlock, validateBlockInput,
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

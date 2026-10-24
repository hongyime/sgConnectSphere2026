// E05-S06 (SCRUM-152) helpers for timed venue unavailability: create, edit,
// lift, history and the list with lifted blocks, against a stubbed fetch
// shaped like the backend's GET/POST /api/venues replies. The server owns the
// rules; these tests check the request bodies, the defaults for missing lists
// and the safe messages on failure.
import { afterEach, expect, test, vi } from 'vitest';
import {
  CATEGORY_LABELS, REASON_CATEGORIES, createUnavailability, editUnavailability, getBlockHistory, liftUnavailability, listBlocks,
  type UnavailabilityInput,
} from './blocksApi';
import { stubApi } from '../../testing/fakeApi';

afterEach(() => vi.unstubAllGlobals());

const block = {
  id: 'blk-1', venueId: 'v-1', from: '2027-01-15', to: '2027-01-15', reasonCategory: 'maintenance', reason: 'Floor resurfacing',
  startsAt: '2027-01-15T00:00:00.000Z', endsAt: '2027-01-15T10:00:00.000Z',
};
const input: UnavailabilityInput = {
  startsAt: '2027-01-15T08:00:00+08:00', endsAt: '2027-01-15T18:00:00+08:00', reasonCategory: 'maintenance', reason: 'Floor resurfacing',
};
const affected = { eventId: 'e-1', eventCode: 'EV-1', title: 'Alumni Dinner', returnedToPlanning: true, coordinatorNotified: true };
const restored = { eventId: 'e-2', eventCode: null, title: 'Spring Gala', coordinatorNotified: true };
const offline = () => vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));

test('every reason category has a label (Scenario 1)', () => {
  expect(REASON_CATEGORIES.map(category => CATEGORY_LABELS[category]))
    .toEqual(['Maintenance', 'Equipment failure', 'Renovation', 'Safety concern', 'Other']);
});

test('createUnavailability sends the timed body and returns the affected events (Scenarios 1 and 2)', async () => {
  const calls = stubApi({ 'POST /api/venues': { status: 201, body: { block, affectedEvents: [affected], notifiedEventCount: 1 } } });
  const result = await createUnavailability('v-1', input);
  expect(calls.at(-1)?.body).toEqual({
    action: 'block', id: 'v-1', starts_at: input.startsAt, ends_at: input.endsAt, reason_category: 'maintenance', reason: 'Floor resurfacing',
  });
  expect(result).toEqual({ ok: true, data: { block, affectedEvents: [affected], restoredEvents: [] } });
});

test('an empty end is sent as null so the venue stays unavailable until lifted (Scenario 5)', async () => {
  const calls = stubApi({ 'POST /api/venues': { status: 201, body: { block: { ...block, to: null, endsAt: null } } } });
  const result = await createUnavailability('v-1', { ...input, endsAt: '' });
  expect((calls.at(-1)?.body as Record<string, unknown>).ends_at).toBeNull();
  expect(result.ok && result.data.affectedEvents).toEqual([]);
});

test('createUnavailability keeps field errors and replaces a network failure with a service message', async () => {
  stubApi({ 'POST /api/venues': { status: 400, body: { error: 'validation_failed', errors: { starts_at: ['A start date and time is required.'] } } } });
  const refused = await createUnavailability('v-1', input);
  expect(refused.ok).toBe(false);
  expect(!refused.ok && refused.fieldErrors?.starts_at).toEqual(['A start date and time is required.']);

  offline();
  expect(await createUnavailability('v-1', input)).toMatchObject({ ok: false, status: 0, message: 'The service is unavailable. Try again.' });
});

test('editUnavailability sends edit_block and returns flagged and restored events (Scenarios 5 and 6)', async () => {
  const calls = stubApi({ 'POST /api/venues': { body: { block, affectedEvents: [affected], restoredEvents: [restored] } } });
  const result = await editUnavailability('v-1', 'blk-1', input);
  expect(calls.at(-1)?.body).toMatchObject({ action: 'edit_block', id: 'v-1', block_id: 'blk-1', reason_category: 'maintenance' });
  expect(result).toEqual({ ok: true, data: { block, affectedEvents: [affected], restoredEvents: [restored] } });

  stubApi({ 'POST /api/venues': { body: { block } } });
  const bare = await editUnavailability('v-1', 'blk-1', input);
  expect(bare.ok && [bare.data.affectedEvents, bare.data.restoredEvents]).toEqual([[], []]);

  stubApi({ 'POST /api/venues': { status: 409, body: { error: 'Bookings at this venue are changing right now. Try again in a moment.' } } });
  expect(await editUnavailability('v-1', 'blk-1', input)).toMatchObject({ ok: false, status: 409 });
});

test('liftUnavailability sends lift_block and returns the restored events (Scenario 6)', async () => {
  const calls = stubApi({ 'POST /api/venues': { body: { block, lifted: true, restoredEvents: [restored], notifiedEventCount: 1 } } });
  const result = await liftUnavailability('v-1', 'blk-1');
  expect(calls.at(-1)?.body).toEqual({ action: 'lift_block', id: 'v-1', block_id: 'blk-1' });
  expect(result).toEqual({ ok: true, data: { block, restoredEvents: [restored] } });

  stubApi({ 'POST /api/venues': { body: { block, lifted: true } } });
  const none = await liftUnavailability('v-1', 'blk-1');
  expect(none.ok && none.data.restoredEvents).toEqual([]);

  offline();
  expect(await liftUnavailability('v-1', 'blk-1')).toMatchObject({ ok: false, message: 'The service is unavailable. Try again.' });
});

test('getBlockHistory reads one block history and refuses safely (Scenario 7)', async () => {
  const entry = { action: 'created', changedAt: '2027-01-02T00:00:00.000Z', actor: 'Venue Staff One', previous: null,
    next: { startsAt: block.startsAt, endsAt: block.endsAt, reasonCategory: 'maintenance', reason: 'Floor resurfacing' } };
  const calls = stubApi({ 'GET /api/venues?id=v-1&blocks=1&history=blk-1': { body: { history: [entry] } } });
  expect(await getBlockHistory('v-1', 'blk-1')).toEqual({ ok: true, data: [entry] });
  expect(calls.at(-1)?.url.search).toBe('?id=v-1&blocks=1&history=blk-1');

  stubApi({ 'GET /api/venues?id=v-1&blocks=1&history=blk-1': { body: {} } });
  expect(await getBlockHistory('v-1', 'blk-1')).toEqual({ ok: true, data: [] });

  stubApi({ 'GET /api/venues?id=v-1&blocks=1&history=blk-1': { status: 403, body: { error: 'Access denied.' } } });
  expect(await getBlockHistory('v-1', 'blk-1')).toMatchObject({ ok: false, status: 403 });
});

test('listBlocks asks for lifted blocks only when requested (Scenario 7)', async () => {
  const calls = stubApi({ 'GET /api/venues?id=v-1&blocks=1': {
    body: { blocks: [{ ...block, liftedAt: '2027-01-15T06:00:00.000Z', liftedBy: 'Venue Staff One' }] },
  } });
  const lifted = await listBlocks('v-1', undefined, { includeLifted: true });
  expect(calls.at(-1)?.url.searchParams.get('lifted')).toBe('1');
  expect(lifted.ok && lifted.data[0]?.liftedBy).toBe('Venue Staff One');

  await listBlocks('v-1');
  expect(calls.at(-1)?.url.searchParams.has('lifted')).toBe(false);
});

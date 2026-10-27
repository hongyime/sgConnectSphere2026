// SCRUM-152: unit tests for E05-S06 "Mark a venue temporarily unavailable
// over existing bookings".
//
// Every create, edit, shorten, lift and remove branch runs against a scripted
// fake database, so the rules are covered without PostgreSQL: bookings and
// holds become Conflicting (Scenario 2, C-111), a Confirmed event returns to
// Planning without generic notices (Scenario 3, T-81, C-121), only affected
// Coordinators are told (Scenario 4), open-ended and edited periods
// (Scenario 5, T-80, T-91), restoring on shorten or lift (Scenario 6, C-122)
// and history (Scenario 7). venueUnavailability.integration.test.ts proves the
// same against a real database (TC_E05S06_05, _07, _08).

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import {
  createVenueBlock, editVenueBlock, getVenueBlockHistory, liftVenueBlock, listVenueBlocks, removeVenueBlock, shortenVenueBlock,
} from '../src/modules/venueBooking/blocks.js';
import { applyEventStatusChange } from '../src/modules/eventLifecycle/repository.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const staff: AuthenticatedUser = { id: '00000000-0000-4000-8000-0000000000f1', email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
const VENUE = '00000000-0000-4000-8000-0000000000a1';
const BLOCK = '00000000-0000-4000-8000-0000000000b1';
const COORD_A = '00000000-0000-4000-8000-0000000000c1';
const COORD_B = '00000000-0000-4000-8000-0000000000c2';
const NOW = new Date('2027-01-02T00:00:00Z');

type Handler = [fragment: string, result: unknown[] | ((values?: unknown[]) => unknown[]) | Error];

// The first handler whose fragment appears in the SQL answers it; anything
// else returns no rows. Every statement is recorded.
function fakeDatabase(handlers: Handler[]) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const run = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const match = handlers.find(([fragment]) => sql.includes(fragment));
    const result = match?.[1];
    if (result instanceof Error) throw result;
    let rows = typeof result === 'function' ? result(values) : result;
    if (!rows) {
      if (sql.includes('INSERT INTO notifications')) rows = [{ id: String(values?.[4]) }];
      else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: '00000000-0000-4000-8000-0000000000d2' }];
      else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'recipient@example.test', title: 'Venue notice', message: 'Synthetic notice' }];
      else rows = [];
    }
    return { rows, rowCount: rows.length };
  };
  const pool = { query: run, async connect() { return { query: run, release() {} }; } } as unknown as Pool;
  const count = (fragment: string) => calls.filter(call => call.sql.includes(fragment)).length;
  const valuesOf = (fragment: string) => calls.filter(call => call.sql.includes(fragment)).map(call => call.values);
  return { pool, calls, count, valuesOf };
}

const sqlError = (code: string) => Object.assign(new Error(`synthetic ${code}`), { code });

const blockRow = (overrides: Record<string, unknown> = {}) => ({
  id: BLOCK, venue_id: VENUE, reason_category: 'safety_concern', reason: 'Ceiling inspection',
  starts_at: new Date('2027-01-14T16:00:00Z'), ends_at: new Date('2027-01-15T16:00:00Z'), ...overrides,
});

const affected = (booking: string, status: string, event: string, eventStatus: string, coordinator: string | null, title = event) => ({
  booking_id: booking, status, event_id: event, event_code: `EVT-${event}`, title, event_status: eventStatus, coordinator_id: coordinator,
});

const flagged = (booking: string, event: string, coordinator: string | null, extra: Record<string, unknown> = {}) => ({
  booking_id: booking, status_before_conflict: 'pending', expired: false, replaced: false,
  event_id: event, event_code: `EVT-${event}`, title: event, coordinator_id: coordinator, ...extra,
});

const venueAndBlock: Handler[] = [
  ['FROM venues WHERE id::text = $1 FOR UPDATE', [{ id: VENUE, name: 'Riverside Hall' }]],
  ['lifted_at IS NULL FOR UPDATE', [blockRow()]],
];

// Applied by applyEventStatusChange when a Confirmed event returns to Planning.
const eventStatusChange: Handler[] = [
  ['SELECT status FROM events WHERE id = $1 FOR UPDATE', [{ status: 'confirmed' }]],
  ['UPDATE events', [{ id: 'e', title: 'T', status: 'planning', start_at: NOW, end_at: NOW }]],
  ["VALUES ($1, 'event', $2, $2", [{ id: 'event-audit', occurred_at: NOW }]],
];

const notifications = (db: ReturnType<typeof fakeDatabase>) =>
  db.valuesOf('INSERT INTO notifications').map(values => ({ user: values?.[0], title: values?.[2], message: String(values?.[3]) }));

test('Scenarios 2 to 4: creating flags every overlapping booking and hold, returns only the Confirmed event to Planning and tells each Coordinator once', async () => {
  const rows = [
    affected('bk-pending', 'pending', 'dinner', 'planning', COORD_B, 'Alumni Dinner'),
    affected('bk-confirmed', 'confirmed', 'run', 'confirmed', COORD_A, 'Charity Run'),
    affected('bk-hold', 'tentative', 'dinner', 'planning', COORD_B, 'Alumni Dinner'),
    affected('bk-nobody', 'pending', 'unassigned', 'approved', null, 'Unassigned Fair'),
  ];
  const db = fakeDatabase([
    ...venueAndBlock, ...eventStatusChange,
    ['e.status NOT IN', rows],
    ['INSERT INTO venue_blocks', [{ ...blockRow(), created_at: NOW }]],
  ]);
  const result = await createVenueBlock(db.pool, staff, VENUE, {
    starts_at: '2027-01-15T00:00:00+08:00', ends_at: '2027-01-16T00:00:00+08:00', reason_category: 'safety_concern', reason: 'Ceiling inspection',
  });
  assert.equal(result.status, 201);
  const body = result.body as { affectedEvents: Array<Record<string, unknown>>; notifiedEventCount: number };
  assert.deepEqual(body.affectedEvents.map(event => [event.title, event.returnedToPlanning, event.coordinatorNotified]), [
    ['Alumni Dinner', false, true], ['Charity Run', true, true], ['Unassigned Fair', false, false],
  ]);
  assert.equal(body.notifiedEventCount, 2);

  // Every booking and the hold become Conflicting with an audit entry; none is released.
  assert.deepEqual(db.valuesOf("SET status = 'conflicting'").map(values => values?.[0]), ['bk-pending', 'bk-confirmed', 'bk-hold', 'bk-nobody']);
  assert.deepEqual(db.valuesOf("'Booking Conflicting'").map(values => values?.[3]), ['pending', 'confirmed', 'tentative', 'pending']);
  assert.equal(db.count("status = 'released'"), 0);
  // Only Charity Run changes status, and the generic notices to everyone are skipped.
  assert.equal(db.count('UPDATE events'), 1);
  assert.equal(db.count('FROM event_registrations'), 0);
  // Events are locked before the venue (lock order shared with decisions).
  const order = db.calls.map(call => call.sql);
  assert.ok(order.findIndex(sql => sql.includes('FROM events WHERE id = ANY')) < order.findIndex(sql => sql.includes('FROM venues WHERE id::text = $1 FOR UPDATE')));
  assert.equal(db.count('NOWAIT'), 0, 'no event appeared after the first read');

  const sent = notifications(db);
  assert.deepEqual(sent.map(notice => [notice.user, notice.title]), [[COORD_B, 'Venue unavailable'], [COORD_A, 'Venue unavailable']]);
  assert.match(sent[0]!.message, /^Riverside Hall is unavailable 15 Jan 2027, 12:00 am to 16 Jan 2027, 12:00 am \(Safety concern: Ceiling inspection\)\. This affects the venue booking for "Alumni Dinner"\. Alternative arrangements are required\.$/);
  assert.match(sent[1]!.message, /Alternative arrangements are required\. The event has returned to Planning\.$/);

  assert.deepEqual(db.valuesOf('INSERT INTO venue_block_history').map(values => values?.slice(0, 2)), [[BLOCK, 'created']]);
});

test('Scenarios 1 and 5: an open-ended unavailability without a note says "until lifted" and leaves the note out', async () => {
  const openEnded = { ...blockRow({ reason_category: 'renovation', reason: '', ends_at: null }), created_at: NOW };
  const db = fakeDatabase([
    ...venueAndBlock,
    ['e.status NOT IN', [affected('bk', 'pending', 'fair', 'planning', COORD_A, 'Spring Fair')]],
    ['INSERT INTO venue_blocks', [openEnded]],
  ]);
  const result = await createVenueBlock(db.pool, staff, VENUE, { starts_at: '2027-01-15T00:00:00+08:00', reason_category: 'renovation' });
  assert.equal(result.status, 201);
  const block = (result.body as { block: Record<string, unknown> }).block;
  assert.deepEqual([block.to, block.endsAt, block.reasonCategory], [null, null, 'renovation']);
  assert.match(notifications(db)[0]!.message, /is unavailable from 15 Jan 2027, 12:00 am until lifted \(Renovation\)\. /);
  assert.match(String(db.valuesOf("'venue_block', $2, $3, 'block_range'")[0]?.[4]), /to until lifted: $/);
});

test('creating refuses invalid input before a transaction, an overlapping unavailability, and an unknown venue', async () => {
  const invalid = fakeDatabase([]);
  const refused = await createVenueBlock(invalid.pool, staff, VENUE, { starts_at: 'soon', reason_category: 'other' });
  assert.equal(refused.status, 400);
  assert.equal(invalid.count('BEGIN'), 0);

  const overlapping = fakeDatabase([...venueAndBlock, ['FROM venue_blocks WHERE venue_id = $1', [blockRow()]]]);
  const overlap = await createVenueBlock(overlapping.pool, staff, VENUE, { starts_at: '2027-01-15T00:00:00+08:00', reason_category: 'other' });
  assert.equal(overlap.status, 409);
  assert.equal((overlap.body as { error: string }).error, 'block_overlap');
  assert.equal(overlapping.count('INSERT INTO venue_blocks'), 0);

  const missing = fakeDatabase([]);
  await assert.rejects(createVenueBlock(missing.pool, staff, VENUE, { starts_at: '2027-01-15T00:00:00+08:00', reason_category: 'other' }), { status: 404 });
});

test('a booking that appears after the first read is locked without waiting, and a busy event asks staff to try again', async () => {
  let reads = 0;
  const lateRows = () => (reads++ === 0 ? [] : [affected('bk-late', 'pending', 'late', 'planning', null)]);
  const ok = fakeDatabase([...venueAndBlock, ['e.status NOT IN', lateRows], ['INSERT INTO venue_blocks', [{ ...blockRow(), created_at: NOW }]]]);
  assert.equal((await createVenueBlock(ok.pool, staff, VENUE, { starts_at: '2027-01-15T00:00:00+08:00', reason_category: 'other' })).status, 201);
  assert.deepEqual(ok.valuesOf('NOWAIT'), [[['late']]]);

  for (const [code, expected] of [['55P03', { status: 409, message: /Try again in a moment/ }], ['XX000', /synthetic XX000/]] as const) {
    reads = 0;
    const busy = fakeDatabase([...venueAndBlock, ['e.status NOT IN', lateRows], ['NOWAIT', sqlError(code)],
      ['INSERT INTO venue_blocks', [{ ...blockRow(), created_at: NOW }]]]);
    await assert.rejects(createVenueBlock(busy.pool, staff, VENUE, { starts_at: '2027-01-15T00:00:00+08:00', reason_category: 'other' }), expected);
    assert.equal(busy.count('ROLLBACK'), 1, code);
    assert.equal(busy.count("SET status = 'conflicting'"), 0, code);
  }
});

test('Scenarios 5 to 7: editing restores bookings it no longer covers, skips replaced ones, flags new ones and keeps history', async () => {
  const toRestore = [
    flagged('bk-back', 'dinner', COORD_B, { status_before_conflict: 'confirmed' }),
    flagged('bk-expired', 'gala', null, { status_before_conflict: 'tentative', expired: true }),
    flagged('bk-replaced', 'night', COORD_A, { replaced: true }),
    flagged('bk-clash', 'clash', COORD_A),
  ];
  const db = fakeDatabase([
    ...venueAndBlock,
    ['vb.conflict_block_id::text = $1', toRestore],
    ['e.status NOT IN', (values) => (values?.[0] === VENUE ? [affected('bk-new', 'pending', 'fair', 'planning', COORD_A, 'Spring Fair')] : [])],
    ['UPDATE venue_blocks SET block_range', [{ ...blockRow({ reason: 'Longer works' }), changed_at: NOW }]],
    ['SET status = $2::booking_status', (values) => { if (values?.[0] === 'bk-clash') throw sqlError('23P01'); return []; }],
  ]);
  const result = await editVenueBlock(db.pool, staff, VENUE, BLOCK, {
    starts_at: '2027-01-15T00:00:00+08:00', ends_at: '2027-01-15T06:00:00+08:00', reason_category: 'safety_concern', reason: 'Longer works',
  });
  assert.equal(result.status, 200);
  const body = result.body as { restoredEvents: Array<Record<string, unknown>>; affectedEvents: Array<Record<string, unknown>> };
  assert.deepEqual(body.restoredEvents.map(event => [event.title, event.coordinatorNotified]), [['dinner', true], ['gala', false]]);
  assert.deepEqual(body.affectedEvents.map(event => event.title), ['Spring Fair']);
  // Restored as they were, an expired hold as Expired; a clash rolls back to its savepoint and stays Conflicting.
  assert.deepEqual(db.valuesOf('SET status = $2::booking_status').map(values => values?.slice(0, 2)), [['bk-back', 'confirmed'], ['bk-expired', 'expired'], ['bk-clash', 'pending']]);
  assert.equal(db.count('ROLLBACK TO SAVEPOINT restore_booking'), 1);
  assert.deepEqual(db.valuesOf("'Booking Restored'").map(values => values?.[1]), ['bk-back', 'bk-expired']);
  assert.deepEqual(notifications(db).map(notice => notice.title), ['Venue available again', 'Venue unavailable']);
  assert.deepEqual(db.valuesOf("'venue_block', $2, $3, 'block_range'").map(values => values?.[2]), ['Venue block edited']);
  assert.deepEqual(db.valuesOf('INSERT INTO venue_block_history').map(values => values?.[1]), ['edited']);
});

test('editing needs a start, valid input and a free period, and does not hide other restore errors', async () => {
  const none = fakeDatabase([]);
  for (const body of [undefined, { reason_category: 'other' }]) {
    const result = await editVenueBlock(none.pool, staff, VENUE, BLOCK, body);
    assert.deepEqual(result.body, { error: 'validation_failed', errors: { starts_at: ['A start date and time is required.'] } });
  }
  assert.equal((await editVenueBlock(none.pool, staff, VENUE, BLOCK, { starts_at: '2027-01-15T00:00:00Z', reason_category: 'flood' })).status, 400);

  const overlapping = fakeDatabase([...venueAndBlock, ['AND id <> $2 AND lifted_at IS NULL', [blockRow({ id: 'other' })]]]);
  const overlap = await editVenueBlock(overlapping.pool, staff, VENUE, BLOCK, { starts_at: '2027-01-15T00:00:00Z', reason_category: 'other' });
  assert.equal(overlap.status, 409);
  assert.equal(overlapping.count('UPDATE venue_blocks'), 0);

  const failing = fakeDatabase([...venueAndBlock,
    ['vb.conflict_block_id::text = $1', [flagged('bk', 'dinner', COORD_A)]],
    ['UPDATE venue_blocks SET block_range', [{ ...blockRow(), changed_at: NOW }]],
    ['SET status = $2::booking_status', sqlError('XX000')]]);
  await assert.rejects(editVenueBlock(failing.pool, staff, VENUE, BLOCK, { starts_at: '2027-01-15T00:00:00Z', reason_category: 'other' }), /synthetic XX000/);

  const missing = fakeDatabase([['FROM venues WHERE id::text = $1 FOR UPDATE', [{ id: VENUE, name: 'Riverside Hall' }]]]);
  await assert.rejects(editVenueBlock(missing.pool, staff, VENUE, BLOCK, { starts_at: '2027-01-15T00:00:00Z', reason_category: 'other' }), { status: 404 });
});

test('E05-S04 shorten still only shortens, keeps the category and note, and now restores what it releases', async () => {
  const shortened = fakeDatabase([...venueAndBlock, ['UPDATE venue_blocks SET block_range', [{ ...blockRow(), changed_at: NOW }]]]);
  const result = await shortenVenueBlock(shortened.pool, staff, VENUE, BLOCK, { from: '2027-01-15', to: '2027-01-15' });
  assert.equal(result.status, 200);
  assert.deepEqual(shortened.valuesOf('UPDATE venue_blocks SET block_range')[0]?.slice(3), ['safety_concern', 'Ceiling inspection']);
  assert.deepEqual(shortened.valuesOf("'venue_block', $2, $3, 'block_range'").map(values => values?.[2]), ['Venue block shortened']);

  const openEnded = fakeDatabase([['FROM venues WHERE id::text = $1 FOR UPDATE', [{ id: VENUE, name: 'Riverside Hall' }]],
    ['lifted_at IS NULL FOR UPDATE', [blockRow({ ends_at: null })]],
    ['UPDATE venue_blocks SET block_range', [{ ...blockRow(), changed_at: NOW }]]]);
  assert.equal((await shortenVenueBlock(openEnded.pool, staff, VENUE, BLOCK, { from: '2027-01-15', to: '2027-03-01' })).status, 200);
  assert.equal(String(openEnded.valuesOf('UPDATE venue_blocks SET block_range')[0]?.[2]), String(new Date('2027-03-01T16:00:00Z')));

  const longer = fakeDatabase(venueAndBlock);
  const refused = await shortenVenueBlock(longer.pool, staff, VENUE, BLOCK, { from: '2027-01-15', to: '2027-01-20' });
  assert.deepEqual(refused.body, { error: 'validation_failed', errors: { to: ['A block can only be shortened. Edit it to cover extra dates.'] } });
  assert.equal(longer.count('UPDATE venue_blocks'), 0);
  assert.equal((await shortenVenueBlock(longer.pool, staff, VENUE, BLOCK, { from: 'x', to: 'y' })).status, 400);
});

test('Scenarios 6 and 7: lifting keeps the block, restores what it flagged and tells every affected Coordinator once', async () => {
  const rows = [
    flagged('bk-back', 'dinner', COORD_B),
    flagged('bk-replaced', 'night', COORD_A, { replaced: true }),
    flagged('bk-replaced-2', 'night', COORD_A, { replaced: true }),
    flagged('bk-unassigned', 'nobody', null, { replaced: true }),
    flagged('bk-inactive', 'gone', 'inactive-user', { replaced: true }),
  ];
  const db = fakeDatabase([
    ...venueAndBlock,
    ['vb.conflict_block_id::text = $1', rows],
    ['UPDATE venue_blocks SET lifted_at', [{ lifted_at: NOW }]],
    ['INSERT INTO notifications', (values) => (values?.[0] === 'inactive-user' ? [] : [{ id: String(values?.[4]) }])],
  ]);
  const result = await liftVenueBlock(db.pool, staff, VENUE, BLOCK);
  assert.equal(result.status, 200);
  const body = result.body as { lifted: boolean; restoredEvents: Array<Record<string, unknown>>; notifiedEventCount: number };
  assert.equal(body.lifted, true);
  assert.deepEqual(body.restoredEvents.map(event => event.title), ['dinner']);
  assert.equal(body.notifiedEventCount, 2);
  assert.equal(db.count('DELETE FROM venue_blocks'), 0);
  assert.deepEqual(db.valuesOf('INSERT INTO venue_block_history').map(values => values?.[1]), ['lifted']);
  const sent = notifications(db);
  assert.deepEqual(sent.map(notice => notice.user), [COORD_B, COORD_A, 'inactive-user']);
  assert.match(sent[1]!.message, /^The unavailability on Riverside Hall has been lifted\. The venue booking for "night" still needs your attention/);
  // The restore and lift notices share one change ID, so a Coordinator is never told twice.
  const ids = db.valuesOf('INSERT INTO notifications').map(values => values?.[4]);
  assert.equal(new Set(ids).size, ids.length);
});

test('#348 review: a booking another unavailability still covers is handed to it, not restored', async () => {
  const db = fakeDatabase([
    ...venueAndBlock,
    ['vb.conflict_block_id::text = $1', [flagged('bk-covered', 'workshop', COORD_A), flagged('bk-free', 'dinner', COORD_B)]],
    ['UPDATE venue_blocks SET lifted_at', [{ lifted_at: NOW }]],
    ['WITH other AS', (values) => (values?.[0] === 'bk-covered' ? [{}] : [])],
  ]);
  const result = await liftVenueBlock(db.pool, staff, VENUE, BLOCK);
  const body = result.body as { restoredEvents: Array<Record<string, unknown>> };
  assert.deepEqual(body.restoredEvents.map(event => event.title), ['dinner']);
  assert.deepEqual(db.valuesOf('WITH other AS'), [['bk-covered', BLOCK], ['bk-free', BLOCK]]);
  assert.deepEqual(db.valuesOf('status_before_conflict = NULL').map(values => values?.[0]), ['bk-free']);
  assert.match(notifications(db).find(notice => notice.user === COORD_A)!.message, /still needs your attention/);
});

test('E05-S04 remove now lifts and keeps its reply; a lifted or unknown block is not found', async () => {
  const db = fakeDatabase([...venueAndBlock, ['UPDATE venue_blocks SET lifted_at', [{ lifted_at: NOW }]]]);
  const result = await removeVenueBlock(db.pool, staff, VENUE, BLOCK);
  assert.deepEqual([result.status, (result.body as Record<string, unknown>).removed, (result.body as Record<string, unknown>).lifted], [200, true, true]);
  assert.deepEqual(db.valuesOf("'venue_block', $2, $3, 'block_range'").map(values => values?.[2]), ['Venue block removed']);

  const missing = fakeDatabase([['FROM venues WHERE id::text = $1 FOR UPDATE', [{ id: VENUE, name: 'Riverside Hall' }]]]);
  await assert.rejects(liftVenueBlock(missing.pool, staff, VENUE, BLOCK), { status: 404 });
});

test('the block list shows an open-ended block with no end and hides lifted ones in its query', async () => {
  const seen: string[] = [];
  const query = (async (sql: string) => {
    seen.push(sql);
    if (sql.startsWith('SELECT 1 FROM venues')) return { rows: [{}] };
    return { rows: [blockRow({ ends_at: null, reason_category: 'other' })] };
  }) as never;
  const listed = await listVenueBlocks(query, staff, VENUE);
  assert.deepEqual(listed.blocks.map(block => [block.from, block.to, block.endsAt, block.reasonCategory]), [['2027-01-15', null, null, 'other']]);
  assert.match(seen.at(-1)!, /lifted_at IS NULL/);
  assert.match(seen.at(-1)!, /upper_inf\(b\.block_range\)/);
  await assert.rejects(listVenueBlocks((async () => ({ rows: [] })) as never, staff, VENUE), { status: 404 });
});

test('Scenario 7: on request the block list keeps lifted blocks, marked lifted with who lifted them, for Venue Staff only', async () => {
  const seen: { sql: string; values?: unknown[] }[] = [];
  const query = (async (sql: string, values?: unknown[]) => {
    seen.push({ sql, values });
    if (sql.startsWith('SELECT 1 FROM venues')) return { rows: [{}] };
    return { rows: [
      blockRow({ lifted_at: null, lifted_by_name: null }),
      blockRow({ id: 'lifted', lifted_at: NOW, lifted_by_name: 'Venue Staff One' }),
      blockRow({ id: 'orphan', lifted_at: NOW }),
    ] };
  }) as never;
  const listed = await listVenueBlocks(query, staff, VENUE, { includeLifted: true });
  assert.deepEqual(listed.blocks.map(block => [block.id, (block as { liftedAt: string | null }).liftedAt, (block as { liftedBy: string | null }).liftedBy]),
    [[BLOCK, null, null], ['lifted', NOW.toISOString(), 'Venue Staff One'], ['orphan', NOW.toISOString(), null]]);
  assert.equal(seen.at(-1)!.values?.[1], true);

  const plain = await listVenueBlocks(query, staff, VENUE);
  assert.equal('liftedAt' in plain.blocks[0]!, false);
  assert.equal(seen.at(-1)!.values?.[1], false);

  const coordinator = { ...staff, role: 'event_coordinator' } as AuthenticatedUser;
  const denied = (async () => ({ rows: [] })) as never;
  await assert.rejects(listVenueBlocks(denied, coordinator, VENUE, { includeLifted: true }), { status: 403 });
});

test('Scenario 7: block history returns each create, edit and lift with the earlier and new period, category, note, actor and time', async () => {
  const later = new Date('2027-01-15T12:00:00Z');
  const query = (async (sql: string) => {
    if (sql.includes('FROM venue_blocks WHERE id::text')) return { rows: [{}] };
    return { rows: [
      { action: 'created', changed_at: NOW, actor_name: 'Venue Staff One',
        previous_starts_at: null, previous_ends_at: null, previous_category: null, previous_reason: null,
        new_starts_at: NOW, new_ends_at: later, new_category: 'maintenance', new_reason: 'Floor resurfacing' },
      { action: 'edited', changed_at: NOW, actor_name: 'Venue Staff One',
        previous_starts_at: NOW, previous_ends_at: later, previous_category: 'maintenance', previous_reason: 'Floor resurfacing',
        new_starts_at: NOW, new_ends_at: null, new_category: 'maintenance', new_reason: 'Floor resurfacing, second coat' },
      { action: 'lifted', changed_at: later, actor_name: null,
        previous_starts_at: NOW, previous_ends_at: null, previous_category: 'maintenance', previous_reason: 'Floor resurfacing, second coat',
        new_starts_at: null, new_ends_at: null, new_category: null, new_reason: null },
    ] };
  }) as never;
  const { history } = await getVenueBlockHistory(query, staff, VENUE, BLOCK);
  assert.deepEqual(history.map(entry => [entry.action, entry.actor, entry.changedAt]),
    [['created', 'Venue Staff One', NOW.toISOString()], ['edited', 'Venue Staff One', NOW.toISOString()], ['lifted', null, later.toISOString()]]);
  assert.equal(history[0]!.previous, null);
  assert.deepEqual(history[0]!.next, { startsAt: NOW.toISOString(), endsAt: later.toISOString(), reasonCategory: 'maintenance', reason: 'Floor resurfacing' });
  assert.deepEqual(history[1]!.next, { startsAt: NOW.toISOString(), endsAt: null, reasonCategory: 'maintenance', reason: 'Floor resurfacing, second coat' });
  assert.equal(history[2]!.next, null);

  await assert.rejects(getVenueBlockHistory((async () => ({ rows: [] })) as never, staff, VENUE, BLOCK), { status: 404 });
  const coordinator = { ...staff, role: 'event_coordinator' } as AuthenticatedUser;
  await assert.rejects(getVenueBlockHistory((async () => ({ rows: [] })) as never, coordinator, VENUE, BLOCK), { status: 403 });
});

test('Scenario 3 support: applyEventStatusChange can skip the generic notices and the audience read', async () => {
  const db = fakeDatabase(eventStatusChange);
  const client = await db.pool.connect() as unknown as PoolClient;
  const result = await applyEventStatusChange(client, 'e', 'planning', staff.id, { auditAction: 'Returned to Planning: venue unavailable', skipNotices: true });
  assert.equal(result.event.status, 'planning');
  assert.deepEqual(result.change, { auditId: 'event-audit', occurredAt: NOW, from: 'confirmed' });
  assert.equal(db.count('INSERT INTO notifications'), 0);
  assert.equal(db.calls.length, 3, 'lock, update and audit only');
});

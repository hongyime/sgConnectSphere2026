// SCRUM-152: E05-S06 "Mark a venue temporarily unavailable over existing
// bookings" against a real, disposable PostgreSQL schema with every
// repository migration applied.
//
// Proves what the unit stubs cannot: overlapping bookings really become
// Conflicting and come back, events really change status, only the affected
// Coordinators really receive notices, and every change is kept in the block
// history.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createVenueBlock, editVenueBlock, getVenueBlockHistory, liftVenueBlock, listVenueBlocks, removeVenueBlock, shortenVenueBlock,
} from '../src/modules/venueBooking/blocks.js';
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import { listBookingRequests } from '../src/modules/venueBooking/bookingRequests.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function fixture() {
  const f = await loginDatabase();
  const ids = {
    org: randomUUID(), organiser: randomUUID(), staff: randomUUID(),
    coordinator1: randomUUID(), coordinator2: randomUUID(), venue: randomUUID(),
  };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, org, name] of [
    [ids.organiser, 'event_organiser', ids.org, 'Organiser A'], [ids.staff, 'venue_staff', null, 'Venue Staff A'],
    [ids.coordinator1, 'event_coordinator', null, 'Coordinator A'], [ids.coordinator2, 'event_coordinator', null, 'Coordinator B'],
  ] as const) {
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', $4, $5)`, [id, org, `${id}@example.test`, name, role]);
  }
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
    VALUES ($1, 'Riverside Hall', 'Test wing', 300, '08:00', '22:00')`, [ids.venue]);

  const staff: AuthenticatedUser = { id: ids.staff, email: `${ids.staff}@example.test`, role: 'venue_staff', isActive: true, failedLoginCount: 0 };

  // An event with one booking on Riverside Hall, times in Singapore time.
  async function book(title: string, coordinatorId: string, eventStatus: string, bookingStatus: string, day: string, from: string, to: string,
    expiresAt: string | null = null) {
    const eventId = randomUUID();
    const bookingId = randomUUID();
    const range = `[${day}T${from}:00+08:00,${day}T${to}:00+08:00)`;
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, $4, $5, $6, $7::event_status, $8::tstzrange, 100)`,
    [eventId, `EVT-${eventId.slice(0, 4)}`, ids.organiser, coordinatorId, ids.org, title, eventStatus, range]);
    await f.pool.query(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status, expires_at)
      VALUES ($1, $2, $3, $4::tstzrange, $5::booking_status, $6)`, [bookingId, ids.venue, eventId, range, bookingStatus, expiresAt]);
    return { eventId, bookingId };
  }

  const booking = async (id: string) => (await f.pool.query<{ status: string; status_before_conflict: string | null; conflict_block_id: string | null }>(
    `SELECT status::text, status_before_conflict::text, conflict_block_id FROM venue_bookings WHERE id = $1`, [id])).rows[0]!;
  const eventStatus = async (id: string) => (await f.pool.query<{ status: string }>(`SELECT status::text FROM events WHERE id = $1`, [id])).rows[0]!.status;
  const notices = async (eventId: string) => (await f.pool.query<{ user_id: string; title: string; message: string }>(
    `SELECT user_id, title, message FROM notifications WHERE event_id = $1 ORDER BY created_at, title`, [eventId])).rows;
  const history = async (blockId: string) => (await f.pool.query<{ action: string; previous_reason: string | null; new_reason: string | null; actor_id: string }>(
    `SELECT action, previous_reason, new_reason, actor_id FROM venue_block_history WHERE block_id = $1 ORDER BY changed_at, action`, [blockId])).rows;

  const isPrimary = async (id: string) => (await f.pool.query<{ is_primary: boolean }>(
    `SELECT is_primary FROM venue_bookings WHERE id = $1`, [id])).rows[0]!.is_primary;

  return { ...f, ids, staff, book, booking, eventStatus, notices, history, isPrimary };
}

async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

type EditBody = { block: { id: string; endsAt: string | null }; affectedEvents: Array<{ title: string }>; restoredEvents: Array<{ title: string }> };

test('TC_E05S06_05: extending by one minute over a booking flags it, and ending at its start again restores it', () => withFixture(async f => {
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T12:00:00+08:00', reason_category: 'maintenance', reason: 'Floor polish',
  });
  assert.equal(created.status, 201);
  const blockId = (created.body as EditBody).block.id;
  const dinner = await f.book('Alumni Dinner', f.ids.coordinator2, 'confirmed', 'confirmed', '2027-01-15', '12:00', '14:00');

  const longer = await editVenueBlock(f.pool, f.staff, f.ids.venue, blockId, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T12:01:00+08:00', reason_category: 'maintenance', reason: 'Floor polish',
  });
  assert.equal(longer.status, 200);
  assert.deepEqual((longer.body as EditBody).affectedEvents.map(event => event.title), ['Alumni Dinner']);
  assert.deepEqual(await f.booking(dinner.bookingId), { status: 'conflicting', status_before_conflict: 'confirmed', conflict_block_id: blockId });
  assert.equal(await f.eventStatus(dinner.eventId), 'planning');
  assert.deepEqual((await f.notices(dinner.eventId)).map(notice => [notice.user_id, notice.title]), [[f.ids.coordinator2, 'Venue unavailable']]);

  const back = await editVenueBlock(f.pool, f.staff, f.ids.venue, blockId, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T12:00:00+08:00', reason_category: 'maintenance', reason: 'Floor polish',
  });
  assert.equal(back.status, 200);
  assert.deepEqual((back.body as EditBody).restoredEvents.map(event => event.title), ['Alumni Dinner']);
  assert.deepEqual(await f.booking(dinner.bookingId), { status: 'confirmed', status_before_conflict: null, conflict_block_id: null });
  // The event does not jump straight back to Confirmed; it follows E08-S04 Scenario 4.
  assert.equal(await f.eventStatus(dinner.eventId), 'planning');
  assert.deepEqual((await f.notices(dinner.eventId)).map(notice => notice.title).sort(), ['Venue available again', 'Venue unavailable']);
  assert.deepEqual((await f.history(blockId)).map(entry => entry.action), ['created', 'edited', 'edited']);
}));

test('Scenario 5: removing the end of an unavailability flags bookings far in the future', () => withFixture(async f => {
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-02-01T08:00:00+08:00', ends_at: '2027-02-01T18:00:00+08:00', reason_category: 'renovation',
  });
  const blockId = (created.body as EditBody).block.id;
  const later = await f.book('Spring Fair', f.ids.coordinator1, 'planning', 'pending', '2027-05-01', '10:00', '12:00');
  const edited = await editVenueBlock(f.pool, f.staff, f.ids.venue, blockId, {
    starts_at: '2027-02-01T08:00:00+08:00', reason_category: 'renovation', reason: 'Extended works',
  });
  assert.equal(edited.status, 200);
  assert.equal((edited.body as EditBody).block.endsAt, null);
  assert.equal((await f.booking(later.bookingId)).status, 'conflicting');
  const entries = await f.history(blockId);
  assert.deepEqual(entries.at(-1), { action: 'edited', previous_reason: '', new_reason: 'Extended works', actor_id: f.ids.staff });
}));

test('Scenario 6: a restored hold whose expiry passed meanwhile becomes Expired, and a replaced booking stays Conflicting', () => withFixture(async f => {
  const hold = await f.book('Spring Gala', f.ids.coordinator1, 'planning', 'tentative', '2027-01-22', '10:00', '12:00', '2099-01-01T00:00:00Z');
  const replacedBooking = await f.book('Harbour Night', f.ids.coordinator2, 'planning', 'pending', '2027-01-22', '14:00', '16:00');
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-22T00:00:00+08:00', ends_at: '2027-01-23T00:00:00+08:00', reason_category: 'maintenance', reason: 'Lighting rig repair',
  });
  const blockId = (created.body as EditBody).block.id;
  assert.equal((await f.booking(hold.bookingId)).status, 'conflicting');

  // The hold's time runs out while it is Conflicting; Harbour Night gets a
  // replacement request that points back at it.
  await f.pool.query(`UPDATE venue_bookings SET expires_at = now() - interval '1 minute' WHERE id = $1`, [hold.bookingId]);
  const otherVenue = randomUUID();
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Harbour Suite', 'Test wing', 300, '08:00', '22:00')`, [otherVenue]);
  await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, replaces_booking_id)
    VALUES ($1, $2, '[2027-01-22T14:00:00+08:00,2027-01-22T16:00:00+08:00)', 'pending', $3)`, [otherVenue, replacedBooking.eventId, replacedBooking.bookingId]);

  const shorter = await editVenueBlock(f.pool, f.staff, f.ids.venue, blockId, {
    starts_at: '2027-01-22T00:00:00+08:00', ends_at: '2027-01-22T06:00:00+08:00', reason_category: 'maintenance', reason: 'Lighting rig repair',
  });
  assert.equal(shorter.status, 200);
  assert.deepEqual((shorter.body as EditBody).restoredEvents.map(event => event.title), ['Spring Gala']);
  assert.equal((await f.booking(hold.bookingId)).status, 'expired');
  assert.equal((await f.booking(replacedBooking.bookingId)).status, 'conflicting');
}));

type LiftBody = { lifted: boolean; restoredEvents: Array<{ title: string }>; notifiedEventCount: number };

test('TC_E05S06_07: editing and lifting keep a history, the lifted block is kept, and its Coordinator is told on lift', () => withFixture(async f => {
  const dinner = await f.book('Alumni Dinner', f.ids.coordinator2, 'planning', 'pending', '2027-01-15', '14:00', '16:00');
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T18:00:00+08:00', reason_category: 'maintenance', reason: 'Floor resurfacing',
  });
  const blockId = (created.body as EditBody).block.id;
  await editVenueBlock(f.pool, f.staff, f.ids.venue, blockId, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T20:00:00+08:00', reason_category: 'maintenance', reason: 'Floor resurfacing, second coat',
  });
  assert.equal((await f.booking(dinner.bookingId)).status, 'conflicting');

  const lifted = await liftVenueBlock(f.pool, f.staff, f.ids.venue, blockId);
  assert.equal(lifted.status, 200);
  const body = lifted.body as LiftBody;
  assert.equal(body.lifted, true);
  assert.deepEqual(body.restoredEvents.map(event => event.title), ['Alumni Dinner']);
  assert.equal(body.notifiedEventCount, 1);
  assert.deepEqual(await f.booking(dinner.bookingId), { status: 'pending', status_before_conflict: null, conflict_block_id: null });

  assert.deepEqual((await f.history(blockId)).map(entry => [entry.action, entry.previous_reason, entry.new_reason, entry.actor_id]), [
    ['created', null, 'Floor resurfacing', f.ids.staff],
    ['edited', 'Floor resurfacing', 'Floor resurfacing, second coat', f.ids.staff],
    ['lifted', 'Floor resurfacing, second coat', null, f.ids.staff],
  ]);
  const kept = (await f.pool.query<{ lifted_by: string }>(`SELECT lifted_by FROM venue_blocks WHERE id = $1 AND lifted_at IS NOT NULL`, [blockId])).rows;
  assert.deepEqual(kept, [{ lifted_by: f.ids.staff }]);
  assert.deepEqual((await f.notices(dinner.eventId)).filter(notice => notice.title === 'Venue available again').map(notice => notice.user_id), [f.ids.coordinator2]);
  // A lifted block is gone from the venue's list and cannot be lifted twice.
  const listed = await listVenueBlocks((sql, values) => f.pool.query(sql, values), f.staff, f.ids.venue);
  assert.deepEqual(listed.blocks, []);
  await assert.rejects(liftVenueBlock(f.pool, f.staff, f.ids.venue, blockId), { status: 404 });

  // Steps 3 and the "listed as lifted" result: what the history screen reads.
  const staffName = (await f.pool.query<{ full_name: string }>(`SELECT full_name FROM users WHERE id = $1`, [f.ids.staff])).rows[0]!.full_name;
  const withLifted = await listVenueBlocks(queryOf(f), f.staff, f.ids.venue, { includeLifted: true });
  assert.deepEqual(withLifted.blocks.map(entry => [entry.id, (entry as { liftedBy: string | null }).liftedBy]), [[blockId, staffName]]);
  const { history } = await getVenueBlockHistory(queryOf(f), f.staff, f.ids.venue, blockId);
  assert.deepEqual(history.map(entry => [entry.action, entry.actor, entry.previous?.endsAt ?? null, entry.next?.endsAt ?? null, entry.next?.reason ?? null]), [
    ['created', staffName, null, '2027-01-15T10:00:00.000Z', 'Floor resurfacing'],
    ['edited', staffName, '2027-01-15T10:00:00.000Z', '2027-01-15T12:00:00.000Z', 'Floor resurfacing, second coat'],
    ['lifted', staffName, '2027-01-15T12:00:00.000Z', null, null],
  ]);
}));

test('TC_E05S06_08: an unexpired tentative hold is flagged without being released, its Coordinator told, and restored on lift', () => withFixture(async f => {
  const gala = await f.book('Spring Gala', f.ids.coordinator1, 'planning', 'tentative', '2027-01-22', '10:00', '12:00', '2099-01-01T00:00:00Z');
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-22T00:00:00+08:00', ends_at: '2027-01-23T00:00:00+08:00', reason_category: 'maintenance', reason: 'Lighting rig repair',
  });
  assert.equal(created.status, 201);
  assert.deepEqual((created.body as EditBody).affectedEvents.map(event => event.title), ['Spring Gala']);
  assert.deepEqual(await f.booking(gala.bookingId), { status: 'conflicting', status_before_conflict: 'tentative', conflict_block_id: (created.body as EditBody).block.id });
  const unavailable = (await f.notices(gala.eventId)).filter(notice => notice.title === 'Venue unavailable');
  assert.equal(unavailable.length, 1);
  assert.equal(unavailable[0]!.user_id, f.ids.coordinator1);
  assert.match(unavailable[0]!.message, /Riverside Hall is unavailable 22 Jan 2027, 12:00 am to 23 Jan 2027, 12:00 am \(Maintenance: Lighting rig repair\)\. This affects the venue booking for "Spring Gala"\. Alternative arrangements are required\./);

  await liftVenueBlock(f.pool, f.staff, f.ids.venue, (created.body as EditBody).block.id);
  const restored = (await f.pool.query<{ status: string; expires_at: Date }>(`SELECT status::text, expires_at FROM venue_bookings WHERE id = $1`, [gala.bookingId])).rows[0]!;
  assert.equal(restored.status, 'tentative');
  assert.equal(restored.expires_at.toISOString(), '2099-01-01T00:00:00.000Z');
}));

test('Scenarios 6 and 7: lifting tells the Coordinator of a replaced booking, which stays Conflicting, and never restores a cancelled one', () => withFixture(async f => {
  const night = await f.book('Harbour Night', f.ids.coordinator2, 'planning', 'pending', '2027-01-22', '14:00', '16:00');
  const cancelled = await f.book('Quiz Night', f.ids.coordinator1, 'planning', 'pending', '2027-01-22', '18:00', '20:00');
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-22T00:00:00+08:00', ends_at: '2027-01-23T00:00:00+08:00', reason_category: 'safety_concern',
  });
  assert.equal((await f.booking(cancelled.bookingId)).status, 'conflicting');
  const otherVenue = randomUUID();
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Harbour Suite', 'Test wing', 300, '08:00', '22:00')`, [otherVenue]);
  await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, replaces_booking_id)
    VALUES ($1, $2, '[2027-01-22T14:00:00+08:00,2027-01-22T16:00:00+08:00)', 'pending', $3)`, [otherVenue, night.eventId, night.bookingId]);
  // C-122: Quiz Night's Coordinator then cancels the Conflicting booking, so it is not restored either.
  await f.pool.query(`UPDATE venue_bookings SET status = 'released' WHERE id = $1`, [cancelled.bookingId]);

  const lifted = await liftVenueBlock(f.pool, f.staff, f.ids.venue, (created.body as EditBody).block.id);
  const body = lifted.body as LiftBody;
  assert.deepEqual(body.restoredEvents, []);
  assert.equal(body.notifiedEventCount, 1);
  assert.equal((await f.booking(night.bookingId)).status, 'conflicting');
  assert.equal((await f.booking(cancelled.bookingId)).status, 'released');
  const again = (await f.notices(night.eventId)).filter(notice => notice.title === 'Venue available again');
  assert.equal(again.length, 1);
  assert.match(again[0]!.message, /still needs your attention/);
}));

const coordinatorUser = (id: string): AuthenticatedUser => ({ id, email: `${id}@example.test`, role: 'event_coordinator', isActive: true, failedLoginCount: 0 });
const queryOf = (f: Fixture) => ((sql: string, values?: unknown[]) => f.pool.query(sql, values)) as never;

test('TC_E05S06_01: marking a free period unavailable with a reason category saves it and shows the period as Blocked', () => withFixture(async f => {
  const result = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-20T08:00:00+08:00', ends_at: '2027-01-20T18:00:00+08:00',
    reason_category: 'equipment_failure', reason: 'Projector rig fault',
  });
  assert.equal(result.status, 201);
  const body = result.body as { block: Record<string, unknown>; affectedEvents: unknown[] };
  assert.deepEqual(
    [body.block.startsAt, body.block.endsAt, body.block.reasonCategory, body.block.reason],
    ['2027-01-20T00:00:00.000Z', '2027-01-20T10:00:00.000Z', 'equipment_failure', 'Projector rig fault']);
  assert.deepEqual(body.affectedEvents, []);
  const saved = (await f.pool.query(`SELECT created_by, reason_category::text, reason FROM venue_blocks WHERE id = $1`, [body.block.id])).rows;
  assert.deepEqual(saved, [{ created_by: f.ids.staff, reason_category: 'equipment_failure', reason: 'Projector rig fault' }]);

  const calendar = await getVenueCalendar(queryOf(f), f.staff, f.ids.venue, '2027-01-20', '2027-01-20');
  assert.deepEqual(calendar.entries.filter(entry => entry.state === 'blocked').map(entry => [entry.start, entry.end, entry.reasonCategory]),
    [['2027-01-20T00:00:00.000Z', '2027-01-20T10:00:00.000Z', 'equipment_failure']]);
}));

test('Scenario 6 with a primary booking: editing over it and lifting restore it Confirmed and still primary', () => withFixture(async f => {
  const run = await f.book('Charity Run', f.ids.coordinator1, 'confirmed', 'confirmed', '2027-01-15', '10:00', '12:00');
  await f.pool.query(`UPDATE venue_bookings SET is_primary = true WHERE id = $1`, [run.bookingId]);
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T09:00:00+08:00', reason_category: 'maintenance', reason: 'Early inspection',
  });
  const blockId = (created.body as EditBody).block.id;
  // Extending over the primary booking flags it; it keeps the primary mark.
  const extended = await editVenueBlock(f.pool, f.staff, f.ids.venue, blockId, {
    starts_at: '2027-01-15T08:00:00+08:00', ends_at: '2027-01-15T18:00:00+08:00', reason_category: 'maintenance', reason: 'Early inspection',
  });
  assert.equal(extended.status, 200);
  assert.deepEqual([(await f.booking(run.bookingId)).status, await f.isPrimary(run.bookingId)], ['conflicting', true]);

  const lifted = await liftVenueBlock(f.pool, f.staff, f.ids.venue, blockId);
  assert.equal(lifted.status, 200);
  assert.deepEqual(await f.booking(run.bookingId), { status: 'confirmed', status_before_conflict: null, conflict_block_id: null });
  assert.equal(await f.isPrimary(run.bookingId), true);
}));

test('TC_E05S06_02: an unavailability over a Pending request and a Confirmed booking flags both, lists both, releases neither and returns the Confirmed event to Planning', () => withFixture(async f => {
  const run = await f.book('Charity Run', f.ids.coordinator1, 'confirmed', 'confirmed', '2027-01-15', '10:00', '12:00');
  // As E06-S04 approval leaves it: the event's first Confirmed booking is its primary venue.
  await f.pool.query(`UPDATE venue_bookings SET is_primary = true WHERE id = $1`, [run.bookingId]);
  const dinner = await f.book('Alumni Dinner', f.ids.coordinator2, 'planning', 'pending', '2027-01-15', '14:00', '16:00');
  // Charity Run's other arrangement: a second Confirmed venue at the same time (C-67).
  const annex = randomUUID();
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Harbour Suite', 'Test wing', 300, '08:00', '22:00')`, [annex]);
  const other = (await f.pool.query<{ id: string }>(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
    VALUES ($1, $2, '[2027-01-15T10:00:00+08:00,2027-01-15T12:00:00+08:00)', 'confirmed') RETURNING id`, [annex, run.eventId])).rows[0]!;

  const result = await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-15T00:00:00+08:00', ends_at: '2027-01-16T00:00:00+08:00', reason_category: 'safety_concern', reason: 'Ceiling inspection',
  });
  assert.equal(result.status, 201);
  const blockId = (result.body as EditBody).block.id;
  assert.deepEqual((result.body as EditBody).affectedEvents.map(event => event.title), ['Charity Run', 'Alumni Dinner']);
  assert.deepEqual(await f.booking(run.bookingId), { status: 'conflicting', status_before_conflict: 'confirmed', conflict_block_id: blockId });
  assert.deepEqual(await f.booking(dinner.bookingId), { status: 'conflicting', status_before_conflict: 'pending', conflict_block_id: blockId });
  assert.equal(await f.isPrimary(run.bookingId), true, 'the lost venue stays the primary record (E10-S05)');

  // Charity Run is back in Planning, not cancelled; its other arrangement is intact; its event view carries the flag.
  assert.equal(await f.eventStatus(run.eventId), 'planning');
  assert.equal(await f.eventStatus(dinner.eventId), 'planning');
  assert.equal((await f.booking(other.id)).status, 'confirmed');
  const view = await listBookingRequests(queryOf(f), coordinatorUser(f.ids.coordinator1), run.eventId);
  const flagged = (view.bookings as Array<Record<string, unknown>>).find(row => row.id === run.bookingId)!;
  assert.deepEqual([flagged.status, flagged.conflict_reason_category, flagged.conflict_note], ['conflicting', 'safety_concern', 'Ceiling inspection']);

  // The calendar shows the period Blocked with both Conflicting bookings visible.
  const calendar = await getVenueCalendar(queryOf(f), f.staff, f.ids.venue, '2027-01-15', '2027-01-15');
  assert.ok(calendar.entries.some(entry => entry.state === 'blocked'));
  assert.deepEqual(calendar.entries.filter(entry => entry.state === 'conflicting').map(entry => [entry.event?.title, entry.reasonCategory]),
    [['Charity Run', 'safety_concern'], ['Alumni Dinner', 'safety_concern']]);
}));

test('TC_E05S06_03: each Coordinator whose booking became Conflicting gets one in-app notice and one email naming the venue, period, reason and event; the Organiser gets none', () => withFixture(async f => {
  const run = await f.book('Charity Run', f.ids.coordinator1, 'confirmed', 'confirmed', '2027-01-15', '10:00', '12:00');
  const dinner = await f.book('Alumni Dinner', f.ids.coordinator2, 'planning', 'pending', '2027-01-15', '14:00', '16:00');
  // A registered Attendee of the Confirmed event, who must not be told yet (C-121).
  const attendee = randomUUID();
  await f.pool.query(`INSERT INTO users (id, email, password_hash, full_name, role) VALUES ($1, $2, 'unused', 'Attendee A', 'attendee')`,
    [attendee, `${attendee}@example.test`]);
  await f.pool.query(`INSERT INTO event_registrations (event_id, attendee_id, status) VALUES ($1, $2, 'registered')`, [run.eventId, attendee]);
  await createVenueBlock(f.pool, f.staff, f.ids.venue, {
    starts_at: '2027-01-15T00:00:00+08:00', ends_at: '2027-01-16T00:00:00+08:00', reason_category: 'safety_concern', reason: 'Ceiling inspection',
  });
  for (const [event, coordinator, title] of [[run.eventId, f.ids.coordinator1, 'Charity Run'], [dinner.eventId, f.ids.coordinator2, 'Alumni Dinner']]) {
    const rows = (await f.pool.query<{ user_id: string; message: string; delivery_id: string | null }>(
      `SELECT n.user_id, n.message, d.id AS delivery_id FROM notifications n
       LEFT JOIN notification_deliveries d ON d.notification_id = n.id WHERE n.event_id = $1`, [event])).rows;
    assert.equal(rows.length, 1, `${title}: exactly one notice, and none for the Organiser`);
    assert.equal(rows[0]!.user_id, coordinator);
    assert.ok(rows[0]!.delivery_id, `${title}: an email delivery is queued with the in-app notice`);
    assert.match(rows[0]!.message, new RegExp(`^Riverside Hall is unavailable 15 Jan 2027, .* \\(Safety concern: Ceiling inspection\\)\\. This affects the venue booking for "${title}"\\. Alternative arrangements are required\\.`));
  }
  for (const [who, id] of [['Organiser', f.ids.organiser], ['registered Attendee', attendee]]) {
    const count = (await f.pool.query(`SELECT count(*)::int AS count FROM notifications WHERE user_id = $1`, [id])).rows[0].count;
    assert.equal(count, 0, `the ${who} is not told when the venue is lost`);
  }
}));

test('TC_E05S06_04: an unavailability with no end is saved as open-ended and stays in force until lifted', () => withFixture(async f => {
  const result = await createVenueBlock(f.pool, f.staff, f.ids.venue, { starts_at: '2027-01-20T08:00:00+08:00', reason_category: 'renovation' });
  assert.equal(result.status, 201);
  const block = (result.body as { block: Record<string, unknown> }).block;
  assert.deepEqual([block.startsAt, block.endsAt, block.to, block.reasonCategory], ['2027-01-20T00:00:00.000Z', null, null, 'renovation']);
  const saved = (await f.pool.query(`SELECT created_by, upper_inf(block_range) AS open FROM venue_blocks WHERE id = $1`, [block.id])).rows;
  assert.deepEqual(saved, [{ created_by: f.ids.staff, open: true }]);

  const first = await getVenueCalendar(queryOf(f), f.staff, f.ids.venue, '2027-01-20', '2027-01-20');
  assert.deepEqual(first.entries.filter(entry => entry.state === 'blocked').map(entry => [entry.start, entry.end]),
    [['2027-01-20T00:00:00.000Z', '2027-01-20T16:00:00.000Z']]);
  const later = await getVenueCalendar(queryOf(f), f.staff, f.ids.venue, '2027-03-20', '2027-03-20');
  assert.deepEqual(later.entries.map(entry => entry.state), ['blocked']);
  const listed = await listVenueBlocks(queryOf(f), f.staff, f.ids.venue);
  assert.deepEqual(listed.blocks.map(entry => entry.id), [block.id]);
}));

test("TC_E05S06_06: E05-S04's block, shorten and remove still work for periods with no bookings", () => withFixture(async f => {
  const created = await createVenueBlock(f.pool, f.staff, f.ids.venue, { from: '2027-01-05', to: '2027-01-07', reason: 'Annual fire safety inspection' });
  assert.equal(created.status, 201);
  const block = (created.body as { block: Record<string, unknown> }).block;
  assert.deepEqual([block.from, block.to, block.reasonCategory], ['2027-01-05', '2027-01-07', 'maintenance']);
  const blockedDays = async () => (await getVenueCalendar(queryOf(f), f.staff, f.ids.venue, '2027-01-05', '2027-01-07'))
    .entries.filter(entry => entry.state === 'blocked').map(entry => entry.end);
  assert.deepEqual(await blockedDays(), ['2027-01-07T16:00:00.000Z']);

  const shortened = await shortenVenueBlock(f.pool, f.staff, f.ids.venue, String(block.id), { from: '2027-01-05', to: '2027-01-05' });
  assert.equal(shortened.status, 200);
  assert.deepEqual(await blockedDays(), ['2027-01-05T16:00:00.000Z']);

  const removed = await removeVenueBlock(f.pool, f.staff, f.ids.venue, String(block.id));
  assert.equal((removed.body as { removed: boolean }).removed, true);
  assert.deepEqual(await blockedDays(), []);
}));

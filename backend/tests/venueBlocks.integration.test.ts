// SCRUM-43: E05-S04 "Block a venue for maintenance" against a real,
// disposable PostgreSQL schema with every repository migration applied.
//
// Proves what venueBlocks.test.ts's stubs cannot: the saved block really
// removes the venue from E06-S01 venue search, a confirmed booking really
// stops the save, the affected Coordinator really receives an in-app
// notification with an email delivery job, and shortening really frees the
// released days.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createVenueBlock, listVenueBlocks, removeVenueBlock, shortenVenueBlock,
} from '../src/modules/venueBooking/blocks.js';
import { venueSearch } from '../src/modules/venueBooking/search.js';
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

type BlockBody = { block: { id: string; from: string; to: string; reason: string } };

async function fixture() {
  const f = await loginDatabase();
  const ids = { org: randomUUID(), organiser: randomUUID(), staff: randomUUID(), coordinator: randomUUID(), venue: randomUUID() };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, org] of [
    [ids.organiser, 'event_organiser', ids.org], [ids.staff, 'venue_staff', null], [ids.coordinator, 'event_coordinator', null],
  ] as const) {
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', 'Synthetic user', $4)`, [id, org, `${id}@example.test`, role]);
  }
  await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
    VALUES ($1, 'Riverside Hall', 'Test wing', 300, '08:00', '22:00')`, [ids.venue]);

  const user = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser =>
    ({ id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0 });
  const staff = user(ids.staff, 'venue_staff');
  const coordinator = user(ids.coordinator, 'event_coordinator');
  const query: Query = (sql, values) => f.pool.query(sql, values);

  // Books the venue for an event on the given Singapore days (inclusive).
  async function book(code: string, status: 'pending' | 'confirmed', from: string, to: string) {
    const eventId = randomUUID();
    const range = `[${from}T00:00:00+08:00,${to}T23:59:59+08:00)`;
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, $4, $5, $6, 'planning', $7::tstzrange, 100)`,
    [eventId, code, ids.organiser, ids.coordinator, ids.org, code, range]);
    await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status) VALUES ($1, $2, $3::tstzrange, $4)`,
      [ids.venue, eventId, range, status]);
    return eventId;
  }

  // E06-S01 venue search, as a Coordinator, for one Singapore day.
  async function availableOn(day: string) {
    const params = new URLSearchParams({
      search: '1', start: `${day}T09:00:00+08:00`, end: `${day}T17:00:00+08:00`, attendance: '50', q: 'Riverside',
    });
    const result = await venueSearch(query, coordinator, params) as { venues?: Array<{ id: string; available: boolean }> };
    assert.ok(result.venues, `venue search failed: ${JSON.stringify(result)}`);
    return result.venues.find(venue => venue.id === ids.venue)?.available;
  }

  return { ...f, ids, staff, coordinator, query, book, availableOn };
}

test('E05-S04 TC_E05S04_01: blocking a free period makes the venue unavailable for those dates', async () => {
  const f = await fixture();
  try {
    assert.equal(await f.availableOn('2027-01-07'), true);
    const result = await createVenueBlock(f.pool, f.staff, f.ids.venue,
      { from: '2027-01-05', to: '2027-01-10', reason: 'Annual fire safety inspection' });
    assert.equal(result.status, 201);
    const { block } = result.body as BlockBody;
    assert.deepEqual([block.from, block.to, block.reason], ['2027-01-05', '2027-01-10', 'Annual fire safety inspection']);

    for (const day of ['2027-01-05', '2027-01-07', '2027-01-10']) assert.equal(await f.availableOn(day), false, day);
    assert.equal(await f.availableOn('2027-01-04'), true);
    assert.equal(await f.availableOn('2027-01-11'), true);

    // E14-S02: the block is recorded against the staff member who made it.
    const audit = await f.pool.query(`SELECT actor_id, action FROM audit_logs WHERE entity_type = 'venue_block' AND entity_id = $1`, [block.id]);
    assert.deepEqual(audit.rows, [{ actor_id: f.ids.staff, action: 'Venue blocked' }]);

    // A second block over the same days is refused rather than stacked.
    const overlap = await createVenueBlock(f.pool, f.staff, f.ids.venue, { from: '2027-01-09', to: '2027-01-12', reason: 'Painting' });
    assert.equal(overlap.status, 409);
    assert.equal((overlap.body as { error: string }).error, 'block_overlap');
  } finally { await f.close(); }
});

test('E05-S04 TC_E05S04_02: a block over a confirmed booking is refused and names the booking', async () => {
  const f = await fixture();
  try {
    await f.book('Charity Run', 'confirmed', '2027-01-15', '2027-01-15');
    const result = await createVenueBlock(f.pool, f.staff, f.ids.venue,
      { from: '2027-01-14', to: '2027-01-16', reason: 'Flooring replacement' });
    assert.equal(result.status, 409);
    const body = result.body as { error: string; conflictingBookings: Array<{ eventCode: string; title: string }> };
    assert.equal(body.error, 'booking_conflict');
    assert.deepEqual(body.conflictingBookings.map(booking => booking.title), ['Charity Run']);
    const saved = await f.pool.query(`SELECT count(*)::int AS count FROM venue_blocks WHERE venue_id = $1`, [f.ids.venue]);
    assert.equal(saved.rows[0].count, 0, 'the block must not take effect until the conflict is resolved');
  } finally { await f.close(); }
});

test('E05-S04 TC_E05S04_03: a block over an upcoming tentative event notifies its Coordinator once', async () => {
  const f = await fixture();
  try {
    const eventId = await f.book('Tech Conference 2026', 'pending', '2027-01-21', '2027-01-22');
    const result = await createVenueBlock(f.pool, f.staff, f.ids.venue, { from: '2027-01-20', to: '2027-01-25', reason: 'Renovation' });
    assert.equal(result.status, 201);
    assert.equal((result.body as { notifiedEventCount: number }).notifiedEventCount, 1);

    const messages = await f.pool.query(`SELECT n.user_id, n.title, n.message, d.id AS delivery_id
      FROM notifications n LEFT JOIN notification_deliveries d ON d.notification_id = n.id WHERE n.event_id = $1`, [eventId]);
    assert.equal(messages.rows.length, 1);
    assert.equal(messages.rows[0].user_id, f.ids.coordinator);
    assert.equal(messages.rows[0].title, 'Venue blocked');
    assert.match(messages.rows[0].message, /Riverside Hall is blocked from 2027-01-20 to 2027-01-25 \(Renovation\)/);
    assert.ok(messages.rows[0].delivery_id, 'an email delivery job is queued with the in-app notification');
  } finally { await f.close(); }
});

test('E05-S04 TC_E05S04_04: shortening or removing a block restores the released days', async () => {
  const f = await fixture();
  try {
    const created = await createVenueBlock(f.pool, f.staff, f.ids.venue,
      { from: '2027-01-05', to: '2027-01-10', reason: 'Annual fire safety inspection' });
    const { block } = created.body as BlockBody;

    const listed = await listVenueBlocks(f.query, f.coordinator, f.ids.venue);
    assert.deepEqual(listed.blocks.map(entry => entry.id), [block.id]);

    const longer = await shortenVenueBlock(f.pool, f.staff, f.ids.venue, block.id, { from: '2027-01-05', to: '2027-01-12' });
    assert.equal(longer.status, 400, 'a block can only be shortened');

    const shortened = await shortenVenueBlock(f.pool, f.staff, f.ids.venue, block.id, { from: '2027-01-05', to: '2027-01-07' });
    assert.equal(shortened.status, 200);
    assert.deepEqual((shortened.body as BlockBody).block,
      { ...block, to: '2027-01-07', endsAt: '2027-01-07T16:00:00.000Z' });
    assert.equal(await f.availableOn('2027-01-07'), false);
    assert.equal(await f.availableOn('2027-01-08'), true);
    // The E05-S03 calendar agrees: the block now ends at 8 January 00:00 SGT,
    // and the released days show as Free again.
    const calendar = await getVenueCalendar(f.query, f.staff, f.ids.venue, '2027-01-05', '2027-01-10');
    assert.deepEqual(calendar.entries.filter(entry => entry.kind === 'block').map(entry => entry.end), ['2027-01-07T16:00:00.000Z']);
    assert.ok(calendar.entries.some(entry => entry.state === 'free' && entry.start.startsWith('2027-01-08')));

    const removed = await removeVenueBlock(f.pool, f.staff, f.ids.venue, block.id);
    assert.equal(removed.status, 200);
    assert.equal(await f.availableOn('2027-01-05'), true);
    await assert.rejects(removeVenueBlock(f.pool, f.staff, f.ids.venue, block.id), { status: 404 });

    const audit = await f.pool.query(`SELECT action FROM audit_logs WHERE entity_type = 'venue_block' AND entity_id = $1 ORDER BY occurred_at`, [block.id]);
    assert.deepEqual(audit.rows.map(row => row.action), ['Venue blocked', 'Venue block shortened', 'Venue block removed']);
  } finally { await f.close(); }
});

test('E05-S04: a block saved with hours accepts its own day back and keeps those hours', async () => {
  const f = await fixture();
  try {
    // Same shape as the seeded Cedar Auditorium inspection (08:00-18:00 SGT).
    const inserted = await f.pool.query<{ id: string }>(`INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
      VALUES ($1, '[2027-02-22 08:00+08,2027-02-22 18:00+08)', 'Fire safety inspection', $2) RETURNING id`, [f.ids.venue, f.ids.staff]);
    const blockId = inserted.rows[0]!.id;

    const resaved = await shortenVenueBlock(f.pool, f.staff, f.ids.venue, blockId,
      { from: '2027-02-22', to: '2027-02-22', reason: 'Annual fire safety inspection' });
    assert.equal(resaved.status, 200, JSON.stringify(resaved.body));
    const { block } = resaved.body as { block: { reason: string; startsAt: string; endsAt: string } };
    assert.deepEqual([block.reason, block.startsAt, block.endsAt],
      ['Annual fire safety inspection', '2027-02-22T00:00:00.000Z', '2027-02-22T10:00:00.000Z']);

    const longer = await shortenVenueBlock(f.pool, f.staff, f.ids.venue, blockId, { from: '2027-02-22', to: '2027-02-23' });
    assert.equal(longer.status, 400);
  } finally { await f.close(); }
});

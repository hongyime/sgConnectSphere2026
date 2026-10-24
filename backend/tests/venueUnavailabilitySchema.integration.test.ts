// SCRUM-152 / E05-S06: migration 0025 against a real, disposable PostgreSQL
// schema with every repository migration applied.
//
// Proves the schema rules the application code will rely on: the reason
// category, a required start with an optional end (T-80), lifted blocks kept
// but no longer blocking (T-91), immutable history (T-91), the restore columns
// on bookings (C-111, C-122), and that code written before 0025 still works.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';

type Database = Awaited<ReturnType<typeof loginDatabase>>;

const blockedByUnavailability = (error: unknown) =>
  (error as { constraint?: string }).constraint === 'venue_bookings_block_overlap';

async function withVenue(work: (f: Database, ids: { venue: string; staff: string; event: string }) => Promise<void>) {
  const f = await loginDatabase();
  try {
    const ids = { venue: randomUUID(), staff: randomUUID(), event: randomUUID() };
    const org = randomUUID();
    const organiser = randomUUID();
    await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [org]);
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', 'Organiser A', 'event_organiser')`, [organiser, org, `${organiser}@example.test`]);
    await f.pool.query(`INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES ($1, $2, 'unused', 'Venue Staff A', 'venue_staff')`, [ids.staff, `${ids.staff}@example.test`]);
    await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
      VALUES ($1, 'Riverside Hall', 'Test wing', 200, '08:00', '22:00')`, [ids.venue]);
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, 'EVT-9001', $2, $3, 'Charity Run', 'planning', '[2027-01-10 08:00+08,2027-06-30 18:00+08)', 50)`,
    [ids.event, organiser, org]);
    await work(f, ids);
  } finally {
    await f.close();
  }
}

test('a block written the pre-0025 way still saves, as maintenance and active', () => withVenue(async (f, ids) => {
  const block = (await f.pool.query<{ reason_category: string; lifted_at: Date | null }>(
    `INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
     VALUES ($1, '[2027-01-10 00:00+08,2027-01-11 00:00+08)', 'Floor resurfacing', $2) RETURNING reason_category, lifted_at`,
    [ids.venue, ids.staff])).rows[0]!;
  assert.equal(block.reason_category, 'maintenance');
  assert.equal(block.lifted_at, null);
  // E05-S04's remove still deletes a block that has no history yet.
  await f.pool.query(`DELETE FROM venue_blocks WHERE venue_id = $1`, [ids.venue]);
}));

test('an unavailability may be open-ended but must have a start, and only a lifted one records who lifted it', () => withVenue(async (f, ids) => {
  await f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason, reason_category)
    VALUES ($1, '[2027-02-01 00:00+08,)', 'Renovation works', 'renovation')`, [ids.venue]);
  await assert.rejects(f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason)
    VALUES ($1, '(,2027-03-01 00:00+08)', 'No start')`, [ids.venue]), { constraint: 'venue_blocks_start_required' });
  await assert.rejects(f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason, lifted_by)
    VALUES ($1, '[2027-04-01 00:00+08,2027-04-02 00:00+08)', 'Lifted without a time', $2)`, [ids.venue, ids.staff]),
  { constraint: 'venue_blocks_lifted_by_needs_lifted_at' });
  await assert.rejects(f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason, reason_category)
    VALUES ($1, '[2027-04-01 00:00+08,2027-04-02 00:00+08)', 'Unknown', 'flood')`, [ids.venue]), /invalid input value for enum/);
}));

test('an active unavailability refuses an overlapping booking; a lifted one does not; an open-ended one refuses later dates', () => withVenue(async (f, ids) => {
  const block = (await f.pool.query<{ id: string }>(`INSERT INTO venue_blocks (venue_id, block_range, reason)
    VALUES ($1, '[2027-01-10 00:00+08,2027-01-11 00:00+08)', 'Inspection') RETURNING id`, [ids.venue])).rows[0]!;
  const insertBooking = () => f.pool.query<{ id: string }>(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
    VALUES ($1, $2, '[2027-01-10 10:00+08,2027-01-10 12:00+08)', 'pending') RETURNING id`, [ids.venue, ids.event]);
  await assert.rejects(insertBooking(), blockedByUnavailability);

  await f.pool.query(`UPDATE venue_blocks SET lifted_at = now(), lifted_by = $2 WHERE id = $1`, [block.id, ids.staff]);
  const booking = (await insertBooking()).rows[0]!;

  await f.pool.query(`INSERT INTO venue_blocks (venue_id, block_range, reason)
    VALUES ($1, '[2027-05-01 00:00+08,)', 'Until further notice')`, [ids.venue]);
  await assert.rejects(f.pool.query(`UPDATE venue_bookings SET booking_range = '[2027-06-01 10:00+08,2027-06-01 12:00+08)'
    WHERE id = $1`, [booking.id]), blockedByUnavailability);
}));

test('a booking remembers its earlier status and the unavailability that flagged it, for restoring', () => withVenue(async (f, ids) => {
  const block = (await f.pool.query<{ id: string }>(`INSERT INTO venue_blocks (venue_id, block_range, reason)
    VALUES ($1, '[2027-03-01 00:00+08,2027-03-02 00:00+08)', 'Inspection') RETURNING id`, [ids.venue])).rows[0]!;
  const booking = (await f.pool.query<{ id: string }>(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
    VALUES ($1, $2, '[2027-01-20 10:00+08,2027-01-20 12:00+08)', 'confirmed') RETURNING id`, [ids.venue, ids.event])).rows[0]!;
  await assert.rejects(f.pool.query(`UPDATE venue_bookings SET status_before_conflict = 'rejected' WHERE id = $1`, [booking.id]),
    { constraint: 'venue_bookings_status_before_conflict_check' });
  for (const earlier of ['pending', 'confirmed', 'tentative']) {
    await f.pool.query(`UPDATE venue_bookings SET status = 'conflicting', status_before_conflict = $2::booking_status,
      conflict_block_id = $3 WHERE id = $1`, [booking.id, earlier, block.id]);
  }
  // Deleting the block clears the link rather than the booking.
  await f.pool.query(`DELETE FROM venue_blocks WHERE id = $1`, [block.id]);
  const row = (await f.pool.query<{ conflict_block_id: string | null }>(
    `SELECT conflict_block_id FROM venue_bookings WHERE id = $1`, [booking.id])).rows[0]!;
  assert.equal(row.conflict_block_id, null);
}));

test('unavailability history is append-only, keeps its shape per action, and follows its venue when deleted', () => withVenue(async (f, ids) => {
  const block = (await f.pool.query<{ id: string }>(`INSERT INTO venue_blocks (venue_id, block_range, reason, created_by)
    VALUES ($1, '[2027-03-01 00:00+08,2027-03-02 00:00+08)', 'Inspection', $2) RETURNING id`, [ids.venue, ids.staff])).rows[0]!;
  const history = (await f.pool.query<{ id: string }>(`INSERT INTO venue_block_history (block_id, action, new_range, new_category, new_reason, actor_id)
    VALUES ($1, 'created', '[2027-03-01 00:00+08,2027-03-02 00:00+08)', 'maintenance', 'Inspection', $2) RETURNING id`,
  [block.id, ids.staff])).rows[0]!;
  await f.pool.query(`INSERT INTO venue_block_history (block_id, action, previous_range, new_range, actor_id)
    VALUES ($1, 'edited', '[2027-03-01 00:00+08,2027-03-02 00:00+08)', '[2027-03-01 00:00+08,)', $2)`, [block.id, ids.staff]);
  await f.pool.query(`INSERT INTO venue_block_history (block_id, action, previous_range, actor_id)
    VALUES ($1, 'lifted', '[2027-03-01 00:00+08,)', $2)`, [block.id, ids.staff]);

  for (const [action, ranges] of [['created', `NULL, NULL`], ['edited', `'[2027-03-01,2027-03-02)', NULL`], ['lifted', `NULL, NULL`], ['moved', `NULL, '[2027-03-01,2027-03-02)'`]]) {
    await assert.rejects(f.pool.query(`INSERT INTO venue_block_history (block_id, action, previous_range, new_range)
      VALUES ($1, $2, ${ranges})`, [block.id, action]), /violates check constraint/, action);
  }

  await assert.rejects(f.pool.query(`UPDATE venue_block_history SET new_reason = 'Rewritten' WHERE id = $1`, [history.id]),
    /cannot be edited or deleted/);
  await assert.rejects(f.pool.query(`DELETE FROM venue_block_history WHERE id = $1`, [history.id]), /cannot be edited or deleted/);

  // Deleting the actor keeps the entry and clears only the link.
  await f.pool.query(`DELETE FROM users WHERE id = $1`, [ids.staff]);
  const kept = (await f.pool.query<{ actor_id: string | null; new_reason: string }>(
    `SELECT actor_id, new_reason FROM venue_block_history WHERE id = $1`, [history.id])).rows[0]!;
  assert.deepEqual(kept, { actor_id: null, new_reason: 'Inspection' });

  // Deleting the venue removes its blocks and their history.
  await f.pool.query(`DELETE FROM venues WHERE id = $1`, [ids.venue]);
  const left = (await f.pool.query<{ count: string }>(`SELECT count(*) FROM venue_block_history WHERE block_id = $1`, [block.id])).rows[0]!;
  assert.equal(left.count, '0');
}));

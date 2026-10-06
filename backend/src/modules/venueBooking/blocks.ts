import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { inTransaction } from '../../database/pool.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { requireCatalogueViewer, requireVenueStaff, type VenueErrors } from './catalogue.js';

// E05-S04 "Block a venue for maintenance". A block is a venue_blocks row; venue
// search (E06-S01) and the availability calendar (E05-S03) already read that
// table, so saving a block is what takes the venue out of availability.
//
// Blocks are entered as whole Singapore days (UTC+08:00, no daylight saving),
// `from` and `to` inclusive, and stored as the half-open range
// [from 00:00, day after to 00:00) - the same day convention as the calendar.

const OFFSET = '+08:00';
const SGT_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REASON_MAX = 255;

export type BlockInput = { start: Date; end: Date; reason: string };

export type VenueBlock = {
  id: string; venueId: string; from: string; to: string; reason: string; startsAt: string; endsAt: string;
};

type BlockRow = { id: string; venue_id: string; reason: string; starts_at: Date; ends_at: Date };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Returns the Singapore-midnight instant for a YYYY-MM-DD string, or undefined.
function parseDay(value: unknown): number | undefined {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00${OFFSET}`);
  // Date.parse accepts 2027-02-31 by rolling over, so round-trip to reject it.
  if (Number.isNaN(time) || sgtDate(time) !== value) return undefined;
  return time;
}

function sgtDate(time: number): string {
  return new Date(time + SGT_MS).toISOString().slice(0, 10);
}

function toVenueBlock(row: BlockRow): VenueBlock {
  return {
    id: row.id, venueId: row.venue_id, reason: row.reason,
    from: sgtDate(row.starts_at.getTime()),
    // The stored end is exclusive, so the last blocked day is the one before it.
    to: sgtDate(row.ends_at.getTime() - 1),
    startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
  };
}

// Pure so the unit tests can cover every rejection without a database.
// requireReason is false for a shorten, where the existing reason is kept
// unless a new one is supplied.
export function validateBlockInput(body: unknown, requireReason = true):
  | { input: { start: Date; end: Date; reason?: string }; errors?: never }
  | { errors: VenueErrors; input?: never } {
  if (!isPlainObject(body)) return { errors: { form: ['Submit an object containing from, to and reason.'] } };
  const errors: VenueErrors = {};

  const start = parseDay(body.from);
  const last = parseDay(body.to);
  if (start === undefined) errors.from = ['Start date must be a real date in YYYY-MM-DD format.'];
  if (last === undefined) errors.to = ['End date must be a real date in YYYY-MM-DD format.'];
  if (start !== undefined && last !== undefined && last < start) errors.to = ['End date must be on or after the start date.'];

  let reason: string | undefined;
  if (body.reason !== undefined || requireReason) {
    reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) errors.reason = ['A reason for the block is required.'];
    else if (reason.length > REASON_MAX) errors.reason = [`Reason must be at most ${REASON_MAX} characters.`];
  }

  if (Object.keys(errors).length) return { errors };
  return { input: { start: new Date(start!), end: new Date(last! + DAY_MS), ...(reason ? { reason } : {}) } };
}

function poolQuery(database: Pool): Query {
  return (sql, values) => database.query(sql, values);
}

async function lockVenue(client: PoolClient, venueId: string) {
  // FOR UPDATE serialises block changes on one venue, so two staff members
  // cannot save overlapping blocks at the same moment.
  const venue = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM venues WHERE id::text = $1 FOR UPDATE`, [venueId]);
  if (!venue.rows[0]) throw new AccessError(404, 'Venue not found.');
  return venue.rows[0];
}

async function lockBlock(client: PoolClient, venueId: string, blockId: string) {
  const result = await client.query<BlockRow>(`
    SELECT id, venue_id, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at
    FROM venue_blocks WHERE id::text = $1 AND venue_id::text = $2 FOR UPDATE`, [blockId, venueId]);
  if (!result.rows[0]) throw new AccessError(404, 'Block not found on this venue.');
  return result.rows[0];
}

async function audit(client: PoolClient, actorId: string, blockId: string, action: string, oldValue: string | null, newValue: string | null) {
  await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, field_changed, old_value, new_value)
    VALUES ($1, 'venue_block', $2, $3, 'block_range', $4, $5)`, [actorId, blockId, action, oldValue, newValue]);
}

function describe(block: VenueBlock): string {
  return `${block.from} to ${block.to}: ${block.reason}`;
}

export async function listVenueBlocks(query: Query, user: AuthenticatedUser | undefined, venueId: string) {
  await requireCatalogueViewer(query, user);
  const venue = await query(`SELECT 1 FROM venues WHERE id::text = $1`, [venueId]);
  if (!venue.rows[0]) throw new AccessError(404, 'Venue not found.');
  // Past blocks are history, not something staff can still shorten or remove.
  const result = await query<BlockRow>(`
    SELECT id, venue_id, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at
    FROM venue_blocks WHERE venue_id::text = $1 AND upper(block_range) > now()
    ORDER BY lower(block_range)`, [venueId]);
  return { blocks: result.rows.map(toVenueBlock) };
}

export async function createVenueBlock(database: Pool, user: AuthenticatedUser | undefined, venueId: string, body: unknown) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  const validated = validateBlockInput(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { start, end } = validated.input;
  const reason = validated.input.reason!;

  return inTransaction(database, async client => {
    const venue = await lockVenue(client, venueId);

    // Scenario 2: a confirmed booking must be resolved first, so the block is
    // refused and every conflicting booking is named.
    const conflicts = await client.query<{ event_code: string | null; title: string; starts_at: Date; ends_at: Date }>(`
      SELECT e.event_code, e.title, lower(vb.booking_range) AS starts_at, upper(vb.booking_range) AS ends_at
      FROM venue_bookings vb
        JOIN events e ON e.id = vb.event_id
        JOIN venues v ON v.id = vb.venue_id
      WHERE vb.venue_id = $1 AND vb.status IN ('confirmed', 'conflicting')
        AND tstzrange(
          lower(vb.booking_range) - (v.setup_time_minutes || ' minutes')::interval,
          upper(vb.booking_range) + (v.turnaround_time_minutes || ' minutes')::interval,
          '[)'
        ) && tstzrange($2::timestamptz, $3::timestamptz, '[)')
      ORDER BY lower(vb.booking_range)`, [venue.id, start, end]);
    if (conflicts.rows.length) {
      return { status: 409, body: {
        error: 'booking_conflict',
        message: 'This period overlaps a confirmed booking. Resolve the booking before blocking the venue.',
        conflictingBookings: conflicts.rows.map(row => ({
          eventCode: row.event_code, title: row.title, startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
        })),
      } };
    }

    // Overlapping blocks would make a later shorten or remove look like it
    // failed, because the other block would still hold the period.
    const overlapping = await client.query<BlockRow>(`
      SELECT id, venue_id, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at
      FROM venue_blocks WHERE venue_id = $1 AND block_range && tstzrange($2::timestamptz, $3::timestamptz, '[)')
      ORDER BY lower(block_range)`, [venue.id, start, end]);
    if (overlapping.rows.length) {
      return { status: 409, body: {
        error: 'block_overlap',
        message: 'This period overlaps an existing block. Change that block instead.',
        overlappingBlocks: overlapping.rows.map(toVenueBlock),
      } };
    }

    const inserted = await client.query<BlockRow & { created_at: Date }>(`
      INSERT INTO venue_blocks (venue_id, block_range, reason, created_by) VALUES ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), $4, $5)
      RETURNING id, venue_id, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at, created_at`,
    [venue.id, start, end, reason, staff.id]);
    const row = inserted.rows[0]!;
    const block = toVenueBlock(row);
    await audit(client, staff.id, block.id, 'Venue blocked', null, describe(block));

    const notified = await notifyAffectedCoordinators(client, venue.name, block, row.created_at);
    return { status: 201, body: { block, notifiedEventCount: notified } };
  });
}

// Scenario 3. A confirmed booking has already been refused above, so the
// affected events are the ones still holding the venue tentatively: a pending
// booking (the calendar's "tentative" state) that has not ended, on an event
// that has not ended. E06-S05 tentative holds must be added here when that
// workflow lands. An event with no assigned Coordinator has nobody to tell
// yet; assignment (E03-S01) notifies the Coordinator it later picks.
// The notification ID is derived from the block ID, so a retried save never
// sends the same Coordinator a second copy.
async function notifyAffectedCoordinators(client: PoolClient, venueName: string, block: VenueBlock, occurredAt: Date) {
  const affected = await client.query<{ event_id: string; title: string; coordinator_id: string }>(`
    SELECT DISTINCT e.id AS event_id, e.title, e.coordinator_id
    FROM venue_bookings vb
      JOIN events e ON e.id = vb.event_id
      JOIN venues v ON v.id = vb.venue_id
    WHERE vb.venue_id = $1 AND vb.status IN ('pending', 'conflicting')
      AND tstzrange(
        lower(vb.booking_range) - (v.setup_time_minutes || ' minutes')::interval,
        upper(vb.booking_range) + (v.turnaround_time_minutes || ' minutes')::interval,
        '[)'
      ) && tstzrange($2::timestamptz, $3::timestamptz, '[)')
      AND upper(vb.booking_range) > now()
      AND e.coordinator_id IS NOT NULL AND upper(e.event_range) > now()
      AND e.status NOT IN ('cancelled', 'completed', 'rejected')`,
  [block.venueId, block.startsAt, block.endsAt]);
  let count = 0;
  for (const event of affected.rows) {
    const message = `${venueName} is blocked from ${block.from} to ${block.to} (${block.reason}). ` +
      `This overlaps the venue request for "${event.title}". Review the event's venue plans.`;
    const id = await writeEventNotification(client, {
      eventId: event.event_id, changeId: `venue-block:${block.id}`, userId: event.coordinator_id,
      occurredAt, title: 'Venue blocked', message,
    });
    if (id) count += 1;
  }
  return count;
}

// Checklist: "Remove or shorten an existing block". Only shortening is
// allowed here - lengthening would need the conflict checks and notifications
// again, so a longer period is saved as a new block instead.
export async function shortenVenueBlock(
  database: Pool, user: AuthenticatedUser | undefined, venueId: string, blockId: string, body: unknown,
) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  const validated = validateBlockInput(body, false);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { start, end, reason } = validated.input;

  return inTransaction(database, async client => {
    await lockVenue(client, venueId);
    const current = await lockBlock(client, venueId, blockId);
    const before = toVenueBlock(current);
    // Compare whole days: a block saved with times (the seeded 08:00-18:00
    // inspection) must still accept its own dates back unchanged.
    const firstDay = Date.parse(`${before.from}T00:00:00${OFFSET}`);
    const afterLastDay = Date.parse(`${before.to}T00:00:00${OFFSET}`) + DAY_MS;
    if (start.getTime() < firstDay || end.getTime() > afterLastDay) {
      return { status: 400, body: {
        error: 'validation_failed',
        errors: { to: ['A block can only be shortened. Create a new block to cover extra dates.'] },
      } };
    }
    // Keep any partial-day start or end on days the request did not cut.
    const newStart = new Date(Math.max(start.getTime(), current.starts_at.getTime()));
    const newEnd = new Date(Math.min(end.getTime(), current.ends_at.getTime()));
    const updated = await client.query<BlockRow>(`
      UPDATE venue_blocks SET block_range = tstzrange($2::timestamptz, $3::timestamptz, '[)'), reason = $4 WHERE id = $1
      RETURNING id, venue_id, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at`,
    [current.id, newStart, newEnd, reason ?? current.reason]);
    const block = toVenueBlock(updated.rows[0]!);
    await audit(client, staff.id, block.id, 'Venue block shortened', describe(before), describe(block));
    return { status: 200, body: { block } };
  });
}

export async function removeVenueBlock(database: Pool, user: AuthenticatedUser | undefined, venueId: string, blockId: string) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  return inTransaction(database, async client => {
    await lockVenue(client, venueId);
    const current = await lockBlock(client, venueId, blockId);
    await client.query(`DELETE FROM venue_blocks WHERE id = $1`, [current.id]);
    await audit(client, staff.id, current.id, 'Venue block removed', describe(toVenueBlock(current)), null);
    return { status: 200, body: { removed: true } };
  });
}

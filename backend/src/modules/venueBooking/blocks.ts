import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { inTransaction } from '../../database/pool.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { requireCatalogueViewer, requireVenueStaff, type VenueErrors } from './catalogue.js';
import { formatSgt, holdsVenue } from './bookingShared.js';
import { applyEventStatusChange } from '../eventLifecycle/repository.js';

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
  id: string; venueId: string; from: string; to: string | null; reasonCategory: ReasonCategory; reason: string;
  startsAt: string; endsAt: string | null;
};

// ends_at is null for an open-ended block (T-80).
type BlockRow = { id: string; venue_id: string; reason_category: ReasonCategory; reason: string; starts_at: Date; ends_at: Date | null };

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
    id: row.id, venueId: row.venue_id, reasonCategory: row.reason_category, reason: row.reason,
    from: sgtDate(row.starts_at.getTime()),
    // The stored end is exclusive, so the last blocked day is the one before it.
    to: row.ends_at ? sgtDate(row.ends_at.getTime() - 1) : null,
    startsAt: row.starts_at.toISOString(), endsAt: row.ends_at?.toISOString() ?? null,
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

// E05-S06 Scenario 1 (C-66): the reason categories, as in migration 0025.
export const REASON_CATEGORIES = ['maintenance', 'equipment_failure', 'renovation', 'safety_concern', 'other'] as const;
export type ReasonCategory = typeof REASON_CATEGORIES[number];

// end is null for an open-ended unavailability (T-80).
export type UnavailabilityInput = { start: Date; end: Date | null; category: ReasonCategory; reason: string };

// The same instant rule as booking requests: a date and time with an explicit
// offset, so a period never depends on the server's time zone.
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/;

function parseInstant(value: unknown): number | undefined {
  if (typeof value !== 'string' || !INSTANT_PATTERN.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

// E05-S06 Scenarios 1 and 5: `starts_at`, an optional `ends_at`, a
// `reason_category` and an optional note in `reason`. A body without
// `starts_at` is E05-S04's whole-day form, which the current screen still
// sends; it is read as a maintenance block. Pure, like validateBlockInput.
export function validateUnavailabilityInput(body: unknown):
  | { input: UnavailabilityInput; errors?: never }
  | { errors: VenueErrors; input?: never } {
  if (!isPlainObject(body)) return { errors: { form: ['Submit an object containing starts_at, reason_category and an optional ends_at and reason.'] } };
  if (body.starts_at === undefined) {
    const days = validateBlockInput(body);
    if (days.errors) return days;
    return { input: { start: days.input.start, end: days.input.end, category: 'maintenance', reason: days.input.reason! } };
  }
  const errors: VenueErrors = {};

  const start = parseInstant(body.starts_at);
  if (start === undefined) errors.starts_at = ['Start must be a date and time with a time zone, for example 2027-01-20T08:00:00+08:00.'];
  // No end, or an empty one, leaves the unavailability open until it is lifted.
  const openEnded = body.ends_at === undefined || body.ends_at === null || body.ends_at === '';
  const end = openEnded ? null : parseInstant(body.ends_at);
  if (end === undefined) errors.ends_at = ['End must be a date and time with a time zone, or left empty to keep the venue unavailable until lifted.'];
  else if (end !== null && start !== undefined && end <= start) errors.ends_at = ['End must be after the start.'];

  const category = REASON_CATEGORIES.find(value => value === body.reason_category);
  if (!category) errors.reason_category = ['Choose maintenance, equipment failure, renovation, safety concern or other.'];

  let reason = '';
  if (body.reason !== undefined && body.reason !== null) {
    if (typeof body.reason !== 'string') errors.reason = ['The note must be text.'];
    else {
      reason = body.reason.trim();
      if (reason.length > REASON_MAX) errors.reason = [`The note must be at most ${REASON_MAX} characters.`];
    }
  }

  if (Object.keys(errors).length) return { errors };
  return { input: { start: new Date(start!), end: end === null ? null : new Date(end!), category: category!, reason } };
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
    SELECT id, venue_id, reason_category, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at
    FROM venue_blocks WHERE id::text = $1 AND venue_id::text = $2 AND lifted_at IS NULL FOR UPDATE`, [blockId, venueId]);
  if (!result.rows[0]) throw new AccessError(404, 'Block not found on this venue.');
  return result.rows[0];
}

async function audit(client: PoolClient, actorId: string, blockId: string, action: string, oldValue: string | null, newValue: string | null) {
  await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, field_changed, old_value, new_value)
    VALUES ($1, 'venue_block', $2, $3, 'block_range', $4, $5)`, [actorId, blockId, action, oldValue, newValue]);
}

function describe(block: VenueBlock): string {
  return `${block.from} to ${block.to ?? 'until lifted'}: ${block.reason}`;
}

type ListedBlockRow = BlockRow & { lifted_at?: Date | null; lifted_by_name?: string | null };

export async function listVenueBlocks(query: Query, user: AuthenticatedUser | undefined, venueId: string,
  options: { includeLifted?: boolean } = {}) {
  // Lifted blocks name the staff member who lifted them, so only Venue Staff see them.
  if (options.includeLifted) await requireVenueStaff(query, user);
  else await requireCatalogueViewer(query, user);
  const venue = await query(`SELECT 1 FROM venues WHERE id::text = $1`, [venueId]);
  if (!venue.rows[0]) throw new AccessError(404, 'Venue not found.');
  // Past blocks are history, not something staff can still change; an
  // open-ended block stays current until it is lifted (T-80, T-91). A lifted
  // block is kept and, on request, listed as lifted (Scenario 7).
  const result = await query<ListedBlockRow>(`
    SELECT b.id, b.venue_id, b.reason_category, b.reason, lower(b.block_range) AS starts_at, upper(b.block_range) AS ends_at,
      b.lifted_at, u.full_name AS lifted_by_name
    FROM venue_blocks b LEFT JOIN users u ON u.id = b.lifted_by
    WHERE b.venue_id::text = $1 AND (b.lifted_at IS NULL OR $2::boolean)
      AND (upper_inf(b.block_range) OR upper(b.block_range) > now())
    ORDER BY lower(b.block_range), b.id`, [venueId, Boolean(options.includeLifted)]);
  return {
    blocks: result.rows.map(row => options.includeLifted
      ? { ...toVenueBlock(row), liftedAt: row.lifted_at?.toISOString() ?? null, liftedBy: row.lifted_by_name ?? null }
      : toVenueBlock(row)),
  };
}

type HistoryRow = {
  action: 'created' | 'edited' | 'lifted'; changed_at: Date; actor_name: string | null;
  previous_starts_at: Date | null; previous_ends_at: Date | null; previous_category: ReasonCategory | null; previous_reason: string | null;
  new_starts_at: Date | null; new_ends_at: Date | null; new_category: ReasonCategory | null; new_reason: string | null;
};

function historyState(startsAt: Date | null, endsAt: Date | null, category: ReasonCategory | null, reason: string | null) {
  if (!startsAt) return null;
  return { startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, reasonCategory: category, reason };
}

// T-91 / Scenario 7: the earlier and new period, category and note of each
// create, edit and lift, with who made it and when. Lifted blocks included.
export async function getVenueBlockHistory(query: Query, user: AuthenticatedUser | undefined, venueId: string, blockId: string) {
  await requireVenueStaff(query, user);
  const block = await query(`SELECT 1 FROM venue_blocks WHERE id::text = $1 AND venue_id::text = $2`, [blockId, venueId]);
  if (!block.rows[0]) throw new AccessError(404, 'Block not found on this venue.');
  const result = await query<HistoryRow>(`
    SELECT h.action, h.changed_at, u.full_name AS actor_name,
      lower(h.previous_range) AS previous_starts_at, upper(h.previous_range) AS previous_ends_at, h.previous_category, h.previous_reason,
      lower(h.new_range) AS new_starts_at, upper(h.new_range) AS new_ends_at, h.new_category, h.new_reason
    FROM venue_block_history h LEFT JOIN users u ON u.id = h.actor_id
    WHERE h.block_id::text = $1
    ORDER BY h.changed_at, h.id`, [blockId]);
  return {
    history: result.rows.map(row => ({
      action: row.action, changedAt: row.changed_at.toISOString(), actor: row.actor_name,
      previous: historyState(row.previous_starts_at, row.previous_ends_at, row.previous_category, row.previous_reason),
      next: historyState(row.new_starts_at, row.new_ends_at, row.new_category, row.new_reason),
    })),
  };
}

// Scenario 4: the category as Venue Staff and Coordinators read it.
export const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  maintenance: 'Maintenance', equipment_failure: 'Equipment failure', renovation: 'Renovation',
  safety_concern: 'Safety concern', other: 'Other',
};

function period(start: Date, end: Date | null) {
  return end ? `${formatSgt(start)} to ${formatSgt(end)}` : `from ${formatSgt(start)} until lifted`;
}

const BUSY = 'Bookings at this venue are changing right now. Try again in a moment.';

// T-91 / Scenario 7: an append-only snapshot of each create, edit and lift.
async function recordHistory(client: PoolClient, blockId: string, action: 'created' | 'edited' | 'lifted',
  actorId: string, before: BlockRow | null, after: BlockRow | null) {
  await client.query(`INSERT INTO venue_block_history
      (block_id, action, previous_range, new_range, previous_category, new_category, previous_reason, new_reason, actor_id)
    VALUES ($1, $2,
      CASE WHEN $3::timestamptz IS NULL THEN NULL ELSE tstzrange($3::timestamptz, $4::timestamptz, '[)') END,
      CASE WHEN $5::timestamptz IS NULL THEN NULL ELSE tstzrange($5::timestamptz, $6::timestamptz, '[)') END,
      $7, $8, $9, $10, $11)`,
  [blockId, action, before?.starts_at ?? null, before?.ends_at ?? null, after?.starts_at ?? null, after?.ends_at ?? null,
    before?.reason_category ?? null, after?.reason_category ?? null, before?.reason ?? null, after?.reason ?? null, actorId]);
}

type AffectedRow = {
  booking_id: string; status: 'pending' | 'confirmed' | 'tentative';
  event_id: string; event_code: string | null; title: string; event_status: string; coordinator_id: string | null;
};

// Scenario 2 (C-111): a Pending or Confirmed booking, or an unexpired hold,
// that has not ended and overlaps the period on its advertised times (T-80:
// no setup/turnaround buffers around an unavailability), on an event that is
// still running.
const affectedSql = (lock: string) => `
  SELECT vb.id AS booking_id, vb.status::text AS status, e.id AS event_id, e.event_code, e.title,
    e.status::text AS event_status, e.coordinator_id
  FROM venue_bookings vb JOIN events e ON e.id = vb.event_id
  WHERE vb.venue_id::text = $1 AND ${holdsVenue('vb', 'now()')}
    AND vb.booking_range && tstzrange($2::timestamptz, $3::timestamptz, '[)')
    AND upper(vb.booking_range) > now() AND e.status NOT IN ('cancelled', 'completed', 'rejected')
  ORDER BY lower(vb.booking_range), vb.id ${lock}`;

// Event rows first, then the venue, as booking requests, holds and decisions
// lock them, so creating an unavailability cannot deadlock with them.
async function lockEvents(client: PoolClient, eventIds: string[], noWait: boolean) {
  if (!eventIds.length) return;
  try {
    await client.query(`SELECT id FROM events WHERE id = ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE${noWait ? ' NOWAIT' : ''}`, [eventIds]);
  } catch (error) {
    if ((error as { code?: string }).code === '55P03') throw new AccessError(409, BUSY);
    throw error;
  }
}

// E05-S06 Scenarios 1 to 4 and 7. Saving an unavailability never releases or
// cancels a booking: overlapping bookings and holds become Conflicting, a
// Confirmed event returns to Planning (T-81), and only each affected
// Coordinator is told now (C-121). E05-S04 Scenario 2's refusal over a
// confirmed booking is superseded (T-67).
export async function createVenueBlock(database: Pool, user: AuthenticatedUser | undefined, venueId: string, body: unknown) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  const validated = validateUnavailabilityInput(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { start, end, category, reason } = validated.input;
  const window = [venueId, start, end];

  return inTransaction(database, async client => {
    const candidates = await client.query<AffectedRow>(affectedSql(''), window);
    const locked = [...new Set(candidates.rows.map(row => row.event_id))].sort();
    await lockEvents(client, locked, false);
    const venue = await lockVenue(client, venueId);

    // Overlapping blocks would make a later edit or lift look like it failed,
    // because the other block would still hold the period.
    const overlapping = await client.query<BlockRow>(`
      SELECT id, venue_id, reason_category, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at
      FROM venue_blocks WHERE venue_id = $1 AND lifted_at IS NULL AND block_range && tstzrange($2::timestamptz, $3::timestamptz, '[)')
      ORDER BY lower(block_range)`, [venue.id, start, end]);
    if (overlapping.rows.length) {
      return { status: 409, body: {
        error: 'block_overlap',
        message: 'This period overlaps an existing block. Change that block instead.',
        overlappingBlocks: overlapping.rows.map(toVenueBlock),
      } };
    }

    const inserted = await client.query<BlockRow & { created_at: Date }>(`
      INSERT INTO venue_blocks (venue_id, block_range, reason_category, reason, created_by)
      VALUES ($1, tstzrange($2::timestamptz, $3::timestamptz, '[)'), $4, $5, $6)
      RETURNING id, venue_id, reason_category, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at, created_at`,
    [venue.id, start, end, category, reason, staff.id]);
    const row = inserted.rows[0]!;
    const block = toVenueBlock(row);
    await audit(client, staff.id, block.id, 'Venue blocked', null, describe(block));
    await recordHistory(client, block.id, 'created', staff.id, null, row);

    // A booking added between the first read and the venue lock belongs to an
    // event not locked yet; take it without waiting, or ask staff to retry.
    const affected = (await client.query<AffectedRow>(affectedSql('FOR UPDATE OF vb'), window)).rows;
    await lockEvents(client, [...new Set(affected.map(item => item.event_id))].filter(id => !locked.includes(id)).sort(), true);
    const affectedEvents = await flagAffected(client, staff.id, venue.name, row, row.created_at, affected);
    return { status: 201, body: {
      block, affectedEvents, notifiedEventCount: affectedEvents.filter(event => event.coordinatorNotified).length,
    } };
  });
}

// Scenarios 2 to 4 for one saved unavailability and the bookings it covers.
// Also used when an edit makes an unavailability cover more (Scenario 5).
async function flagAffected(client: PoolClient, actorId: string, venueName: string, block: BlockRow,
  occurredAt: Date, affected: AffectedRow[]) {
  for (const booking of affected) {
    await client.query(`UPDATE venue_bookings SET status = 'conflicting', status_before_conflict = status, conflict_block_id = $2
      WHERE id = $1`, [booking.booking_id, block.id]);
    await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
      VALUES ($1, 'venue_booking', $2, $3, 'Booking Conflicting', 'status', $4, 'conflicting')`,
    [actorId, booking.booking_id, booking.event_id, booking.status]);
  }
  const events = [...new Map(affected.map(item => [item.event_id, item])).values()];
  const result = [];
  for (const event of events) {
    const returnedToPlanning = event.event_status === 'confirmed';
    if (returnedToPlanning) {
      await applyEventStatusChange(client, event.event_id, 'planning', actorId, {
        auditAction: 'Returned to Planning: venue unavailable', skipNotices: true,
      });
    }
    let coordinatorNotified = false;
    if (event.coordinator_id) {
      const note = block.reason ? `: ${block.reason}` : '';
      const message = `${venueName} is unavailable ${period(block.starts_at, block.ends_at)} `
        + `(${CATEGORY_LABELS[block.reason_category]}${note}). This affects the venue booking for "${event.title}". `
        + `Alternative arrangements are required.${returnedToPlanning ? ' The event has returned to Planning.' : ''}`;
      coordinatorNotified = Boolean(await writeEventNotification(client, {
        eventId: event.event_id, changeId: `venue-unavailability:${block.id}:${occurredAt.toISOString()}`,
        userId: event.coordinator_id, occurredAt, title: 'Venue unavailable', message,
      }));
    }
    result.push({ eventId: event.event_id, eventCode: event.event_code, title: event.title, returnedToPlanning, coordinatorNotified });
  }
  return result;
}

type FlaggedRow = {
  booking_id: string; status_before_conflict: 'pending' | 'confirmed' | 'tentative'; expired: boolean; replaced: boolean;
  event_id: string; event_code: string | null; title: string; coordinator_id: string | null;
};

// Scenario 6 (C-122): the bookings and holds this unavailability made
// Conflicting that no longer overlap `$2`-`$3` (pass NULL, NULL... via
// restoreAll for a lift). A hold whose expiry has passed meanwhile is
// restored as Expired (E06-S05). A booking the Coordinator has replaced (an
// active booking points at it through replaces_booking_id) is not restored.
const flaggedSql = (lock: string, restoreAll: boolean) => `
  SELECT vb.id AS booking_id, vb.status_before_conflict::text AS status_before_conflict,
    (vb.status_before_conflict::text = 'tentative' AND vb.expires_at <= now()) AS expired,
    EXISTS (SELECT 1 FROM venue_bookings r WHERE r.replaces_booking_id = vb.id AND ${holdsVenue('r', 'now()')}) AS replaced,
    e.id AS event_id, e.event_code, e.title, e.coordinator_id
  FROM venue_bookings vb JOIN events e ON e.id = vb.event_id
  WHERE vb.conflict_block_id::text = $1 AND vb.status = 'conflicting'
    ${restoreAll ? '' : `AND NOT (vb.booking_range && tstzrange($2::timestamptz, $3::timestamptz, '[)'))`}
  ORDER BY lower(vb.booking_range), vb.id ${lock}`;

// Scenario 6: put each booking back as it was and tell its Coordinator once.
async function restoreFlagged(client: PoolClient, actorId: string, venueName: string, blockId: string,
  occurredAt: Date, flagged: FlaggedRow[]) {
  const restored: FlaggedRow[] = [];
  for (const booking of flagged) {
    if (booking.replaced) continue;
    const status = booking.expired ? 'expired' : booking.status_before_conflict;
    // Another booking may have taken the slot's buffers meanwhile (0016); that
    // booking then stays Conflicting for staff to resolve, and the rest of the
    // change still saves.
    await client.query('SAVEPOINT restore_booking');
    try {
      await client.query(`UPDATE venue_bookings SET status = $2::booking_status, status_before_conflict = NULL, conflict_block_id = NULL
        WHERE id = $1`, [booking.booking_id, status]);
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT restore_booking');
      if ((error as { code?: string }).code === '23P01') continue;
      throw error;
    }
    await client.query('RELEASE SAVEPOINT restore_booking');
    await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
      VALUES ($1, 'venue_booking', $2, $3, 'Booking Restored', 'status', 'conflicting', $4)`,
    [actorId, booking.booking_id, booking.event_id, status]);
    restored.push(booking);
  }
  const result = [];
  for (const event of new Map(restored.map(item => [item.event_id, item])).values()) {
    let coordinatorNotified = false;
    if (event.coordinator_id) {
      coordinatorNotified = Boolean(await writeEventNotification(client, {
        eventId: event.event_id, changeId: `venue-available:${blockId}:${occurredAt.toISOString()}`,
        userId: event.coordinator_id, occurredAt, title: 'Venue available again',
        message: `${venueName} is no longer unavailable for the venue booking of "${event.title}", so that booking stands again. `
          + 'Review the event\'s arrangements.',
      }));
    }
    result.push({ eventId: event.event_id, eventCode: event.event_code, title: event.title, coordinatorNotified });
  }
  return result;
}

type NextBlock = { start: Date; end: Date | null; category: ReasonCategory; reason: string };
type Decision = { next: NextBlock; response?: never } | { response: { status: number; body: Record<string, unknown> }; next?: never };

// Scenarios 5 to 7 for an edit: change the period, category or note; flag
// bookings the new period newly covers; restore those it no longer covers;
// keep the history. Locks events, then the venue, then the block.
async function changeBlock(client: PoolClient, actorId: string, venueId: string, blockId: string,
  expected: { start: Date; end: Date | null }, decide: (current: BlockRow) => Decision, auditAction: string) {
  const candidates = [
    ...(await client.query<FlaggedRow>(flaggedSql('', true), [blockId])).rows,
    ...(await client.query<AffectedRow>(affectedSql(''), [venueId, expected.start, expected.end])).rows,
  ];
  const locked = [...new Set(candidates.map(row => row.event_id))].sort();
  await lockEvents(client, locked, false);
  const venue = await lockVenue(client, venueId);
  const current = await lockBlock(client, venueId, blockId);
  const decision = decide(current);
  if (decision.response) return decision.response;
  const { start, end, category, reason } = decision.next;

  const overlapping = await client.query<BlockRow>(`
    SELECT id, venue_id, reason_category, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at
    FROM venue_blocks WHERE venue_id = $1 AND id <> $2 AND lifted_at IS NULL
      AND block_range && tstzrange($3::timestamptz, $4::timestamptz, '[)')
    ORDER BY lower(block_range)`, [venue.id, current.id, start, end]);
  if (overlapping.rows.length) {
    return { status: 409, body: {
      error: 'block_overlap',
      message: 'This period overlaps an existing block. Change that block instead.',
      overlappingBlocks: overlapping.rows.map(toVenueBlock),
    } };
  }

  const updated = (await client.query<BlockRow & { changed_at: Date }>(`
    UPDATE venue_blocks SET block_range = tstzrange($2::timestamptz, $3::timestamptz, '[)'), reason_category = $4, reason = $5
    WHERE id = $1
    RETURNING id, venue_id, reason_category, reason, lower(block_range) AS starts_at, upper(block_range) AS ends_at, now() AS changed_at`,
  [current.id, start, end, category, reason])).rows[0]!;
  const block = toVenueBlock(updated);
  await audit(client, actorId, block.id, auditAction, describe(toVenueBlock(current)), describe(block));
  await recordHistory(client, block.id, 'edited', actorId, current, updated);

  const toRestore = (await client.query<FlaggedRow>(flaggedSql('FOR UPDATE OF vb', false), [current.id, start, end])).rows;
  const toFlag = (await client.query<AffectedRow>(affectedSql('FOR UPDATE OF vb'), [venue.id, start, end])).rows;
  await lockEvents(client, [...new Set([...toRestore, ...toFlag].map(row => row.event_id))].filter(id => !locked.includes(id)).sort(), true);
  const restoredEvents = await restoreFlagged(client, actorId, venue.name, current.id, updated.changed_at, toRestore);
  const affectedEvents = await flagAffected(client, actorId, venue.name, updated, updated.changed_at, toFlag);
  return { status: 200, body: { block, affectedEvents, restoredEvents } };
}

// T-91 / Scenarios 5 to 7: edit an unavailability's period, category or note.
// The body is the full new state, as for creation, with starts_at required.
export async function editVenueBlock(
  database: Pool, user: AuthenticatedUser | undefined, venueId: string, blockId: string, body: unknown,
) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  if (!isPlainObject(body) || body.starts_at === undefined) {
    return { status: 400, body: { error: 'validation_failed', errors: { starts_at: ['A start date and time is required.'] } } };
  }
  const validated = validateUnavailabilityInput(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const next = validated.input;
  return inTransaction(database, client => changeBlock(client, staff.id, venueId, blockId, next,
    () => ({ next }), 'Venue block edited'));
}

// E05-S04 checklist "Remove or shorten an existing block", which the current
// screen still uses: whole days, shortening only. It now also restores the
// bookings the shorter period no longer covers (E05-S06 Scenario 6).
export async function shortenVenueBlock(
  database: Pool, user: AuthenticatedUser | undefined, venueId: string, blockId: string, body: unknown,
) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  const validated = validateBlockInput(body, false);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { start, end, reason } = validated.input;

  return inTransaction(database, client => changeBlock(client, staff.id, venueId, blockId, { start, end }, current => {
    const before = toVenueBlock(current);
    // Compare whole days: a block saved with times (the seeded 08:00-18:00
    // inspection) must still accept its own dates back unchanged.
    const firstDay = Date.parse(`${before.from}T00:00:00${OFFSET}`);
    // An open-ended block has no last day, so any end shortens it.
    const afterLastDay = before.to ? Date.parse(`${before.to}T00:00:00${OFFSET}`) + DAY_MS : Infinity;
    if (start.getTime() < firstDay || end.getTime() > afterLastDay) {
      return { response: { status: 400, body: {
        error: 'validation_failed',
        errors: { to: ['A block can only be shortened. Edit it to cover extra dates.'] },
      } } };
    }
    // Keep any partial-day start or end on days the request did not cut.
    return { next: {
      start: new Date(Math.max(start.getTime(), current.starts_at.getTime())),
      end: new Date(Math.min(end.getTime(), current.ends_at?.getTime() ?? Infinity)),
      category: current.reason_category, reason: reason ?? current.reason,
    } };
  }, 'Venue block shortened'));
}

// T-91 / Scenarios 6 and 7: lifting keeps the unavailability as history,
// restores every booking and hold it made Conflicting (C-122), and tells the
// Coordinator of each event it affected, including one whose booking stays
// Conflicting because it was replaced or now clashes.
async function liftBlock(client: PoolClient, actorId: string, venueId: string, blockId: string, auditAction: string) {
  const candidates = (await client.query<FlaggedRow>(flaggedSql('', true), [blockId])).rows;
  const locked = [...new Set(candidates.map(row => row.event_id))].sort();
  await lockEvents(client, locked, false);
  const venue = await lockVenue(client, venueId);
  const current = await lockBlock(client, venueId, blockId);

  const lifted = (await client.query<{ lifted_at: Date }>(`UPDATE venue_blocks SET lifted_at = now(), lifted_by = $2
    WHERE id = $1 RETURNING lifted_at`, [current.id, actorId])).rows[0]!;
  await audit(client, actorId, current.id, auditAction, describe(toVenueBlock(current)), null);
  await recordHistory(client, current.id, 'lifted', actorId, current, null);

  const flagged = (await client.query<FlaggedRow>(flaggedSql('FOR UPDATE OF vb', true), [current.id])).rows;
  await lockEvents(client, [...new Set(flagged.map(row => row.event_id))].filter(id => !locked.includes(id)).sort(), true);
  const restoredEvents = await restoreFlagged(client, actorId, venue.name, current.id, lifted.lifted_at, flagged);
  const restored = new Set(restoredEvents.map(event => event.eventId));
  let notified = restoredEvents.filter(event => event.coordinatorNotified).length;
  for (const event of new Map(flagged.map(item => [item.event_id, item])).values()) {
    if (restored.has(event.event_id) || !event.coordinator_id) continue;
    // Same change ID as the restore notice, so nobody is told twice.
    if (await writeEventNotification(client, {
      eventId: event.event_id, changeId: `venue-available:${current.id}:${lifted.lifted_at.toISOString()}`,
      userId: event.coordinator_id, occurredAt: lifted.lifted_at, title: 'Venue available again',
      message: `The unavailability on ${venue.name} has been lifted. The venue booking for "${event.title}" `
        + 'still needs your attention before it can stand again.',
    })) notified += 1;
  }
  return { status: 200, body: { block: toVenueBlock(current), lifted: true, restoredEvents, notifiedEventCount: notified } };
}

export async function liftVenueBlock(database: Pool, user: AuthenticatedUser | undefined, venueId: string, blockId: string) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  return inTransaction(database, client => liftBlock(client, staff.id, venueId, blockId, 'Venue block lifted'));
}

// E05-S04's "remove", which the current screen still uses, now lifts the
// block instead of deleting it, so its history is kept (T-91). The reply
// keeps E05-S04's `removed` flag.
export async function removeVenueBlock(database: Pool, user: AuthenticatedUser | undefined, venueId: string, blockId: string) {
  const staff = await requireVenueStaff(poolQuery(database), user);
  return inTransaction(database, async client => {
    const result = await liftBlock(client, staff.id, venueId, blockId, 'Venue block removed');
    return { status: result.status, body: { ...result.body, removed: true } };
  });
}

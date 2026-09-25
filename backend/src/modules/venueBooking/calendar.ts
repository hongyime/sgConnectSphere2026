import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { requireCatalogueViewer } from './catalogue.js';

// E05-S03 "View the venue availability calendar". Read-only: bookings come
// from venue_bookings, maintenance blocks from venue_blocks, and Free is
// every remaining gap inside the venue's opening hours.
//
// Calendar days are Singapore days (UTC+08:00, no daylight saving), the same
// offset every seeded booking and block range uses.

export type CalendarState = 'free' | 'tentative' | 'confirmed' | 'blocked' | 'unavailable';

export type CalendarEntry = {
  state: CalendarState;
  // 'block' is kept distinct from 'booking' so a maintenance block is never
  // mistaken for an event (E05-S03 Scenario 3).
  kind: 'free' | 'booking' | 'block';
  start: string;
  end: string;
  event?: { id: string; code: string | null; title: string };
  reason?: string;
};

export const CALENDAR_TIMEZONE = 'Asia/Singapore';
const OFFSET = '+08:00';
const DAY_MS = 24 * 60 * 60 * 1000;
// Bounds a single request so calendar load stays within the three-second
// target (BDR T-51) - two months covers the month view plus navigation.
export const MAX_CALENDAR_DAYS = 62;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value: unknown, field: string): number {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new AccessError(400, `${field} must be a date in YYYY-MM-DD format.`);
  }
  const time = Date.parse(`${value}T00:00:00${OFFSET}`);
  // Date.parse accepts 2026-02-31 by rolling over, so round-trip to reject it.
  if (Number.isNaN(time) || new Date(time + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) !== value) {
    throw new AccessError(400, `${field} is not a real calendar date.`);
  }
  return time;
}

// Returns the Singapore-midnight instants bounding [from, to] inclusive.
export function parseCalendarRange(from: unknown, to: unknown): { start: number; end: number; days: string[] } {
  const start = parseDay(from, 'from');
  const last = parseDay(to, 'to');
  if (last < start) throw new AccessError(400, 'to must be on or after from.');
  const dayCount = (last - start) / DAY_MS + 1;
  if (dayCount > MAX_CALENDAR_DAYS) {
    throw new AccessError(400, `A calendar range can cover at most ${MAX_CALENDAR_DAYS} days.`);
  }
  const days = Array.from({ length: dayCount }, (_, index) =>
    new Date(start + index * DAY_MS + 8 * 60 * 60 * 1000).toISOString().slice(0, 10));
  return { start, end: last + DAY_MS, days };
}

type BookingRow = {
  status: 'pending' | 'confirmed';
  starts_at: Date; ends_at: Date;
  event_id: string; event_code: string | null; title: string; coordinator_id: string | null;
};
type BlockRow = { reason: string; starts_at: Date; ends_at: Date };

// E05-S03 Scenario 2, following TC_E05S03_02/05: Venue Staff maintain every
// booking, and a Coordinator sees the details of events assigned to them.
// Anyone else sees the period only as Unavailable.
function canSeeEventDetails(user: AuthenticatedUser, booking: BookingRow): boolean {
  return user.role === 'venue_staff' || booking.coordinator_id === user.id;
}

function bookingEntry(user: AuthenticatedUser, booking: BookingRow): CalendarEntry {
  const period = { kind: 'booking' as const, start: booking.starts_at.toISOString(), end: booking.ends_at.toISOString() };
  if (!canSeeEventDetails(user, booking)) return { state: 'unavailable', ...period };
  return {
    state: booking.status === 'pending' ? 'tentative' : 'confirmed',
    ...period,
    event: { id: booking.event_id, code: booking.event_code, title: booking.title },
  };
}

// Free periods are the parts of each day's opening hours not covered by any
// booking or block. Occupied intervals may overlap each other or run past
// opening hours, so each day window is walked against the sorted list.
function freeEntries(days: string[], opensAt: string, closesAt: string, occupied: Array<[number, number]>): CalendarEntry[] {
  const sorted = [...occupied].sort((a, b) => a[0] - b[0]);
  const entries: CalendarEntry[] = [];
  for (const day of days) {
    const windowEnd = Date.parse(`${day}T${closesAt}:00${OFFSET}`);
    let cursor = Date.parse(`${day}T${opensAt}:00${OFFSET}`);
    for (const [start, end] of sorted) {
      if (end <= cursor || start >= windowEnd) continue;
      if (start > cursor) entries.push(freeEntry(cursor, start));
      cursor = Math.max(cursor, end);
      if (cursor >= windowEnd) break;
    }
    if (cursor < windowEnd) entries.push(freeEntry(cursor, windowEnd));
  }
  return entries;
}

function freeEntry(start: number, end: number): CalendarEntry {
  return { state: 'free', kind: 'free', start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

export async function getVenueCalendar(
  query: Query,
  user: AuthenticatedUser | undefined,
  venueId: string,
  from: unknown,
  to: unknown,
) {
  const viewer = await requireCatalogueViewer(query, user, 'venue_calendar');
  const range = parseCalendarRange(from, to);

  const venueResult = await query<{ id: string; name: string; opens_at: string; closes_at: string; is_active: boolean }>(`
    SELECT v.id, v.name, to_char(v.opens_at, 'HH24:MI') AS opens_at, to_char(v.closes_at, 'HH24:MI') AS closes_at, v.is_active
    FROM venues v WHERE v.id::text = $1`, [venueId]);
  const venue = venueResult.rows[0];
  if (!venue) throw new AccessError(404, 'Venue not found.');

  const window = [venue.id, new Date(range.start).toISOString(), new Date(range.end).toISOString()];
  // Ranges are clipped to the requested window: the schema allows an
  // open-ended or infinite range (e.g. a block with no known end), whose
  // NULL or infinite bound would otherwise become 1970 or an invalid date.
  // GREATEST/LEAST ignore NULLs, so an unbounded side takes the window edge.
  //
  // Only pending and confirmed bookings hold the venue (the same statuses the
  // venue_bookings_no_active_overlap constraint covers). Rejected, released
  // and conflicting requests leave the period Free.
  const bookings = await query<BookingRow>(`
    SELECT vb.status,
      greatest(lower(vb.booking_range), $2::timestamptz) AS starts_at,
      least(upper(vb.booking_range), $3::timestamptz) AS ends_at,
      e.id AS event_id, e.event_code, e.title, e.coordinator_id
    FROM venue_bookings vb JOIN events e ON e.id = vb.event_id
    WHERE vb.venue_id = $1 AND vb.status IN ('pending', 'confirmed')
      AND vb.booking_range && tstzrange($2::timestamptz, $3::timestamptz)
    ORDER BY lower(vb.booking_range)`, window);
  const blocks = await query<BlockRow>(`
    SELECT reason,
      greatest(lower(block_range), $2::timestamptz) AS starts_at,
      least(upper(block_range), $3::timestamptz) AS ends_at
    FROM venue_blocks
    WHERE venue_id = $1 AND block_range && tstzrange($2::timestamptz, $3::timestamptz)
    ORDER BY lower(block_range)`, window);

  const occupied: Array<[number, number]> = [
    ...bookings.rows.map(row => [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()] as [number, number]),
    ...blocks.rows.map(row => [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()] as [number, number]),
  ];
  const entries: CalendarEntry[] = [
    ...bookings.rows.map(row => bookingEntry(viewer, { ...row, starts_at: new Date(row.starts_at), ends_at: new Date(row.ends_at) })),
    ...blocks.rows.map(row => ({
      state: 'blocked' as const, kind: 'block' as const, reason: row.reason,
      start: new Date(row.starts_at).toISOString(), end: new Date(row.ends_at).toISOString(),
    })),
    // A retired venue cannot take new bookings, so none of its time is Free.
    ...(venue.is_active ? freeEntries(range.days, venue.opens_at, venue.closes_at, occupied) : []),
  ].sort((a, b) => a.start.localeCompare(b.start));

  return {
    venue: { id: venue.id, name: venue.name, opens_at: venue.opens_at, closes_at: venue.closes_at, is_active: venue.is_active },
    from: range.days[0],
    to: range.days[range.days.length - 1],
    timezone: CALENDAR_TIMEZONE,
    entries,
  };
}

// E05-S05: Setup and turnaround buffer calculations for venue bookings
// These helpers extend booking time ranges to include setup_time_minutes before
// and turnaround_time_minutes after, for conflict checking and availability.

import type { Query } from '../eventVisibility/service.js';

export type VenueBufferConfig = {
  setup_time_minutes: number;
  turnaround_time_minutes: number;
};

// Fetch buffer configuration for a specific venue
export async function getVenueBuffers(query: Query, venueId: string): Promise<VenueBufferConfig> {
  const result = await query<{ setup_time_minutes: number; turnaround_time_minutes: number }>(
    `SELECT setup_time_minutes, turnaround_time_minutes FROM venues WHERE id::text = $1`,
    [venueId],
  );

  if (!result.rows[0]) {
    // Default to zero buffers if venue not found (should not happen in normal flow)
    return { setup_time_minutes: 0, turnaround_time_minutes: 0 };
  }

  return result.rows[0];
}

// Calculate the effective time range including buffers for a given booking
// Returns timestamps adjusted by setup_time_minutes before start and turnaround_time_minutes after end
export function calculateBufferedRange(
  start: Date,
  end: Date,
  setupMinutes: number,
  turnaroundMinutes: number,
): { bufferedStart: Date; bufferedEnd: Date } {
  const bufferedStart = new Date(start.getTime() - setupMinutes * 60 * 1000);
  const bufferedEnd = new Date(end.getTime() + turnaroundMinutes * 60 * 1000);
  return { bufferedStart, bufferedEnd };
}

// SQL helper: Returns a SQL expression that calculates the buffered range
// Usage: Instead of `booking_range && tstzrange($start, $end)`, use
//        `(${bufferedRangeSQL('vb.booking_range', 'v.setup_time_minutes', 'v.turnaround_time_minutes')}) && tstzrange($start, $end)`
export function bufferedRangeSQL(
  bookingRangeCol: string,
  setupMinutesCol: string,
  turnaroundMinutesCol: string,
): string {
  // Extend the booking range by subtracting setup minutes from start and adding turnaround minutes to end
  return `tstzrange(
    lower(${bookingRangeCol}) - (${setupMinutesCol} || ' minutes')::interval,
    upper(${bookingRangeCol}) + (${turnaroundMinutesCol} || ' minutes')::interval,
    '[)'
  )`;
}

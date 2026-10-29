import type { CalendarEntry } from './venueCalendarApi';

const MINUTE_MS = 60_000;
const SINGAPORE_OFFSET_MS = 8 * 60 * MINUTE_MS;

export type BookingForConflictCheck = {
  startsAt: string;
  endsAt: string;
  eventId: string;
  eventCode: string | null;
};

export function bookingCalendarRange(
  startsAt: string,
  endsAt: string,
  setupMinutes: number,
  turnaroundMinutes: number,
): { from: string; to: string } | null {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end
    || !Number.isFinite(setupMinutes) || setupMinutes < 0
    || !Number.isFinite(turnaroundMinutes) || turnaroundMinutes < 0) return null;

  const from = start - setupMinutes * MINUTE_MS;
  const to = end + turnaroundMinutes * MINUTE_MS;
  const fromSgt = from + SINGAPORE_OFFSET_MS;
  const toSgt = to + SINGAPORE_OFFSET_MS;
  if (!Number.isFinite(fromSgt) || !Number.isFinite(toSgt) || Math.abs(fromSgt) > 8.64e15 || Math.abs(toSgt) > 8.64e15) return null;
  return {
    from: new Date(fromSgt).toISOString().slice(0, 10),
    to: new Date(toSgt).toISOString().slice(0, 10),
  };
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function identifier(entry: CalendarEntry) {
  return entry.event?.code ? ` [${entry.event.code}]` : entry.event?.title ? ` "${entry.event.title}"` : '';
}

function isCandidateEntry(entry: CalendarEntry, booking: BookingForConflictCheck) {
  const start = Date.parse(booking.startsAt);
  const end = Date.parse(booking.endsAt);
  const entryStart = Date.parse(entry.start);
  const entryEnd = Date.parse(entry.end);
  return entry.event?.id === booking.eventId && (
    (entryStart === start && entryEnd === end)
    || (entry.reason === 'Setup time' && entryEnd === start)
    || (entry.reason === 'Turnaround time' && entryStart === end)
  );
}

export function detectBookingConflict(
  booking: BookingForConflictCheck,
  setupMinutes: number,
  turnaroundMinutes: number,
  entries: CalendarEntry[],
): string | null {
  const start = Date.parse(booking.startsAt) - setupMinutes * MINUTE_MS;
  const end = Date.parse(booking.endsAt) + turnaroundMinutes * MINUTE_MS;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;

  for (const entry of entries) {
    if (entry.kind !== 'booking' || !entry.event || isCandidateEntry(entry, booking)
      || !['confirmed', 'tentative', 'conflicting'].includes(entry.state)) continue;
    const otherStart = Date.parse(entry.start);
    const otherEnd = Date.parse(entry.end);
    if (!Number.isFinite(otherStart) || !Number.isFinite(otherEnd) || !overlaps(start, end, otherStart, otherEnd)) continue;
    const kind = entry.state === 'confirmed' ? 'confirmed booking' : entry.state === 'conflicting' ? 'conflicting booking' : 'active booking or hold';
    return `Booking Conflict: overlaps with ${kind}${identifier(entry)}`;
  }
  if (entries.some(entry => entry.kind === 'booking' && isCandidateEntry(entry, booking) && entry.bufferConflict)) {
    return `Booking Conflict: ${booking.eventCode ? `[${booking.eventCode}] ` : 'this request '}is flagged after the venue buffers changed.`;
  }
  return null;
}

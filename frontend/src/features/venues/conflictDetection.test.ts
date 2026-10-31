import { describe, expect, it } from 'vitest';
import type { CalendarEntry } from '../venue/venueCalendarApi';
import { bookingCalendarRange, detectBookingConflict } from '../venue/conflictDetection';

const booking = { startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T12:00:00.000Z', eventId: 'event-a', eventCode: 'EVT-1' };
const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  kind: 'booking', state: 'confirmed', start: '2026-10-25T11:00:00.000Z', end: '2026-10-25T13:00:00.000Z',
  event: { id: 'event-b', code: 'EVT-2', title: 'Other event' }, ...overrides,
});

describe('bookingCalendarRange', () => {
  it('includes venue buffers and converts the range to Singapore calendar days', () => {
    expect(bookingCalendarRange('2026-10-25T00:30:00Z', '2026-10-25T16:30:00Z', 60, 120))
      .toEqual({ from: '2026-10-25', to: '2026-10-26' });
  });

  it.each([
    ['', '2026-10-25T12:00:00Z', 0, 0],
    ['2026-10-25T12:00:00Z', '2026-10-25T12:00:00Z', 0, 0],
    ['2026-10-25T10:00:00Z', '2026-10-25T12:00:00Z', -1, 0],
    ['2026-10-25T10:00:00Z', '2026-10-25T12:00:00Z', 0, Number.NaN],
  ])('rejects invalid dates, intervals, or buffers', (start, end, setup, turnaround) => {
    expect(bookingCalendarRange(start, end, setup, turnaround)).toBeNull();
  });

  it('rejects buffers that exceed the JavaScript date range', () => {
    expect(bookingCalendarRange('2026-10-25T10:00:00Z', '2026-10-25T12:00:00Z', Number.MAX_SAFE_INTEGER, 0)).toBeNull();
  });
});

describe('detectBookingConflict', () => {
  it('reports an overlapping confirmed booking by event code, including buffered overlap', () => {
    expect(detectBookingConflict(booking, 30, 0, [entry({ start: '2026-10-25T09:00:00Z', end: '2026-10-25T09:45:00Z' })]))
      .toBe('Booking Conflict: overlaps with confirmed booking [EVT-2]');
  });

  it('reports an overlapping active hold or pending claim', () => {
    expect(detectBookingConflict(booking, 0, 0, [entry({ state: 'tentative' })]))
      .toBe('Booking Conflict: overlaps with active booking or hold [EVT-2]');
  });

  it('reports an overlapping booking already flagged as conflicting', () => {
    expect(detectBookingConflict(booking, 0, 0, [entry({ state: 'conflicting' })]))
      .toBe('Booking Conflict: overlaps with conflicting booking [EVT-2]');
  });

  it('uses the event title when a conflicting booking has no code', () => {
    expect(detectBookingConflict(booking, 0, 0, [entry({ event: { id: 'event-b', code: null, title: 'Other event' } })]))
      .toBe('Booking Conflict: overlaps with confirmed booking "Other event"');
    expect(detectBookingConflict(booking, 0, 0, [entry({ event: { id: 'event-b', code: null, title: '' } })]))
      .toBe('Booking Conflict: overlaps with confirmed booking');
  });

  it('allows exact half-open adjacency', () => {
    expect(detectBookingConflict(booking, 0, 0, [entry({ start: booking.endsAt, end: '2026-10-25T14:00:00Z' })])).toBeNull();
  });

  it('ignores the same event, non-booking entries, and malformed calendar periods', () => {
    expect(detectBookingConflict(booking, 0, 0, [
      entry({ event: { id: 'event-a', code: 'EVT-1', title: 'This request' }, start: booking.startsAt, end: booking.endsAt }),
      entry({ kind: 'block' }),
      { kind: 'booking', state: 'confirmed', start: '2026-10-25T11:00:00Z', end: '2026-10-25T13:00:00Z' },
      entry({ start: 'invalid', end: '2026-10-25T13:00:00Z' }),
      entry({ state: 'unavailable' }),
    ])).toBeNull();
  });

  it('only ignores the candidate booking segments for the same event', () => {
    const localBooking = { ...booking, startsAt: '2026-10-25T18:00:00+08:00', endsAt: '2026-10-25T20:00:00+08:00' };
    const own = { event: { id: booking.eventId, code: booking.eventCode, title: 'This request' } };
    expect(detectBookingConflict(localBooking, 30, 30, [
      entry({ ...own, state: 'tentative', reason: 'Setup time', start: '2026-10-25T09:30:00Z', end: booking.startsAt }),
      entry({ ...own, state: 'tentative', start: booking.startsAt, end: booking.endsAt }),
      entry({ ...own, state: 'tentative', reason: 'Turnaround time', start: booking.endsAt, end: '2026-10-25T12:30:00Z' }),
    ])).toBeNull();
    expect(detectBookingConflict(booking, 0, 0, [entry({
      event: { id: booking.eventId, code: booking.eventCode, title: 'Other request for same event' },
    })])).toBe('Booking Conflict: overlaps with confirmed booking [EVT-1]');
  });

  // TC_E06S06_06: once the other request is rejected or withdrawn, the stale flag must not block approval.
  it('does not block a flagged request once nothing overlaps it any more', () => {
    const flaggedSelf = entry({
      state: 'tentative', start: booking.startsAt, end: booking.endsAt,
      event: { id: booking.eventId, code: booking.eventCode, title: 'This request' }, bufferConflict: true,
    });
    expect(detectBookingConflict(booking, 30, 45, [flaggedSelf])).toBeNull();
  });

  it('still blocks a flagged request while its buffered window overlaps another claim', () => {
    const flaggedSelf = entry({
      state: 'tentative', start: booking.startsAt, end: booking.endsAt,
      event: { id: booking.eventId, code: booking.eventCode, title: 'This request' }, bufferConflict: true,
    });
    // The other request ends at 09:45 UTC; with 30 minutes' setup this request occupies from 09:30 UTC.
    expect(detectBookingConflict(booking, 30, 45, [flaggedSelf,
      entry({ state: 'tentative', start: '2026-10-25T08:00:00Z', end: '2026-10-25T09:45:00Z' })]))
      .toBe('Booking Conflict: overlaps with active booking or hold [EVT-2]');
  });

  it('returns no warning for invalid candidate times', () => {
    expect(detectBookingConflict({ ...booking, startsAt: 'invalid' }, 0, 0, [entry()])).toBeNull();
  });
});

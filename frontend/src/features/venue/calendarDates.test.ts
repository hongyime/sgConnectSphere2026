import { expect, test } from 'vitest';
import { dayCount, dayKeyAt, formatTime, isDayKey, monthBounds, shiftMonth } from './calendarDates';

test('month bounds cover leap and non-leap Februaries', () => {
  expect(monthBounds('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  expect(monthBounds('2027-02-10')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
});

test('shifting months crosses year boundaries', () => {
  expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-01');
  expect(shiftMonth('2027-01-31', -1)).toBe('2026-12-01');
});

test('Singapore day keys and times use UTC+8 regardless of browser timezone', () => {
  // 16:00Z is midnight the next day in Singapore.
  expect(dayKeyAt(Date.parse('2026-11-12T16:00:00Z'))).toBe('2026-11-13');
  expect(formatTime(Date.parse('2026-11-12T01:00:00Z'))).toBe('09:00');
  expect(formatTime(Date.parse('2026-11-12T16:00:00Z'), true)).toBe('24:00');
});

test('day counts are inclusive and invalid dates are rejected', () => {
  expect(dayCount('2026-12-05', '2026-12-10')).toBe(6);
  expect(isDayKey('2026-02-31')).toBe(false);
  expect(isDayKey('2026-02-28')).toBe(true);
});

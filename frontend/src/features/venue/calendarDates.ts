// Date helpers for the venue calendar (E05-S03). Calendar days are Singapore
// days (UTC+08:00, no daylight saving), matching the backend, so every
// conversion here uses the fixed offset rather than the browser's timezone.
// Day keys are 'YYYY-MM-DD' strings.

import type { CalendarEntry } from './venueCalendarApi';

const OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKeyAt(instant: number): string {
  return new Date(instant + OFFSET_MS).toISOString().slice(0, 10);
}

export function dayStart(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00+08:00`);
}

export function todayKey(now = Date.now()): string {
  return dayKeyAt(now);
}

function parts(dayKey: string): [number, number] {
  const [year, month] = dayKey.split('-').map(Number);
  return [year, month];
}

function keyFromUtc(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function monthBounds(dayKey: string): { from: string; to: string } {
  const [year, month] = parts(dayKey);
  return { from: keyFromUtc(year, month - 1, 1), to: keyFromUtc(year, month, 0) };
}

export function shiftMonth(dayKey: string, delta: number): string {
  const [year, month] = parts(dayKey);
  return keyFromUtc(year, month - 1 + delta, 1);
}

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dayStart(value)) && dayKeyAt(dayStart(value)) === value;
}

// Inclusive count of days from `from` to `to`.
export function dayCount(from: string, to: string): number {
  return Math.round((dayStart(to) - dayStart(from)) / DAY_MS) + 1;
}

export function daysInRange(from: string, to: string): string[] {
  const count = dayCount(from, to);
  return Array.from({ length: Math.max(count, 0) }, (_, index) => dayKeyAt(dayStart(from) + index * DAY_MS));
}

export function formatDay(dayKey: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${dayKey}T00:00:00Z`));
}

export function formatMonth(dayKey: string): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dayKey}T00:00:00Z`));
}

// Singapore wall-clock time. The end of a day segment is the next midnight,
// which reads more naturally as 24:00 than 00:00.
export function formatTime(instant: number, isEnd = false): string {
  const time = new Date(instant + OFFSET_MS).toISOString().slice(11, 16);
  return isEnd && time === '00:00' ? '24:00' : time;
}

export type DaySegment = { entry: CalendarEntry; start: number; end: number };

// The API returns one entry per booking or block, which may span several days
// (a two-day maintenance block, an open-ended closure clipped to the window).
// The agenda lists each day separately, so entries are cut at Singapore
// midnight and each piece is filed under the day it falls in.
export function segmentsByDay(entries: CalendarEntry[], days: string[]): Map<string, DaySegment[]> {
  const byDay = new Map<string, DaySegment[]>(days.map(day => [day, []]));
  for (const entry of entries) {
    const entryStart = Date.parse(entry.start);
    const entryEnd = Date.parse(entry.end);
    if (!(entryEnd > entryStart)) continue;
    for (let cursor = dayStart(dayKeyAt(entryStart)); cursor < entryEnd; cursor += DAY_MS) {
      const segments = byDay.get(dayKeyAt(cursor));
      if (!segments) continue;
      segments.push({ entry, start: Math.max(entryStart, cursor), end: Math.min(entryEnd, cursor + DAY_MS) });
    }
  }
  for (const segments of byDay.values()) segments.sort((a, b) => a.start - b.start);
  return byDay;
}

// SCRUM-42: unit tests for the venue availability calendar (E05-S03 "View the
// venue availability calendar").
//
// Every query is answered by an in-memory stub keyed on the table it reads,
// so these tests prove the state mapping, the Free-gap filling, the
// event-detail privacy rule and the input validation without a database.
// Guarded paths use a stub that throws on anything except the E14-S02
// audit-denial write, proving a denial reads no venue data.
//
// See venueCalendar.integration.test.ts for TC_E05S03_01..05 against real
// PostgreSQL.

import test from 'node:test';
import assert from 'node:assert/strict';
import { getVenueCalendar, MAX_CALENDAR_DAYS, parseCalendarRange } from '../src/modules/venueBooking/calendar';
import { AccessError, type Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';

const venueStaff: AuthenticatedUser = { id: 'staff-1', email: 'staff@example.test', role: 'venue_staff', isActive: true, failedLoginCount: 0 };
const coordinator: AuthenticatedUser = { ...venueStaff, id: 'coord-1', role: 'event_coordinator' };
const otherCoordinator: AuthenticatedUser = { ...venueStaff, id: 'coord-2', role: 'event_coordinator' };
const attendee: AuthenticatedUser = { ...venueStaff, id: 'attendee-1', role: 'attendee' };

const sgt = (value: string) => new Date(`${value}+08:00`);
const venueRow = { id: 'venue-1', name: 'Grand Ballroom', opens_at: '08:00', closes_at: '22:00', is_active: true };

function booking(status: 'pending' | 'confirmed', start: string, end: string, title: string, coordinatorId: string | null) {
  return {
    status, starts_at: sgt(start), ends_at: sgt(end),
    event_id: `event-${title}`, event_code: `EVT-${title}`, title, coordinator_id: coordinatorId,
  };
}

// TC_E05S03_01's fixture: Free, Tentative, Confirmed and Blocked on four days.
const bookings = [
  booking('pending', '2026-11-11T09:00', '2026-11-11T12:00', 'Pending Summit', 'coord-1'),
  booking('confirmed', '2026-11-12T09:00', '2026-11-12T12:00', 'Annual Tech Summit', 'coord-1'),
];
const blocks = [{ reason: 'Maintenance', starts_at: sgt('2026-11-13T00:00'), ends_at: sgt('2026-11-14T00:00') }];

function calendarQuery(rows: { venue?: unknown; bookings?: unknown[]; blocks?: unknown[] } = {}): Query {
  return (async (sql: string) => {
    if (sql.includes('FROM venues')) return { rows: 'venue' in rows ? (rows.venue ? [rows.venue] : []) : [venueRow] };
    if (sql.includes('FROM venue_bookings')) return { rows: rows.bookings ?? bookings };
    if (sql.includes('FROM venue_blocks')) return { rows: rows.blocks ?? blocks };
    throw new Error(`Unexpected query: ${sql}`);
  }) as Query;
}

const denied: string[] = [];
const denyQuery: Query = async (sql, values) => {
  if (sql.includes('INSERT INTO audit_logs')) {
    denied.push(String(values?.[1]));
    return { rows: [] };
  }
  throw new Error('Unauthorised database read');
};

const local = (iso: string) => new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);

test('getVenueCalendar requires a signed-in user', async () => {
  await assert.rejects(getVenueCalendar(denyQuery, undefined, 'venue-1', '2026-11-10', '2026-11-13'),
    (error: AccessError) => error.status === 401);
});

test('getVenueCalendar refuses roles other than Venue Staff and Event Coordinators, logging the denial', async () => {
  denied.length = 0;
  await assert.rejects(getVenueCalendar(denyQuery, attendee, 'venue-1', '2026-11-10', '2026-11-13'),
    (error: AccessError) => error.status === 403);
  assert.deepEqual(denied, ['venue_calendar']);
});

test('getVenueCalendar returns 404 for an unknown venue', async () => {
  await assert.rejects(getVenueCalendar(calendarQuery({ venue: undefined }), coordinator, 'missing', '2026-11-10', '2026-11-13'),
    (error: AccessError) => error.status === 404);
});

test('parseCalendarRange lists every Singapore day in an inclusive range', () => {
  const range = parseCalendarRange('2026-11-30', '2026-12-02');
  assert.deepEqual(range.days, ['2026-11-30', '2026-12-01', '2026-12-02']);
  assert.equal(new Date(range.start).toISOString(), '2026-11-29T16:00:00.000Z');
  assert.equal(new Date(range.end).toISOString(), '2026-12-02T16:00:00.000Z');
});

test('parseCalendarRange rejects missing, malformed, impossible, reversed and oversized ranges', () => {
  const rejects = (from: unknown, to: unknown, message: RegExp) =>
    assert.throws(() => parseCalendarRange(from, to), (error: AccessError) => error.status === 400 && message.test(error.message));
  rejects(null, '2026-11-13', /from must be a date/);
  rejects('2026-11-10', undefined, /to must be a date/);
  rejects('10/11/2026', '2026-11-13', /from must be a date/);
  rejects('2026-02-31', '2026-03-01', /from is not a real calendar date/);
  rejects('2026-11-13', '2026-11-10', /on or after/);
  rejects('2026-01-01', '2026-12-31', new RegExp(`at most ${MAX_CALENDAR_DAYS} days`));
  assert.equal(parseCalendarRange('2026-11-10', '2026-11-10').days.length, 1);
});

test('TC_E05S03_01 / TC_E05S03_03: each period carries a distinct Free, Tentative, Confirmed or Blocked state', async () => {
  const calendar = await getVenueCalendar(calendarQuery(), coordinator, 'venue-1', '2026-11-10', '2026-11-13');
  assert.equal(calendar.timezone, 'Asia/Singapore');
  assert.equal(calendar.from, '2026-11-10');
  assert.equal(calendar.to, '2026-11-13');
  assert.deepEqual(calendar.entries.map(entry => [entry.state, local(entry.start), local(entry.end)]), [
    ['free', '2026-11-10T08:00', '2026-11-10T22:00'],
    ['free', '2026-11-11T08:00', '2026-11-11T09:00'],
    ['tentative', '2026-11-11T09:00', '2026-11-11T12:00'],
    ['free', '2026-11-11T12:00', '2026-11-11T22:00'],
    ['free', '2026-11-12T08:00', '2026-11-12T09:00'],
    ['confirmed', '2026-11-12T09:00', '2026-11-12T12:00'],
    ['free', '2026-11-12T12:00', '2026-11-12T22:00'],
    ['blocked', '2026-11-13T00:00', '2026-11-14T00:00'],
  ]);
  const block = calendar.entries.find(entry => entry.state === 'blocked')!;
  assert.equal(block.kind, 'block');
  assert.equal(block.reason, 'Maintenance');
  assert.equal(block.event, undefined);
  assert.ok(calendar.entries.filter(entry => entry.state !== 'blocked' && entry.state !== 'free').every(entry => entry.kind === 'booking'));
});

test('TC_E05S03_05: the assigned Coordinator sees the event name, code, date and time', async () => {
  const calendar = await getVenueCalendar(calendarQuery(), coordinator, 'venue-1', '2026-11-12', '2026-11-12');
  const confirmed = calendar.entries.find(entry => entry.state === 'confirmed')!;
  assert.deepEqual(confirmed.event, { id: 'event-Annual Tech Summit', code: 'EVT-Annual Tech Summit', title: 'Annual Tech Summit' });
  assert.equal(local(confirmed.start), '2026-11-12T09:00');
  assert.equal(local(confirmed.end), '2026-11-12T12:00');
});

test('TC_E05S03_02: another Coordinator sees the period as Unavailable with no event information', async () => {
  const calendar = await getVenueCalendar(calendarQuery(), otherCoordinator, 'venue-1', '2026-11-11', '2026-11-12');
  const booked = calendar.entries.filter(entry => entry.kind === 'booking');
  assert.equal(booked.length, 2);
  for (const entry of booked) {
    assert.deepEqual(Object.keys(entry).sort(), ['end', 'kind', 'start', 'state']);
    assert.equal(entry.state, 'unavailable');
  }
  const serialised = JSON.stringify(calendar);
  assert.ok(!serialised.includes('Annual Tech Summit') && !serialised.includes('EVT-') && !serialised.includes('event-'));
});

test('an unassigned event is Unavailable to every Coordinator but visible to Venue Staff', async () => {
  const unassigned = [booking('confirmed', '2026-11-12T09:00', '2026-11-12T12:00', 'Unassigned', null)];
  const forCoordinator = await getVenueCalendar(calendarQuery({ bookings: unassigned, blocks: [] }), coordinator, 'venue-1', '2026-11-12', '2026-11-12');
  assert.equal(forCoordinator.entries.find(entry => entry.kind === 'booking')!.state, 'unavailable');
  const forStaff = await getVenueCalendar(calendarQuery({ bookings: unassigned, blocks: [] }), venueStaff, 'venue-1', '2026-11-12', '2026-11-12');
  const staffEntry = forStaff.entries.find(entry => entry.kind === 'booking')!;
  assert.equal(staffEntry.state, 'confirmed');
  assert.equal(staffEntry.event?.title, 'Unassigned');
});

test('Free periods skip overlapping bookings and blocks and stay within opening hours', async () => {
  const calendar = await getVenueCalendar(calendarQuery({
    bookings: [
      booking('confirmed', '2026-11-10T07:00', '2026-11-10T10:00', 'Early', 'coord-1'),
      booking('pending', '2026-11-10T20:00', '2026-11-10T23:30', 'Late', 'coord-1'),
    ],
    blocks: [{ reason: 'Overlap', starts_at: sgt('2026-11-10T09:00'), ends_at: sgt('2026-11-10T13:00') }],
  }), coordinator, 'venue-1', '2026-11-10', '2026-11-10');
  const free = calendar.entries.filter(entry => entry.state === 'free').map(entry => [local(entry.start), local(entry.end)]);
  assert.deepEqual(free, [['2026-11-10T13:00', '2026-11-10T20:00']]);
});

test('a retired venue shows its bookings and blocks but no Free period', async () => {
  const calendar = await getVenueCalendar(calendarQuery({ venue: { ...venueRow, is_active: false } }), coordinator, 'venue-1', '2026-11-10', '2026-11-13');
  assert.equal(calendar.venue.is_active, false);
  assert.deepEqual(calendar.entries.map(entry => entry.state), ['tentative', 'confirmed', 'blocked']);
});

test('a day fully covered by a block has no Free period', async () => {
  const calendar = await getVenueCalendar(calendarQuery({ bookings: [], blocks }), coordinator, 'venue-1', '2026-11-13', '2026-11-13');
  assert.deepEqual(calendar.entries.map(entry => entry.state), ['blocked']);
});

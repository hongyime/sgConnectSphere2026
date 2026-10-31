// Unit tests for the E10-S02 (SCRUM-71) arrangement impact check. The check
// is a pure comparison of two snapshots, so each case builds the before and
// after state directly; the loader is checked against a recorded query double.
// The real-database behaviour (Session sync trigger, flags written on save)
// is covered by the integration suite, not here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessArrangementImpact, governingHeadcount, loadArrangementSnapshot,
  type ArrangementSnapshot, type BookingState, type SessionState, type SupportState,
} from '../src/modules/changeManagement/arrangementImpact.js';

const sessionA: SessionState = { id: 'session-a', startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T03:00:00.000Z', expectedAttendance: 80 };
const sessionB: SessionState = { id: 'session-b', startsAt: '2027-03-12T05:00:00.000Z', endsAt: '2027-03-12T07:00:00.000Z', expectedAttendance: 100 };
const bookingA: BookingState = { id: 'booking-a', sessionId: 'session-a', venueId: 'venue-a', venueName: 'Small Room', headcount: null, capacity: 80 };
const bookingB: BookingState = { id: 'booking-b', sessionId: 'session-b', venueId: 'venue-b', venueName: 'Main Hall', headcount: null, capacity: 120 };
// T-103: staffed support requests keep their own window. A starts an hour
// before Session A (setup); B covers Session B and runs past it.
const supportA: SupportState = { id: 'support-a', description: 'Sound desk', startsAt: '2027-03-12T00:00:00.000Z', endsAt: '2027-03-12T03:00:00.000Z' };
const supportB: SupportState = { id: 'support-b', description: 'Lighting', startsAt: '2027-03-12T06:00:00.000Z', endsAt: '2027-03-12T09:00:00.000Z' };

function snapshot(overrides: Partial<ArrangementSnapshot> = {}): ArrangementSnapshot {
  return {
    event: { startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T07:00:00.000Z' },
    sessions: [sessionA, sessionB],
    bookings: [bookingA, bookingB],
    reservations: [
      { id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector' },
      { id: 'reservation-b', sessionId: 'session-b', equipmentId: 'microphone', equipmentName: 'Microphone' },
    ],
    supports: [supportA, supportB],
    ...overrides,
  };
}

const ids = (items: { id: string }[]) => items.map(item => item.id);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test('TC_E10S02_02/_09: an unchanged snapshot (description-only edit) flags nothing', () => {
  const impact = assessArrangementImpact(snapshot(), snapshot());
  assert.deepEqual(impact, { affected: false, bookings: [], reservations: [], supports: [] });
});

test('TC_E10S02_01: Session attendance above capacity flags only that Session booking', () => {
  const after = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 81 }, sessionB] });
  const impact = assessArrangementImpact(snapshot(), after);
  assert.equal(impact.affected, true);
  assert.deepEqual(impact.bookings, [{
    id: 'booking-a', sessionId: 'session-a', venueId: 'venue-a', venueName: 'Small Room',
    reasons: ['capacity'], governingHeadcount: 81, capacity: 80,
  }]);
  assert.deepEqual(impact.reservations, [], 'an attendance change does not touch equipment');
});

test('attendance raised to exactly the capacity is still sufficient (boundary)', () => {
  const before = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 70 }, sessionB] });
  const impact = assessArrangementImpact(before, snapshot());
  assert.equal(impact.affected, false);
});

test('attendance lowered but still above capacity stays flagged; lowered within capacity does not', () => {
  const before = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 90 }, sessionB] });
  const after = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 85 }, sessionB] });
  // Still above 80, so it is flagged: the booking cannot hold the new figure.
  assert.deepEqual(ids(assessArrangementImpact(before, after).bookings), ['booking-a']);
  const within = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 60 }, sessionB] });
  assert.equal(assessArrangementImpact(before, within).affected, false);
});

test('TC_E10S02_07: a booking headcount override governs over the Session attendance', () => {
  const before = snapshot({
    sessions: [{ ...sessionA, expectedAttendance: 50 }, { ...sessionB, expectedAttendance: 70 }],
    bookings: [{ ...bookingA, headcount: 60 }, { ...bookingB, capacity: 80 }],
  });
  const after = snapshot({
    sessions: [{ ...sessionA, expectedAttendance: 100 }, { ...sessionB, expectedAttendance: 81 }],
    bookings: [{ ...bookingA, headcount: 60 }, { ...bookingB, capacity: 80 }],
  });
  const impact = assessArrangementImpact(before, after);
  assert.deepEqual(ids(impact.bookings), ['booking-b'], 'Session A keeps its 60-person override, below 80');
  assert.deepEqual(impact.bookings[0]!.reasons, ['capacity']);
  assert.equal(impact.bookings[0]!.governingHeadcount, 81);
});

test('Scenario 1: an attendance change flags a booking whose own headcount is already above capacity', () => {
  const before = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 50 }, sessionB], bookings: [{ ...bookingA, headcount: 90 }] });
  const after = snapshot({ sessions: [{ ...sessionA, expectedAttendance: 60 }, sessionB], bookings: [{ ...bookingA, headcount: 90 }] });
  const impact = assessArrangementImpact(before, after);
  assert.deepEqual(impact.bookings.map(booking => [booking.id, booking.reasons, booking.governingHeadcount]), [['booking-a', ['capacity'], 90]],
    'its governing headcount of 90 exceeds the 80 capacity, so the change asks staff to re-check it');
  assert.equal(assessArrangementImpact(after, after).affected, false, 'no attendance change, no flag');
});

test('TC_E10S02_05: a Session date change flags only that Session booking and equipment', () => {
  const after = snapshot({ sessions: [{ ...sessionA, startsAt: '2027-03-13T01:00:00.000Z', endsAt: '2027-03-13T03:00:00.000Z' }, sessionB] });
  const impact = assessArrangementImpact(snapshot(), after);
  assert.deepEqual(ids(impact.bookings), ['booking-a']);
  assert.deepEqual(impact.bookings[0]!.reasons, ['time']);
  assert.deepEqual(impact.reservations, [{ id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector', reasons: ['time'] }]);
  assert.deepEqual(impact.supports, [{ ...supportA, reasons: ['time'], shiftMs: DAY }],
    'support overlapping the previous Session time moves as far as the Session; Session B support untouched');
});

test('TC_E10S02_10: a Session change does not flag support that does not overlap it', () => {
  const before = snapshot({ supports: [supportB] });
  const after = snapshot({ supports: [supportB], sessions: [{ ...sessionA, startsAt: '2027-03-13T01:00:00.000Z', endsAt: '2027-03-13T03:00:00.000Z' }, sessionB] });
  const impact = assessArrangementImpact(before, after);
  assert.deepEqual(impact.supports, []);
  assert.deepEqual(ids(impact.bookings), ['booking-a'], 'the Session A arrangements are still flagged');
});

test('T-103: overlap is judged against the previous Session time, and touching ends do not overlap', () => {
  // Session A moves onto support B's window: B overlaps only the new time.
  const intoB = snapshot({ sessions: [{ ...sessionA, startsAt: '2027-03-12T06:00:00.000Z', endsAt: '2027-03-12T08:00:00.000Z' }, sessionB] });
  assert.deepEqual(ids(assessArrangementImpact(snapshot(), intoB).supports), ['support-a']);
  // Support ending exactly when Session B starts, and one starting exactly when it ends.
  const touching = [{ ...supportA, id: 'ends-at-start', endsAt: sessionB.startsAt }, { ...supportB, id: 'starts-at-end', startsAt: sessionB.endsAt }];
  const movedB = { ...sessionB, startsAt: '2027-03-13T05:00:00.000Z', endsAt: '2027-03-13T07:00:00.000Z' };
  const impact = assessArrangementImpact(snapshot({ supports: touching }), snapshot({ supports: touching, sessions: [sessionA, movedB] }));
  assert.deepEqual(impact.supports, []);
});

test('T-103: a flagged support request alone marks the change as affecting arrangements', () => {
  const only = { sessions: [sessionA], bookings: [], reservations: [], supports: [supportA] };
  const after = snapshot({ ...only, sessions: [{ ...sessionA, endsAt: '2027-03-12T04:00:00.000Z' }] });
  const impact = assessArrangementImpact(snapshot(only), after);
  assert.equal(impact.affected, true);
  assert.deepEqual(ids(impact.supports), ['support-a']);
});

test('a snapshot without support requests flags none', () => {
  const after = snapshot({ supports: undefined, event: { startsAt: '2027-03-19T01:00:00.000Z', endsAt: '2027-03-19T07:00:00.000Z' } });
  assert.deepEqual(assessArrangementImpact(snapshot({ supports: undefined }), after).supports, []);
});

test('a Session end-time-only change also counts as a time change', () => {
  const after = snapshot({ sessions: [sessionA, { ...sessionB, endsAt: '2027-03-12T08:00:00.000Z' }] });
  const impact = assessArrangementImpact(snapshot(), after);
  assert.deepEqual(ids(impact.bookings), ['booking-b']);
  assert.deepEqual(ids(impact.reservations), ['reservation-b']);
});

test('TC_E10S02_08: an Event-wide date change flags every Session arrangement', () => {
  const after = snapshot({ event: { startsAt: '2027-03-19T01:00:00.000Z', endsAt: '2027-03-19T07:00:00.000Z' } });
  const impact = assessArrangementImpact(snapshot(), after);
  assert.deepEqual(ids(impact.bookings), ['booking-a', 'booking-b']);
  assert.deepEqual(ids(impact.reservations), ['reservation-a', 'reservation-b']);
  assert.deepEqual(impact.supports.map(support => [support.id, support.reasons, support.shiftMs]), [['support-a', ['time'], 7 * DAY], ['support-b', ['time'], 7 * DAY]]);
});

test('T-103: an Event-wide change moves support as far as the Event start, even when only the end moved', () => {
  const earlier = snapshot({ event: { startsAt: '2027-03-11T22:30:00.000Z', endsAt: '2027-03-12T07:00:00.000Z' } });
  assert.deepEqual(assessArrangementImpact(snapshot(), earlier).supports.map(support => support.shiftMs), [-2.5 * HOUR, -2.5 * HOUR]);
  const longer = snapshot({ event: { startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T09:00:00.000Z' } });
  assert.deepEqual(assessArrangementImpact(snapshot(), longer).supports.map(support => support.shiftMs), [0, 0], 'flagged, but its time stays');
});

test('T-103: support overlapping several moved Sessions moves as far as the earliest of them', () => {
  const wide: SupportState = { id: 'support-wide', description: 'Whole day', startsAt: '2027-03-12T00:00:00.000Z', endsAt: '2027-03-12T09:00:00.000Z' };
  const after = snapshot({ supports: [wide], sessions: [
    { ...sessionA, startsAt: '2027-03-12T03:00:00.000Z', endsAt: '2027-03-12T05:00:00.000Z' },
    { ...sessionB, startsAt: '2027-03-13T05:00:00.000Z', endsAt: '2027-03-13T07:00:00.000Z' },
  ] });
  assert.deepEqual(assessArrangementImpact(snapshot({ supports: [wide] }), after).supports.map(support => support.shiftMs), [2 * HOUR], 'Session A, not B');
});

test('an Event end-only change is still an Event-wide time change', () => {
  const after = snapshot({ event: { startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T09:00:00.000Z' } });
  assert.equal(assessArrangementImpact(snapshot(), after).bookings.length, 2);
});

test('a single-session move with too many people lists both reasons once', () => {
  const after = snapshot({ sessions: [{ ...sessionA, startsAt: '2027-03-13T01:00:00.000Z', expectedAttendance: 95 }, sessionB] });
  const impact = assessArrangementImpact(snapshot(), after);
  assert.deepEqual(impact.bookings.map(booking => booking.reasons), [['time', 'capacity']]);
});

test('arrangements without a known Session move only with the Event', () => {
  const orphan: BookingState = { ...bookingA, id: 'booking-orphan', sessionId: null };
  const orphanReservation = { id: 'reservation-orphan', sessionId: null, equipmentId: 'screen', equipmentName: 'Screen' };
  const before = snapshot({ bookings: [orphan], reservations: [orphanReservation], supports: [] });
  const sessionMoved = snapshot({
    sessions: [{ ...sessionA, startsAt: '2027-03-13T01:00:00.000Z', expectedAttendance: 200 }, sessionB],
    bookings: [orphan], reservations: [orphanReservation], supports: [],
  });
  assert.equal(assessArrangementImpact(before, sessionMoved).affected, false);
  const eventMoved = snapshot({ event: { startsAt: '2027-03-19T01:00:00.000Z', endsAt: '2027-03-19T07:00:00.000Z' }, bookings: [orphan], reservations: [orphanReservation] });
  const impact = assessArrangementImpact(before, eventMoved);
  assert.deepEqual(impact.bookings.map(booking => [booking.id, booking.governingHeadcount]), [['booking-orphan', null]]);
  assert.deepEqual(ids(impact.reservations), ['reservation-orphan']);
});

test('a Session missing from either snapshot is neither moved nor resized', () => {
  const removed = snapshot({ sessions: [sessionB] });
  assert.equal(assessArrangementImpact(snapshot(), removed).affected, false, 'removing a Session is E04-S02 Scenario 5, not this check');
  const added = snapshot({ sessions: [sessionB] });
  assert.equal(assessArrangementImpact(added, snapshot({ sessions: [{ ...sessionA, expectedAttendance: 500 }, sessionB] })).affected, false);
});

test('governingHeadcount: override, then Session attendance, then unknown', () => {
  assert.equal(governingHeadcount({ ...bookingA, headcount: 40 }, sessionA), 40);
  assert.equal(governingHeadcount(bookingA, sessionA), 80);
  assert.equal(governingHeadcount(bookingA, undefined), null);
});

type Recorded = { sql: string; values?: unknown[] };
function recordingQuery(results: Record<string, unknown>[][]) {
  const calls: Recorded[] = [];
  const query = async <T,>(sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    return { rows: (results.shift() ?? []) as T[] };
  };
  return { calls, query };
}

test('loadArrangementSnapshot reads live arrangements and converts dates to ISO strings', async () => {
  const { calls, query } = recordingQuery([
    [{ starts_at: new Date('2027-03-12T01:00:00Z'), ends_at: new Date('2027-03-12T07:00:00Z') }],
    [{ id: 'session-a', starts_at: new Date('2027-03-12T01:00:00Z'), ends_at: '2027-03-12T03:00:00Z', expected_attendance: 80 }],
    [{ id: 'booking-a', session_id: 'session-a', venue_id: 'venue-a', venue_name: 'Small Room', headcount: null, capacity: 80 }],
    [{ id: 'reservation-a', session_id: 'session-a', equipment_id: 'projector', equipment_name: 'Projector' }],
    [{ id: 'support-a', description: 'Sound desk', starts_at: new Date('2027-03-12T00:00:00Z'), ends_at: new Date('2027-03-12T03:00:00Z') }],
  ]);
  const result = await loadArrangementSnapshot(query, 'event-1');
  assert.deepEqual(result, {
    event: { startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T07:00:00.000Z', layoutId: null, accessibilityFeatureIds: [] },
    sessions: [{ id: 'session-a', startsAt: '2027-03-12T01:00:00.000Z', endsAt: '2027-03-12T03:00:00.000Z', expectedAttendance: 80 }],
    bookings: [{ id: 'booking-a', sessionId: 'session-a', venueId: 'venue-a', venueName: 'Small Room', headcount: null, capacity: 80 }],
    reservations: [{ id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector' }],
    supports: [{ id: 'support-a', description: 'Sound desk', startsAt: '2027-03-12T00:00:00.000Z', endsAt: '2027-03-12T03:00:00.000Z' }],
  });
  assert.equal(calls.length, 5);
  assert.ok(calls.every(call => call.values?.[0] === 'event-1'));
  assert.match(calls[2]!.sql, /b\.status = 'confirmed'/, 'only Confirmed bookings can need reconfirmation');
  assert.match(calls[2]!.sql, /COALESCE\(l\.capacity, v\.max_capacity\)/, 'layout capacity first, venue maximum otherwise');
  assert.match(calls[3]!.sql, /r\.status IN \('reserved', 'partial'\)/, 'only live reservations');
  assert.match(calls[4]!.sql, /status = 'staffed'/, 'only staffed support requests (T-103)');
});

test('loadArrangementSnapshot refuses an unknown Event', async () => {
  const { query } = recordingQuery([[]]);
  await assert.rejects(loadArrangementSnapshot(query, 'missing'), /Event missing not found/);
});


test('TC_E10S01_04: Event layout/accessibility changes flag venues only and include changed layout capacity', () => {
  const before = snapshot();
  const after = snapshot({ event: { ...before.event, layoutId: 'layout-new', accessibilityFeatureIds: ['step-free'] },
    bookings: [{ ...bookingA, capacity: 50 }, bookingB] });
  const impact = assessArrangementImpact(before, after);
  assert.deepEqual(impact.bookings.map(b => b.reasons), [['layout', 'accessibility', 'capacity'], ['layout', 'accessibility']]);
  assert.deepEqual(impact.reservations, [], 'requirement changes do not move equipment reservations');
  assert.deepEqual(impact.supports, [], 'nor support requests');
  assert.equal(assessArrangementImpact(after, after).affected, false);
  const cleared = snapshot({ event: { ...after.event, layoutId: null, accessibilityFeatureIds: [] } });
  assert.deepEqual(assessArrangementImpact(after, cleared).bookings[0].reasons, ['layout', 'accessibility']);
});

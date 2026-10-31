// SCRUM-60 (E08-S03) unit tests: the readiness rules on plain rows, the
// status rules around Safety Review, and the refusals decided before any
// event is read. The rules that depend on stored data are proven against
// PostgreSQL in eventReadiness.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { DEACTIVATION_BLOCKING_STATUSES } from '../src/modules/accessControl/deactivation.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import {
  ACTIVE_EVENT_STATUSES, allowedNextStatuses, EVENT_STATUSES, validateEventStatusTransition,
} from '../src/modules/eventLifecycle/status.js';
import { withArrangements } from '../src/modules/eventReadiness/arrangements.js';
import {
  assessReadiness, type ReadinessBookingRow, type ReadinessEquipmentRow, type ReadinessEventRow, type ReadinessSupportRow,
} from '../src/modules/eventReadiness/readiness.js';
import {
  confirmEvent, getEventReadiness, READINESS_MESSAGES, submitForSafetyReview,
} from '../src/modules/eventReadiness/submission.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';

const START = new Date('2027-01-15T01:00:00Z');
const END = new Date('2027-01-15T09:00:00Z');
const event = (overrides: Partial<ReadinessEventRow> = {}): ReadinessEventRow => ({
  id: 'e-1', event_code: 'EVT-1', title: 'Gala', status: 'planning', starts_at: START, ends_at: END,
  equipment_requirements: 'none_required', ...overrides,
});
const booking = (overrides: Partial<ReadinessBookingRow> = {}): ReadinessBookingRow => ({
  id: 'b-1', venue_name: 'Orchid Hall', status: 'confirmed', purpose: 'Main programme', starts_at: START, ends_at: END,
  buffer_conflict: false, requires_reconfirmation: false, live_hold: false, ...overrides,
});
const line = (overrides: Partial<ReadinessEquipmentRow> = {}): ReadinessEquipmentRow => ({
  id: 'r-1', name: 'Projector', requested: 3, reservation_status: 'reserved', reserved: 3, requires_reconfirmation: false,
  ...overrides,
});
const support = (overrides: Partial<ReadinessSupportRow> = {}): ReadinessSupportRow => ({
  id: 's-1', support_required: true, description: 'Sound desk', starts_at: START, ends_at: END, status: 'staffed',
  requires_reconfirmation: false, ...overrides,
});
const messages = (snapshot: ReturnType<typeof assessReadiness>) => snapshot.blockers.map(row => row.message);

test('TC_E08S03_08: an event with a Confirmed booking, full reservations and staffed support is ready to submit', () => {
  const snapshot = assessReadiness(event({ equipment_requirements: 'Projector' }), [booking()], [line()], [support()]);
  assert.deepEqual(snapshot.blockers, []);
  assert.equal(snapshot.canSubmit, true);
  assert.equal(snapshot.equipmentNoneRequired, false);
  assert.equal(snapshot.supportNoneRequired, false);
  assert.deepEqual(snapshot.venueBookings, [{
    id: 'b-1', venueName: 'Orchid Hall', status: 'confirmed', purpose: 'Main programme',
    startsAt: START.toISOString(), endsAt: END.toISOString(), state: 'ready',
  }]);
  assert.deepEqual(snapshot.equipment, [{ id: 'r-1', name: 'Projector', requested: 3, reserved: 3, state: 'ready' }]);
});

test('SCRUM-60 D58: a ready event that is not in Planning can be read but not submitted', () => {
  for (const status of ['approved', 'safety_review', 'confirmed']) {
    const snapshot = assessReadiness(event({ status }), [booking()], [], []);
    assert.deepEqual([snapshot.blockers.length, snapshot.canSubmit], [0, false], status);
  }
});

test('TC_E08S03_09: each kind of outstanding booking is listed by venue; withdrawn ones are ignored', () => {
  const snapshot = assessReadiness(event(), [
    booking({ id: 'p', venue_name: 'A', status: 'pending' }),
    booking({ id: 'pb', venue_name: 'B', status: 'pending', buffer_conflict: true }),
    booking({ id: 'c', venue_name: 'C', status: 'conflicting' }),
    booking({ id: 'h', venue_name: 'D', status: 'tentative', live_hold: true }),
    booking({ id: 'x', venue_name: 'E', status: 'tentative', live_hold: false }),
    booking({ id: 'r', venue_name: 'F', status: 'rejected' }),
    booking({ id: 'l', venue_name: 'G', status: 'released' }),
    booking({ id: 'e', venue_name: 'H', status: 'expired' }),
  ], [], []);
  assert.deepEqual(messages(snapshot), [
    'No venue booking is Confirmed yet.',
    'A — Pending',
    'B — Conflicting (setup or turnaround overlap)',
    'C — Conflicting',
    'D — tentative hold; request it or let it go',
  ]);
  assert.deepEqual(snapshot.venueBookings.map(row => row.state),
    ['outstanding', 'outstanding', 'outstanding', 'outstanding', 'withdrawn', 'withdrawn', 'withdrawn', 'withdrawn']);
  assert.equal(snapshot.canSubmit, false);
});

test('TC_E08S03_09: an event with no bookings at all is blocked for want of a Confirmed venue', () => {
  assert.deepEqual(messages(assessReadiness(event(), [], [], [])), ['No venue booking is Confirmed yet.']);
});

test('TC_E08S03_03: a reservation short of the requested quantity shows the outstanding amount, whatever its stored status', () => {
  const snapshot = assessReadiness(event(), [booking()], [
    line({ id: 'a', name: 'Projector', requested: 3, reservation_status: 'partial', reserved: 2 }),
    line({ id: 'b', name: 'Speaker', requested: 4, reservation_status: 'reserved', reserved: 1 }),
    line({ id: 'c', name: 'Screen', requested: 1, reservation_status: 'reserved', reserved: null }),
  ], []);
  assert.deepEqual(messages(snapshot), [
    'Projector — 2 of 3 reserved; 1 outstanding',
    'Speaker — 1 of 4 reserved; 3 outstanding',
    'Screen — 0 of 1 reserved; 1 outstanding',
  ]);
});

test('TC_E07S04_07: a missing, released or flagged reservation blocks; a flag outranks a shortfall', () => {
  const snapshot = assessReadiness(event(), [booking()], [
    line({ id: 'a', name: 'Lectern', requested: 1, reservation_status: null, reserved: null, requires_reconfirmation: null }),
    line({ id: 'b', name: 'Screen', requested: 2, reservation_status: 'released', reserved: 2 }),
    line({ id: 'c', name: 'Speaker', requested: 5, reservation_status: 'partial', reserved: 3, requires_reconfirmation: true }),
  ], []);
  assert.deepEqual(messages(snapshot), [
    'Lectern — not reserved; 1 outstanding',
    'Screen — reservation released; 2 outstanding',
    'Speaker — needs review: stock changed (3 of 5 reserved)',
  ]);
  assert.deepEqual(snapshot.equipment.map(row => [row.reserved, row.state]), [[0, 'outstanding'], [0, 'outstanding'], [3, 'outstanding']]);
});

test('TC_E08S03_10: none required with no request lines passes the equipment check', () => {
  const snapshot = assessReadiness(event(), [booking()], [], []);
  assert.deepEqual([snapshot.equipmentNoneRequired, snapshot.canSubmit], [true, true]);
});

test('TC_E08S03_04: only an open required support request blocks; text is tidied and long text is cut', () => {
  const long = 'x'.repeat(81);
  const snapshot = assessReadiness(event(), [booking()], [], [
    support({ id: 'a', status: 'open', description: '  Two   sound\ntechnicians ' }),
    support({ id: 'b', status: 'open', description: 'y'.repeat(80) }),
    support({ id: 'c', status: 'open', description: long }),
    support({ id: 'd', status: 'staffed' }),
    support({ id: 'e', status: 'open', support_required: false }),
  ]);
  assert.deepEqual(messages(snapshot), [
    'Technical support — no staff assigned yet: Two sound technicians',
    `Technical support — no staff assigned yet: ${'y'.repeat(80)}`,
    `Technical support — no staff assigned yet: ${'x'.repeat(79)}…`,
  ]);
  assert.equal(snapshot.support.length, 4, 'the not-required row is a decision, not a request');
  assert.equal(snapshot.supportNoneRequired, false);
  assert.equal(assessReadiness(event(), [booking()], [], [support({ support_required: false })]).supportNoneRequired, true);
  assert.equal(assessReadiness(event(), [booking()], [], []).supportNoneRequired, false, 'nothing recorded is not "none needed"');
});

test('TC_E10S02_11: a staffed support request flagged by a date change is outstanding until reconfirmed (T-103)', () => {
  const flagged = assessReadiness(event(), [booking()], [], [support({ id: 'f', requires_reconfirmation: true, description: '  Sound\ndesk ' })]);
  assert.deepEqual(flagged.blockers, [{ kind: 'support-needs-review', supportRequestId: 'f', description: '  Sound\ndesk ',
    message: 'Technical support — needs reconfirmation at the new time: Sound desk' }]);
  assert.equal(flagged.support[0]!.state, 'outstanding');
  assert.equal(flagged.canSubmit, false);
  const cleared = assessReadiness(event(), [booking()], [], [support({ id: 'f' })]);
  assert.deepEqual(cleared.blockers, []);
  assert.equal(cleared.support[0]!.state, 'ready');
  // An open request is already outstanding; it is listed once, as unassigned.
  const open = assessReadiness(event(), [booking()], [], [support({ status: 'open', requires_reconfirmation: true })]);
  assert.deepEqual(open.blockers.map(row => row.kind), ['support-unassigned']);
});

test('TC_E08S03_09: Planning goes to Safety Review, never straight to Confirmed; Safety Review exits to Confirmed, Planning or Cancelled', () => {
  assert.ok(EVENT_STATUSES.indexOf('safety_review') === EVENT_STATUSES.indexOf('planning') + 1);
  assert.deepEqual(allowedNextStatuses('planning'), ['safety_review', 'cancelled']);
  assert.deepEqual(allowedNextStatuses('safety_review'), ['confirmed', 'planning', 'cancelled']);
  assert.deepEqual(validateEventStatusTransition('planning', 'confirmed'),
    { allowed: false, from: 'planning', to: 'confirmed', reason: 'illegal_transition' });
  assert.equal(validateEventStatusTransition('approved', 'safety_review').allowed, false);
  assert.equal(validateEventStatusTransition('confirmed', 'planning').allowed, true, 'E08-S04 keeps its reversion');
});

test('SCRUM-60 D64: Safety Review counts as an active event for workload and deactivation (T-52)', () => {
  assert.ok((ACTIVE_EVENT_STATUSES as readonly string[]).includes('safety_review'));
  assert.deepEqual([...ACTIVE_EVENT_STATUSES], [...DEACTIVATION_BLOCKING_STATUSES]);
});

// Records every statement; any attempt to open a transaction fails the test.
function recordingPool(rowCount = 0) {
  const calls: string[] = [];
  const pool = {
    async query(sql: string) { calls.push(sql); return { rows: [], rowCount }; },
    async connect() { throw new Error('no transaction should be opened'); },
  } as unknown as Pool;
  return { pool, calls };
}
const person = (role: AuthenticatedUser['role']): AuthenticatedUser => ({
  id: '00000000-0000-4000-8000-0000000000aa', email: 'person@example.test', role, isActive: true, failedLoginCount: 0,
  clientOrgId: role === 'event_organiser' ? '00000000-0000-4000-8000-0000000000bb' : undefined,
});
function refusedWith(status: number, message: string) {
  return (error: unknown) => {
    assert.ok(error instanceof AccessError);
    assert.deepEqual([error.status, error.message], [status, message]);
    return true;
  };
}

test('SCRUM-60: a wrong-role submission is refused and audited without opening a transaction; signed-out and blank calls record nothing', async () => {
  const db = recordingPool();
  await assert.rejects(submitForSafetyReview(db.pool, person('event_organiser'), 'EVT-1'), refusedWith(403, READINESS_MESSAGES.submitNotAssigned));
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0]!, /'Access Denied'/);
  await assert.rejects(submitForSafetyReview(db.pool, undefined, 'EVT-1'), refusedWith(401, 'Sign in to continue.'));
  await assert.rejects(submitForSafetyReview(db.pool, person('event_coordinator'), ''), refusedWith(400, 'An event id or code is required.'));
  await assert.rejects(submitForSafetyReview(db.pool, person('event_coordinator'), 'x'.repeat(241)), refusedWith(400, 'An event id or code is required.'));
  await assert.rejects(getEventReadiness(db.pool, person('technical_support_staff'), 'EVT-1'), refusedWith(403, READINESS_MESSAGES.readNotAssigned));
  assert.equal(db.calls.length, 2, 'only the two wrong-role calls are audited');
});

test('TC_E08S03_09: a confirm by a Coordinator Lead is logged on the event; by an Attendee it is an access denial; a Safety Officer is never refused for role', async () => {
  const logged = recordingPool(1);
  await assert.rejects(confirmEvent(logged.pool, person('event_coordinator_lead'), 'EVT-1'), refusedWith(403, READINESS_MESSAGES.onlySafetyOfficer));
  assert.equal(logged.calls.length, 1);
  assert.match(logged.calls[0]!, /'Confirmation refused'/);

  const unknown = recordingPool(0);
  await assert.rejects(confirmEvent(unknown.pool, person('venue_staff'), 'EVT-404'), refusedWith(403, READINESS_MESSAGES.onlySafetyOfficer));
  assert.equal(unknown.calls.length, 2, 'no event to log against, so an access denial is recorded instead');
  assert.match(unknown.calls[1]!, /'Access Denied'/);

  const attendee = recordingPool(1);
  await assert.rejects(confirmEvent(attendee.pool, person('attendee'), 'EVT-1'), refusedWith(403, READINESS_MESSAGES.onlySafetyOfficer));
  assert.equal(attendee.calls.length, 1);
  assert.match(attendee.calls[0]!, /'Access Denied'/);

  const officer = recordingPool();
  await assert.rejects(confirmEvent(officer.pool, person('safety_officer'), 'EVT-404'), refusedWith(409, READINESS_MESSAGES.confirmNotInReview));
  assert.equal(officer.calls.length, 1);
  assert.doesNotMatch(officer.calls[0]!, /audit_logs/);
  await assert.rejects(confirmEvent(officer.pool, person('safety_officer'), ''), refusedWith(400, 'An event id or code is required.'));
});

test('TC_E08S03_05: arrangements are left out, with no query, until the event is confirmed', async () => {
  const calls: string[] = [];
  const query = async (sql: string) => { calls.push(sql); return { rows: [] }; };
  for (const status of ['planning', 'safety_review', 'cancelled', undefined]) {
    assert.deepEqual(await withArrangements(query as never, { id: 'e-1', status }), { id: 'e-1', status, arrangements: null });
  }
  assert.deepEqual(calls, []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { eventCapacity, fullSessionIds, overCapacity } from '../src/modules/attendeeRegistration/capacity.js';
import { getEventRegistrations, manageRegistrations, parseAction } from '../src/modules/attendeeRegistration/organiser.js';
import type { Query } from '../src/modules/eventVisibility/service.js';

// E09-S02 unit tests with a scripted database. Locks, counts and races on real
// PostgreSQL are in attendeeCapacity.integration.test.ts.
const organiser: AuthenticatedUser = { id: randomUUID(), email: 'olive@example.test', role: 'event_organiser', isActive: true, failedLoginCount: 0 };
const eventId = randomUUID(), sessionA = randomUUID(), sessionB = randomUUID(), requestId = randomUUID(), attendeeId = randomUUID();
const now = new Date('2027-03-01T02:00:00Z');

type State = {
  event?: Record<string, unknown> | null;
  capacity?: Record<string, unknown>[];
  eventRegistered?: number;
  pending?: Record<string, unknown>[];
  request?: Record<string, unknown> | null;
  attendee?: Record<string, unknown> | null;
  existing?: Record<string, unknown> | null;
  failAt?: string;
  failure?: Error;
};

const roomy = [{ session_id: sessionA, session_capacity: 10, registered: 2 }, { session_id: sessionB, session_capacity: 10, registered: 2 }];

function script(state: State = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const answer = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (state.failAt && sql.includes(state.failAt)) throw state.failure;
    let rows: unknown[] = [];
    if (sql.includes('FROM events WHERE id::text')) {
      rows = state.event === null ? [] : [{
        id: eventId, event_code: 'EVT-2001', title: 'Community Meetup', status: 'confirmed', waitlist_enabled: false,
        organiser_id: organiser.id, starts_at: new Date('2027-04-01T01:00:00Z'), ends_at: new Date('2027-04-01T09:00:00Z'),
        registration_enabled: true, opens_at: null, closes_at: new Date('2027-03-30T00:00:00Z'), withdrawal_deadline: null, ...state.event,
      }];
    } else if (sql.includes('AS session_capacity')) rows = state.capacity ?? roomy;
    else if (sql.includes('AS registered FROM event_registrations')) rows = [{ registered: state.eventRegistered ?? 4 }];
    else if (sql.includes('FROM sessions s')) {
      rows = [
        { id: sessionA, title: 'Morning', starts_at: new Date('2027-04-01T01:00:00Z'), ends_at: new Date('2027-04-01T04:00:00Z'), venue_name: 'Hall 1', venue_location: 'L1' },
        { id: sessionB, title: null, starts_at: new Date('2027-04-01T05:00:00Z'), ends_at: new Date('2027-04-01T09:00:00Z'), venue_name: null, venue_location: null },
      ];
    } else if (sql.includes("r.status = 'pending'")) rows = state.pending ?? [];
    else if (sql.includes('WHERE r.id = $1 AND r.event_id = $2')) {
      rows = state.request === null ? [] : [{ id: requestId, status: 'pending', attendee_id: attendeeId, session_ids: [sessionA], ...state.request }];
    } else if (sql.includes('UPDATE event_registrations SET status')) rows = [{ at: now }];
    else if (sql.includes('lower(email) = lower($1)')) rows = state.attendee === null ? [] : [state.attendee ?? { id: attendeeId }];
    else if (sql.includes('FROM event_registrations r WHERE r.event_id')) rows = state.existing ? [state.existing] : [];
    else if (sql.includes('INSERT INTO event_registrations')) rows = [{ id: randomUUID(), registered_at: now }];
    else if (sql.includes('INSERT INTO notifications')) rows = [{ id: randomUUID() }];
    else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: randomUUID() }];
    else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'a@example.test', title: 'x', message: 'Synthetic notice' }];
    return { rows, rowCount: rows.length };
  };
  const pool = { query: answer, connect: async () => ({ query: answer, release: () => undefined }) } as unknown as Pool;
  return { calls, query: answer as Query, pool };
}

test('eventCapacity sums Session capacities and counts registered places only (TC_E09S02_12)', async () => {
  const { query, calls } = script({ capacity: [{ session_id: sessionA, session_capacity: 80, registered: 3 }, { session_id: sessionB, session_capacity: 40, registered: 1 }], eventRegistered: 3 });
  assert.deepEqual(await eventCapacity(query, eventId), {
    capacity: 120, registered: 3,
    sessions: [{ sessionId: sessionA, capacity: 80, registered: 3 }, { sessionId: sessionB, capacity: 40, registered: 1 }],
  });
  assert.ok(calls[0]!.sql.includes("b.status = 'confirmed'") && calls[0]!.sql.includes('coalesce(vl.capacity, v.max_capacity)'));
  assert.ok(calls[1]!.sql.includes("status = 'registered'"));
});

test('overCapacity names each full chosen Session, then a full Event, else null', () => {
  const capacity = { capacity: 20, registered: 19, sessions: [{ sessionId: sessionA, capacity: 10, registered: 10 }, { sessionId: sessionB, capacity: 10, registered: 9 }] };
  assert.equal(overCapacity(capacity, [sessionA], new Map([[sessionA, '"Morning"']])), '"Morning" is full (10 of 10 places).');
  assert.equal(overCapacity(capacity, [sessionA]), 'A chosen Session is full (10 of 10 places).');
  assert.equal(overCapacity(capacity, [sessionB]), null);
  assert.equal(overCapacity({ ...capacity, registered: 20 }, [sessionB]), 'The event is full (20 of 20 places).');
  assert.deepEqual(fullSessionIds(capacity), [sessionA]);
});

test('getEventRegistrations shows capacity per Session and why each Pending request does not fit', async () => {
  const pending = [{ id: requestId, full_name: 'Casey Tan', email: 'casey@example.test', registered_at: now, session_ids: [sessionA] }];
  const view = await getEventRegistrations(script({ pending, capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }] }).query, organiser, 'EVT-2001');
  assert.deepEqual(view.event, { id: eventId, eventCode: 'EVT-2001', name: 'Community Meetup', status: 'confirmed', waitlistEnabled: false,
    startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z', registrationEnabled: true,
    opensAt: null, closesAt: '2027-03-30T00:00:00.000Z', withdrawalDeadline: null });
  assert.deepEqual(view.capacity, { capacity: 10, registered: 4 });
  assert.deepEqual(view.sessions.map(session => [session.id, session.capacity, session.registered]), [[sessionA, 10, 10], [sessionB, 0, 0]]);
  assert.deepEqual(view.pending, [{ id: requestId, name: 'Casey Tan', email: 'casey@example.test', requestedAt: now.toISOString(),
    sessionIds: [sessionA], overCapacity: '"Morning" is full (10 of 10 places).' }]);
});

test("getEventRegistrations is for the Event's own Organiser only", async () => {
  await assert.rejects(getEventRegistrations(script().query, { ...organiser, role: 'attendee' }, eventId), { status: 403 });
  await assert.rejects(getEventRegistrations(script({ event: null }).query, organiser, eventId), { status: 404 });
  await assert.rejects(getEventRegistrations(script({ event: { organiser_id: randomUUID() } }).query, organiser, eventId), { status: 404, message: 'Event not found.' });
  await assert.rejects(getEventRegistrations(script().query, organiser, ''), { status: 400 });
});

test('parseAction accepts approve, reject and add, and names what is wrong otherwise', () => {
  assert.deepEqual(parseAction({ action: 'approve', registrationId: requestId.toUpperCase() }), { action: 'approve', registrationId: requestId });
  assert.deepEqual(parseAction({ action: 'reject', registrationId: 'x' }), { error: 'Choose a registration request.' });
  assert.deepEqual(parseAction({ action: 'add', email: ' v@example.test ', sessionIds: [sessionA] }), { action: 'add', email: 'v@example.test', sessionIds: [sessionA] });
  assert.deepEqual(parseAction({ action: 'add', email: 'nope', sessionIds: [sessionA] }), { error: "Enter the attendee's email address." });
  assert.deepEqual(parseAction({ action: 'add', email: `${'a'.repeat(250)}@x.io`, sessionIds: [sessionA] }), { error: "Enter the attendee's email address." });
  assert.deepEqual(parseAction({ action: 'add', email: 3 }), { error: "Enter the attendee's email address." });
  assert.deepEqual(parseAction({ action: 'add', email: 'v@example.test', sessionIds: [] }), { error: 'Choose at least one Session.' });
  assert.deepEqual(parseAction({ action: 'delete' }), { error: 'Unknown action.' });
  assert.deepEqual(parseAction(null), { error: 'Unknown action.' });
});

test('manageRegistrations approves a Pending request only while both limits allow it (TC_E09S02_11)', async () => {
  const blocked = await manageRegistrations(script({ capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }] }).pool, organiser, eventId,
    { action: 'approve', registrationId: requestId });
  assert.deepEqual(blocked, { status: 409, body: { error: 'Can\'t approve yet. "Morning" is full (10 of 10 places).' } });
  const eventFull = await manageRegistrations(script({ eventRegistered: 20 }).pool, organiser, eventId, { action: 'approve', registrationId: requestId });
  assert.deepEqual(eventFull.body, { error: "Can't approve yet. The event is full (20 of 20 places)." });
  const { pool, calls } = script();
  const approved = await manageRegistrations(pool, organiser, eventId, { action: 'approve', registrationId: requestId });
  assert.equal(approved.status, 200);
  assert.deepEqual(approved.body.registration, { id: requestId, status: 'registered', sessionIds: [sessionA] });
  assert.ok(Array.isArray(approved.body.sessions) && Array.isArray(approved.body.pending));
  assert.ok(calls.some(call => call.sql.includes('FOR UPDATE') && call.sql.includes('FROM events')));
  assert.deepEqual(calls.find(call => call.sql.includes('INSERT INTO audit_logs'))!.values!.slice(4), ['Registration Approved', 'pending', 'registered']);
  const notice = calls.find(call => call.sql.includes('INSERT INTO notifications'))!;
  assert.equal(notice.values![0], attendeeId);
  assert.equal(notice.values![2], 'Registration confirmed');
  assert.ok(calls.some(call => call.sql === 'COMMIT'));
});

test('manageRegistrations rejects a Pending request without a capacity check', async () => {
  const { pool, calls } = script({ eventRegistered: 20 });
  const rejected = await manageRegistrations(pool, organiser, eventId, { action: 'reject', registrationId: requestId });
  assert.deepEqual(rejected.body.registration, { id: requestId, status: 'rejected', sessionIds: [sessionA] });
  assert.equal(calls.find(call => call.sql.includes('INSERT INTO notifications'))!.values![2], 'Registration request declined');
});

test('manageRegistrations refuses unknown, decided and unconfirmed cases', async () => {
  assert.deepEqual(await manageRegistrations(script({ request: null }).pool, organiser, eventId, { action: 'approve', registrationId: requestId }),
    { status: 404, body: { error: 'Registration request not found.' } });
  assert.deepEqual(await manageRegistrations(script({ request: { status: 'registered' } }).pool, organiser, eventId, { action: 'reject', registrationId: requestId }),
    { status: 409, body: { error: 'This request has already been decided. Refresh the list.' } });
  assert.deepEqual(await manageRegistrations(script({ event: { status: 'planning' } }).pool, organiser, eventId, { action: 'approve', registrationId: requestId }),
    { status: 409, body: { error: 'Registrations can only be managed for a Confirmed event.' } });
  const { pool, calls } = script();
  assert.deepEqual(await manageRegistrations(pool, organiser, eventId, { action: 'nope' }), { status: 400, body: { error: 'Unknown action.' } });
  assert.equal(calls.length, 0);
  await assert.rejects(manageRegistrations(pool, organiser, '', { action: 'nope' }), { status: 400 });
});

test('manageRegistrations adds an attendee manually within both limits (TC_E09S02_06)', async () => {
  const { pool, calls } = script({ eventRegistered: 19, capacity: [{ session_id: sessionA, session_capacity: 10, registered: 9 }, { session_id: sessionB, session_capacity: 10, registered: 10 }] });
  const added = await manageRegistrations(pool, organiser, 'EVT-2001', { action: 'add', email: 'V@example.test', sessionIds: [sessionA] });
  assert.equal(added.status, 201);
  assert.deepEqual(added.body.registration, { id: (added.body.registration as { id: string }).id, status: 'registered', manuallyAdded: true, sessionIds: [sessionA] });
  assert.ok(calls.find(call => call.sql.includes('INSERT INTO event_registrations'))!.sql.includes("'registered', true"));
  assert.ok(calls.some(call => call.sql.includes('lower(email)') && call.sql.includes('FOR SHARE NOWAIT')));
  assert.equal(calls.find(call => call.sql.includes('INSERT INTO audit_logs'))!.values![4], 'Attendee Added Manually');
  assert.match(String(calls.find(call => call.sql.includes('INSERT INTO notifications'))!.values![3]), /the organiser registered you/);
});

test('manageRegistrations blocks a manual addition at either limit and other refusals (TC_E09S02_07)', async () => {
  const add = { action: 'add', email: 'v@example.test', sessionIds: [sessionB] };
  const sessionFull = await manageRegistrations(script({ capacity: [{ session_id: sessionB, session_capacity: 10, registered: 10 }] }).pool, organiser, eventId, add);
  assert.deepEqual(sessionFull, { status: 409, body: { error: "Can't add them. Session 2 is full (10 of 10 places)." } });
  const { pool, calls } = script({ eventRegistered: 20 });
  assert.deepEqual((await manageRegistrations(pool, organiser, eventId, add)).body, { error: "Can't add them. The event is full (20 of 20 places)." });
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO event_registrations')), false);
  assert.deepEqual(await manageRegistrations(script().pool, organiser, eventId, { ...add, sessionIds: [randomUUID()] }),
    { status: 400, body: { error: 'Choose valid Sessions from this event.' } });
  assert.deepEqual(await manageRegistrations(script({ attendee: null }).pool, organiser, eventId, add),
    { status: 404, body: { error: 'No active attendee account uses that email.' } });
  const pending = { id: randomUUID(), status: 'pending', registered_at: now, session_ids: [sessionB] };
  assert.equal((await manageRegistrations(script({ existing: pending }).pool, organiser, eventId, add)).body.error,
    'They already have a pending request. Approve it from the list instead.');
  assert.equal((await manageRegistrations(script({ existing: { ...pending, status: 'registered' } }).pool, organiser, eventId, add)).body.error,
    'They already have a registration for this event.');
});

test('manageRegistrations maps a busy account and a lost unique race, and rethrows other failures', async () => {
  const add = { action: 'add', email: 'v@example.test', sessionIds: [sessionA] };
  await assert.rejects(manageRegistrations(script({ failAt: 'FOR SHARE NOWAIT', failure: Object.assign(new Error('lock'), { code: '55P03' }) }).pool, organiser, eventId, add),
    { status: 409, message: 'That account is being updated. Please try again.' });
  const race = await manageRegistrations(script({ failAt: 'INSERT INTO event_registrations', failure: Object.assign(new Error('dup'), { code: '23505' }) }).pool, organiser, eventId, add);
  assert.deepEqual(race, { status: 409, body: { error: 'They already have a registration for this event.' } });
  const broken = new Error('connection lost');
  const { pool, calls } = script({ failAt: 'INSERT INTO audit_logs', failure: broken });
  await assert.rejects(manageRegistrations(pool, organiser, eventId, add), broken);
  assert.ok(calls.some(call => call.sql === 'ROLLBACK'));
});

test('getEventRegistrations returns the registration period the Organiser set (E09-S03)', async () => {
  const view = await getEventRegistrations(script({ event: {
    opens_at: new Date('2027-02-01T00:00:00Z'), closes_at: null, withdrawal_deadline: new Date('2027-03-25T00:00:00Z'), registration_enabled: false,
  } }).query, organiser, 'EVT-2001');
  assert.equal(view.event.opensAt, '2027-02-01T00:00:00.000Z');
  assert.equal(view.event.closesAt, null);
  assert.equal(view.event.withdrawalDeadline, '2027-03-25T00:00:00.000Z');
  assert.equal(view.event.registrationEnabled, false);
});

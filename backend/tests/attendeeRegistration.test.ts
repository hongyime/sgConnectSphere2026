import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import {
  getRegistrationForm, listOpenEvents, missingDetails, parseSessionIds, registerForEvent, registrationState,
} from '../src/modules/attendeeRegistration/service.js';
import type { Query } from '../src/modules/eventVisibility/service.js';

// E09-S01 unit tests with a scripted database. Real PostgreSQL behaviour
// (locks, the partial unique index, composite keys) is in the integration test.
const attendee: AuthenticatedUser = { id: randomUUID(), email: 'casey@example.test', role: 'attendee', isActive: true, failedLoginCount: 0 };
const eventId = randomUUID(), sessionA = randomUUID(), sessionB = randomUUID();
const now = new Date('2027-03-01T02:00:00Z');
const at = (iso: string) => new Date(iso);

type State = {
  event?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
  existing?: Record<string, unknown> | null;
  mine?: { event_id: string; status: string }[];
  sessions?: Record<string, unknown>[];
  capacity?: Record<string, unknown>[];
  eventRegistered?: number;
  failAt?: string;
  failure?: Error;
};

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: eventId, event_code: 'EVT-9001', name: 'Community Meetup', status: 'confirmed', registration_enabled: true, waitlist_enabled: false,
    opens_at: at('2027-02-01T00:00:00Z'), closes_at: at('2027-03-30T00:00:00Z'),
    starts_at: at('2027-04-01T01:00:00Z'), ends_at: at('2027-04-01T09:00:00Z'),
    venue_name: 'Grand Auditorium', venue_location: 'Level 1', now, ...overrides,
  };
}

function sessionRows() {
  return [
    { id: sessionB, title: null, starts_at: at('2027-04-01T05:00:00Z'), ends_at: at('2027-04-01T09:00:00Z'), venue_name: null, venue_location: null },
    { id: sessionA, title: 'Morning', starts_at: at('2027-04-01T01:00:00Z'), ends_at: at('2027-04-01T04:00:00Z'), venue_name: 'Grand Auditorium', venue_location: 'Level 1' },
  ];
}

function script(state: State = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const answer = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (state.failAt && sql.includes(state.failAt)) throw state.failure;
    let rows: unknown[] = [];
    if (sql.includes('FROM events e JOIN event_publications')) {
      rows = state.event === null ? [] : [state.event ?? eventRow()];
    } else if (sql.includes('SELECT r.event_id, r.status')) rows = state.mine ?? [];
    else if (sql.includes('contact_number FROM users')) rows = state.details === null ? [] : [state.details ?? { full_name: 'Casey Tan', email: 'casey@example.test', contact_number: '+65 8123 4567' }];
    else if (sql.includes('FROM event_registrations r WHERE r.event_id')) rows = state.existing ? [state.existing] : [];
    else if (sql.includes('AS session_capacity')) rows = state.capacity ?? [
      { session_id: sessionA, session_capacity: 10, registered: 0 }, { session_id: sessionB, session_capacity: 10, registered: 0 }];
    else if (sql.includes('AS registered FROM event_registrations')) rows = [{ registered: state.eventRegistered ?? 0 }];
    else if (sql.includes('FROM sessions s')) rows = state.sessions ?? sessionRows();
    else if (sql.includes('INSERT INTO event_registrations')) rows = [{ id: randomUUID(), status: values?.[2] ?? 'registered', registered_at: now }];
    else if (sql.includes('INSERT INTO notifications')) rows = [{ id: randomUUID() }];
    else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: randomUUID() }];
    else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', dispatch_state: 'pending', recipient_email: null, email: 'casey@example.test', title: 'Registration confirmed', message: 'Synthetic notice' }];
    return { rows, rowCount: rows.length };
  };
  const query: Query = answer as Query;
  const pool = {
    query: answer,
    connect: async () => ({ query: answer, release: () => undefined }),
  } as unknown as Pool;
  return { calls, query, pool };
}

test('registrationState: both window ends are inclusive and unset ends are unbounded', () => {
  const window = { opens_at: at('2027-02-01T00:00:00Z'), closes_at: at('2027-03-01T00:00:00Z') };
  assert.equal(registrationState(window, at('2027-01-31T23:59:59Z')), 'not_yet_open');
  assert.equal(registrationState(window, at('2027-02-01T00:00:00Z')), 'open');
  assert.equal(registrationState(window, at('2027-03-01T00:00:00Z')), 'open');
  assert.equal(registrationState(window, at('2027-03-01T00:00:01Z')), 'closed');
  assert.equal(registrationState({ opens_at: null, closes_at: null }, now), 'open');
});

test('missingDetails names every blank or missing account detail (TC_E09S01_04, T-32)', () => {
  assert.deepEqual(missingDetails({ full_name: 'Casey', email: 'c@example.test', contact_number: '9' }), []);
  assert.deepEqual(missingDetails({ full_name: '  ', email: 'c@example.test', contact_number: null }), ['Name', 'Contact number']);
});

test('parseSessionIds accepts one to fifty Session ids, de-duplicates them and says why it refuses', () => {
  assert.deepEqual(parseSessionIds({ sessionIds: [sessionA, sessionA.toUpperCase(), sessionB] }), { ids: [sessionA, sessionB] });
  for (const body of [null, 'x', {}, { sessionIds: [] }, { sessionIds: 'not-an-array' }]) {
    assert.deepEqual(parseSessionIds(body), { error: 'Choose at least one Session.' });
  }
  for (const body of [{ sessionIds: ['not-a-uuid'] }, { sessionIds: [1] }, { sessionIds: Array.from({ length: 51 }, () => randomUUID()) }]) {
    assert.deepEqual(parseSessionIds(body), { error: 'Choose valid Sessions from this event.' });
  }
});

test('listOpenEvents returns public fields and the signed-in Attendee registration status only', async () => {
  const other = randomUUID();
  const { query, calls } = script({ mine: [{ event_id: eventId, status: 'registered' }, { event_id: other, status: 'pending' }] });
  const events = await listOpenEvents(query, attendee);
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0]!).sort(), ['closesAt', 'endsAt', 'eventCode', 'id', 'myRegistrationStatus', 'name',
    'opensAt', 'registrationState', 'startsAt', 'venueLocation', 'venueName']);
  assert.equal(events[0]!.myRegistrationStatus, 'registered');
  assert.equal(events[0]!.registrationState, 'open');
  assert.ok(calls[0]!.sql.includes("e.status = 'confirmed' AND e.registration_enabled"));
  const unregistered = await listOpenEvents(script().query, attendee);
  assert.equal(unregistered[0]!.myRegistrationStatus, null);
  await assert.rejects(listOpenEvents(script().query, { ...attendee, role: 'event_organiser' }), { status: 403 });
});

test('getRegistrationForm shows Sessions with their own venues, account details and any active registration', async () => {
  const form = await getRegistrationForm(script({ event: eventRow({ opens_at: null, closes_at: null }) }).query, attendee, 'EVT-9001');
  assert.equal(form.event.venueName, 'Grand Auditorium');
  assert.equal(form.event.opensAt, null);
  assert.deepEqual(form.sessions.map(session => session.id), [sessionA, sessionB]); // Sorted by start time.
  assert.equal(form.sessions[1]!.venueName, null);
  assert.deepEqual(form.details, { name: 'Casey Tan', email: 'casey@example.test', contactNumber: '+65 8123 4567' });
  assert.deepEqual(form.missingDetails, []);
  assert.equal(form.registration, null);
  const existing = { id: randomUUID(), status: 'registered', registered_at: now, session_ids: [sessionA] };
  const again = await getRegistrationForm(script({ existing, details: { full_name: 'Casey', email: 'c@example.test', contact_number: null } }).query, attendee, eventId);
  assert.deepEqual(again.registration, { id: existing.id, status: 'registered', registeredAt: now.toISOString(), sessionIds: [sessionA] });
  assert.deepEqual(again.missingDetails, ['Contact number']);
  const tie = sessionRows().map(session => ({ ...session, starts_at: now }));
  assert.equal((await getRegistrationForm(script({ sessions: tie }).query, attendee, eventId)).sessions.length, 2);
});

test('getRegistrationForm refuses unconfirmed, unknown and registration-free events (TC_E09S01_05)', async () => {
  for (const event of [eventRow({ status: 'planning' }), eventRow({ registration_enabled: false }), null]) {
    await assert.rejects(getRegistrationForm(script({ event }).query, attendee, 'EVT-9001'),
      { status: 409, message: 'Registration is only open for confirmed events that take registrations.' });
  }
  await assert.rejects(getRegistrationForm(script().query, attendee, ''), { status: 400 });
  await assert.rejects(getRegistrationForm(script().query, attendee, 'x'.repeat(241)), { status: 400 });
});

test('registerForEvent creates one registration with the selected Sessions and a confirmation (TC_E09S01_01, _07)', async () => {
  const { pool, calls } = script();
  const result = await registerForEvent(pool, attendee, 'EVT-9001', { sessionIds: [sessionA, sessionB] });
  assert.equal(result.status, 201);
  const body = result.body as { registration: { status: string; sessionIds: string[] }; sessions: { id: string }[] };
  assert.equal(body.registration.status, 'registered');
  assert.deepEqual(body.registration.sessionIds, [sessionA, sessionB]);
  assert.deepEqual(body.sessions.map(session => session.id), [sessionA, sessionB]);
  assert.ok(calls.some(call => call.sql.includes('FOR UPDATE OF e')));
  assert.ok(calls.some(call => call.sql.includes('FOR SHARE NOWAIT')));
  const links = calls.find(call => call.sql.includes('INSERT INTO event_registration_sessions'))!;
  assert.deepEqual(links.values![2], [sessionA, sessionB]);
  const notice = calls.find(call => call.sql.includes('INSERT INTO notifications'))!;
  assert.equal(notice.values![2], 'Registration confirmed');
  assert.match(String(notice.values![3]), /^Community Meetup, .*: you're registered for Morning \(.*, Grand Auditorium\); Session \(.*\)\.$/);
  assert.ok(calls.some(call => call.sql === 'COMMIT'));
});

test('registerForEvent refuses before touching the database when the body or role is wrong', async () => {
  const { pool, calls } = script();
  assert.deepEqual(await registerForEvent(pool, attendee, eventId, { sessionIds: [] }), { status: 400, body: { error: 'Choose at least one Session.' } });
  assert.deepEqual(await registerForEvent(pool, attendee, eventId, { sessionIds: ['not-a-uuid'] }), { status: 400, body: { error: 'Choose valid Sessions from this event.' } });
  assert.equal(calls.some(call => call.sql === 'BEGIN'), false);
  await assert.rejects(registerForEvent(pool, { ...attendee, role: 'event_coordinator' }, eventId, { sessionIds: [sessionA] }), { status: 403 });
  await assert.rejects(registerForEvent(pool, attendee, '', { sessionIds: [sessionA] }), { status: 400 });
});

test('registerForEvent refuses unconfirmed events and closed or not-yet-open windows (Scenario 4, E09-S03)', async () => {
  const notOffered = await registerForEvent(script({ event: eventRow({ status: 'planning' }) }).pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.deepEqual(notOffered, { status: 409, body: { error: 'Registration is only open for confirmed events that take registrations.' } });
  const early = await registerForEvent(script({ event: eventRow({ opens_at: at('2027-03-02T00:00:00Z') }) }).pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.equal(early.status, 409);
  assert.match(String(early.body.error), /^Registration opens on .*2027/);
  assert.equal(early.body.registrationState, 'not_yet_open');
  const late = await registerForEvent(script({ event: eventRow({ closes_at: at('2027-02-28T00:00:00Z') }) }).pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.deepEqual(late, { status: 409, body: { error: 'Registration for this event has closed.', registrationState: 'closed' } });
});

test('registerForEvent names missing account details and refuses inactive accounts (Scenario 3)', async () => {
  const missing = await registerForEvent(script({ details: { full_name: 'Casey', email: 'c@example.test', contact_number: '' } }).pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.deepEqual(missing, { status: 400, body: { error: 'Add your contact number to your profile before registering.', missingFields: ['Contact number'] } });
  await assert.rejects(registerForEvent(script({ details: null }).pool, attendee, eventId, { sessionIds: [sessionA] }), { status: 403 });
});

test('registerForEvent keeps one active registration and rejects foreign Sessions (Scenario 2)', async () => {
  const existing = { id: randomUUID(), status: 'registered', registered_at: now, session_ids: [sessionA] };
  const { pool, calls } = script({ existing });
  const duplicate = await registerForEvent(pool, attendee, eventId, { sessionIds: [sessionB] });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, "You're already registered for this event.");
  assert.deepEqual((duplicate.body.registration as { sessionIds: string[] }).sessionIds, [sessionA]);
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO event_registrations')), false);
  const foreign = await registerForEvent(script().pool, attendee, eventId, { sessionIds: [sessionA, randomUUID()] });
  assert.deepEqual(foreign, { status: 400, body: { error: 'Choose valid Sessions from this event.' } });
});

test('registerForEvent maps a lost unique race, a busy account and rethrows other failures', async () => {
  const unique = Object.assign(new Error('duplicate'), { code: '23505' });
  const race = await registerForEvent(script({ failAt: 'INSERT INTO event_registrations', failure: unique }).pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.deepEqual(race, { status: 409, body: { error: "You're already registered for this event." } });
  const busy = Object.assign(new Error('lock'), { code: '55P03' });
  await assert.rejects(registerForEvent(script({ failAt: 'FOR SHARE NOWAIT', failure: busy }).pool, attendee, eventId, { sessionIds: [sessionA] }),
    { status: 409, message: 'Your account is being updated. Please try again.' });
  const broken = new Error('connection lost');
  const { pool, calls } = script({ failAt: 'INSERT INTO event_registration_sessions', failure: broken });
  await assert.rejects(registerForEvent(pool, attendee, eventId, { sessionIds: [sessionA] }), broken);
  assert.ok(calls.some(call => call.sql === 'ROLLBACK'));
});

test('getRegistrationForm reports full Sessions, a full Event and the waiting-list setting (E09-S02 Scenario 5)', async () => {
  const open = await getRegistrationForm(script().query, attendee, eventId);
  assert.deepEqual(open.capacity, { eventFull: false, waitlistEnabled: false, fullSessionIds: [] });
  const full = await getRegistrationForm(script({
    event: eventRow({ waitlist_enabled: true }), eventRegistered: 20,
    capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }, { session_id: sessionB, session_capacity: 10, registered: 10 }],
  }).query, attendee, eventId);
  assert.deepEqual(full.capacity, { eventFull: true, waitlistEnabled: true, fullSessionIds: [sessionA, sessionB] });
});

test('registerForEvent confirms the last place in a Session and the Event (TC_E09S02_08)', async () => {
  // Session A 9/10 and the Event 99/100, so both limits are reached but not passed.
  const { pool, calls } = script({ eventRegistered: 99, capacity: [
    { session_id: sessionA, session_capacity: 10, registered: 9 }, { session_id: sessionB, session_capacity: 90, registered: 90 }] });
  const result = await registerForEvent(pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.equal((result.body.registration as { status: string }).status, 'registered');
  assert.equal(calls.find(call => call.sql.includes('INSERT INTO event_registrations'))!.values![2], 'registered');
});

test('registerForEvent keeps an over-capacity request Pending with its own notice (TC_E09S02_09, _10)', async () => {
  for (const state of [
    { eventRegistered: 8, capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }] },
    { eventRegistered: 20, capacity: [{ session_id: sessionA, session_capacity: 10, registered: 4 }] },
  ]) {
    const { pool, calls } = script(state);
    const result = await registerForEvent(pool, attendee, eventId, { sessionIds: [sessionA] });
    assert.equal(result.status, 201);
    assert.equal((result.body.registration as { status: string }).status, 'pending');
    const notice = calls.find(call => call.sql.includes('INSERT INTO notifications'))!;
    assert.equal(notice.values![2], 'Registration request received');
    assert.match(String(notice.values![3]), /your choice is at capacity, so the organiser will review your request for Morning/);
  }
});

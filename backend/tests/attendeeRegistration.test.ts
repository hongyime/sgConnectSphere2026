import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import {
  getRegistrationForm, joinWaitingList, listOpenEvents, missingDetails, parseSessionIds, registerForEvent, registrationState,
  withdrawalOpen, withdrawRegistration,
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
  updateNoRows?: boolean;
  withdrawable?: { id: string; status: string } | null;
  contact?: string;
  waitlisted?: string[];
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
    else if (sql.includes('SELECT id, status FROM event_registrations')) rows = state.withdrawable ? [state.withdrawable] : [];
    else if (sql.includes('AS contact')) rows = [{ contact: state.contact ?? 'help@client.example.test' }];
    else if (sql.includes('AS coordinator_id')) rows = [{ id: eventId, title: 'Private title', public_name: 'Community Meetup', status: 'confirmed',
      starts_at: at('2027-04-01T01:00:00Z'), ends_at: at('2027-04-01T09:00:00Z'), organiser_id: null, coordinator_id: null }];
    else if (sql.includes('SELECT r.attendee_id, r.status')) rows = (state.waitlisted ?? []).map(id => ({ attendee_id: id, status: 'waitlisted' }));
    else if (sql.includes('AS session_capacity')) rows = state.capacity ?? [
      { session_id: sessionA, session_capacity: 10, registered: 0 }, { session_id: sessionB, session_capacity: 10, registered: 0 }];
    else if (sql.includes('AS registered FROM event_registrations')) rows = [{ registered: state.eventRegistered ?? 0 }];
    else if (sql.includes('FROM sessions s')) rows = state.sessions ?? sessionRows();
    else if (sql.startsWith('UPDATE event_registrations SET status = $2')) rows = state.existing && !state.updateNoRows
      ? [{ id: values?.[0], status: values?.[1], registered_at: values?.[2] }] : [];
    else if (sql.includes('INSERT INTO event_registrations')) rows = [{ id: randomUUID(), status: sql.includes("'waitlisted'") ? 'waitlisted' : values?.[2] ?? 'registered', registered_at: now }];
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
    'opensAt', 'registrationState', 'startsAt', 'venueLocation', 'venueName', 'withdrawalDeadline']);
  assert.equal(events[0]!.myRegistrationStatus, 'registered');
  assert.equal(events[0]!.registrationState, 'open');
  assert.ok(calls[0]!.sql.includes("e.status = 'confirmed' AND ((e.registration_enabled"));
  // D105: the Attendee's own active registrations stay listed after registration closes, until the event starts.
  assert.match(calls[0]!.sql, /OR \(lower\(e\.event_range\) > clock_timestamp\(\)\s+AND EXISTS \(SELECT 1 FROM event_registrations r/);
  assert.deepEqual(calls[0]!.values, [attendee.id]);
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
  assert.deepEqual(await registerForEvent(pool, attendee, eventId, []), { status: 400, body: { error: 'Choose at least one Session.' } });
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

// E09-S04: Event-level waiting list, no positions or automatic promotion (T-46, T-98).
test('joinWaitingList accepts only a full enabled Event and creates one empty Event-level entry (TC_E09S04_01)', async () => {
  const full = script({ event: eventRow({ waitlist_enabled: true }), eventRegistered: 20,
    capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }, { session_id: sessionB, session_capacity: 10, registered: 10 }] });
  const result = await joinWaitingList(full.pool, attendee, 'EVT-9001');
  assert.equal(result.status, 201);
  assert.deepEqual((result.body.registration as { status: string; sessionIds: string[] }).status, 'waitlisted');
  assert.deepEqual((result.body.registration as { sessionIds: string[] }).sessionIds, []);
  const insert = full.calls.find(call => call.sql.includes('INSERT INTO event_registrations'))!;
  assert.deepEqual(insert.values, [eventId, attendee.id]);
  const locks = ['FOR UPDATE OF e', 'FOR SHARE NOWAIT', 'SELECT r.id, r.status, r.registered_at'].map(lock =>
    full.calls.findIndex(call => call.sql.includes(lock)));
  assert.ok(locks.every(index => index >= 0));
  assert.deepEqual([...locks].sort((a, b) => a - b), locks);
});

test('joinWaitingList refuses a disabled list (TC_E09S04_04), an Event with room, and an Event without places', async () => {
  const disabled = await joinWaitingList(script({ eventRegistered: 20 }).pool, attendee, eventId);
  assert.deepEqual(disabled, { status: 409, body: { error: 'This event is not accepting waiting-list entries.' } });
  const room = await joinWaitingList(script({ event: eventRow({ waitlist_enabled: true }), eventRegistered: 19 }).pool, attendee, eventId);
  assert.deepEqual(room, { status: 409, body: { error: 'This event has places available; register directly.' } });
  const noPlaces = await joinWaitingList(script({ event: eventRow({ waitlist_enabled: true }), capacity: [], eventRegistered: 0 }).pool, attendee, eventId);
  assert.deepEqual(noPlaces, { status: 409, body: { error: 'This event has no places available to wait for.' } });
});

test('joinWaitingList rejects unavailable Events, closed windows, existing registrations and invalid accounts', async () => {
  assert.deepEqual(await joinWaitingList(script({ event: null }).pool, attendee, eventId),
    { status: 409, body: { error: 'Registration is only open for confirmed events that take registrations.' } });
  assert.deepEqual(await joinWaitingList(script({ event: eventRow({ registration_enabled: false }) }).pool, attendee, eventId),
    { status: 409, body: { error: 'Registration is only open for confirmed events that take registrations.' } });
  assert.deepEqual(await joinWaitingList(script({ event: eventRow({ closes_at: at('2027-02-28T00:00:00Z') }) }).pool, attendee, eventId),
    { status: 409, body: { error: 'Registration for this event has closed.', registrationState: 'closed' } });
  for (const status of ['waitlisted', 'registered', 'pending']) {
    const existing = { id: 'existing', status, registered_at: now, session_ids: [] };
    const result = await joinWaitingList(script({ existing }).pool, attendee, eventId);
    assert.equal(result.status, 409);
    assert.match(String(result.body.error), status === 'waitlisted' ? /already on the waiting list/ : /already registered/);
  }
  await assert.rejects(joinWaitingList(script({ details: null }).pool, attendee, eventId), { status: 403 });
  await assert.rejects(joinWaitingList(script().pool, { ...attendee, role: 'event_organiser' }, eventId), { status: 403 });
  await assert.rejects(joinWaitingList(script().pool, attendee, ''), { status: 400 });
});

test('joinWaitingList handles races, locked accounts and unexpected failures transactionally', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: '23505' });
  assert.deepEqual(await joinWaitingList(script({ event: eventRow({ waitlist_enabled: true }), eventRegistered: 20,
    failAt: 'INSERT INTO event_registrations', failure: duplicate }).pool, attendee, eventId),
  { status: 409, body: { error: "You're already registered for this event." } });
  const busy = Object.assign(new Error('lock'), { code: '55P03' });
  await assert.rejects(joinWaitingList(script({ event: eventRow({ waitlist_enabled: true }), failAt: 'FOR SHARE NOWAIT', failure: busy }).pool, attendee, eventId),
    { status: 409, message: 'Your account is being updated. Please try again.' });
  const broken = new Error('connection lost');
  const failed = script({ event: eventRow({ waitlist_enabled: true }), failAt: 'AS session_capacity', failure: broken });
  await assert.rejects(joinWaitingList(failed.pool, attendee, eventId), broken);
  assert.ok(failed.calls.some(call => call.sql === 'ROLLBACK'));
});

test('registerForEvent claims a released place by converting the same waitlisted row (TC_E09S04_02, TC_E09S04_03)', async () => {
  const existing = { id: 'waitlisted-entry', status: 'waitlisted', registered_at: now, session_ids: [] };
  const { pool, calls } = script({ existing, eventRegistered: 19 });
  const result = await registerForEvent(pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: true });
  assert.equal(result.status, 201);
  assert.equal((result.body.registration as { id: string }).id, existing.id);
  assert.equal((result.body.registration as { status: string }).status, 'registered');
  const update = calls.find(call => call.sql.startsWith('UPDATE event_registrations SET status = $2'))!;
  assert.deepEqual(update.values, [existing.id, 'registered', now, eventId, attendee.id]);
  assert.ok(calls.some(call => call.sql.includes('INSERT INTO event_registration_sessions')));
  assert.ok(calls.some(call => call.sql.includes('INSERT INTO notifications')));
});

test('a lost place keeps the Attendee waitlisted; a full selected Session follows Pending (T-85, T-98)', async () => {
  const existing = { id: 'waitlisted-entry', status: 'waitlisted', registered_at: now, session_ids: [] };
  const raced = script({ existing, eventRegistered: 20,
    capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }, { session_id: sessionB, session_capacity: 10, registered: 10 }] });
  assert.deepEqual(await registerForEvent(raced.pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: true }),
    { status: 409, body: { error: "That place has just been taken; you're still on the waiting list." } });
  assert.equal(raced.calls.some(call => call.sql.startsWith('UPDATE event_registrations SET status = $2')), false);
  const pending = script({ existing, eventRegistered: 19,
    capacity: [{ session_id: sessionA, session_capacity: 10, registered: 10 }, { session_id: sessionB, session_capacity: 10, registered: 9 }] });
  const result = await registerForEvent(pending.pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: true });
  assert.equal((result.body.registration as { status: string }).status, 'pending');
  assert.deepEqual(pending.calls.find(call => call.sql.startsWith('UPDATE event_registrations SET status = $2'))!.values?.slice(0, 2),
    [existing.id, 'pending']);
});

test('claimWaitlist accepts only a boolean and an active waitlist row', async () => {
  assert.deepEqual(await registerForEvent(script().pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: 'yes' }),
    { status: 400, body: { error: 'claimWaitlist must be true or false.' } });
  assert.deepEqual(await registerForEvent(script().pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: true }),
    { status: 409, body: { error: "You're no longer on the waiting list for this event." } });
  const registered = script({ existing: { id: 'r', status: 'registered', registered_at: now, session_ids: [sessionA] } });
  assert.deepEqual(await registerForEvent(registered.pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: true }),
    { status: 409, body: { error: "You're no longer on the waiting list for this event." } });
  const stillWaitlisted = script({ existing: { id: 'r', status: 'waitlisted', registered_at: now, session_ids: [] } });
  const duplicate = await registerForEvent(stillWaitlisted.pool, attendee, eventId, { sessionIds: [sessionA] });
  assert.equal(duplicate.status, 409);
  assert.match(String(duplicate.body.error), /already registered/);
  const claimRace = script({ existing: { id: 'r', status: 'waitlisted', registered_at: now, session_ids: [] }, updateNoRows: true });
  assert.deepEqual(await registerForEvent(claimRace.pool, attendee, eventId, { sessionIds: [sessionA], claimWaitlist: true }),
    { status: 409, body: { error: "You're no longer on the waiting list for this event." } });
});

// ─── E09-S05 Withdraw my registration ─────────────────────────────────────

test('withdrawalOpen: the deadline binds approved places only and is inclusive (TC_E09S05_04, D88)', () => {
  const deadline = at('2027-03-25T15:59:59Z');
  const event = { status: 'confirmed', withdrawal_deadline: deadline, starts_at: at('2027-04-01T01:00:00Z') };
  assert.equal(withdrawalOpen(event, 'registered', deadline), true);
  assert.equal(withdrawalOpen(event, 'registered', at('2027-03-25T16:00:00Z')), false);
  for (const status of ['pending', 'waitlisted']) assert.equal(withdrawalOpen(event, status, at('2027-03-30T00:00:00Z')), true);
  // No deadline: until the Event starts, for every status.
  const noDeadline = { ...event, withdrawal_deadline: null };
  assert.equal(withdrawalOpen(noDeadline, 'registered', at('2027-04-01T00:59:59Z')), true);
  assert.equal(withdrawalOpen(noDeadline, 'registered', at('2027-04-01T01:00:00Z')), false);
  assert.equal(withdrawalOpen(noDeadline, 'pending', at('2027-04-01T01:00:00Z')), false);
  for (const status of ['cancelled', 'completed']) assert.equal(withdrawalOpen({ ...noDeadline, status }, 'registered', now), false);
});

test('withdrawRegistration releases an approved place and tells the waiting list (TC_E09S05_01, TC_E09S05_04, TC_E09S05_05)', async () => {
  const registration = { id: randomUUID(), status: 'registered' };
  const waiting = [randomUUID(), randomUUID()];
  const { pool, calls } = script({ event: eventRow({ withdrawal_deadline: now }), withdrawable: registration, waitlisted: waiting, eventRegistered: 19 });
  const result = await withdrawRegistration(pool, attendee, 'EVT-9001');
  assert.deepEqual(result, { status: 200, body: { registration: { id: registration.id, status: 'withdrawn', withdrawnAt: now.toISOString() } } });
  // Lock order Event -> Account -> Registration.
  const order = ['FOR UPDATE OF e', 'FOR SHARE NOWAIT', 'LIMIT 1 FOR UPDATE'].map(lock => calls.findIndex(call => call.sql.includes(lock)));
  assert.ok(order[0]! >= 0);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  const update = calls.find(call => call.sql.includes("SET status = 'withdrawn'"))!;
  assert.deepEqual(update.values, [registration.id, now]);
  const notices = calls.filter(call => call.sql.includes('INSERT INTO notifications'));
  assert.deepEqual(notices.map(call => call.values![0]), waiting);
  assert.match(String(notices[0]!.values![3]), /^Community Meetup: A place is available\. Apply on a first-come basis; no place has been reserved for you\./);
  assert.ok(calls.some(call => call.sql === 'COMMIT'));
});

test('withdrawing from one event cancels only that registration and leaves the rest untouched (TC_E09S05_02)', async () => {
  const registration = { id: randomUUID(), status: 'registered' };
  const { pool, calls } = script({ event: eventRow({ withdrawal_deadline: now }), withdrawable: registration, waitlisted: [], eventRegistered: 5 });
  const result = await withdrawRegistration(pool, attendee, 'EVT-9001');
  assert.equal(result.status, 200);
  assert.equal((result.body as { registration: { status: string } }).registration.status, 'withdrawn');
  // One row is written, addressed by its own id: a withdrawal cannot reach a
  // second event's registration because the statement is not keyed on event_id.
  const updates = calls.filter(call => call.sql.includes('UPDATE event_registrations'));
  assert.equal(updates.length, 1, 'exactly one registration row is written');
  assert.match(updates[0]!.sql, /WHERE id = \$1/);
  assert.doesNotMatch(updates[0]!.sql, /event_id/);
  assert.deepEqual(updates[0]!.values, [registration.id, now]);
});
test('withdrawRegistration tells nobody when the Event is still full or the row held no place (D82, D88)', async () => {
  const full = script({ withdrawable: { id: randomUUID(), status: 'registered' }, waitlisted: [randomUUID()], eventRegistered: 20 });
  assert.equal((await withdrawRegistration(full.pool, attendee, eventId)).status, 200);
  assert.equal(full.calls.some(call => call.sql.includes('INSERT INTO notifications')), false);
  // A Pending request leaves after the deadline (AC 5); a waiting-list entry too, for E09-S04.
  for (const status of ['pending', 'waitlisted']) {
    const { pool, calls } = script({ event: eventRow({ withdrawal_deadline: at('2027-02-01T00:00:00Z') }), withdrawable: { id: randomUUID(), status }, waitlisted: [randomUUID()] });
    assert.equal((await withdrawRegistration(pool, attendee, eventId)).status, 200);
    assert.equal(calls.some(call => call.sql.includes('AS session_capacity') || call.sql.includes('INSERT INTO notifications')), false);
  }
});

test('withdrawRegistration refuses after the deadline with a contact, and changes nothing (TC_E09S05_03, D89)', async () => {
  const { pool, calls } = script({ event: eventRow({ withdrawal_deadline: at('2027-02-28T15:59:59Z') }), withdrawable: { id: randomUUID(), status: 'registered' }, contact: 'events@client.example.test' });
  assert.deepEqual(await withdrawRegistration(pool, attendee, eventId), { status: 409, body: {
    error: 'Withdrawal has closed. For help, contact events@client.example.test.', contact: 'events@client.example.test' } });
  assert.equal(calls.some(call => call.sql.includes('UPDATE event_registrations')), false);
  const contactQuery = calls.find(call => call.sql.includes('AS contact'))!;
  assert.ok(contactQuery.sql.includes("coalesce(nullif(trim(c.contact_email), ''), o.email)"));
});

test('withdrawRegistration answers a missing, repeated or foreign withdrawal without writing (AC 6)', async () => {
  const cases: [State, unknown][] = [
    [{ event: null }, { status: 404, body: { error: "You don't have a registration for this event." } }],
    [{ withdrawable: null }, { status: 404, body: { error: "You don't have a registration for this event." } }],
    [{ withdrawable: { id: randomUUID(), status: 'withdrawn' } }, { status: 409, body: { error: "You've already withdrawn from this event." } }],
  ];
  for (const [state, expected] of cases) {
    const { pool, calls } = script(state);
    assert.deepEqual(await withdrawRegistration(pool, attendee, eventId), expected);
    assert.equal(calls.some(call => call.sql.includes('UPDATE event_registrations')), false);
  }
  // Only the signed-in Attendee's own row is ever looked up.
  const own = script({ withdrawable: { id: randomUUID(), status: 'registered' } });
  await withdrawRegistration(own.pool, attendee, eventId);
  assert.deepEqual(own.calls.find(call => call.sql.includes('SELECT id, status FROM event_registrations'))!.values, [eventId, attendee.id]);
  await assert.rejects(withdrawRegistration(script().pool, { ...attendee, role: 'event_organiser' }, eventId), { status: 403 });
  await assert.rejects(withdrawRegistration(script().pool, attendee, ''), { status: 400 });
  await assert.rejects(withdrawRegistration(script({ details: null }).pool, attendee, eventId), { status: 403 });
});

test('withdrawRegistration maps a busy account and rethrows other failures', async () => {
  const busy = Object.assign(new Error('lock'), { code: '55P03' });
  await assert.rejects(withdrawRegistration(script({ failAt: 'FOR SHARE NOWAIT', failure: busy }).pool, attendee, eventId),
    { status: 409, message: 'Your account is being updated. Please try again.' });
  const broken = new Error('connection lost');
  const { pool, calls } = script({ withdrawable: { id: randomUUID(), status: 'registered' }, failAt: "SET status = 'withdrawn'", failure: broken });
  await assert.rejects(withdrawRegistration(pool, attendee, eventId), broken);
  assert.ok(calls.some(call => call.sql === 'ROLLBACK'));
});

test('getRegistrationForm says whether a registration can still be withdrawn, and who to contact (D101, D105)', async () => {
  const existing = { id: randomUUID(), status: 'registered', registered_at: now, session_ids: [sessionA] };
  const open = await getRegistrationForm(script({ existing, event: eventRow({ withdrawal_deadline: at('2027-03-25T15:59:59Z') }) }).query, attendee, eventId);
  assert.deepEqual(open.withdrawal, { open: true, contact: null });
  assert.equal(open.event.withdrawalDeadline, '2027-03-25T15:59:59.000Z');
  const closed = await getRegistrationForm(script({ existing, event: eventRow({ withdrawal_deadline: at('2027-02-01T00:00:00Z') }) }).query, attendee, eventId);
  assert.deepEqual(closed.withdrawal, { open: false, contact: 'help@client.example.test' });
  // D105: registration switched off, but the Attendee's own registration keeps the page.
  const off = await getRegistrationForm(script({ existing, event: eventRow({ registration_enabled: false }) }).query, attendee, eventId);
  assert.equal(off.registration!.id, existing.id);
  await assert.rejects(getRegistrationForm(script({ existing, event: eventRow({ status: 'cancelled' }) }).query, attendee, eventId), { status: 409 });
  assert.equal((await getRegistrationForm(script().query, attendee, eventId)).withdrawal, null);
});

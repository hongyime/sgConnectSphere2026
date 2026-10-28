import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client, Pool } from 'pg';
import { hashPassword } from '../src/modules/accessControl/passwords';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import { eventCapacity } from '../src/modules/attendeeRegistration/capacity';
import { getEventRegistrations, manageRegistrations } from '../src/modules/attendeeRegistration/organiser';
import { getRegistrationForm, registerForEvent } from '../src/modules/attendeeRegistration/service';
import type { Query } from '../src/modules/eventVisibility/service';
import type { VercelRequest, VercelResponse } from '../src/vercel';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';

// E09-S02 on real PostgreSQL: every migration, an isolated schema in the
// disposable TEST_DATABASE_URL, real locks for the races, and the real
// Organiser API handler with a session cookie.
//   Session A: Grand Auditorium, Theatre layout listed at 2 places.
//   Session B: Seminar Room B, no Theatre row, so the venue maximum of 4.
//   Event: 2 + 4 = 6 places (TC_E09S02_12).
test('E09-S02: Session and Event capacity, Pending requests and manual additions on real PostgreSQL', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Use a disposable TEST_DATABASE_URL');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect();
  const schema = `capacity_${randomUUID().replaceAll('-', '')}`;
  const [org, organiser, coordinator, meetup, layout, hall, seminar, annex] = Array.from({ length: 8 }, () => randomUUID());
  const attendees = Array.from({ length: 11 }, () => randomUUID());
  const savedEnv = { ...process.env };
  let pool: Pool | undefined;
  let closeRuntime: (() => Promise<void>) | undefined;
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`); await db.query(`SET search_path TO ${schema}, public`);
    const migrations = (await readdir(new URL('../database/migrations/', import.meta.url))).filter(file => file.endsWith('.sql')).sort();
    for (const migration of migrations) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    const credential = randomUUID();
    const digest = await hashPassword(credential);
    await db.query('INSERT INTO client_organisations(id,name) VALUES ($1,$2)', [org, 'Synthetic client']);
    const people: [string, string, string][] = [
      [organiser, 'event_organiser', 'organiser@example.test'], [coordinator, 'event_coordinator', 'coordinator@example.test'],
      ...attendees.map((id, index): [string, string, string] => [id, 'attendee', `attendee${index + 1}@example.test`]),
    ];
    for (const [id, role, email] of people) {
      await db.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role,contact_number,email_verified_at)
        VALUES ($1,$2,$3,$4,$5,$6,'+65 8000 0000',now())`, [id, role === 'attendee' ? null : org, email, digest, `Synthetic ${role}`, role]);
    }
    await db.query("INSERT INTO room_layouts(id,code,label) VALUES ($1,'theatre','Theatre')", [layout]);
    for (const [id, name, max] of [[hall, 'Grand Auditorium', 200], [seminar, 'Seminar Room B', 4], [annex, 'Annex', 5]] as const) {
      await db.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES ($1,$2,'Level 1',$3,'07:00','23:00')", [id, name, max]);
    }
    await db.query('INSERT INTO venue_supported_layouts(venue_id,layout_id,capacity) VALUES ($1,$2,2)', [hall, layout]);
    await db.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance,
        layout_id,registration_enabled,waitlist_enabled,registration_opens_at,registration_closes_at)
      VALUES ($1,'EVT-2001',$2,$3,$4,'Community Meetup','confirmed','[2030-05-01 01:00Z,2030-05-01 09:00Z)',6,$5,true,true,
        now() - interval '1 day', now() + interval '10 days')`, [meetup, organiser, coordinator, org, layout]);
    const sessionA = (await db.query(`UPDATE sessions SET title='Morning keynote', layout_id=$2, session_range='[2030-05-01 01:00Z,2030-05-01 04:00Z)'
      WHERE event_id=$1 RETURNING id`, [meetup, layout])).rows[0].id as string;
    const sessionB = (await db.query(`INSERT INTO sessions(event_id,title,session_range,expected_attendance,layout_id)
      VALUES ($1,'Afternoon workshops','[2030-05-01 05:00Z,2030-05-01 09:00Z)',4,$2) RETURNING id`, [meetup, layout])).rows[0].id as string;
    await db.query(`INSERT INTO venue_bookings(venue_id,event_id,session_id,booking_range,status,is_primary) VALUES
      ($1,$3,$4,'[2030-05-01 01:00Z,2030-05-01 04:00Z)','confirmed',true),
      ($2,$3,$5,'[2030-05-01 05:00Z,2030-05-01 09:00Z)','confirmed',false)`, [hall, seminar, meetup, sessionA, sessionB]);
    await db.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
      SELECT id, title, lower(event_range), upper(event_range), 'Grand Auditorium', 'Level 1' FROM events WHERE id=$1`, [meetup]);

    const query: Query = (sql, values) => db.query(sql, values);
    const url = new URL(process.env.TEST_DATABASE_URL!); url.searchParams.set('options', `-csearch_path=${schema},public`);
    pool = new Pool({ connectionString: url.toString(), max: 6 });
    const person = (index: number): AuthenticatedUser => ({ id: attendees[index - 1]!, email: `attendee${index}@example.test`, role: 'attendee', isActive: true, failedLoginCount: 0 });
    const olive: AuthenticatedUser = { id: organiser, email: 'organiser@example.test', role: 'event_organiser', clientOrgId: org, isActive: true, failedLoginCount: 0 };
    const register = (index: number, sessionId: string) => registerForEvent(pool!, person(index), 'EVT-2001', { sessionIds: [sessionId] });
    const statusOf = (result: { body: Record<string, unknown> }) => (result.body.registration as { status: string }).status;
    const counts = async () => {
      const capacity = await eventCapacity(query, meetup);
      return [capacity.registered, capacity.capacity, ...capacity.sessions.map(session => `${session.registered}/${session.capacity}`)];
    };

    // TC_E09S02_12: the Event's capacity comes from the confirmed layouts, not an entered limit.
    assert.deepEqual(await counts(), [0, 6, '0/2', '0/4']);

    // TC_E09S02_08: the last place in Session A is confirmed; TC_E09S02_09: the next request is Pending.
    assert.equal(statusOf(await register(1, sessionA)), 'registered');
    assert.equal(statusOf(await register(2, sessionA)), 'registered');
    const overSession = await register(3, sessionA);
    assert.equal(overSession.status, 201); assert.equal(statusOf(overSession), 'pending');
    assert.deepEqual(await counts(), [2, 6, '2/2', '0/4']);
    const notice = (await db.query('SELECT title FROM notifications WHERE user_id=$1', [attendees[2]])).rows;
    assert.deepEqual(notice.map(row => row.title), ['Registration request received']);
    const form = await getRegistrationForm(query, person(4), 'EVT-2001');
    assert.deepEqual(form.capacity, { eventFull: false, waitlistEnabled: true, fullSessionIds: [sessionA] });

    // TC_E09S02_03: three places taken in Session B, then two Attendees race for the last place.
    for (const index of [4, 5, 6]) assert.equal(statusOf(await register(index, sessionB)), 'registered');
    const race = await Promise.all([register(7, sessionB), register(8, sessionB)]);
    assert.deepEqual(race.map(statusOf).sort(), ['pending', 'registered']);
    assert.deepEqual(await counts(), [6, 6, '2/2', '4/4']);
    assert.deepEqual((await getRegistrationForm(query, person(9), 'EVT-2001')).capacity,
      { eventFull: true, waitlistEnabled: true, fullSessionIds: [sessionA, sessionB] });

    // TC_E09S02_10: one Session B place is withdrawn, then Session A's layout shrinks to 1, so
    // the Event is full (5 of 5) while Session B has room (3 of 4); the request is Pending.
    await db.query("UPDATE event_registrations SET status='withdrawn', withdrawn_at=now() WHERE attendee_id=$1", [attendees[3]]);
    await db.query('UPDATE venue_supported_layouts SET capacity=1 WHERE venue_id=$1', [hall]);
    assert.deepEqual(await counts(), [5, 5, '2/1', '3/4']);
    assert.equal(statusOf(await register(9, sessionB)), 'pending');

    // TC_E09S02_11: approval is refused while Session A is full, then allowed once a confirmed
    // Annex booking adds 5 places to Session A (an arrangement change).
    const view = await getEventRegistrations(query, olive, 'EVT-2001');
    assert.equal(view.pending.length, 3);
    const caseyRequest = view.pending.find(row => row.email === 'attendee3@example.test')!;
    assert.equal(caseyRequest.overCapacity, '"Morning keynote" is full (2 of 1 places).');
    const refused = await manageRegistrations(pool, olive, 'EVT-2001', { action: 'approve', registrationId: caseyRequest.id });
    assert.deepEqual(refused, { status: 409, body: { error: 'Can\'t approve yet. "Morning keynote" is full (2 of 1 places).' } });
    await db.query(`INSERT INTO venue_bookings(venue_id,event_id,session_id,booking_range,status,is_primary)
      VALUES ($1,$2,$3,'[2030-05-01 01:00Z,2030-05-01 04:00Z)','confirmed',false)`, [annex, meetup, sessionA]);
    assert.deepEqual(await counts(), [5, 10, '2/6', '3/4']);
    const approved = await manageRegistrations(pool, olive, 'EVT-2001', { action: 'approve', registrationId: caseyRequest.id });
    assert.equal(approved.status, 200);
    assert.deepEqual(approved.body.capacity, { capacity: 10, registered: 6, remaining: 4 });
    assert.equal((approved.body.pending as unknown[]).length, 2);
    assert.deepEqual((await db.query('SELECT title FROM notifications WHERE user_id=$1 ORDER BY created_at', [attendees[2]])).rows.map(row => row.title),
      ['Registration request received', 'Registration confirmed']);
    const again = await manageRegistrations(pool, olive, 'EVT-2001', { action: 'reject', registrationId: caseyRequest.id });
    assert.equal(again.status, 409);

    // Rejecting a request frees the account to register again later (0024's partial index).
    const ninth = view.pending.find(row => row.email === 'attendee9@example.test')!;
    assert.equal((await manageRegistrations(pool, olive, 'EVT-2001', { action: 'reject', registrationId: ninth.id })).status, 200);
    assert.equal((await db.query('SELECT status FROM event_registrations WHERE id=$1', [ninth.id])).rows[0].status, 'rejected');

    // TC_E09S02_06: a manual addition takes Session B's last place and is marked as manual.
    const added = await manageRegistrations(pool, olive, 'EVT-2001', { action: 'add', email: 'attendee10@example.test', sessionIds: [sessionB] });
    assert.equal(added.status, 201);
    assert.deepEqual(await counts(), [7, 10, '3/6', '4/4']);
    assert.equal((await db.query('SELECT manually_added FROM event_registrations WHERE attendee_id=$1', [attendees[9]])).rows[0].manually_added, true);
    // TC_E09S02_07: Session B is now full, so the next manual addition is blocked and nothing is written.
    const blocked = await manageRegistrations(pool, olive, 'EVT-2001', { action: 'add', email: 'attendee11@example.test', sessionIds: [sessionB] });
    assert.deepEqual(blocked, { status: 409, body: { error: 'Can\'t add them. "Afternoon workshops" is full (4 of 4 places).' } });
    assert.equal((await db.query('SELECT count(*)::int AS n FROM event_registrations WHERE attendee_id=$1', [attendees[10]])).rows[0].n, 0);
    const audit = (await db.query("SELECT action FROM audit_logs WHERE entity_type='event_registration' ORDER BY occurred_at")).rows.map(row => row.action);
    assert.deepEqual(audit, ['Registration Approved', 'Registration Rejected', 'Attendee Added Manually']);
    // E09-S07 (TC_E09S07_01, _02, _04): registered and waitlisted Attendees listed apart, with
    // name, email and contact number; registered count and places remaining.
    await db.query("INSERT INTO event_registrations(event_id,attendee_id,status) VALUES ($1,$2,'waitlisted')", [meetup, attendees[10]]);
    const list = await getEventRegistrations(query, olive, 'EVT-2001');
    assert.equal(list.registered.length, 7);
    const vip = list.registered.find(row => row.email === 'attendee10@example.test')!;
    assert.equal(vip.manuallyAdded, true); assert.equal(vip.contactNumber, '+65 8000 0000'); assert.equal(vip.name, 'Synthetic attendee');
    assert.deepEqual(list.waitlisted.map(row => row.email), ['attendee11@example.test']);
    assert.deepEqual(list.capacity, { capacity: 10, registered: 7, remaining: 3 });
    // TC_E09S07_03: another organisation's Organiser is refused, and the attempt is recorded (E01-S02).
    const otherOrg = randomUUID();
    await db.query('INSERT INTO client_organisations(id,name) VALUES ($1,$2)', [otherOrg, 'Other client']);
    await assert.rejects(getEventRegistrations(query, { ...olive, id: coordinator, clientOrgId: otherOrg }, 'EVT-2001'),
      { status: 403, message: 'Access denied. This event is not available to your organisation.' });
    const denial = (await db.query("SELECT event_id FROM audit_logs WHERE action='Access Denied' AND field_changed='registrations' AND actor_id=$1", [coordinator])).rows;
    assert.deepEqual(denial.map(row => row.event_id), [meetup]);
    // A colleague in the same organisation (E01-S02 Scenario 3) can view the list but not manage it.
    const colleague = { ...olive, id: coordinator };
    assert.equal((await getEventRegistrations(query, colleague, 'EVT-2001')).event.canManage, false);
    await assert.rejects(manageRegistrations(pool, colleague, 'EVT-2001', { action: 'add', email: 'attendee11@example.test', sessionIds: [sessionA] }),
      { status: 403, message: "Only this event's Organiser can approve requests or add attendees." });

    // The real API handler with an Organiser session cookie, and the origin check on POST.
    process.env.DATABASE_URL = url.toString(); delete process.env.DATABASE_POOLER_URL; process.env.APP_URL = 'https://app.example.test';
    process.env.ADDITIONAL_ALLOWED_ORIGINS = 'https://app.example.test';
    const runtime = await import('../src/modules/eventVisibility/runtime'); closeRuntime = () => runtime.databasePool().end();
    const { default: session } = await import('../../api/auth/session');
    const { default: api } = await import('../../api/events');
    async function call(handler: typeof api, request: VercelRequest) {
      let status = 200; let body: any; const headers: Record<string, string> = {};
      const response: VercelResponse = { setHeader(k, v) { headers[k] = v; }, status(code) { status = code; return { json(value) { body = value; } }; }, json(value) { body = value; } };
      await handler(request, response); return { status, body, headers };
    }
    const origin = 'https://app.example.test';
    const signedIn = await call(session, { method: 'POST', headers: { origin }, body: { email: 'organiser@example.test', password: credential } });
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers['Set-Cookie'].split(';')[0];
    const shown = await call(api, { method: 'GET', url: '/api/events?registrations=1&id=EVT-2001', headers: { cookie } });
    assert.equal(shown.status, 200); assert.deepEqual(shown.body.capacity, { capacity: 10, registered: 7, remaining: 3 }); assert.equal(shown.body.pending.length, 1);
    const pendingId = shown.body.pending[0].id;
    const foreign = await call(api, { method: 'POST', url: '/api/events?registrations=1&id=EVT-2001', headers: { cookie, origin: 'https://evil.example.test' },
      body: { action: 'approve', registrationId: pendingId } });
    assert.equal(foreign.status, 403);
    const full = await call(api, { method: 'POST', url: '/api/events?registrations=1&id=EVT-2001', headers: { cookie, origin }, body: { action: 'approve', registrationId: pendingId } });
    assert.equal(full.status, 409); assert.match(full.body.error, /^Can't approve yet\. "Afternoon workshops" is full/);
    const rejected = await call(api, { method: 'POST', url: '/api/events?registrations=1&id=EVT-2001', headers: { cookie, origin }, body: { action: 'reject', registrationId: pendingId } });
    assert.equal(rejected.status, 200); assert.equal(rejected.body.pending.length, 0);
    assert.equal((await call(api, { method: 'GET', url: '/api/events?registrations=1&id=EVT-2001', headers: {} })).status, 401);
  } finally {
    if (closeRuntime) await closeRuntime();
    if (pool) await pool.end();
    for (const key of ['DATABASE_URL', 'DATABASE_POOLER_URL', 'APP_URL', 'ADDITIONAL_ALLOWED_ORIGINS']) { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; }
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await db.end();
  }
});

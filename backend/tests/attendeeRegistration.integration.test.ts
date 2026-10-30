import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client, Pool } from 'pg';
import { hashPassword } from '../src/modules/accessControl/passwords';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import { eventCapacity } from '../src/modules/attendeeRegistration/capacity';
import { getRegistrationForm, joinWaitingList, listOpenEvents, registerForEvent, withdrawRegistration } from '../src/modules/attendeeRegistration/service';
import type { Query } from '../src/modules/eventVisibility/service';
import type { VercelRequest, VercelResponse } from '../src/vercel';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';

// E09-S01 on real PostgreSQL: every migration up to 0024, an isolated schema in
// the disposable TEST_DATABASE_URL, and the real API handler with a session cookie.
test('E09-S01 and E09-S05: register once for a Confirmed Event, selecting Sessions, then withdraw, on real PostgreSQL (TC_E09S05_01, TC_E09S05_03, TC_E09S05_04, TC_E09S05_05)', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Use a disposable TEST_DATABASE_URL');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect();
  const schema = `registration_${randomUUID().replaceAll('-', '')}`;
  const [org, organiser, coordinator, casey, dana, eli, fay, grace] = Array.from({ length: 8 }, () => randomUUID());
  const [meetup, planning, closed, waitlistEvent, layout, hall, seminar, waitHall] = Array.from({ length: 8 }, () => randomUUID());
  const savedEnv = { ...process.env };
  let pool: Pool | undefined;
  let closeRuntime: (() => Promise<void>) | undefined;
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`); await db.query(`SET search_path TO ${schema}, public`);
    const migrations = (await readdir(new URL('../database/migrations/', import.meta.url))).filter(file => file.endsWith('.sql')).sort();
    assert.ok(migrations.includes('0024_registration_sessions.sql'));
    for (const migration of migrations) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    const credential = randomUUID();
    const digest = await hashPassword(credential);
    await db.query('INSERT INTO client_organisations(id,name) VALUES ($1,$2)', [org, 'Synthetic client']);
    for (const [id, role, email, contact] of [
      [organiser, 'event_organiser', 'organiser@example.test', '+65 6000 0001'],
      [coordinator, 'event_coordinator', 'coordinator@example.test', '+65 6000 0002'],
      [casey, 'attendee', 'casey@example.test', '+65 8000 0001'],
      [dana, 'attendee', 'dana@example.test', '+65 8000 0002'],
      [eli, 'attendee', 'eli@example.test', null],
      [fay, 'attendee', 'fay@example.test', '+65 8000 0004'],
      [grace, 'attendee', 'grace@example.test', '+65 8000 0005'],
    ]) {
      await db.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role,contact_number,email_verified_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,now())`,
        [id, role === 'attendee' ? null : org, email, digest, `Synthetic ${role}`, role, contact]);
    }
    await db.query("INSERT INTO room_layouts(id,code,label) VALUES ($1,'theatre','Theatre')", [layout]);
    for (const [id, name, capacity] of [[hall, 'Grand Auditorium', 200], [seminar, 'Seminar Room B', 200], [waitHall, 'Small Waiting Room', 1]]) {
      await db.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES ($1,$2,'Level 1',$3,'07:00','23:00')", [id, name, capacity]);
    }
    // Event ranges far in the future; registration windows relative to the database clock.
    const events: [string, string, string, string, string][] = [
      [meetup, 'EVT-REG-1', 'Private meetup title', 'confirmed', "now() - interval '1 day'"],
      [planning, 'EVT-REG-2', 'Draft Networking Event', 'planning', "now() - interval '1 day'"],
      [closed, 'EVT-REG-3', 'Closed event', 'confirmed', "now() - interval '3 days'"],
      [waitlistEvent, 'EVT-WAIT-1', 'Waitlist Event', 'confirmed', "now() - interval '1 day'"],
    ];
    for (const [id, code, title, status, opens] of events) {
      await db.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance,
          layout_id,registration_enabled,registration_opens_at,registration_closes_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,${id === waitlistEvent ? "'[2030-05-02 01:00Z,2030-05-02 09:00Z)'" : "'[2030-05-01 01:00Z,2030-05-01 09:00Z)'"},100,$8,true,${opens},
          ${id === closed ? "now() - interval '1 day'" : "now() + interval '10 days'"})`,
        [id, code, organiser, coordinator, org, title, status, layout]);
    }
    // The events trigger made one default Session per Event; split the meetup into two.
    const [sessionA] = (await db.query(`UPDATE sessions SET title='Morning keynote', session_range='[2030-05-01 01:00Z,2030-05-01 04:00Z)'
      WHERE event_id=$1 RETURNING id`, [meetup])).rows.map(row => row.id as string);
    const sessionB = (await db.query(`INSERT INTO sessions(event_id,title,session_range,expected_attendance)
      VALUES ($1,'Afternoon workshops','[2030-05-01 05:00Z,2030-05-01 09:00Z)',40) RETURNING id`, [meetup])).rows[0].id as string;
    const otherSession = (await db.query('SELECT id FROM sessions WHERE event_id=$1', [closed])).rows[0].id as string;
    await db.query(`INSERT INTO venue_bookings(venue_id,event_id,session_id,booking_range,status,is_primary) VALUES
      ($1,$3,$4,'[2030-05-01 01:00Z,2030-05-01 04:00Z)','confirmed',true),
      ($2,$3,$5,'[2030-05-01 05:00Z,2030-05-01 09:00Z)','confirmed',false)`, [hall, seminar, meetup, sessionA, sessionB]);
    await db.query('UPDATE events SET waitlist_enabled=true WHERE id=$1', [waitlistEvent]);
    const waitSession = (await db.query('SELECT id FROM sessions WHERE event_id=$1', [waitlistEvent])).rows[0].id as string;
    await db.query(`INSERT INTO venue_bookings(venue_id,event_id,session_id,booking_range,status,is_primary)
      VALUES ($1,$2,$3,'[2030-05-02 01:00Z,2030-05-02 09:00Z)','confirmed',true)`, [waitHall, waitlistEvent, waitSession]);
    for (const id of [meetup, planning, closed, waitlistEvent]) {
      await db.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
        SELECT id, CASE WHEN id=$2 THEN 'Community Meetup' ELSE title END, lower(event_range), upper(event_range), 'Published venue', 'Level 1'
        FROM events WHERE id=$1`, [id, meetup]);
    }

    const query: Query = (sql, values) => db.query(sql, values);
    const url = new URL(process.env.TEST_DATABASE_URL!); url.searchParams.set('options', `-csearch_path=${schema},public`);
    pool = new Pool({ connectionString: url.toString(), max: 4 });
    const as = (id: string, email: string): AuthenticatedUser => ({ id, email, role: 'attendee', isActive: true, failedLoginCount: 0 });
    const caseyUser = as(casey, 'casey@example.test');

    // Discovery: only the Confirmed, not-yet-closed event; the Planning and closed events are hidden.
    const open = await listOpenEvents(query, caseyUser);
    assert.deepEqual(open.map(event => event.eventCode), ['EVT-REG-1', 'EVT-WAIT-1']);
    assert.equal(open[0]!.name, 'Community Meetup');
    assert.equal(JSON.stringify(open).includes('Private meetup title'), false);

    // TC_E09S01_06: the Event shows its primary venue; each Session shows its own.
    const form = await getRegistrationForm(query, caseyUser, 'EVT-REG-1');
    assert.equal(form.event.venueName, 'Grand Auditorium');
    assert.deepEqual(form.sessions.map(session => [session.title, session.venueName]),
      [['Morning keynote', 'Grand Auditorium'], ['Afternoon workshops', 'Seminar Room B']]);
    assert.deepEqual(form.missingDetails, []);

    // TC_E09S01_05: an unconfirmed event is refused, both for the form and for registering.
    await assert.rejects(getRegistrationForm(query, caseyUser, 'EVT-REG-2'), { status: 409 });
    assert.equal((await registerForEvent(pool, caseyUser, 'EVT-REG-2', { sessionIds: [sessionA] })).status, 409);
    // A closed window is refused (E09-S03 adds the Organiser side).
    assert.equal((await registerForEvent(pool, caseyUser, 'EVT-REG-3', { sessionIds: [otherSession] })).body.registrationState, 'closed');

    // TC_E09S01_04 under T-32: details come from the account, so a missing contact number blocks registration.
    const eliResult = await registerForEvent(pool, as(eli, 'eli@example.test'), 'EVT-REG-1', { sessionIds: [sessionA] });
    assert.deepEqual(eliResult, { status: 400, body: { error: 'Add your contact number to your profile before registering.', missingFields: ['Contact number'] } });

    // A Session from another Event is refused and nothing is written.
    assert.equal((await registerForEvent(pool, caseyUser, 'EVT-REG-1', { sessionIds: [sessionA, otherSession] })).status, 400);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM event_registrations')).rows[0].n, 0);

    // TC_E09S01_01 and _07: one Event-level registration with both Sessions, plus a confirmation and its email delivery.
    const created = await registerForEvent(pool, caseyUser, 'EVT-REG-1', { sessionIds: [sessionB, sessionA] });
    assert.equal(created.status, 201);
    const registrationId = (created.body.registration as { id: string }).id;
    const stored = (await db.query(`SELECT r.status, r.manually_added, array_agg(rs.session_id ORDER BY lower(s.session_range)) AS sessions
      FROM event_registrations r JOIN event_registration_sessions rs ON rs.registration_id=r.id JOIN sessions s ON s.id=rs.session_id
      WHERE r.id=$1 GROUP BY r.id`, [registrationId])).rows[0];
    assert.equal(stored.status, 'registered'); assert.equal(stored.manually_added, false);
    assert.deepEqual(stored.sessions, [sessionA, sessionB]);
    const notice = (await db.query(`SELECT n.title, n.message, d.channel FROM notifications n
      JOIN notification_deliveries d ON d.notification_id=n.id WHERE n.user_id=$1 AND n.event_id=$2`, [casey, meetup])).rows;
    assert.equal(notice.length, 1); assert.equal(notice[0].title, 'Registration confirmed'); assert.equal(notice[0].channel, 'email');
    assert.match(notice[0].message, /^Community Meetup, .*Morning keynote .*Grand Auditorium.*Afternoon workshops .*Seminar Room B/);
    assert.equal(notice[0].message.includes('Private meetup title'), false);

    // TC_E09S01_03: a second attempt is refused and the first selection is unchanged.
    const again = await registerForEvent(pool, caseyUser, 'EVT-REG-1', { sessionIds: [sessionB] });
    assert.equal(again.status, 409);
    assert.deepEqual((again.body.registration as { sessionIds: string[] }).sessionIds.sort(), [sessionA, sessionB].sort());
    assert.equal((await db.query('SELECT count(*)::int AS n FROM event_registrations WHERE attendee_id=$1', [casey])).rows[0].n, 1);
    assert.equal((await listOpenEvents(query, caseyUser))[0]!.myRegistrationStatus, 'registered');

    // Two simultaneous submissions from one account: the Event lock lets exactly one through.
    const danaUser = as(dana, 'dana@example.test');
    const race = await Promise.all([1, 2].map(() => registerForEvent(pool!, danaUser, 'EVT-REG-1', { sessionIds: [sessionA] })));
    assert.deepEqual(race.map(result => result.status).sort(), [201, 409]);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM event_registrations WHERE attendee_id=$1 AND status='registered'", [dana])).rows[0].n, 1);

    // Withdrawn and Organiser-rejected rows are not active, so the account may register again (0024).
    await db.query("UPDATE event_registrations SET status='withdrawn', withdrawn_at=now() WHERE id=$1", [registrationId]);
    assert.equal((await registerForEvent(pool, caseyUser, 'EVT-REG-1', { sessionIds: [sessionB] })).status, 201);

    // E09-S04/T-46: no positions or automatic promotion; two claims contend for one released place.
    const initialWaitlist = await registerForEvent(pool, caseyUser, 'EVT-WAIT-1', { sessionIds: [waitSession] });
    assert.equal(initialWaitlist.status, 201);
    const danaWaitlist = await joinWaitingList(pool, danaUser, 'EVT-WAIT-1');
    const fayWaitlist = await joinWaitingList(pool, as(fay, 'fay@example.test'), 'EVT-WAIT-1');
    assert.equal(danaWaitlist.status, 201); assert.equal(fayWaitlist.status, 201);
    assert.equal('position' in (danaWaitlist.body.registration as object), false);
    assert.equal((await withdrawRegistration(pool, caseyUser, 'EVT-WAIT-1')).status, 200);
    const claimRace = await Promise.all([dana, fay].map(id => registerForEvent(pool!, as(id, id === dana ? 'dana@example.test' : 'fay@example.test'), 'EVT-WAIT-1',
      { sessionIds: [waitSession], claimWaitlist: true })));
    assert.deepEqual(claimRace.map(result => result.status).sort(), [201, 409]);
    const claimRows = (await db.query("SELECT attendee_id,status FROM event_registrations WHERE event_id=$1 ORDER BY attendee_id", [waitlistEvent])).rows;
    assert.equal(claimRows.filter(row => row.status === 'registered').length, 1);
    assert.equal(claimRows.filter(row => row.status === 'waitlisted').length, 1);
    const waitlistNotices = (await db.query("SELECT count(*)::int AS n FROM notifications WHERE event_id=$1 AND title='Event update' AND user_id=ANY($2::uuid[])", [waitlistEvent, [dana, fay]])).rows[0].n;
    assert.equal(waitlistNotices, 2);

    // The real API handler: GET discovery and form, POST registration with a session cookie.
    process.env.DATABASE_URL = url.toString(); delete process.env.DATABASE_POOLER_URL; process.env.APP_URL = 'https://app.example.test';
    // config.ts reads APP_URL once at import, which happened above; this one is read per call.
    process.env.ADDITIONAL_ALLOWED_ORIGINS = 'https://app.example.test';
    const runtime = await import('../src/modules/eventVisibility/runtime'); closeRuntime = () => runtime.databasePool().end();
    const { default: session } = await import('../../api/auth/session');
    const { default: api } = await import('../../api/attendee/events');
    async function call(handler: typeof api, request: VercelRequest) {
      let status = 200; let body: any; const headers: Record<string, string> = {};
      const response: VercelResponse = { setHeader(k, v) { headers[k] = v; }, status(code) { status = code; return { json(value) { body = value; } }; }, json(value) { body = value; } };
      await handler(request, response); return { status, body, headers };
    }
    const signedIn = await call(session, { method: 'POST', headers: { origin: 'https://app.example.test' }, body: { email: 'dana@example.test', password: credential } });
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers['Set-Cookie'].split(';')[0];
    const listed = await call(api, { method: 'GET', url: '/api/attendee/events?open=1', headers: { cookie } });
    assert.equal(listed.status, 200); assert.equal(listed.body.events[0].myRegistrationStatus, 'registered');
    const shown = await call(api, { method: 'GET', url: '/api/attendee/events?registration=1&id=EVT-REG-1', headers: { cookie } });
    assert.equal(shown.status, 200); assert.equal(shown.body.sessions.length, 2); assert.equal(shown.headers['Cache-Control'], 'private, no-store');
    const origin = 'https://app.example.test';
    const graceSignedIn = await call(session, { method: 'POST', headers: { origin }, body: { email: 'grace@example.test', password: credential } });
    assert.equal(graceSignedIn.status, 200);
    const waitlistJoin = await call(api, { method: 'POST', url: '/api/attendee/events?waitlist=1&id=EVT-WAIT-1',
      headers: { cookie: graceSignedIn.headers['Set-Cookie'].split(';')[0], origin }, body: {} });
    assert.equal(waitlistJoin.status, 201);
    assert.equal((await db.query("SELECT status FROM event_registrations WHERE event_id=$1 AND attendee_id=$2", [waitlistEvent, grace])).rows[0].status, 'waitlisted');
    const staleClaim = await call(api, { method: 'POST', url: '/api/attendee/events?registration=1&id=EVT-WAIT-1',
      headers: { cookie: graceSignedIn.headers['Set-Cookie'].split(';')[0], origin }, body: { sessionIds: [waitSession], claimWaitlist: true } });
    assert.equal(staleClaim.status, 409);
    assert.match(staleClaim.body.error, /place has just been taken/);
    assert.equal((await db.query("SELECT status FROM event_registrations WHERE event_id=$1 AND attendee_id=$2", [waitlistEvent, grace])).rows[0].status, 'waitlisted');
    await db.query("UPDATE events SET status='completed' WHERE id=$1", [waitlistEvent]);
    const foreign = await call(api, { method: 'POST', url: '/api/attendee/events?registration=1&id=EVT-REG-1', headers: { cookie, origin: 'https://evil.example.test' }, body: { sessionIds: [sessionB] } });
    assert.equal(foreign.status, 403); assert.equal(foreign.body.error, 'Request origin not allowed.');
    const posted = await call(api, { method: 'POST', url: '/api/attendee/events?registration=1&id=EVT-REG-1', headers: { cookie, origin }, body: { sessionIds: [sessionB] } });
    assert.equal(posted.status, 409); assert.equal(posted.body.error, "You're already registered for this event.");
    assert.equal((await call(api, { method: 'PUT', url: '/api/attendee/events', headers: { cookie } })).status, 405);
    assert.equal((await call(api, { method: 'POST', url: '/api/attendee/events?registration=1&id=EVT-REG-1', headers: { origin }, body: { sessionIds: [sessionB] } })).status, 401);

    // ─── E09-S05 (SCRUM-67): withdraw a registration ───
    await db.query("UPDATE client_organisations SET contact_email='events@client.example.test' WHERE id=$1", [org]);
    await db.query("INSERT INTO event_registrations(event_id,attendee_id,status) VALUES ($1,$2,'waitlisted')", [meetup, eli]);
    const placeNotices = async () => (await db.query(`SELECT n.message, d.channel FROM notifications n
      JOIN notification_deliveries d ON d.notification_id=n.id WHERE n.user_id=$1 AND n.title='Event update'`, [eli])).rows;
    const counts = async () => {
      const capacity = await eventCapacity(query, meetup);
      return [capacity.registered, ...capacity.sessions.map(session => session.registered)];
    };
    const fayUser = as(fay, 'fay@example.test');

    // TC_E09S05_01 and _05: one withdrawal releases the place in both selected Sessions and the Event, and
    // nobody else's registration changes. The Event has room again, so the waiting list hears (TC_E09S05_04).
    const fayRegistration = (await registerForEvent(pool, fayUser, 'EVT-REG-1', { sessionIds: [sessionA, sessionB] })).body.registration as { id: string };
    const before = await counts();
    const others = (await db.query("SELECT id, status FROM event_registrations WHERE attendee_id<>$1 ORDER BY id", [fay])).rows;
    const withdrawn = await withdrawRegistration(pool, fayUser, 'EVT-REG-1');
    assert.equal(withdrawn.status, 200);
    assert.deepEqual(await counts(), before.map(count => count - 1));
    const fayRow = (await db.query('SELECT status, withdrawn_at FROM event_registrations WHERE id=$1', [fayRegistration.id])).rows[0];
    assert.equal(fayRow.status, 'withdrawn'); assert.ok(fayRow.withdrawn_at);
    assert.deepEqual((await db.query("SELECT id, status FROM event_registrations WHERE attendee_id<>$1 ORDER BY id", [fay])).rows, others);
    const firstNotices = await placeNotices();
    assert.equal(firstNotices.length, 1); assert.equal(firstNotices[0].channel, 'email');
    assert.match(firstNotices[0].message, /^Community Meetup: A place is available\. Apply on a first-come basis; no place has been reserved for you\./);
    // AC 6: a repeat is refused clearly and releases nothing more.
    assert.deepEqual(await withdrawRegistration(pool, fayUser, 'EVT-REG-1'), { status: 409, body: { error: "You've already withdrawn from this event." } });
    assert.deepEqual(await counts(), before.map(count => count - 1));

    // The real handler: a foreign origin is refused; two simultaneous withdrawals serialise on the Event row.
    const withdrawUrl = '/api/attendee/events?registration=1&withdraw=1&id=EVT-REG-1';
    assert.equal((await call(api, { method: 'POST', url: withdrawUrl, headers: { cookie, origin: 'https://evil.example.test' } })).status, 403);
    const both = await Promise.all([1, 2].map(() => call(api, { method: 'POST', url: withdrawUrl, headers: { cookie, origin } })));
    assert.deepEqual(both.map(result => result.status).sort(), [200, 409]);
    assert.equal((await placeNotices()).length, 2);

    // TC_E09S05_03: after the deadline an approved place is refused with the client's contact, then the
    // Organiser's email when the client has none (D89); nothing changes.
    await db.query("UPDATE events SET withdrawal_deadline=now() - interval '1 minute' WHERE id=$1", [meetup]);
    assert.deepEqual(await withdrawRegistration(pool, caseyUser, 'EVT-REG-1'), { status: 409, body: {
      error: 'Withdrawal has closed. For help, contact events@client.example.test.', contact: 'events@client.example.test' } });
    await db.query("UPDATE client_organisations SET contact_email='' WHERE id=$1", [org]);
    assert.equal((await withdrawRegistration(pool, caseyUser, 'EVT-REG-1')).body.contact, 'organiser@example.test');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM event_registrations WHERE attendee_id=$1 AND status='registered'", [casey])).rows[0].n, 1);

    // D105: with registration closed and switched off, Casey still finds the event and sees why she can't withdraw.
    await db.query("UPDATE events SET registration_enabled=false, registration_closes_at=now() - interval '1 minute' WHERE id=$1", [meetup]);
    assert.deepEqual((await listOpenEvents(query, caseyUser)).map(event => event.eventCode), ['EVT-REG-1']);
    assert.deepEqual((await getRegistrationForm(query, caseyUser, 'EVT-REG-1')).withdrawal, { open: false, contact: 'organiser@example.test' });
    assert.deepEqual(await listOpenEvents(query, fayUser), []);
    await assert.rejects(getRegistrationForm(query, fayUser, 'EVT-REG-1'), { status: 409 });

    // D88: a Pending request holds no place, so it can be withdrawn after the deadline and tells nobody.
    await db.query("INSERT INTO event_registrations(event_id,attendee_id,status) VALUES ($1,$2,'pending')", [meetup, fay]);
    assert.equal((await withdrawRegistration(pool, fayUser, 'EVT-REG-1')).status, 200);
    assert.equal((await placeNotices()).length, 2);
  } finally {
    if (closeRuntime) await closeRuntime();
    if (pool) await pool.end();
    for (const key of ['DATABASE_URL', 'DATABASE_POOLER_URL', 'APP_URL', 'ADDITIONAL_ALLOWED_ORIGINS']) { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; }
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await db.end();
  }
});

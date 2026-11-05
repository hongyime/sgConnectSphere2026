import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client, Pool } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import { getEventRegistrations } from '../src/modules/attendeeRegistration/organiser';
import { getRegistrationForm, registerForEvent } from '../src/modules/attendeeRegistration/service';
import { updateEventInformationWithNotifications } from '../src/modules/eventNotifications/informationChange';
import type { Query } from '../src/modules/eventVisibility/service';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';
import { loginDatabase } from './helpers/loginDatabase.js';
import { eventCapacity } from '../src/modules/attendeeRegistration/capacity';

// E09-S03 on real PostgreSQL: the Organiser sets the Event-level registration
// period through the real edit service (PATCH /api/events?edit=1), and an
// Attendee sees and is held to it for every Session (T-42, T-79, T-85).
test('E09-S03: the Organiser sets one Event-level registration period that Attendees are held to', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Use a disposable TEST_DATABASE_URL');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect();
  const schema = `period_${randomUUID().replaceAll('-', '')}`;
  const [org, organiser, coordinator, attendee, meetup, hall, seminar] = Array.from({ length: 7 }, () => randomUUID());
  let pool: Pool | undefined;
  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`); await db.query(`SET search_path TO ${schema}, public`);
    const migrations = (await readdir(new URL('../database/migrations/', import.meta.url))).filter(file => file.endsWith('.sql')).sort();
    for (const migration of migrations) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    await db.query('INSERT INTO client_organisations(id,name) VALUES ($1,$2)', [org, 'Synthetic client']);
    for (const [id, role, email] of [[organiser, 'event_organiser', 'organiser@example.test'],
      [coordinator, 'event_coordinator', 'coordinator@example.test'], [attendee, 'attendee', 'casey@example.test']]) {
      await db.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role,contact_number,email_verified_at)
        VALUES ($1,$2,$3,'x',$4,$5,'+65 8000 0000',now())`, [id, role === 'attendee' ? null : org, email, `Synthetic ${role}`, role]);
    }
    // Each Session has its own venue, so the venue buffer guard has nothing to refuse.
    for (const [id, name] of [[hall, 'Grand Auditorium'], [seminar, 'Seminar Room B']]) {
      await db.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES ($1,$2,'Level 1',200,'07:00','23:00')", [id, name]);
    }
    // A Confirmed event 30 days out, 02:00-10:00Z (10 am-6 pm Singapore) whatever time the test runs,
    // taking registrations, with no period set yet.
    await db.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance,registration_enabled)
      VALUES ($1,'EVT-PERIOD',$2,$3,$4,'Community Meetup','confirmed',
        tstzrange(date_trunc('day', now()) + interval '30 days 2 hours', date_trunc('day', now()) + interval '30 days 10 hours','[)'),50,true)`,
    [meetup, organiser, coordinator, org]);
    const sessionA = (await db.query("UPDATE sessions SET title='Morning' WHERE event_id=$1 RETURNING id", [meetup])).rows[0].id as string;
    const sessionB = (await db.query(`INSERT INTO sessions(event_id,title,session_range,expected_attendance)
      SELECT id,'Afternoon',tstzrange(upper(event_range) - interval '3 hours', upper(event_range),'[)'),20 FROM events WHERE id=$1 RETURNING id`, [meetup])).rows[0].id as string;
    await db.query(`INSERT INTO venue_bookings(venue_id,event_id,session_id,booking_range,status,is_primary)
      SELECT CASE WHEN s.id=$3 THEN $1::uuid ELSE $4::uuid END,$2,s.id,s.session_range,'confirmed',s.id=$3
      FROM sessions s WHERE s.event_id=$2`, [hall, meetup, sessionA, seminar]);
    await db.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
      SELECT id,title,lower(event_range),upper(event_range),'Grand Auditorium','Level 1' FROM events WHERE id=$1`, [meetup]);

    const query: Query = (sql, values) => db.query(sql, values);
    const url = new URL(process.env.TEST_DATABASE_URL!); url.searchParams.set('options', `-csearch_path=${schema},public`);
    pool = new Pool({ connectionString: url.toString(), max: 3 });
    const olive: AuthenticatedUser = { id: organiser, email: 'organiser@example.test', role: 'event_organiser', clientOrgId: org, isActive: true, failedLoginCount: 0 };
    const casey: AuthenticatedUser = { id: attendee, email: 'casey@example.test', role: 'attendee', isActive: true, failedLoginCount: 0 };
    const start = (await db.query('SELECT lower(event_range) AS start FROM events WHERE id=$1', [meetup])).rows[0].start as Date;
    const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
    const save = (patch: Record<string, unknown>) => updateEventInformationWithNotifications(pool!, olive, 'EVT-PERIOD', patch);

    // TC_E09S03_01, _02, _06: a Confirmed event's Organiser sets the window, withdrawal deadline and waiting list directly.
    const [opens, closes, withdrawBy] = [at(2), at(20), at(25)];
    await save({ registrationDates: { opensAt: opens, closesAt: closes }, withdrawalDeadline: withdrawBy, waitlistEnabled: true });
    let view = await getEventRegistrations(query, olive, 'EVT-PERIOD');
    assert.deepEqual([view.event.opensAt, view.event.closesAt, view.event.withdrawalDeadline, view.event.waitlistEnabled], [opens, closes, withdrawBy, true]);
    const audit = (await db.query("SELECT field_changed FROM audit_logs WHERE event_id=$1 AND entity_type='event' ORDER BY field_changed", [meetup])).rows.map(row => row.field_changed);
    assert.deepEqual(audit, ['registrationDates', 'waitlistEnabled', 'withdrawalDeadline']);

    // TC_E09S03_03 and _09: before opening, neither Session can be registered and the opening date is stated.
    const before = await getRegistrationForm(query, casey, 'EVT-PERIOD');
    assert.equal(before.event.registrationState, 'not_yet_open'); assert.equal(before.event.opensAt, view.event.opensAt);
    for (const sessionIds of [[sessionA], [sessionB]]) {
      const refused = await registerForEvent(pool, casey, 'EVT-PERIOD', { sessionIds });
      assert.equal(refused.status, 409); assert.match(String(refused.body.error), /^Registration opens on /);
    }

    // TC_E09S03_05: closing after the event starts is refused until confirmed; nothing changes meanwhile.
    const lateClose = { registrationDates: { opensAt: at(-1), closesAt: new Date(start.getTime() + 3_600_000).toISOString() } };
    await assert.rejects(save(lateClose), { status: 428 });
    assert.equal((await getEventRegistrations(query, olive, 'EVT-PERIOD')).event.opensAt, view.event.opensAt);
    await save({ ...lateClose, confirmLateClose: true });
    view = await getEventRegistrations(query, olive, 'EVT-PERIOD');
    assert.equal(view.event.closesAt, new Date(start.getTime() + 3_600_000).toISOString());

    // TC_E09S03_09: inside the window both Sessions are selectable in one registration.
    const inside = await registerForEvent(pool, casey, 'EVT-PERIOD', { sessionIds: [sessionA, sessionB] });
    assert.equal(inside.status, 201);
    await db.query("UPDATE event_registrations SET status='withdrawn', withdrawn_at=now() WHERE attendee_id=$1", [attendee]);

    // TC_E09S03_04: once the closing date has passed, registration is refused.
    await save({ registrationDates: { opensAt: at(-3), closesAt: at(-1) } });
    const after = await registerForEvent(pool, casey, 'EVT-PERIOD', { sessionIds: [sessionB] });
    assert.deepEqual(after, { status: 409, body: { error: 'Registration for this event has closed.', registrationState: 'closed' } });

    // Another Organiser can't change the period.
    await assert.rejects(updateEventInformationWithNotifications(pool, { ...olive, id: coordinator }, 'EVT-PERIOD', { waitlistEnabled: false }), { status: 403 });
  } finally {
    if (pool) await pool.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await db.end();
  }
});

// TC_E09S03_07 / TC_E09S03_08: both window ends are inclusive. The service reads
// PostgreSQL's clock_timestamp(), so this test sets "the system clock" in the
// database: its schema defines its own clock_timestamp() reading a one-row
// table, and the pool puts that schema ahead of pg_catalog on the search_path.
test('TC_E09S03_07 TC_E09S03_08: registration succeeds at the exact opening and closing instants and is refused one second outside them', async () => {
  const f = await loginDatabase();
  const schema = (await f.pool.query('SELECT current_schema() AS s')).rows[0].s as string;
  const url = new URL(f.connectionString); url.searchParams.set('options', `-c search_path=${schema},pg_catalog,public`);
  const clocked = new Pool({ connectionString: url.href, max: 2 });
  try {
    await f.pool.query('CREATE TABLE test_clock (at timestamptz NOT NULL)');
    await f.pool.query(`CREATE FUNCTION ${schema}.clock_timestamp() RETURNS timestamptz LANGUAGE sql STABLE AS 'SELECT at FROM ${schema}.test_clock'`);
    const [org, organiser, venue, event] = Array.from({ length: 4 }, () => randomUUID());
    const attendees = Array.from({ length: 4 }, () => randomUUID());
    await f.pool.query('INSERT INTO client_organisations(id,name) VALUES ($1,$2)', [org, 'Synthetic client']);
    await f.pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role) VALUES ($1,$2,'organiser@example.test','x','Synthetic organiser','event_organiser')`, [organiser, org]);
    for (const [index, id] of attendees.entries()) {
      await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,contact_number,email_verified_at)
        VALUES ($1,$2,'x','Synthetic attendee','attendee','+65 8000 0000',now())`, [id, `attendee${index}@example.test`]);
    }
    await f.pool.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES ($1,'Grand Auditorium','Level 1',200,'07:00','23:00')", [venue]);
    await f.pool.query(`INSERT INTO events(id,event_code,organiser_id,client_org_id,title,status,event_range,expected_attendance,registration_enabled,
        registration_opens_at,registration_closes_at)
      VALUES ($1,'EVT-2001',$2,$3,'Tech Conference 2026','confirmed','[2030-11-20 09:00+08,2030-11-20 17:00+08)',50,true,
        '2026-10-01 09:00:00+08','2026-10-20 17:00:00+08')`, [event, organiser, org]);
    const session = (await f.pool.query('SELECT id FROM sessions WHERE event_id=$1', [event])).rows[0].id as string;
    await f.pool.query(`INSERT INTO venue_bookings(venue_id,event_id,session_id,booking_range,status,is_primary)
      SELECT $1,$2,id,session_range,'confirmed',true FROM sessions WHERE id=$3`, [venue, event, session]);
    await f.pool.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
      SELECT id,title,lower(event_range),upper(event_range),'Grand Auditorium','Level 1' FROM events WHERE id=$1`, [event]);
    await f.pool.query('INSERT INTO test_clock(at) VALUES (now())');

    const attendee = (index: number): AuthenticatedUser => ({ id: attendees[index]!, email: `attendee${index}@example.test`, role: 'attendee', isActive: true, failedLoginCount: 0 });
    const attemptAt = async (instant: string, index: number) => {
      await f.pool.query('UPDATE test_clock SET at=$1', [instant]);
      return registerForEvent(clocked, attendee(index), 'EVT-2001', { sessionIds: [session] });
    };
    const registered = async () => (await eventCapacity((sql, values) => f.pool.query(sql, values), event)).registered;

    // TC_E09S03_07: one second before opening is refused; exactly at opening a place is reserved.
    const early = await attemptAt('2026-10-01T08:59:59+08:00', 0);
    assert.equal(early.status, 409); assert.equal(early.body.registrationState, 'not_yet_open');
    const atOpening = await attemptAt('2026-10-01T09:00:00+08:00', 0);
    assert.equal(atOpening.status, 201);
    assert.equal((atOpening.body.registration as { status: string }).status, 'registered');
    assert.equal(await registered(), 1);

    // TC_E09S03_08: exactly at closing still succeeds; one second later is refused.
    const atClosing = await attemptAt('2026-10-20T17:00:00+08:00', 1);
    assert.equal(atClosing.status, 201);
    assert.equal((atClosing.body.registration as { status: string }).status, 'registered');
    const late = await attemptAt('2026-10-20T17:00:01+08:00', 2);
    assert.deepEqual(late, { status: 409, body: { error: 'Registration for this event has closed.', registrationState: 'closed' } });
    assert.equal(await registered(), 2);
  } finally {
    await clocked.end();
    await f.close();
  }
});

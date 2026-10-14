import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';

test('TC_E04S02_01 TC_E04S02_02: migration backfills and keeps single-session Event data aligned', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const schema = `event_sessions_${randomUUID().replaceAll('-', '')}`;
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();

  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET search_path TO ${schema}, public`);

    const migrations = (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql') && name !== '0014_event_sessions.sql')
      .sort((a, b) => a.localeCompare(b));
    for (const migration of migrations) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    const org = randomUUID();
    const organiser = randomUUID();
    const attendee = randomUUID();
    const layout = randomUUID();
    const accessibility = randomUUID();
    const facility = randomUUID();
    const venue = randomUUID();
    const equipment = randomUUID();
    const event = randomUUID();
    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Session migration client']);
    await db.query(
      `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
       VALUES ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser')`,
      [organiser, org],
    );
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES ($1, 'attendee@example.test', 'unused', 'Attendee', 'attendee')`,
      [attendee],
    );
    await db.query('INSERT INTO room_layouts (id, code, label) VALUES ($1, $2, $3)', [layout, 'session-layout', 'Session layout']);
    await db.query('INSERT INTO accessibility_features (id, code, label) VALUES ($1, $2, $3)', [accessibility, 'step-free', 'Step-free access']);
    await db.query('INSERT INTO facilities (id, code, label) VALUES ($1, $2, $3)', [facility, 'projector', 'Projector']);
    await db.query(
      `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
       VALUES ($1, 'Session venue', 'Singapore', 100, '08:00', '22:00')`,
      [venue],
    );
    await db.query(
      `INSERT INTO equipment (id, name, category, total_quantity)
       VALUES ($1, 'Session projector', 'AV', 2)`,
      [equipment],
    );

    await db.query(
      `INSERT INTO events (
        id, organiser_id, client_org_id, title, status, event_range,
        expected_attendance, layout_id, accessibility_note, venue_requirements,
        equipment_requirements, layout_preference
      ) VALUES (
        $1, $2, $3, 'Legacy multi-session candidate', 'planning',
        tstzrange('2027-03-12 09:00+08', '2027-03-12 11:00+08', '[)'),
        40, $4, 'Wheelchair route', 'Ground-floor room', 'One projector', 'Theatre'
      )`,
      [event, organiser, org, layout],
    );
    await db.query('INSERT INTO event_accessibility_needs (event_id, feature_id) VALUES ($1, $2)', [event, accessibility]);
    await db.query('INSERT INTO event_facility_needs (event_id, facility_id) VALUES ($1, $2)', [event, facility]);
    await db.query(
      `INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
       VALUES ($1, $2, tstzrange('2027-03-12 09:00+08', '2027-03-12 11:00+08', '[)'), 'pending')`,
      [venue, event],
    );
    const requestId = randomUUID();
    await db.query(
      `INSERT INTO equipment_requests (id, event_id, equipment_id, quantity_requested, requested_by)
       VALUES ($1, $2, $3, 1, $4)`,
      [requestId, event, equipment, organiser],
    );
    await db.query(
      `INSERT INTO equipment_reservations (request_id, event_id, equipment_id, quantity_reserved, reservation_range)
       VALUES ($1, $2, $3, 1, tstzrange('2027-03-12 09:00+08', '2027-03-12 11:00+08', '[)'))`,
      [requestId, event, equipment],
    );
    await db.query('INSERT INTO event_registrations (event_id, attendee_id) VALUES ($1, $2)', [event, attendee]);
    await db.query(
      `INSERT INTO tech_support_requests (event_id, support_range, requested_by)
       VALUES ($1, tstzrange('2027-03-12 09:00+08', '2027-03-12 11:00+08', '[)'), $2)`,
      [event, organiser],
    );

    await db.query(await readFile(new URL('../database/migrations/0014_event_sessions.sql', import.meta.url), 'utf8'));

    const session = (await db.query<{
      id: string; event_id: string; start_at: Date; end_at: Date; expected_attendance: number;
      layout_id: string; venue_requirements: string; accessibility_note: string;
      equipment_requirements: string; layout_preference: string;
    }>(
      `SELECT id, event_id, lower(session_range) AS start_at, upper(session_range) AS end_at,
              expected_attendance, layout_id, venue_requirements, accessibility_note,
              equipment_requirements, layout_preference
       FROM sessions WHERE event_id = $1`,
      [event],
    )).rows[0];
    assert.ok(session, 'existing Event receives one child Session');
    assert.equal(session.expected_attendance, 40);
    assert.equal(session.layout_id, layout);
    assert.equal(session.venue_requirements, 'Ground-floor room');
    assert.equal(session.accessibility_note, 'Wheelchair route');
    assert.equal(session.equipment_requirements, 'One projector');
    assert.equal(session.layout_preference, 'Theatre');
    assert.equal(session.start_at.toISOString(), new Date('2027-03-12T01:00:00.000Z').toISOString());
    assert.equal(session.end_at.toISOString(), new Date('2027-03-12T03:00:00.000Z').toISOString());
    assert.equal((await db.query('SELECT count(*)::int AS count FROM session_accessibility_needs WHERE session_id = $1', [session.id])).rows[0].count, 1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM session_facility_needs WHERE session_id = $1', [session.id])).rows[0].count, 1);
    assert.equal((await db.query('SELECT session_id FROM venue_bookings WHERE event_id = $1', [event])).rows[0].session_id, session.id);
    assert.equal((await db.query('SELECT session_id FROM equipment_requests WHERE event_id = $1', [event])).rows[0].session_id, session.id);
    assert.equal((await db.query('SELECT session_id FROM equipment_reservations WHERE event_id = $1', [event])).rows[0].session_id, session.id);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM event_registrations WHERE event_id = $1', [event])).rows[0].count, 1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM tech_support_requests WHERE event_id = $1', [event])).rows[0].count, 1);

    const newEvent = randomUUID();
    await db.query(
      `INSERT INTO events (id, organiser_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $3, 'New single-session event', 'draft',
               tstzrange('2027-04-01 09:00+08', '2027-04-01 10:00+08', '[)'), 25)`,
      [newEvent, organiser, org],
    );
    const newSession = (await db.query<{ id: string; expected_attendance: number }>(
      'SELECT id, expected_attendance FROM sessions WHERE event_id = $1', [newEvent],
    )).rows[0];
    assert.ok(newSession, 'a newly inserted Event receives one default Session');
    assert.equal(newSession.expected_attendance, 25);

    await db.query(
      `UPDATE events SET event_range = tstzrange('2027-04-01 10:00+08', '2027-04-01 11:00+08', '[)'),
                        expected_attendance = 30
       WHERE id = $1`,
      [newEvent],
    );
    const syncedSession = (await db.query<{ start_at: Date; end_at: Date; expected_attendance: number }>(
      `SELECT lower(session_range) AS start_at, upper(session_range) AS end_at, expected_attendance
       FROM sessions WHERE id = $1`, [newSession.id],
    )).rows[0];
    assert.equal(syncedSession.start_at.toISOString(), '2027-04-01T02:00:00.000Z');
    assert.equal(syncedSession.end_at.toISOString(), '2027-04-01T03:00:00.000Z');
    assert.equal(syncedSession.expected_attendance, 30);

    const linkedBooking = (await db.query<{ session_id: string }>(
      `INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
       VALUES ($1, $2, tstzrange('2027-04-01 09:00+08', '2027-04-01 10:00+08', '[)'), 'pending')
       RETURNING session_id`,
      [venue, newEvent],
    )).rows[0];
    assert.equal(linkedBooking.session_id, newSession.id, 'legacy single-session booking writes resolve to the only Session');

    const secondSession = (await db.query<{ id: string }>(
      `INSERT INTO sessions (event_id, session_range, expected_attendance)
       VALUES ($1, tstzrange('2027-04-01 11:00+08', '2027-04-01 12:00+08', '[)'), 10)
       RETURNING id`,
      [newEvent],
    )).rows[0];
    assert.ok(secondSession);
    const savedSecondSession = (await db.query<{ start_at: Date; end_at: Date; expected_attendance: number }>(
      `SELECT lower(session_range) AS start_at, upper(session_range) AS end_at, expected_attendance
       FROM sessions WHERE id = $1`, [secondSession.id],
    )).rows[0];
    assert.equal(savedSecondSession.start_at.toISOString(), '2027-04-01T03:00:00.000Z');
    assert.equal(savedSecondSession.end_at.toISOString(), '2027-04-01T04:00:00.000Z');
    assert.equal(savedSecondSession.expected_attendance, 10);
    await assert.rejects(
      db.query(
        `INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
         VALUES ($1, $2, tstzrange('2027-04-01 11:00+08', '2027-04-01 12:00+08', '[)'), 'pending')`,
        [venue, newEvent],
      ),
      (error: unknown) => (error as { code?: string }).code === '23514',
      'multi-session Events must provide the selected session_id explicitly',
    );
  } finally {
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
    await db.end();
  }
});

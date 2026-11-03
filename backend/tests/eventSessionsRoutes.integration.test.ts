// T-59 rollback-only database test for E04-S02 Session authoring.
//
// The whole run is one transaction that is always rolled back, so it is safe
// against the shared Supabase project's `test` schema and needs no local
// PostgreSQL. Every write, including the fixture rows, is undone by the final
// ROLLBACK. Only run this against `test`; the assertions below fail rather than
// write to `public` if the Session tables are missing there.
//
//   $env:TEST_DATABASE_URL = "<DATABASE_POOLER_URL from .env>"
//   npm run test:event-sessions:db --workspace backend
//
// inTransaction() would normally COMMIT, so the injected pool turns its
// BEGIN/COMMIT/ROLLBACK into savepoints on the single rollback-only connection.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { hashPassword } from '../src/modules/accessControl/passwords.js';
import { addSession, editSession, getSessions, removeSession } from '../src/modules/eventSessions/service.js';
import { createSessionRepository } from '../src/modules/eventSessions/repository.js';
import { venueSearch } from '../src/modules/venueBooking/search.js';
import { submitBooking } from '../src/modules/venueBooking/bookingSubmission.js';

test('TC_E04S02_05: deleting a Session releases its booking, audits it and notifies Venue Staff, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    // Rollback-only: this schema and every fixture row live in the transaction that is rolled back.
    const schema = `session_authoring_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    const migrations = (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));
    for (const migration of migrations) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    let savepoint = 0;
    const savepointPool = {
      async query(sql: string, values?: unknown[]) {
        return client.query(sql, values);
      },
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            if (sql === 'BEGIN') {
              savepoint += 1;
              return client.query(`SAVEPOINT session_operation_${savepoint}`);
            }
            if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT session_operation_${savepoint}`);
            if (sql === 'ROLLBACK') {
              const name = `session_operation_${savepoint}`;
              await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
              return client.query(`RELEASE SAVEPOINT ${name}`);
            }
            return client.query(sql, values);
          },
          release() {},
        };
      },
    } as unknown as Pool;
    const repository = createSessionRepository(savepointPool);

    const org = randomUUID();
    const layout = randomUUID();
    const venue = randomUUID();
    const organiserId = randomUUID();
    const staffId = randomUUID();
    const eventId = randomUUID();
    const digest = await hashPassword('synthetic-session-password');

    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    await client.query('INSERT INTO room_layouts (id, code, label) VALUES ($1, $2, $3)', [layout, layout, 'Synthetic']);
    await client.query(
      `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
       VALUES ($1, 'Session Venue', 'Level 1', 120, '07:00', '23:00')`, [venue],
    );
    for (const [id, role] of [[organiserId, 'event_organiser'], [staffId, 'venue_staff']] as const) {
      await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, role, `${id}@example.test`, digest, role, org],
      );
    }
    await client.query('INSERT INTO venue_staff_assignments (venue_id, staff_id) VALUES ($1, $2)', [venue, staffId]);
    await client.query(
      `INSERT INTO events (id, organiser_id, client_org_id, title, status, event_range,
         expected_attendance, layout_id, withdrawal_deadline)
       VALUES ($1, $2, $3, 'Synthetic multi-session event', 'draft',
         tstzrange(now() + interval '10 days', now() + interval '10 days 2 hours', '[)'),
         100, $4, now() - interval '1 day')`,
      [eventId, organiserId, org, layout],
    );

    const initial = await getSessions(repository, organiserId, eventId);
    assert.equal(initial.sessions.length, 1, 'migration 0014 backfills one Session per Event');
    const first = initial.sessions[0]!;

    const second = await addSession(repository, organiserId, eventId, {
      title: 'Second',
      startAt: new Date(Date.now() + 11 * 864e5).toISOString(),
      endAt: new Date(Date.now() + 11 * 864e5 + 36e5).toISOString(),
      expectedAttendance: 40,
    });
    const third = await addSession(repository, organiserId, eventId, {
      title: 'Third',
      startAt: new Date(Date.now() + 12 * 864e5).toISOString(),
      endAt: new Date(Date.now() + 12 * 864e5 + 36e5).toISOString(),
      expectedAttendance: 20,
    });
    assert.equal((await getSessions(repository, organiserId, eventId)).sessions.length, 3);

    const edited = await editSession(repository, organiserId, eventId, second.session.id, {
      title: 'Second (edited)',
      startAt: second.session.startAt.toISOString(),
      endAt: second.session.endAt.toISOString(),
      expectedAttendance: 44,
    });
    assert.equal(edited.session.title, 'Second (edited)');
    assert.equal(edited.session.expectedAttendance, 44);

    const bookingId = randomUUID();
    const secondBookingId = randomUUID();
    await client.query(
      `INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status, session_id)
       VALUES ($1, $2, $3, tstzrange(now() + interval '10 days', now() + interval '10 days 1 hour', '[)'), 'confirmed', $4)`,
      [bookingId, venue, eventId, first.id],
    );
    await client.query(
      `INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status, session_id)
       VALUES ($1, $2, $3, tstzrange(now() + interval '12 days', now() + interval '12 days 1 hour', '[)'), 'confirmed', $4)`,
      [secondBookingId, venue, eventId, third.session.id],
    );

    const removal = await removeSession(repository, organiserId, eventId, first.id);
    assert.deepEqual(
      { bookings: removal.releasedBookings, staff: removal.notifiedStaff },
      { bookings: 1, staff: 1 },
    );

    const booking = (await client.query<{ status: string; session_id: string | null }>(
      'SELECT status, session_id FROM venue_bookings WHERE id = $1', [bookingId],
    )).rows[0]!;
    assert.equal(booking.status, 'released');
    assert.equal(booking.session_id, null, 'the released booking keeps no Session link');

    const otherBooking = (await client.query<{ status: string; session_id: string | null }>(
      'SELECT status, session_id FROM venue_bookings WHERE id = $1', [secondBookingId],
    )).rows[0]!;
    assert.equal(otherBooking.status, 'confirmed', 'another Session keeps its own booking');
    assert.equal(otherBooking.session_id, third.session.id);

    const audit = await client.query(
      `SELECT action FROM audit_logs WHERE entity_type = 'venue_booking' AND entity_id = $1`, [bookingId],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(audit.rows[0]!.action, 'Booking Released');

    const deletion = await client.query(
      `SELECT action, old_value FROM audit_logs WHERE entity_type = 'event' AND event_id = $1 AND field_changed = 'session'`, [eventId],
    );
    assert.deepEqual(deletion.rows, [{ action: 'Session Deleted', old_value: 'Untitled Session' }],
      'the deletion itself is in the activity log');

    const notices = await client.query(
      'SELECT title FROM notifications WHERE user_id = $1 AND event_id = $2', [staffId, eventId],
    );
    assert.equal(notices.rowCount, 1);
    assert.equal(notices.rows[0]!.title, 'Venue booking released');

    const remaining = await getSessions(repository, organiserId, eventId);
    assert.deepEqual(remaining.sessions.map(s => s.id), [second.session.id, third.session.id]);

    await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [eventId]);
    await assert.rejects(
      addSession(repository, organiserId, eventId, {
        startAt: new Date(Date.now() + 13 * 864e5).toISOString(),
        endAt: new Date(Date.now() + 13 * 864e5 + 36e5).toISOString(),
        expectedAttendance: 10,
      }),
      (error: { status?: number }) => error.status === 409,
    );

    const planningEdit = await editSession(repository, organiserId, eventId, third.session.id, {
      startAt: third.session.startAt.toISOString(),
      endAt: third.session.endAt.toISOString(),
      expectedAttendance: 500,
    });
    assert.equal(planningEdit.impact.affected, true);
    const flagged = (await client.query<{ requires_reconfirmation: boolean }>(
      'SELECT requires_reconfirmation FROM venue_bookings WHERE id = $1', [secondBookingId],
    )).rows[0]!;
    assert.equal(flagged.requires_reconfirmation, true);
    const impactAudit = await client.query(
      `SELECT action FROM audit_logs WHERE entity_id = $1 AND field_changed = 'requires_reconfirmation'`,
      [secondBookingId],
    );
    assert.equal(impactAudit.rowCount, 1);

    await assert.rejects(
      editSession(repository, organiserId, eventId, third.session.id, {
        startAt: third.session.startAt.toISOString(),
        endAt: third.session.endAt.toISOString(),
        expectedAttendance: 600,
      }, { reviewed: 'stale-revision' }),
      (error: { status?: number }) => error.status === 409,
    );
    const afterStale = (await client.query<{ expected_attendance: number }>(
      'SELECT expected_attendance FROM sessions WHERE id = $1', [third.session.id],
    )).rows[0]!;
    assert.equal(afterStale.expected_attendance, 500);

    const preview = await editSession(repository, organiserId, eventId, third.session.id, {
      startAt: third.session.startAt.toISOString(),
      endAt: third.session.endAt.toISOString(),
      expectedAttendance: 700,
    }, { preview: true });
    assert.equal(preview.preview.impact.affected, true);
    const afterPreview = (await client.query<{ expected_attendance: number }>(
      'SELECT expected_attendance FROM sessions WHERE id = $1', [third.session.id],
    )).rows[0]!;
    assert.equal(afterPreview.expected_attendance, 500);

    const planningRemoval = await removeSession(repository, organiserId, eventId, second.session.id);
    assert.equal(planningRemoval.deleted, true);

    await assert.rejects(
      removeSession(repository, organiserId, eventId, third.session.id),
      (error: { status?: number }) => error.status === 409,
    );
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

test('TC_E04S02_03: venue suitability uses each Session own attendance, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    const schema = `session_suitability_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    const org = randomUUID();
    const coordinator = randomUUID();
    const eventId = randomUUID();
    const smallVenue = randomUUID();
    const largeVenue = randomUUID();
    const digest = await hashPassword('synthetic-suitability-password');
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    await client.query(
      `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id)
       VALUES ($1, 'Coordinator', $2, $3, 'event_coordinator', $4)`,
      [coordinator, `${coordinator}@example.test`, digest, org],
    );
    for (const [id, capacity] of [[smallVenue, 50], [largeVenue, 500]] as const) {
      await client.query(
        `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
         VALUES ($1, $2, 'Level 1', $3, '00:00', '23:59')`,
        [id, `Venue ${capacity}`, capacity],
      );
    }
    await client.query(
      `INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $2, $3, 'Synthetic suitability event', 'planning',
         tstzrange('2027-03-12T01:00:00Z', '2027-03-12T05:00:00Z', '[)'), 100)`,
      [eventId, coordinator, org],
    );
    const sessions = (await client.query<{ id: string }>(
      `SELECT id FROM sessions WHERE event_id = $1`, [eventId],
    )).rows;
    const first = sessions[0]!.id;
    await client.query(
      `UPDATE sessions SET session_range = tstzrange('2027-03-12T01:00:00Z','2027-03-12T02:00:00Z','[)'),
         expected_attendance = 40 WHERE id = $1`, [first],
    );
    const second = randomUUID();
    await client.query(
      `INSERT INTO sessions (id, event_id, title, session_range, expected_attendance)
       VALUES ($1, $2, 'Afternoon', tstzrange('2027-03-12T03:00:00Z','2027-03-12T04:00:00Z','[)'), 120)`,
      [second, eventId],
    );

    const user = { id: coordinator, email: `${coordinator}@example.test`, role: 'event_coordinator' as const, clientOrgId: org, isActive: true };
    const query = (sql: string, values?: unknown[]) => client.query(sql, values);
    const searchFor = async (sessionId: string) => venueSearch(query, user,
      new URLSearchParams({ event_id: eventId, session_id: sessionId, search: '1' }));

    const forty = await searchFor(first);
    const oneTwenty = await searchFor(second);
    assert.equal(forty.criteria!.attendance, 40);
    assert.equal(oneTwenty.criteria!.attendance, 120);
    assert.equal(forty.criteria!.start, '2027-03-12T01:00:00.000Z');
    assert.equal(oneTwenty.criteria!.start, '2027-03-12T03:00:00.000Z');

    const smallForForty = forty.venues!.find(venue => venue.id === smallVenue)!;
    const smallForOneTwenty = oneTwenty.venues!.find(venue => venue.id === smallVenue)!;
    assert.equal(smallForForty.suitable, true, '50 places suit the 40-place Session');
    assert.equal(smallForOneTwenty.suitable, false, '50 places do not suit the 120-place Session');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

test('TC_E04S02_04: one Event books the same venue for two Sessions, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    const schema = `session_bookings_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    let savepoint = 0;
    const savepointPool = {
      async query(sql: string, values?: unknown[]) { return client.query(sql, values); },
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            if (sql === 'BEGIN') { savepoint += 1; return client.query(`SAVEPOINT booking_operation_${savepoint}`); }
            if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT booking_operation_${savepoint}`);
            if (sql === 'ROLLBACK') {
              const name = `booking_operation_${savepoint}`;
              await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
              return client.query(`RELEASE SAVEPOINT ${name}`);
            }
            return client.query(sql, values);
          },
          release() {},
        };
      },
    } as unknown as Pool;

    const org = randomUUID();
    const coordinator = randomUUID();
    const eventId = randomUUID();
    const venue = randomUUID();
    const digest = await hashPassword('synthetic-booking-password');
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    await client.query(
      `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id)
       VALUES ($1, 'Coordinator', $2, $3, 'event_coordinator', $4)`,
      [coordinator, `${coordinator}@example.test`, digest, org],
    );
    await client.query(
      `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at, setup_time_minutes, turnaround_time_minutes)
       VALUES ($1, 'Shared Venue', 'Level 2', 200, '00:00', '23:59', 0, 0)`, [venue],
    );
    await client.query(
      `INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $2, $3, 'Synthetic two-session event', 'planning',
         tstzrange('2027-03-12T01:00:00Z', '2027-03-12T05:00:00Z', '[)'), 80)`,
      [eventId, coordinator, org],
    );
    const first = (await client.query<{ id: string }>('SELECT id FROM sessions WHERE event_id = $1', [eventId])).rows[0]!.id;
    await client.query(
      `UPDATE sessions SET session_range = tstzrange('2027-03-12T01:00:00Z','2027-03-12T02:00:00Z','[)'),
         expected_attendance = 40 WHERE id = $1`, [first],
    );
    const second = randomUUID();
    await client.query(
      `INSERT INTO sessions (id, event_id, title, session_range, expected_attendance)
       VALUES ($1, $2, 'Afternoon', tstzrange('2027-03-12T03:00:00Z','2027-03-12T04:00:00Z','[)'), 40)`,
      [second, eventId],
    );

    const user = { id: coordinator, email: `${coordinator}@example.test`, role: 'event_coordinator' as const, clientOrgId: org, isActive: true };
    const book = (sessionId: string, startsAt: string, endsAt: string) => submitBooking(savepointPool, user, {
      event_id: eventId,
      venue_id: venue,
      session_id: sessionId,
      starts_at: startsAt,
      ends_at: endsAt,
      purpose: null,
      headcount: null,
    }, randomUUID());

    const morning = await book(first, '2027-03-12T01:00:00Z', '2027-03-12T02:00:00Z');
    const afternoon = await book(second, '2027-03-12T03:00:00Z', '2027-03-12T04:00:00Z');
    assert.equal(morning.status, 201);
    assert.equal(afternoon.status, 201);
    assert.equal(morning.body.booking.session_id, first);
    assert.equal(afternoon.body.booking.session_id, second);

    const rows = (await client.query<{ session_id: string }>(
      'SELECT session_id FROM venue_bookings WHERE event_id = $1 ORDER BY session_id', [eventId],
    )).rows;
    assert.equal(rows.length, 2, 'the same venue holds one booking per Session');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

test('TC_E04S02_03: each Session is judged on its own accessibility needs, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    const schema = `session_needs_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    let savepoint = 0;
    const savepointPool = {
      async query(sql: string, values?: unknown[]) { return client.query(sql, values); },
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            if (sql === 'BEGIN') { savepoint += 1; return client.query(`SAVEPOINT session_needs_${savepoint}`); }
            if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT session_needs_${savepoint}`);
            if (sql === 'ROLLBACK') {
              await client.query(`ROLLBACK TO SAVEPOINT session_needs_${savepoint}`);
              return client.query(`RELEASE SAVEPOINT session_needs_${savepoint}`);
            }
            return client.query(sql, values);
          },
          release() {},
        };
      },
    } as unknown as Pool;
    const repository = createSessionRepository(savepointPool);

    const org = randomUUID();
    const organiserId = randomUUID();
    const coordinatorId = randomUUID();
    const eventId = randomUUID();
    const stepFree = randomUUID();
    const accessibleVenue = randomUUID();
    const stairsVenue = randomUUID();
    const digest = await hashPassword('synthetic-session-needs-password');
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    for (const [id, role] of [[organiserId, 'event_organiser'], [coordinatorId, 'event_coordinator']] as const) {
      await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, role, `${id}@example.test`, digest, role, org],
      );
    }
    await client.query('INSERT INTO accessibility_features (id, code, label) VALUES ($1, $2, $3)', [stepFree, `step-free-${stepFree}`, 'Step-free access']);
    for (const [id, name] of [[accessibleVenue, 'Step-free hall'], [stairsVenue, 'Stairs-only hall']] as const) {
      await client.query(
        `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, $2, 'Level 1', 200, '00:00', '23:59')`,
        [id, name],
      );
    }
    await client.query('INSERT INTO venue_accessibility_features (venue_id, feature_id) VALUES ($1, $2)', [accessibleVenue, stepFree]);
    await client.query(
      `INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $3, $4, 'Synthetic needs event', 'draft',
         tstzrange('2027-03-12T01:00:00Z', '2027-03-13T09:00:00Z', '[)'), 40)`,
      [eventId, organiserId, coordinatorId, org],
    );
    // The request form records accessibility on the Event, not on its Session.
    await client.query('INSERT INTO event_accessibility_needs (event_id, feature_id) VALUES ($1, $2)', [eventId, stepFree]);

    const user = { id: coordinatorId, email: `${coordinatorId}@example.test`, role: 'event_coordinator' as const, clientOrgId: org, isActive: true };
    const query = (sql: string, values?: unknown[]) => client.query(sql, values);
    const suitable = async (sessionId: string) => {
      const result = await venueSearch(query, user, new URLSearchParams({ event_id: eventId, session_id: sessionId, search: '1' }));
      return Object.fromEntries(result.venues!.filter(venue => [accessibleVenue, stairsVenue].includes(venue.id))
        .map(venue => [venue.id, venue.suitable]));
    };

    const [sole] = (await getSessions(repository, organiserId, eventId)).sessions;
    await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [eventId]);
    assert.deepEqual(await suitable(sole!.id), { [accessibleVenue]: true, [stairsVenue]: false },
      'a sole Session with no needs of its own follows the Event');

    await client.query(`UPDATE events SET status = 'draft' WHERE id = $1`, [eventId]);
    const afternoon = await addSession(repository, organiserId, eventId, {
      title: 'Afternoon',
      startAt: '2027-03-13T05:00:00.000Z',
      endAt: '2027-03-13T08:00:00.000Z',
      expectedAttendance: 120,
      accessibilityFeatureIds: [],
    });
    assert.deepEqual(afternoon.session.accessibilityFeatureIds, []);
    const listed = await getSessions(repository, organiserId, eventId);
    assert.deepEqual(listed.sessions.find(item => item.id === sole!.id)!.accessibilityFeatureIds, [stepFree],
      'the first Session keeps the Event needs once a second Session exists');
    assert.ok(listed.options.accessibility.some(option => option.id === stepFree));

    await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [eventId]);
    assert.deepEqual(await suitable(sole!.id), { [accessibleVenue]: true, [stairsVenue]: false });
    assert.deepEqual(await suitable(afternoon.session.id), { [accessibleVenue]: true, [stairsVenue]: true },
      'the Afternoon Session needs no step-free access');

    const edited = await editSession(repository, organiserId, eventId, afternoon.session.id, {
      title: 'Afternoon',
      startAt: '2027-03-13T05:00:00.000Z',
      endAt: '2027-03-13T08:00:00.000Z',
      expectedAttendance: 120,
      accessibilityFeatureIds: [stepFree],
    });
    assert.ok('session' in edited);
    assert.deepEqual(await suitable(afternoon.session.id), { [accessibleVenue]: true, [stairsVenue]: false });

    await assert.rejects(
      editSession(repository, organiserId, eventId, afternoon.session.id, {
        startAt: '2027-03-13T05:00:00.000Z',
        endAt: '2027-03-13T08:00:00.000Z',
        expectedAttendance: 120,
        facilityIds: [randomUUID()],
      }),
      (error: { status?: number }) => error.status === 400,
    );

    const setup = await venueSearch(query, user, new URLSearchParams({ event_id: eventId }));
    assert.deepEqual((setup as { sessions: { id: string }[] }).sessions.map(item => item.id), [sole!.id, afternoon.session.id],
      'venue search lists the Sessions to choose from');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

// #408 review (Ji Ning, Xiang Ying): a requirement-only Planning edit must flag
// that Session's bookings, and deleting a Session must not change what the
// survivor needs, including a deliberately empty list.
test('TC_E04S02_03 TC_E04S02_05: requirement edits flag only that Session and a survivor keeps its needs, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    const schema = `session_review_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    let savepoint = 0;
    const savepointPool = {
      async query(sql: string, values?: unknown[]) { return client.query(sql, values); },
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            if (sql === 'BEGIN') { savepoint += 1; return client.query(`SAVEPOINT session_review_${savepoint}`); }
            if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT session_review_${savepoint}`);
            if (sql === 'ROLLBACK') {
              await client.query(`ROLLBACK TO SAVEPOINT session_review_${savepoint}`);
              return client.query(`RELEASE SAVEPOINT session_review_${savepoint}`);
            }
            return client.query(sql, values);
          },
          release() {},
        };
      },
    } as unknown as Pool;
    const repository = createSessionRepository(savepointPool);

    const org = randomUUID();
    const organiserId = randomUUID();
    const coordinatorId = randomUUID();
    const stepFree = randomUUID();
    const projector = randomUUID();
    const theatre = randomUUID();
    const equippedVenue = randomUUID();
    const plainVenue = randomUUID();
    // Holds the part 1 bookings, so the two venues being compared stay available.
    const bookedVenue = randomUUID();
    const digest = await hashPassword('synthetic-session-review-password');
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    for (const [id, role] of [[organiserId, 'event_organiser'], [coordinatorId, 'event_coordinator']] as const) {
      await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, role, `${id}@example.test`, digest, role, org],
      );
    }
    await client.query('INSERT INTO accessibility_features (id, code, label) VALUES ($1, $2, $3)', [stepFree, `step-free-${stepFree}`, 'Step-free access']);
    await client.query('INSERT INTO facilities (id, code, label) VALUES ($1, $2, $3)', [projector, `projector-${projector}`, 'Projector']);
    await client.query('INSERT INTO room_layouts (id, code, label) VALUES ($1, $2, $3)', [theatre, `theatre-${theatre}`, 'Theatre']);
    for (const [id, name] of [[equippedVenue, 'Equipped hall'], [plainVenue, 'Plain hall'], [bookedVenue, 'Booked hall']] as const) {
      await client.query(
        `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, $2, 'Level 1', 200, '00:00', '23:59')`,
        [id, name],
      );
    }
    await client.query('INSERT INTO venue_accessibility_features (venue_id, feature_id) VALUES ($1, $2)', [equippedVenue, stepFree]);
    await client.query('INSERT INTO venue_facilities (venue_id, facility_id) VALUES ($1, $2)', [equippedVenue, projector]);

    const user = { id: coordinatorId, email: `${coordinatorId}@example.test`, role: 'event_coordinator' as const, clientOrgId: org, isActive: true };
    const query = (sql: string, values?: unknown[]) => client.query(sql, values);
    const later = { startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 40 };

    // A draft whose Event needs step-free access and a projector, with a second
    // Session given its own needs; the first Session keeps the Event's.
    async function twoSessionEvent(second: { accessibilityFeatureIds: string[]; facilityIds: string[] }) {
      const eventId = randomUUID();
      await client.query(
        `INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
         VALUES ($1, $2, $3, $4, 'Synthetic review event', 'draft', tstzrange('2027-03-12T01:00:00Z', '2027-03-13T09:00:00Z', '[)'), 40)`,
        [eventId, organiserId, coordinatorId, org],
      );
      await client.query('INSERT INTO event_accessibility_needs (event_id, feature_id) VALUES ($1, $2)', [eventId, stepFree]);
      await client.query('INSERT INTO event_facility_needs (event_id, facility_id) VALUES ($1, $2)', [eventId, projector]);
      const [first] = (await getSessions(repository, organiserId, eventId)).sessions;
      const added = await addSession(repository, organiserId, eventId, { title: 'Second', ...later, ...second });
      await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [eventId]);
      return { eventId, firstId: first!.id, secondId: added.session.id };
    }
    const suitable = async (eventId: string, sessionId: string) => {
      const result = await venueSearch(query, user, new URLSearchParams({ event_id: eventId, session_id: sessionId, search: '1' }));
      return Object.fromEntries(result.venues!.filter(venue => [equippedVenue, plainVenue].includes(venue.id))
        .map(venue => [venue.id, venue.suitable]));
    };

    // 1. Requirement-only edits, with times, attendance and capacity unchanged.
    const edited = await twoSessionEvent({ accessibilityFeatureIds: [], facilityIds: [] });
    const bookingFor = async (sessionId: string, hours: string) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO venue_bookings (id, venue_id, event_id, session_id, booking_range, status)
         VALUES ($1, $2, $3, $4, tstzrange($5::timestamptz, $5::timestamptz + interval '1 hour', '[)'), 'confirmed')`,
        [id, bookedVenue, edited.eventId, sessionId, hours],
      );
      return id;
    };
    const otherBooking = await bookingFor(edited.firstId, '2027-03-12T01:00:00Z');
    const editedBooking = await bookingFor(edited.secondId, '2027-03-13T05:00:00Z');
    const flagged = async (id: string) => (await client.query<{ requires_reconfirmation: boolean }>(
      'SELECT requires_reconfirmation FROM venue_bookings WHERE id = $1', [id])).rows[0]!.requires_reconfirmation;
    const edit = (change: object, options = {}) => editSession(repository, organiserId, edited.eventId, edited.secondId, { title: 'Second', ...later, ...change }, options);

    const unchanged = await edit({ accessibilityFeatureIds: [], facilityIds: [] }, { preview: true });
    assert.equal(unchanged.preview!.impact.affected, false, 'resending the same needs changes nothing');

    const preview = await edit({ accessibilityFeatureIds: [stepFree], facilityIds: [] }, { preview: true });
    assert.deepEqual(preview.preview!.impact.bookings.map(booking => [booking.id, booking.reasons]), [[editedBooking, ['accessibility']]]);
    assert.equal(await flagged(editedBooking), false, 'a preview saves nothing');

    const saved = await edit({ accessibilityFeatureIds: [stepFree], facilityIds: [] }, { reviewed: preview.preview!.revision });
    assert.deepEqual(saved.impact!.bookings.map(booking => booking.id), [editedBooking]);
    assert.equal(await flagged(editedBooking), true, 'the edited Session needs reconfirmation');
    assert.equal(await flagged(otherBooking), false, 'the other Session keeps its booking as it was');
    const audit = await client.query<{ action: string }>(
      `SELECT action FROM audit_logs WHERE entity_id = $1 AND field_changed = 'requires_reconfirmation'`, [editedBooking]);
    assert.match(audit.rows[0]!.action, /accessibility requirements changed/);

    const facilities = await edit({ accessibilityFeatureIds: [stepFree], facilityIds: [projector] }, { preview: true });
    assert.deepEqual(facilities.preview!.impact.bookings[0]!.reasons, ['facilities']);
    const layout = await edit({ layoutId: theatre, accessibilityFeatureIds: [stepFree], facilityIds: [] }, { preview: true });
    assert.deepEqual(layout.preview!.impact.bookings[0]!.reasons, ['layout']);

    // 2. Two Sessions down to one: an explicitly empty list stays empty.
    const empty = await twoSessionEvent({ accessibilityFeatureIds: [], facilityIds: [] });
    assert.deepEqual(await suitable(empty.eventId, empty.secondId), { [equippedVenue]: true, [plainVenue]: true });
    await removeSession(repository, organiserId, empty.eventId, empty.firstId);
    assert.deepEqual(await suitable(empty.eventId, empty.secondId), { [equippedVenue]: true, [plainVenue]: true },
      'the survivor does not pick up the needs the Event had');

    // ...and a survivor's own needs stay, then carry into a later second Session.
    const own = await twoSessionEvent({ accessibilityFeatureIds: [stepFree], facilityIds: [projector] });
    await client.query('DELETE FROM session_accessibility_needs WHERE session_id = $1', [own.firstId]);
    await client.query('DELETE FROM session_facility_needs WHERE session_id = $1', [own.firstId]);
    await client.query('DELETE FROM event_accessibility_needs WHERE event_id = $1', [own.eventId]);
    await client.query('DELETE FROM event_facility_needs WHERE event_id = $1', [own.eventId]);
    await removeSession(repository, organiserId, own.eventId, own.firstId);
    assert.deepEqual(await suitable(own.eventId, own.secondId), { [equippedVenue]: true, [plainVenue]: false });
    await client.query(`UPDATE events SET status = 'draft' WHERE id = $1`, [own.eventId]);
    const again = await addSession(repository, organiserId, own.eventId, { title: 'Third', ...later, startAt: '2027-03-13T01:00:00.000Z', endAt: '2027-03-13T02:00:00.000Z' });
    await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [own.eventId]);
    assert.deepEqual(again.session.accessibilityFeatureIds, [stepFree]);
    assert.deepEqual(await suitable(own.eventId, own.secondId), { [equippedVenue]: true, [plainVenue]: false },
      'the survivor keeps its needs when a Session is added again');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

test('TC_E10S02_15 TC_E10S02_10: a Session move on the Session screen flags only the overlapping support, asks only its technician to reconfirm and sends everyone else the date notice, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    const schema = `session_support_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    let savepoint = 0;
    const savepointPool = {
      async query(sql: string, values?: unknown[]) { return client.query(sql, values); },
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            if (sql === 'BEGIN') { savepoint += 1; return client.query(`SAVEPOINT session_support_${savepoint}`); }
            if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT session_support_${savepoint}`);
            if (sql === 'ROLLBACK') {
              await client.query(`ROLLBACK TO SAVEPOINT session_support_${savepoint}`);
              return client.query(`RELEASE SAVEPOINT session_support_${savepoint}`);
            }
            return client.query(sql, values);
          },
          release() {},
        };
      },
    } as unknown as Pool;
    const repository = createSessionRepository(savepointPool);

    const org = randomUUID();
    const organiserId = randomUUID();
    const coordinatorId = randomUUID();
    const techA = randomUUID();
    const techB = randomUUID();
    const eventId = randomUUID();
    const digest = await hashPassword('synthetic-session-support-password');
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    for (const [id, role] of [[organiserId, 'event_organiser'], [coordinatorId, 'event_coordinator'],
      [techA, 'technical_support_staff'], [techB, 'technical_support_staff']] as const) {
      await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, role, `${id}@example.test`, digest, role, org],
      );
    }
    await client.query(
      `INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $3, $4, 'Synthetic support event', 'draft', tstzrange('2027-03-12T01:00:00Z', '2027-03-13T09:00:00Z', '[)'), 40)`,
      [eventId, organiserId, coordinatorId, org],
    );
    const later = { title: 'Second', startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 40 };
    const added = await addSession(repository, organiserId, eventId, later);
    await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [eventId]);

    // Sound desk overlaps the second Session's current time; Lighting does not.
    const staffed = async (description: string, staffId: string, from: string, to: string) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO tech_support_requests (id, event_id, support_required, support_description, support_range, status, requested_by)
         VALUES ($1, $2, true, $3, tstzrange($4::timestamptz, $5::timestamptz, '[)'), 'staffed', $6)`,
        [id, eventId, description, from, to, coordinatorId],
      );
      await client.query(
        `INSERT INTO tech_staff_assignments (request_id, event_id, staff_id, assignment_range)
         VALUES ($1, $2, $3, tstzrange($4::timestamptz, $5::timestamptz, '[)'))`,
        [id, eventId, staffId, from, to],
      );
      return id;
    };
    const soundDesk = await staffed('Sound desk', techA, '2027-03-13T04:00:00Z', '2027-03-13T06:00:00Z');
    const lighting = await staffed('Lighting', techB, '2027-03-12T02:00:00Z', '2027-03-12T04:00:00Z');
    const flagged = async (id: string) => (await client.query<{ requires_reconfirmation: boolean }>(
      'SELECT requires_reconfirmation FROM tech_support_requests WHERE id = $1', [id])).rows[0]!.requires_reconfirmation;
    const notices = async (staffId: string) => (await client.query<{ message: string }>(
      'SELECT message FROM notifications WHERE user_id = $1 AND event_id = $2', [staffId, eventId])).rows.map(row => row.message);

    const moved = { ...later, startAt: '2027-03-13T06:00:00.000Z', endAt: '2027-03-13T08:30:00.000Z' };
    const preview = await editSession(repository, organiserId, eventId, added.session.id, moved, { preview: true });
    assert.deepEqual(preview.preview!.impact.supports.map(support => support.id), [soundDesk]);
    assert.deepEqual(preview.preview!.impact.bookings, []);
    assert.deepEqual(preview.preview!.impact.reservations, []);
    assert.equal(await flagged(soundDesk), false, 'a preview saves nothing');

    await editSession(repository, organiserId, eventId, added.session.id, moved, { reviewed: preview.preview!.revision });
    assert.equal(await flagged(soundDesk), true, 'the support overlapping the old time needs reconfirmation');
    assert.equal(await flagged(lighting), false, 'support away from the moved Session is left alone');
    const told = await notices(techA);
    assert.equal(told.length, 1, 'the Sound desk technician is told once, not also sent the date notice');
    assert.match(told[0]!, /An event change \(date or time\) means .*Technical Support requests need reconfirmation/);
    // E11-S01 Scenario 2: everyone else on the Event gets the Session date notice only.
    const dateNotice = /^Synthetic support event: Session date, time changed\. Changed at /;
    const lightingTold = await notices(techB);
    assert.equal(lightingTold.length, 1);
    assert.match(lightingTold[0]!, dateNotice, 'the Lighting technician hears of the new time but is not asked to reconfirm');
    const coordinatorTold = await notices(coordinatorId);
    assert.equal(coordinatorTold.length, 1);
    assert.match(coordinatorTold[0]!, dateNotice);
    assert.deepEqual(await notices(organiserId), [], 'the Organiser who made the change is not told');

    // An attendance-only edit moves nothing, so no date notice goes out.
    await editSession(repository, organiserId, eventId, added.session.id, { ...moved, expectedAttendance: 45 }, {});
    assert.equal((await notices(techB)).length, 1);
    assert.equal((await notices(coordinatorId)).length, 1);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

test('TC_E10S02_16: a Session layout change below its registrations is warned about and removes no one, rolled back', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; every fixture change is rolled back');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 30000');
    const schema = `session_capacity_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path = ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url)))
      .filter(name => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b))) {
      await client.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    let savepoint = 0;
    const savepointPool = {
      async query(sql: string, values?: unknown[]) { return client.query(sql, values); },
      async connect() {
        return {
          async query(sql: string, values?: unknown[]) {
            if (sql === 'BEGIN') { savepoint += 1; return client.query(`SAVEPOINT session_capacity_${savepoint}`); }
            if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT session_capacity_${savepoint}`);
            if (sql === 'ROLLBACK') {
              await client.query(`ROLLBACK TO SAVEPOINT session_capacity_${savepoint}`);
              return client.query(`RELEASE SAVEPOINT session_capacity_${savepoint}`);
            }
            return client.query(sql, values);
          },
          release() {},
        };
      },
    } as unknown as Pool;
    const repository = createSessionRepository(savepointPool);

    const org = randomUUID();
    const organiserId = randomUUID();
    const coordinatorId = randomUUID();
    const eventId = randomUUID();
    const venue = randomUUID();
    const boardroom = randomUUID();
    const digest = await hashPassword('synthetic-session-capacity-password');
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    for (const [id, role] of [[organiserId, 'event_organiser'], [coordinatorId, 'event_coordinator']] as const) {
      await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, role, client_org_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, role, `${id}@example.test`, digest, role, org],
      );
    }
    await client.query('INSERT INTO room_layouts (id, code, label) VALUES ($1, $2, $3)', [boardroom, `boardroom-${boardroom}`, 'Boardroom']);
    await client.query(
      `INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Synthetic hall', 'Level 1', 200, '00:00', '23:59')`, [venue]);
    await client.query('INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity) VALUES ($1, $2, 20)', [venue, boardroom]);
    await client.query(
      `INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
       VALUES ($1, $2, $3, $4, 'Synthetic capacity event', 'draft', tstzrange('2027-03-12T01:00:00Z', '2027-03-13T09:00:00Z', '[)'), 40)`,
      [eventId, organiserId, coordinatorId, org],
    );
    const later = { title: 'Second', startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 40 };
    const added = await addSession(repository, organiserId, eventId, later);
    await client.query(`UPDATE events SET status = 'planning' WHERE id = $1`, [eventId]);
    await client.query(
      `INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status)
       VALUES ($1, $2, $3, tstzrange('2027-03-13T05:00:00Z', '2027-03-13T08:00:00Z', '[)'), 'confirmed')`,
      [venue, eventId, added.session.id],
    );
    // 30 Attendees registered for the second Session; the venue's maximum (200) holds them today.
    for (let n = 0; n < 30; n += 1) {
      const attendee = randomUUID();
      await client.query(`INSERT INTO users (id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'attendee')`,
        [attendee, `Attendee ${n}`, `${attendee}@example.test`, digest]);
      const registration = (await client.query<{ id: string }>(
        `INSERT INTO event_registrations (event_id, attendee_id, status) VALUES ($1, $2, 'registered') RETURNING id`, [eventId, attendee])).rows[0]!.id;
      await client.query('INSERT INTO event_registration_sessions (registration_id, event_id, session_id) VALUES ($1, $2, $3)',
        [registration, eventId, added.session.id]);
    }
    const registered = async () => (await client.query<{ status: string; n: number }>(
      'SELECT status::text, count(*)::int AS n FROM event_registrations WHERE event_id = $1 GROUP BY status', [eventId])).rows;

    const boardroomOnly = { ...later, layoutId: boardroom };
    const preview = await editSession(repository, organiserId, eventId, added.session.id, boardroomOnly, { preview: true });
    assert.deepEqual(preview.preview!.overSubscription, [
      { scope: 'session', sessionId: added.session.id, registered: 30, capacity: 20 },
      { scope: 'event', sessionId: null, registered: 30, capacity: 20 },
    ]);

    await editSession(repository, organiserId, eventId, added.session.id, boardroomOnly, { reviewed: preview.preview!.revision });
    assert.deepEqual(await registered(), [{ status: 'registered', n: 30 }], 'no Attendee is removed or waitlisted');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
});

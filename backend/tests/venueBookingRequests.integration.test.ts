import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { listBookingRequests, prepareBookingRequest } from '../src/modules/venueBooking/bookingRequests.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';

test('TC_E06S03_05: PostgreSQL request list isolates assigned events and preserves every booking status', async () => {
  const connectionString = process.env.TEST_DATABASE_URL;
  assert.ok(connectionString, 'Set TEST_DATABASE_URL to a disposable test database.');
  const client = new Client({ connectionString, connectionTimeoutMillis: 8000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout=15000');
    const schema = `booking_requests_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path=${schema},public`);
    await client.query(await readFile(new URL('../database/migrations/0001_connectsphere_schema.sql', import.meta.url), 'utf8'));
    const query: Query = (sql, values) => client.query(sql, values);
    const org = (await client.query("INSERT INTO client_organisations(name) VALUES('Synthetic Org') RETURNING id")).rows[0].id;
    const uid = (await client.query("INSERT INTO users(full_name,email,password_hash,role) VALUES('Synthetic Coordinator','coord@example.test','fixture','event_coordinator') RETURNING id")).rows[0].id;
    const user: AuthenticatedUser = { id: uid, role: 'event_coordinator', email: 'coord@example.test', isActive: true, failedLoginCount: 0 };
    const event = (await client.query(`INSERT INTO events(organiser_id,coordinator_id,client_org_id,event_code,title,status,event_range,expected_attendance)
      VALUES($1,$1,$2,'EVT-REQUESTS','Assigned Event','approved','[2027-01-15T09:00:00+08,2027-01-15T18:00:00+08)',150) RETURNING id`, [uid, org])).rows[0].id;
    const other = (await client.query(`INSERT INTO events(organiser_id,client_org_id,title,status,event_range,expected_attendance)
      VALUES($1,$2,'Private Other Event','planning','[2027-01-15T09:00:00+08,2027-01-15T18:00:00+08)',50) RETURNING id`, [uid, org])).rows[0].id;
    const venue = (await client.query("INSERT INTO venues(name,location,max_capacity,opens_at,closes_at) VALUES('Recorded Hall','Central',100,'08:00','22:00') RETURNING id")).rows[0].id;
    const statuses = ['pending', 'confirmed', 'rejected', 'released', 'conflicting'];
    for (const [index, status] of statuses.entries()) {
      await client.query(`INSERT INTO venue_bookings(venue_id,event_id,status,booking_range,created_at)
        VALUES($1,$2,$3,tstzrange($4::timestamptz,$4::timestamptz + interval '1 hour','[)'),$5)`,
      [venue, event, status, `2027-01-15T${String(9 + index).padStart(2, '0')}:00:00+08`, `2027-01-01T00:00:0${index}Z`]);
    }
    await client.query("INSERT INTO venue_bookings(venue_id,event_id,status,booking_range,decision_reason) VALUES($1,$2,'rejected','[2027-01-15T09:00:00+08,2027-01-15T10:00:00+08)','PRIVATE OTHER REASON')", [venue, other]);
    for (const identifier of [event, 'EVT-REQUESTS']) {
      const result = await listBookingRequests(query, user, identifier);
      assert.deepEqual(result.bookings.map(b => b.status), [...statuses].reverse());
      assert.ok(!JSON.stringify(result).includes('PRIVATE OTHER'));
      await assert.rejects(listBookingRequests(query, { ...user, id: randomUUID() }, identifier), { status: 404 });
    }
    await assert.rejects(listBookingRequests(query, user, other), { status: 404 });
    // Historical bookings remain visible after a venue retires.
    await client.query('UPDATE venues SET is_active=false WHERE id=$1', [venue]);
    assert.equal((await listBookingRequests(query, user, event)).bookings.length, 5);
    const request = { event_id: event, venue_id: venue, starts_at: '2027-01-15T14:00:00+08:00', ends_at: '2027-01-15T16:00:00+08:00', headcount: 80 };
    await assert.rejects(prepareBookingRequest(query, user, request), { status: 404 });
    await client.query('UPDATE venues SET is_active=true WHERE id=$1', [venue]);
    const prepared = await prepareBookingRequest(query, user, { event_id: event, venue_id: venue, starts_at: '2027-01-15T14:00:00+08:00', ends_at: '2027-01-15T16:00:00+08:00', headcount: 80 });
    assert.equal(prepared.criteria?.attendance, 80);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM venue_bookings')).rows[0].n, 6);
    assert.equal((await client.query('SELECT status FROM events WHERE id=$1', [event])).rows[0].status, 'approved');
    await client.query('UPDATE events SET coordinator_id=NULL WHERE id=$1', [event]);
    await assert.rejects(listBookingRequests(query, user, event), { status: 404 });
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

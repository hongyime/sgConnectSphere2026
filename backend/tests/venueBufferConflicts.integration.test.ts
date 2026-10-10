// SCRUM-44: real-PostgreSQL boundary tests for E05-S05 "Apply setup and
// turnaround time" (TC_E05S05_01, TC_E05S05_03, TC_E05S05_05).
//
// These prove what the stubbed unit tests cannot: the buffer-conflict
// detection query in detectAndMarkBufferConflicts() actually plans and runs
// on PostgreSQL (a missing FROM-clause alias there used to roll the whole
// buffer edit back), and the maintenance-block check compares against the
// raw advertised booking range.
//
// Requires TEST_DATABASE_URL; run via `npm run test:db`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { createVenue, getVenue, updateVenue } from '../src/modules/venueBooking/catalogue.js';
import { createVenueBlock } from '../src/modules/venueBooking/blocks.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { loginDatabase } from './helpers/loginDatabase.js';

const SGT = '+08:00';
const sgtRange = (from: string, to: string) => `[${from}${SGT},${to}${SGT})`;

type Fixture = {
  pool: Pool;
  close: () => Promise<void>;
  staff: AuthenticatedUser;
  coordinator: AuthenticatedUser;
  ids: { org: string; organiser: string; venue: string; coordinator: string };
  venueBody: Record<string, unknown>;
};

async function fixture(): Promise<Fixture> {
  const f = await loginDatabase();
  const ids = { org: randomUUID(), organiser: randomUUID(), staff: randomUUID(), coordinator: randomUUID(), venue: '' };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, org] of [
    [ids.organiser, 'event_organiser', ids.org], [ids.staff, 'venue_staff', null], [ids.coordinator, 'event_coordinator', null],
  ] as const) {
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', 'Synthetic user', $4)`, [id, org, `${id}@example.test`, role]);
  }
  const user = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser =>
    ({ id, email: `${id}@example.test`, role, isActive: true, failedLoginCount: 0 });

  const venueBody = {
    name: 'Buffer Test Hall', location: 'Test wing', max_capacity: 300,
    opens_at: '08:00', closes_at: '22:00',
    facilities: ['Stage'], accessibility_features: ['Wheelchair Access'],
    supported_layouts: [{ label: 'Theatre', capacity: 280 }],
  };
  const created = await createVenue(f.pool, user(ids.staff, 'venue_staff'), venueBody);
  assert.equal(created.status, 201);
  ids.venue = (created.body as { venue: { id: string } }).venue.id;

  return {
    pool: f.pool, close: f.close,
    staff: user(ids.staff, 'venue_staff'), coordinator: user(ids.coordinator, 'event_coordinator'),
    ids, venueBody,
  };
}

// Books the venue for an event with the given advertised Singapore range.
async function book(
  f: Fixture, code: string, status: 'pending' | 'confirmed', from: string, to: string, title: string,
): Promise<string> {
  const eventId = randomUUID();
  await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
    VALUES ($1, $2, $3, $4, $5, $6, 'planning', $7::tstzrange, 100)`,
  [eventId, code, f.ids.organiser, f.ids.coordinator, f.ids.org, title, sgtRange(from, to)]);
  await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
    VALUES ($1, $2, $3::tstzrange, $4)`, [f.ids.venue, eventId, sgtRange(from, to), status]);
  return eventId;
}

async function bookingStatus(f: Fixture, eventId: string): Promise<string> {
  const result = await f.pool.query<{ status: string }>(
    `SELECT status FROM venue_bookings WHERE event_id = $1`, [eventId]);
  return result.rows[0]!.status;
}

// TC_E05S05_01: saving setup/turnaround times on a venue stores both values
// and shows them on the venue detail (E05-S05 Scenario 1).
test('TC_E05S05_01: buffers saved on a venue are persisted and returned on detail', async () => {
  const f = await fixture();
  try {
    const created = await createVenue(f.pool, f.staff, {
      ...f.venueBody, name: 'Second Hall', setup_time_minutes: 30, turnaround_time_minutes: 45,
    });
    assert.equal(created.status, 201);
    const venue = (created.body as { venue: Record<string, unknown> }).venue;
    assert.equal(venue.setup_time_minutes, 30);
    assert.equal(venue.turnaround_time_minutes, 45);

    const stored = await f.pool.query<{ setup_time_minutes: number; turnaround_time_minutes: number }>(
      `SELECT setup_time_minutes, turnaround_time_minutes FROM venues WHERE id = $1`, [venue.id]);
    assert.deepEqual(
      [stored.rows[0]!.setup_time_minutes, stored.rows[0]!.turnaround_time_minutes], [30, 45]);

    const query: Query = (sql, values) => f.pool.query(sql, values);
    const detail = await getVenue(query, f.coordinator, venue.id as string) as unknown as Record<string, unknown>;
    assert.equal(detail.setup_time_minutes, 30);
    assert.equal(detail.turnaround_time_minutes, 45);
  } finally {
    await f.close();
  }
});

// TC_E05S05_03: raising a venue's setup time so two confirmed bookings'
// buffered windows overlap flags the LATER booking as Conflicting, lists it
// on save and notifies its Coordinator — without releasing either booking.
// Regression: detectAndMarkBufferConflicts() used to reference a FROM-clause
// alias (`vb`) that does not exist, so PostgreSQL rejected the query and the
// whole buffer edit rolled back.
test('TC_E05S05_03: a buffer edit flags the later of two newly-overlapping bookings, notifies once, keeps both', async () => {
  const f = await fixture();
  try {
    const eventA = await book(f, 'BUF-A', 'confirmed', '2027-06-01T10:00', '2027-06-01T11:00', 'Morning Workshop');
    const eventB = await book(f, 'BUF-B', 'confirmed', '2027-06-01T11:30', '2027-06-01T12:30', 'Midday Seminar');
    // Advertised ranges do not overlap, so no conflict exists yet.

    const result = await updateVenue(f.pool, f.staff, f.ids.venue,
      { ...f.venueBody, setup_time_minutes: 60, turnaround_time_minutes: 0 });
    assert.equal(result.status, 200);
    const body = result.body as {
      venue: Record<string, unknown>;
      bufferConflicts: Array<{ eventCode: string | null; title: string }>;
    };
    assert.equal(body.venue.setup_time_minutes, 60);
    // A 60-minute setup makes A's window 09:00-11:00 and B's 10:30-12:30:
    // the later booking (B) is the one flagged.
    assert.equal(body.bufferConflicts.length, 1);
    assert.equal(body.bufferConflicts[0]!.eventCode, 'BUF-B');
    assert.equal(body.bufferConflicts[0]!.title, 'Midday Seminar');

    assert.equal(await bookingStatus(f, eventA), 'confirmed');
    assert.equal(await bookingStatus(f, eventB), 'conflicting');

    const notifications = await f.pool.query<{ title: string; user_id: string }>(
      `SELECT title, user_id FROM notifications WHERE event_id = $1`, [eventB]);
    assert.equal(notifications.rows.length, 1);
    assert.equal(notifications.rows[0]!.title, 'Booking conflict detected');
    assert.equal(notifications.rows[0]!.user_id, f.ids.coordinator);
  } finally {
    await f.close();
  }
});

// TC_E05S05_05: a maintenance block ending before the advertised event start
// but overlapping its setup time is allowed, and the Coordinator is not
// notified (E05-S05 Scenario 5: buffers do not apply against maintenance
// blocks).
test('TC_E05S05_05: a block ending before the advertised start but overlapping setup time is allowed silently', async () => {
  const f = await fixture();
  try {
    const created = await createVenue(f.pool, f.staff, {
      ...f.venueBody, name: 'Early Hall', setup_time_minutes: 60, turnaround_time_minutes: 0,
    });
    assert.equal(created.status, 201);
    const venueId = (created.body as { venue: { id: string } }).venue.id;

    // Advertised 00:30-01:30 on 2027-01-06; the 60-minute setup reaches back
    // to 23:30 on 2027-01-05, which the all-day 2027-01-05 block overlaps —
    // but the block ends (midnight) before the advertised start (00:30).
    await book({ ...f, ids: { ...f.ids, venue: venueId } }, 'BUF-C', 'pending',
      '2027-01-06T00:30', '2027-01-06T01:30', 'Dawn Rehearsal');

    const result = await createVenueBlock(f.pool, f.staff, venueId,
      { from: '2027-01-05', to: '2027-01-05', reason: 'Overnight deep clean' });
    assert.equal(result.status, 201);
    assert.equal((result.body as { notifiedEventCount: number }).notifiedEventCount, 0);
  } finally {
    await f.close();
  }
});

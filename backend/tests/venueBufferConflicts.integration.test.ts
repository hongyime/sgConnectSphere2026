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
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import { venueSearch } from '../src/modules/venueBooking/search.js';
import { placeHold, convertHold } from '../src/modules/venueBooking/holds.js';
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
    assert.equal(await bookingStatus(f, eventB), 'confirmed');
    assert.equal((await f.pool.query('SELECT buffer_conflict FROM venue_bookings WHERE event_id=$1',[eventB])).rows[0].buffer_conflict,true);

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

test('buffer conflicts preserve occupancy and confirmed priority, include live holds and exclude history', async () => {
  const f = await fixture();
  try {
    const pending = await book(f, 'PRIORITY-P', 'pending', '2027-06-01T10:00', '2027-06-01T11:00', 'Pending request');
    const confirmed = await book(f, 'PRIORITY-C', 'confirmed', '2027-06-01T11:30', '2027-06-01T12:30', 'Confirmed event');
    const held = await book(f, 'PRIORITY-H', 'pending', '2027-06-01T13:00', '2027-06-01T14:00', 'Live hold');
    await f.pool.query("UPDATE venue_bookings SET status='tentative',expires_at=clock_timestamp()+interval '1 day' WHERE event_id=$1", [held]);
    await book(f, 'OLD-A', 'confirmed', '2020-06-01T10:00', '2020-06-01T11:00', 'Past A');
    const old = await book(f, 'OLD-B', 'confirmed', '2020-06-01T11:30', '2020-06-01T12:30', 'Past B');
    const changed = await updateVenue(f.pool, f.staff, f.ids.venue, { setup_time_minutes: 60 });
    assert.equal(changed.status, 200);
    const rows = (await f.pool.query('SELECT event_id,status,buffer_conflict FROM venue_bookings')).rows;
    const row = (id: string) => rows.find(r => r.event_id === id);
    assert.deepEqual([row(pending).status,row(pending).buffer_conflict],['pending',true]);
    assert.deepEqual([row(confirmed).status,row(confirmed).buffer_conflict],['confirmed',false]);
    assert.deepEqual([row(held).status,row(held).buffer_conflict],['tentative',true]);
    assert.equal(row(old).buffer_conflict,false);
    assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM notifications WHERE event_id=$1',[old])).rows[0].n,0);
    // A read-only warning must not create a new hole in capacity.
    const booking = (await f.pool.query('SELECT id FROM venue_bookings WHERE event_id=$1',[pending])).rows[0];
    await assert.rejects(f.pool.query("INSERT INTO venue_bookings(venue_id,event_id,booking_range,status) VALUES($1,$2,'[2027-06-01 10:15+08,2027-06-01 10:30+08)','pending')",[f.ids.venue,pending]),{code:'23P01'});
    assert.ok(booking.id);
    // Smaller buffers clear only their reason-specific flag; status survives.
    await updateVenue(f.pool, f.staff, f.ids.venue, { setup_time_minutes: 0 });
    assert.equal((await f.pool.query('SELECT buffer_conflict FROM venue_bookings WHERE event_id=$1',[pending])).rows[0].buffer_conflict,false);
  } finally { await f.close(); }
});

test('TC_E05S05_04 buffered writes reject a one-minute overlap, accept adjacency and ignore maintenance buffers', async () => {
  const f = await fixture();
  try {
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:30,turnaround_time_minutes:45});
    const original = await book(f,'WRITE-A','confirmed','2027-06-01T10:00','2027-06-01T12:00','Original');
    // Raw intervals do not overlap: database guard must catch the buffers.
    await assert.rejects(book(f,'WRITE-B','pending','2027-06-01T13:14','2027-06-01T14:00','Overlap'),{code:'23P01'});
    await book(f,'WRITE-C','pending','2027-06-01T13:15','2027-06-01T14:00','Adjacent');
    await f.pool.query("INSERT INTO venue_blocks(venue_id,block_range,reason) VALUES($1,'[2027-06-02 08:00+08,2027-06-02 12:00+08)','Maintenance')",[f.ids.venue]);
    await book(f,'WRITE-D','pending','2027-06-02T12:00','2027-06-02T14:00','After maintenance');
    assert.equal(await bookingStatus(f,original),'confirmed');
    await assert.rejects(book(f,'WRITE-E','pending','2027-06-02T10:00','2027-06-02T11:00','Inside maintenance'),{code:'23P01'});
  } finally { await f.close(); }
});

test('TC_E05S05_02 calendar clips buffer-only bookings and Free matches advertised search windows', async () => {
  const f = await fixture();
  try {
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:30,turnaround_time_minutes:30});
    await book(f,'CAL-A','confirmed','2027-06-01T10:00','2027-06-01T11:00','Calendar booking');
    const query: Query = (sql, values) => f.pool.query(sql, values);
    const calendar = await getVenueCalendar(query,f.coordinator,f.ids.venue,'2027-06-01','2027-06-01');
    const free = calendar.entries.filter(entry => entry.state === 'free');
    assert.equal(free.find(entry => entry.start.includes('04:00:00.000Z'))?.start,'2027-06-01T04:00:00.000Z'); // 12:00 SGT
    const search = await venueSearch(query,f.coordinator,new URLSearchParams({start:'2027-06-01T11:30:00+08:00',end:'2027-06-01T12:30:00+08:00',attendance:'100',search:'1'}));
    assert.equal(search.venues?.find(v => v.id === f.ids.venue)?.available,false);
    const entries = calendar.entries.filter(entry => entry.kind === 'booking');
    assert.deepEqual(entries.map(entry => entry.reason ?? 'Event'),['Setup time','Event','Turnaround time']);
    for (const entry of calendar.entries) assert.ok(new Date(entry.start) < new Date(entry.end));
    // Turnaround reaches into a day whose raw event has already ended.
    await book(f,'CAL-B','confirmed','2027-06-02T23:00','2027-06-02T23:45','Over midnight');
    const clipped = await getVenueCalendar(query,f.coordinator,f.ids.venue,'2027-06-03','2027-06-03');
    const turn = clipped.entries.find(entry => entry.kind === 'booking');
    assert.equal(turn?.reason,'Turnaround time');
    assert.equal(turn?.start,'2027-06-02T16:00:00.000Z');
    assert.equal(turn?.end,'2027-06-02T16:15:00.000Z');
    // Setup-only slice before the next day's advertised event.
    await book(f,'CAL-C','confirmed','2027-06-05T00:15','2027-06-05T01:00','Next day');
    const setupOnly = await getVenueCalendar(query,f.coordinator,f.ids.venue,'2027-06-04','2027-06-04');
    const setup = setupOnly.entries.find(entry => entry.kind === 'booking');
    assert.equal(setup?.reason,'Setup time');
    assert.ok(new Date(setup!.start) < new Date(setup!.end));
  } finally { await f.close(); }
});

test('new hold and conversion enforce buffered clashes; flags remain visible without private event disclosure', async () => {
  const f = await fixture();
  try {
    const original = await book(f,'HOLD-A','confirmed','2027-06-01T10:00','2027-06-01T12:00','Existing booking');
    // Broad event allows an adjacent hold period within its advertised event.
    const event = randomUUID();
    await f.pool.query("INSERT INTO events(id,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance) VALUES($1,$2,$3,$4,'Hold event','planning','[2027-06-01 09:00+08,2027-06-01 18:00+08)',100)",[event,f.ids.organiser,f.ids.coordinator,f.ids.org]);
    const first = await placeHold(f.pool,f.coordinator,{event_id:event,venue_id:f.ids.venue,starts_at:'2027-06-01T12:30:00+08:00',ends_at:'2027-06-01T13:00:00+08:00'});
    assert.equal(first.status,201);
    const id = (first.body as {hold:{id:string}}).hold.id;
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:30,turnaround_time_minutes:45});
    const refused = await placeHold(f.pool,f.coordinator,{event_id:event,venue_id:f.ids.venue,starts_at:'2027-06-01T13:14:00+08:00',ends_at:'2027-06-01T14:00:00+08:00'});
    assert.equal(refused.status,409);
    assert.equal((await convertHold(f.pool,f.coordinator,{booking_id:id})).status,409);
    assert.equal(await bookingStatus(f,original),'confirmed');
    const query: Query = (sql, values) => f.pool.query(sql, values);
    const own = await getVenueCalendar(query,f.coordinator,f.ids.venue,'2027-06-01','2027-06-01');
    assert.ok(own.entries.some(entry => entry.bufferConflict));
    const privateView = await getVenueCalendar(query,{...f.coordinator,id:randomUUID()},f.ids.venue,'2027-06-01','2027-06-01');
    assert.ok(privateView.entries.filter(entry => entry.kind === 'booking').every(entry => !entry.event && !entry.bufferConflict && !entry.reason));
  } finally { await f.close(); }
});

test('a retained conflict chain flags every real pair without releasing or flagging the highest-priority booking', async () => {
  const f = await fixture();
  try {
    const a = await book(f,'CHAIN-A','confirmed','2027-06-01T10:00','2027-06-01T11:00','A');
    const b = await book(f,'CHAIN-B','confirmed','2027-06-01T11:30','2027-06-01T12:30','B');
    const c = await book(f,'CHAIN-C','confirmed','2027-06-01T13:00','2027-06-01T14:00','C');
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:60});
    for (const [event,flag] of [[a,false],[b,true],[c,true]] as const) {
      const row=(await f.pool.query('SELECT status,buffer_conflict FROM venue_bookings WHERE event_id=$1',[event])).rows[0];
      assert.equal(row.status,'confirmed'); assert.equal(row.buffer_conflict,flag);
    }
    assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n,3);
  } finally { await f.close(); }
});

test('concurrent raw booking writes cannot bypass buffers', async () => {
  const f = await fixture();
  try {
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:30,turnaround_time_minutes:30});
    const event = await book(f,'RACE-E','confirmed','2027-06-02T10:00','2027-06-02T11:00','Other day');
    const insert=(range:string)=>f.pool.query("INSERT INTO venue_bookings(venue_id,event_id,booking_range,status) VALUES($1,$2,$3,'pending')",[f.ids.venue,event,range]);
    const results=await Promise.allSettled([insert('[2027-06-01 10:00+08,2027-06-01 11:00+08)'),insert('[2027-06-01 11:30+08,2027-06-01 12:30+08)')]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;
    assert.equal(rejected.reason.code,'23P01');
  } finally { await f.close(); }
});

test('buffer notifications skip missing Coordinators, and clearing flags preserves capacity review', async () => {
  const f = await fixture();
  try {
    const a=await book(f,'NO-COORD-A','confirmed','2027-06-01T10:00','2027-06-01T11:00','Unassigned');
    const b=await book(f,'NO-COORD-B','confirmed','2027-06-01T11:30','2027-06-01T12:30','Assigned');
    await f.pool.query('UPDATE events SET coordinator_id=NULL WHERE id=$1',[a]);
    await f.pool.query('UPDATE venue_bookings SET requires_reconfirmation=true WHERE event_id=$1',[b]);
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:60});
    assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n,1);
    await updateVenue(f.pool,f.staff,f.ids.venue,{setup_time_minutes:0});
    const row=(await f.pool.query('SELECT buffer_conflict,requires_reconfirmation,status FROM venue_bookings WHERE event_id=$1',[b])).rows[0];
    assert.deepEqual(row,{buffer_conflict:false,requires_reconfirmation:true,status:'confirmed'});
  } finally { await f.close(); }
});

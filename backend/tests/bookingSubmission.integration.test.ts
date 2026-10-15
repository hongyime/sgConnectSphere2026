import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { submitBooking } from '../src/modules/venueBooking/bookingSubmission.js';
import { convertHold, expireHolds, placeHold } from '../src/modules/venueBooking/holds.js';
import { listBookingRequests } from '../src/modules/venueBooking/bookingRequests.js';
import { getVenueCalendar } from '../src/modules/venueBooking/calendar.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';

async function fixture() {
  const db = await loginDatabase();
  const q: Query = (sql, values) => db.pool.query(sql, values);
  const org = randomUUID(), organiser = randomUUID(), coord = randomUUID(), staff = randomUUID(), other = randomUUID();
  await q("INSERT INTO client_organisations(id,name) VALUES($1,'Synthetic Booking Org')", [org]);
  for (const [id,role] of [[organiser,'event_organiser'],[coord,'event_coordinator'],[staff,'venue_staff'],[other,'event_coordinator']]) await q(
    "INSERT INTO users(id,client_org_id,email,password_hash,full_name,role) VALUES($1,$2,$3,'unused','Synthetic User',$4)", [id,role === 'event_organiser' ? org : null,`${id}@example.test`,role]);
  const actor: AuthenticatedUser = { id: coord, role: 'event_coordinator', email: `${coord}@example.test`, isActive: true, failedLoginCount: 0 };
  const event = randomUUID();
  await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance)
    VALUES($1,'EVT-BOOKING',$2,$3,$4,'Synthetic Booking Event','approved','[2027-01-15T07:00:00+08,2027-01-15T23:00:00+08)',150)`, [event,organiser,coord,org]);
  const venues = [randomUUID(),randomUUID()];
  for (const [index,id] of venues.entries()) await q(`INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at,setup_time_minutes,turnaround_time_minutes)
    VALUES($1,$2,'Synthetic Campus',100,'08:00','22:00',30,45)`, [id,`Synthetic Hall ${index}`]);
  const input = { event_id: event, venue_id: venues[0]!, starts_at: '2027-01-15T09:00:00+08:00', ends_at: '2027-01-15T10:00:00+08:00' };
  const options = { resolveVenueStaff: async () => [staff,staff] };
  return { ...db,q,org,organiser,staff,other,actor,event,venues,input,options };
}

test('TC_E06S03_01 TC_E06S03_02 TC_E06S03_07 request persists advisory assessment, Planning, calendar and atomic inbox/outbox', async () => {
  const f = await fixture();
  try {
    await f.q("UPDATE events SET status_changed_at='2020-01-01T00:00:00Z' WHERE id=$1", [f.event]);
    const key = randomUUID();
    const first = await submitBooking(f.pool,f.actor,{ ...f.input,purpose:'Main programme' },key,f.options);
    assert.equal(first.status,201); assert.equal(first.body.event_status,'planning');
    assert.equal(first.body.suitability?.suitable,false);
    assert.match(JSON.stringify(first.body.suitability), /Capacity 100 is below the required 150/);
    const id = first.body.booking.id;
    const saved = (await f.q('SELECT * FROM venue_bookings WHERE id=$1',[id])).rows[0];
    assert.equal(saved.status,'pending'); assert.equal(saved.purpose,'Main programme'); assert.equal(saved.headcount,null);
    assert.equal(saved.requested_by,f.actor.id); assert.ok(saved.session_id); assert.equal(saved.is_primary,false);
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1',[f.event])).rows[0].status,'planning');
    assert.ok((await f.q('SELECT status_changed_at FROM events WHERE id=$1',[f.event])).rows[0].status_changed_at > new Date('2020-01-01'));
    const notices = (await f.q('SELECT user_id,message FROM notifications WHERE event_id=$1',[f.event])).rows;
    assert.deepEqual(new Set(notices.map(n=>n.user_id)),new Set([f.staff,f.organiser]));
    assert.equal(notices.length,2); assert.ok(!notices.some(n=>n.user_id===f.actor.id));
    assert.equal((await f.q('SELECT id FROM notification_deliveries')).rows.length,2);
    const repeated = await submitBooking(f.pool,f.actor,{ ...f.input,purpose:'Main programme' },key,f.options);
    assert.equal(repeated.body.booking.id,id); assert.equal(repeated.body.replayed,true);
    assert.deepEqual(repeated.body.suitability, first.body.suitability);
    assert.equal((await f.q('SELECT id FROM notifications')).rows.length,2);
    await assert.rejects(submitBooking(f.pool,f.actor,{ ...f.input,headcount:30 },key,f.options),{status:409});
    const second = await submitBooking(f.pool,f.actor,{ ...f.input,venue_id:f.venues[1],headcount:50 },randomUUID(),f.options);
    assert.equal(second.status,201); assert.equal(second.body.suitability?.suitable,true);
    const list = await listBookingRequests(f.q,f.actor,f.event);
    assert.equal(list.bookings.length,2); assert.equal(list.bookings[0].id,second.body.booking.id);
    const calendar = await getVenueCalendar(f.q,f.actor,f.venues[0]!,'2027-01-15','2027-01-16');
    assert.match(JSON.stringify(calendar), /[Tt]entative/);
    await assert.rejects(submitBooking(f.pool,{...f.actor,id:f.other},f.input,randomUUID()),{status:404});
  } finally { await f.close(); }
});

test('TC_E06S03_04 TC_E06S03_06 TC_E06S02_04 buffered request conflicts, blocks, periods and unsuitable hours are distinct gates', async () => {
  const f = await fixture();
  try {
    const early = await submitBooking(f.pool,f.actor,{...f.input,starts_at:'2027-01-15T07:30:00+08:00',ends_at:'2027-01-15T08:00:00+08:00'},randomUUID());
    assert.equal(early.status,201); assert.match(JSON.stringify(early.body.suitability),/Event is outside operating hours/);
    await assert.rejects(submitBooking(f.pool,f.actor,{...f.input,starts_at:'2027-01-15T08:30:00+08:00'},randomUUID()),{status:409});
    await f.q("INSERT INTO venue_blocks(venue_id,block_range,reason,created_by) VALUES($1,'[2027-01-15T14:00:00+08,2027-01-15T15:00:00+08)','Synthetic maintenance',$2)",[f.venues[1],f.staff]);
    await assert.rejects(submitBooking(f.pool,f.actor,{...f.input,venue_id:f.venues[1],starts_at:'2027-01-15T14:30:00+08:00',ends_at:'2027-01-15T15:30:00+08:00'},randomUUID()),{status:409});
    await assert.rejects(submitBooking(f.pool,f.actor,{...f.input,starts_at:'2027-01-15T06:30:00+08:00'},randomUUID()),{status:400});
    await f.q("UPDATE events SET status='confirmed' WHERE id=$1",[f.event]);
    await assert.rejects(submitBooking(f.pool,f.actor,{...f.input,venue_id:f.venues[1]},randomUUID()),{status:409});
    assert.equal((await f.q('SELECT id FROM venue_bookings')).rows.length,1);
  } finally { await f.close(); }
});

test('notification failure rolls back request, status, audit and deliveries together', async () => {
  const f = await fixture();
  try {
    // Fail at the outbox database boundary, after the business writes.
    await f.q("CREATE FUNCTION fail_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic outbox failure'; END $$");
    await f.q('CREATE TRIGGER fail_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_delivery()');
    await assert.rejects(submitBooking(f.pool,f.actor,f.input,randomUUID(),f.options),/Synthetic outbox failure/);
    for (const table of ['venue_bookings','notifications','notification_deliveries','audit_logs']) assert.equal((await f.q(`SELECT id FROM ${table}`)).rows.length,0);
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1',[f.event])).rows[0].status,'approved');
  } finally { await f.close(); }
});

test('concurrent direct submissions and retries create only one request and one set of effects', async () => {
  const f = await fixture();
  try {
    const key = randomUUID();
    const repeated = await Promise.all([submitBooking(f.pool,f.actor,f.input,key,f.options),submitBooking(f.pool,f.actor,f.input,key,f.options)]);
    assert.equal(repeated[0].body.booking.id,repeated[1].body.booking.id);
    assert.equal((await f.q('SELECT id FROM venue_bookings')).rows.length,1);
    assert.equal((await f.q('SELECT id FROM notifications')).rows.length,2);
    const different = {...f.input,venue_id:f.venues[1]};
    const competing = await Promise.allSettled([submitBooking(f.pool,f.actor,different,randomUUID()),submitBooking(f.pool,f.actor,different,randomUUID())]);
    assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(competing.filter(r=>r.status==='rejected' && r.reason.status===409).length,1);
  } finally { await f.close(); }
});

test('a direct request and a hold for different events cannot both occupy the same venue', async () => {
  const f = await fixture();
  try {
    const otherEvent = randomUUID();
    await f.q(`INSERT INTO events(id,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance)
      VALUES($1,$2,$3,$4,'Synthetic competing event','planning','[2027-01-15T07:00+08,2027-01-15T23:00+08)',50)`,[otherEvent,f.organiser,f.other,f.org]);
    const competing = await Promise.allSettled([
      submitBooking(f.pool,f.actor,f.input,randomUUID()),
      placeHold(f.pool,{...f.actor,id:f.other},{...f.input,event_id:otherEvent}),
    ]);
    assert.equal(competing.filter(r=>r.status==='fulfilled' && r.value.status===201).length,1);
    assert.equal(competing.filter(r=>r.status==='fulfilled' ? r.value.status===409 : r.reason.status===409).length,1);
    assert.equal((await f.q("SELECT id FROM venue_bookings WHERE status IN ('pending','tentative')")).rows.length,1);
  } finally { await f.close(); }
});

test('stale login and ambiguous Session data cannot authorize a new request', async () => {
  const f = await fixture();
  try {
    await f.q('UPDATE users SET is_active=false WHERE id=$1',[f.actor.id]);
    await assert.rejects(submitBooking(f.pool,f.actor,f.input,randomUUID()),{status:403});
    await f.q('UPDATE users SET is_active=true,failed_login_count=5 WHERE id=$1',[f.actor.id]);
    await assert.rejects(submitBooking(f.pool,f.actor,f.input,randomUUID()),{status:403});
    await f.q('UPDATE users SET failed_login_count=0 WHERE id=$1',[f.actor.id]);
    await f.q("INSERT INTO sessions(event_id,title,session_range,expected_attendance) VALUES($1,'Synthetic second Session','[2027-01-15T09:00+08,2027-01-15T10:00+08)',20)",[f.event]);
    await assert.rejects(submitBooking(f.pool,f.actor,f.input,randomUUID()),{status:409});
    assert.equal((await f.q('SELECT id FROM venue_bookings')).rows.length,0);
  } finally { await f.close(); }
});

test('TC_E06S05_04 conversion preserves row and stops expiry; concurrent retry and expiry cannot undo Pending', async () => {
  const f = await fixture();
  try {
    const hold = await placeHold(f.pool,f.actor,f.input);
    const id = (hold.body.hold as {id:string}).id;
    const results = await Promise.all([convertHold(f.pool,f.actor,{booking_id:id}),convertHold(f.pool,f.actor,{booking_id:id})]);
    assert.equal(results[0].body.booking.id,id); assert.equal(results[1].body.booking.id,id);
    assert.equal((await expireHolds(f.pool,new Date(Date.now()+7*86400000))).holdsExpired,0);
    const row = (await f.q('SELECT status,expires_at,requested_by FROM venue_bookings WHERE id=$1',[id])).rows[0];
    assert.equal(row.status,'pending'); assert.equal(row.expires_at,null); assert.equal(row.requested_by,f.actor.id);
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE action='Venue booking requested'")).rows.length,1);
    const second = await placeHold(f.pool,f.actor,{...f.input,venue_id:f.venues[1]});
    const secondId = (second.body.hold as {id:string}).id;
    await f.q("UPDATE venue_bookings SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[secondId]);
    const race = await Promise.allSettled([convertHold(f.pool,f.actor,{booking_id:secondId}),expireHolds(f.pool)]);
    assert.equal(race[0].status,'rejected');
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[secondId])).rows[0].status,'expired');
  } finally { await f.close(); }
});

test('migration preserves legacy rows and enforces optional headcount and confirmed-only primary', async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.q("INSERT INTO venue_bookings(venue_id,event_id,booking_range,headcount) VALUES($1,$2,'[2027-01-15T09:00+08,2027-01-15T10:00+08)',0)",[f.venues[0],f.event]),{code:'23514'});
    await assert.rejects(f.q("INSERT INTO venue_bookings(venue_id,event_id,booking_range,is_primary) VALUES($1,$2,'[2027-01-15T09:00+08,2027-01-15T10:00+08)',true)",[f.venues[0],f.event]),{code:'23514'});
    await f.q("INSERT INTO venue_bookings(venue_id,event_id,booking_range,status) VALUES($1,$2,'[2027-01-15T09:00+08,2027-01-15T10:00+08)','rejected')",[f.venues[0],f.event]);
    assert.equal((await listBookingRequests(f.q,f.actor,f.event)).bookings[0].purpose,null);
    const legacy = (await f.q("INSERT INTO venue_bookings(venue_id,event_id,booking_range,status) VALUES($1,$2,'[2027-01-15T12:00+08,2027-01-15T13:00+08)','pending') RETURNING id",[f.venues[0],f.event])).rows[0];
    const replay = await convertHold(f.pool,f.actor,{booking_id:legacy.id});
    assert.equal(replay.body.replayed,true); assert.equal(replay.body.booking.requested_by,null);
    assert.equal(replay.body.suitability,null);
    await f.q("INSERT INTO venue_bookings(venue_id,event_id,booking_range,status,is_primary) VALUES($1,$2,'[2027-01-15T09:00+08,2027-01-15T10:00+08)','confirmed',true)",[f.venues[0],f.event]);
    await assert.rejects(f.q("INSERT INTO venue_bookings(venue_id,event_id,booking_range,status,is_primary) VALUES($1,$2,'[2027-01-15T09:00+08,2027-01-15T10:00+08)','confirmed',true)",[f.venues[1],f.event]),{code:'23505'});
  } finally { await f.close(); }
});


test('suggested venue replacement keeps rejection, validates links and serializes duplicate switches', async () => {
  const f = await fixture();
  try {
    const rejected = randomUUID();
    await f.q(`INSERT INTO venue_bookings(id,event_id,session_id,venue_id,booking_range,status,decision_reason,suggested_venue_id)
      SELECT $1,$2,s.id,$3,tstzrange($4,$5,'[)'),'rejected','Synthetic rejection',$6 FROM sessions s WHERE s.event_id=$2`,
    [rejected,f.event,f.venues[0],f.input.starts_at,f.input.ends_at,f.venues[1]]);
    const replacement = {...f.input,venue_id:f.venues[1],replaces_booking_id:rejected};
    await assert.rejects(submitBooking(f.pool,f.actor,{...replacement,replaces_booking_id:randomUUID()},randomUUID(),f.options),{status:409});
    await assert.rejects(submitBooking(f.pool,f.actor,{...replacement,venue_id:f.venues[0]},randomUUID(),f.options),{status:409});
    const key = randomUUID();
    const results = await Promise.allSettled([submitBooking(f.pool,f.actor,replacement,key,f.options),submitBooking(f.pool,f.actor,replacement,randomUUID(),f.options)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected').length,1);
    const saved = (await f.q('SELECT id,status,replaces_booking_id,submission_key FROM venue_bookings WHERE replaces_booking_id=$1',[rejected])).rows[0];
    assert.equal(saved.status,'pending');
    const retry = await submitBooking(f.pool,f.actor,replacement,saved.submission_key,f.options);
    assert.equal(retry.body.booking.id,saved.id);assert.equal(retry.body.replayed,true);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[rejected])).rows[0].status,'rejected');
    const list = await listBookingRequests(f.q,f.actor,f.event);
    assert.equal(list.bookings.find(b=>b.id===rejected)?.has_replacement,true);
    assert.equal(list.bookings.find(b=>b.id===rejected)?.suggested_venue_id,f.venues[1]);
    // Database invariant protects against writers bypassing the service too.
    await assert.rejects(f.q(`INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status,replaces_booking_id)
      SELECT event_id,session_id,venue_id,booking_range,'rejected',replaces_booking_id FROM venue_bookings WHERE id=$1`,[saved.id]),{code:'23505'});
  } finally {await f.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { loginDatabase } from './helpers/loginDatabase.js';
import { submitBooking } from '../src/modules/venueBooking/bookingSubmission.js';
import { withdrawBooking } from '../src/modules/venueBooking/bookingWithdrawal.js';
import { setPrimaryBooking } from '../src/modules/venueBooking/bookingPrimary.js';
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

// SCRUM-189: with no injected resolver, the request notifies the staff assigned
// to the requested venue in venue_staff_assignments, and no one else.
test('TC_E06S03_01 TC_E11S01_10: a request notifies only the requested venue\'s assigned Venue Staff by default', async () => {
  const f = await fixture();
  try {
    const elsewhere = randomUUID();
    await f.q("INSERT INTO users(id,email,password_hash,full_name,role) VALUES($1,$2,'unused','Synthetic User','venue_staff')", [elsewhere,`${elsewhere}@example.test`]);
    await f.q('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2),($3,$4)', [f.venues[0],f.staff,f.venues[1],elsewhere]);
    const assigned = await submitBooking(f.pool,f.actor,f.input,randomUUID());
    assert.deepEqual(assigned.body.unresolved_venue_ids,[]);
    const notified = (await f.q('SELECT user_id FROM notifications WHERE event_id=$1',[f.event])).rows.map(n=>n.user_id);
    assert.deepEqual(new Set(notified),new Set([f.staff,f.organiser]));

    await f.q('DELETE FROM venue_staff_assignments WHERE venue_id=$1',[f.venues[1]]);
    const unassigned = await submitBooking(f.pool,f.actor,{...f.input,venue_id:f.venues[1]},randomUUID());
    assert.deepEqual(unassigned.body.unresolved_venue_ids,[f.venues[1]]);
    const after = (await f.q('SELECT user_id FROM notifications WHERE event_id=$1',[f.event])).rows.map(n=>n.user_id);
    assert.ok(!after.includes(elsewhere), 'staff of another venue are never notified');
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
    await assert.rejects(convertHold(f.pool,{...f.actor,id:f.other},{booking_id:id}),{status:403});
    const denied = (await f.q("SELECT actor_id,event_id,new_value FROM audit_logs WHERE action='Access Denied'")).rows;
    assert.equal(denied.length,1); assert.equal(denied[0].actor_id,f.other);
    assert.equal(denied[0].event_id,null); assert.equal(denied[0].new_value,'venue_holds');
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[id])).rows[0].status,'tentative');
    const results = await Promise.all([convertHold(f.pool,f.actor,{booking_id:id}),convertHold(f.pool,f.actor,{booking_id:id})]);
    assert.equal(results[0].body.booking.id,id); assert.equal(results[1].body.booking.id,id);
    assert.equal((await expireHolds(f.pool,new Date(Date.now()+7*86400000))).holdsExpired,0);
    const row = (await f.q('SELECT status,expires_at,requested_by FROM venue_bookings WHERE id=$1',[id])).rows[0];
    assert.equal(row.status,'pending'); assert.equal(row.expires_at,null); assert.equal(row.requested_by,f.actor.id);
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE action LIKE 'Venue booking requested for %'")).rows.length,1);
    const second = await placeHold(f.pool,f.actor,{...f.input,venue_id:f.venues[1]});
    const secondId = (second.body.hold as {id:string}).id;
    await f.q("UPDATE venue_bookings SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[secondId]);
    await assert.rejects(convertHold(f.pool,f.actor,{booking_id:secondId}),{status:409,message:"This hold has expired, so it can't be changed. Place a new hold if the venue is still needed."});
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

test('TC_E06S03_08 TC_E06S03_09 TC_E06S03_11 Pending withdrawal preserves other bookings, expiry history and targeted staff delivery', async () => {
  const f = await fixture();
  try {
    // Use the merged default resolver, not an injected audience.
    await f.q('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)', [f.venues[0],f.staff]);
    const hold = await placeHold(f.pool,f.actor,f.input);
    const id = (hold.body.hold as { id: string }).id;
    await convertHold(f.pool,f.actor,{ booking_id: id });
    const other = await submitBooking(f.pool,f.actor,{ ...f.input,venue_id:f.venues[1] },randomUUID());
    const before = (await f.q('SELECT * FROM venue_bookings WHERE id=$1',[other.body.booking.id])).rows[0];
    await assert.rejects(withdrawBooking(f.pool,{...f.actor,id:f.other},{booking_id:id}),{status:404});
    const notices = (await f.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n;
    await withdrawBooking(f.pool,f.actor,{booking_id:id});
    assert.deepEqual((await f.q('SELECT * FROM venue_bookings WHERE id=$1',[other.body.booking.id])).rows[0],before);
    const released = (await f.q('SELECT status,expires_at,is_primary FROM venue_bookings WHERE id=$1',[id])).rows[0];
    assert.deepEqual(released,{status:'released',expires_at:null,is_primary:false});
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1',[f.event])).rows[0].status,'planning');
    const audit = (await f.q("SELECT actor_id,entity_type,entity_id,event_id,field_changed,old_value,new_value FROM audit_logs WHERE action='Booking Withdrawn'")).rows;
    assert.deepEqual(audit,[{actor_id:f.actor.id,entity_type:'venue_booking',entity_id:id,event_id:f.event,field_changed:'status',old_value:'pending',new_value:'released'}]);
    const delivered = (await f.q("SELECT n.user_id,d.id FROM notifications n JOIN notification_deliveries d ON d.notification_id=n.id WHERE n.message LIKE '%withdrew a Pending%'")).rows;
    assert.equal(delivered.length,1); assert.equal(delivered[0].user_id,f.staff);
    assert.equal((await f.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n,notices+1);
    await assert.rejects(withdrawBooking(f.pool,f.actor,{booking_id:id}),{status:409});
    assert.equal((await f.q("SELECT count(*)::int AS n FROM audit_logs WHERE action='Booking Withdrawn'")).rows[0].n,1);
    // Freed occupancy permits an ordinary request over the same slot.
    await submitBooking(f.pool,f.actor,f.input,randomUUID());
    await f.q("UPDATE venue_bookings SET status='confirmed',is_primary=true WHERE id=$1",[other.body.booking.id]);
    await assert.rejects(withdrawBooking(f.pool,f.actor,{booking_id:other.body.booking.id}),{status:409});
    assert.equal((await f.q('SELECT is_primary FROM venue_bookings WHERE id=$1',[other.body.booking.id])).rows[0].is_primary,true);
  } finally { await f.close(); }
});

test('TC_E06S03_11 withdrawal outbox failure rolls back status, audit and notification', async () => {
  const f = await fixture();
  try {
    const saved = await submitBooking(f.pool,f.actor,f.input,randomUUID(),f.options);
    await f.q(`CREATE FUNCTION refuse_withdrawal_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic outbox failure'; END $$`);
    await f.q('CREATE TRIGGER refuse_withdrawal_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION refuse_withdrawal_delivery()');
    const count = (await f.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n;
    await assert.rejects(withdrawBooking(f.pool,f.actor,{booking_id:saved.body.booking.id},f.options),/Synthetic outbox failure/);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[saved.body.booking.id])).rows[0].status,'pending');
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE action='Booking Withdrawn'")).rows.length,0);
    assert.equal((await f.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n,count);
  } finally { await f.close(); }
});

test('TC_E06S03_12 TC_E06S03_13 Released replacement permits a fresh attempt; Rejected follows only its own suggestion', async () => {
  const f = await fixture();
  try {
    const rejected = randomUUID();
    await f.q(`INSERT INTO venue_bookings(id,event_id,venue_id,booking_range,status,suggested_venue_id)
      VALUES($1,$2,$3,tstzrange($4,$5,'[)'),'rejected',$6)`,[rejected,f.event,f.venues[0],f.input.starts_at,f.input.ends_at,f.venues[1]]);
    const input = {...f.input,venue_id:f.venues[1],replaces_booking_id:rejected};
    const key = randomUUID();
    const first = await submitBooking(f.pool,f.actor,input,key,f.options);
    await withdrawBooking(f.pool,f.actor,{booking_id:first.body.booking.id},f.options);
    assert.equal((await listBookingRequests(f.q,f.actor,f.event)).bookings.find(b=>b.id===rejected)?.has_replacement,false);
    const replay = await submitBooking(f.pool,f.actor,input,key,f.options);
    assert.equal(replay.body.booking.id,first.body.booking.id); assert.equal(replay.body.booking.status,'released');
    const attempts = await Promise.allSettled([submitBooking(f.pool,f.actor,input,randomUUID(),f.options),submitBooking(f.pool,f.actor,input,randomUUID(),f.options)]);
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(attempts.filter(r=>r.status==='rejected' && r.reason.status===409).length,1);
    let latest = (await f.q("SELECT id FROM venue_bookings WHERE replaces_booking_id=$1 AND status='pending'",[rejected])).rows[0].id;
    // More than two switches: every next link uses the latest rejection, never A again.
    for (let n=0;n<3;n++) {
      const venue = f.venues[n%2]!;
      await f.q("UPDATE venue_bookings SET status='rejected',suggested_venue_id=$2 WHERE id=$1",[latest,venue]);
      await assert.rejects(submitBooking(f.pool,f.actor,input,randomUUID(),f.options),{status:409});
      const next = await submitBooking(f.pool,f.actor,{...f.input,venue_id:venue,replaces_booking_id:latest},randomUUID(),f.options);
      assert.equal(next.body.booking.replaces_booking_id,latest); latest=next.body.booking.id;
    }
    await f.q("UPDATE venue_bookings SET status='rejected',suggested_venue_id=NULL WHERE id=$1",[latest]);
    await assert.rejects(submitBooking(f.pool,f.actor,{...f.input,replaces_booking_id:latest},randomUUID(),f.options),{status:409});
    assert.equal((await f.q('SELECT count(*)::int AS n FROM venue_bookings WHERE replaces_booking_id=$1',[rejected])).rows[0].n,2);
    // Rejected replacements remain protected even for writers bypassing service checks.
    await assert.rejects(f.q(`INSERT INTO venue_bookings(event_id,venue_id,booking_range,status,replaces_booking_id)
      SELECT event_id,venue_id,booking_range,'rejected',replaces_booking_id FROM venue_bookings WHERE replaces_booking_id=$1 AND status='rejected'`,[rejected]),{code:'23505'});
  } finally { await f.close(); }
});

async function waitForBlockedWriter(query: Query, blocker: number) {
  for (let attempt=0;attempt<200;attempt++) {
    const row=(await query<{ blocked: boolean }>('SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))) AS blocked',[blocker])).rows[0];
    if (row?.blocked) return;
    await delay(10);
  }
  assert.fail('The competing writer never waited on the held venue lock');
}

test('TC_E06S03_10 decision winning the venue lock prevents withdrawal from overwriting its result', async () => {
  for (const decision of ['confirmed','rejected']) {
    const f = await fixture();
    const client = await f.pool.connect();
    try {
      const saved = await submitBooking(f.pool,f.actor,f.input,randomUUID());
      await client.query('BEGIN');
      await client.query('SELECT id FROM venues WHERE id=$1 FOR NO KEY UPDATE',[f.venues[0]]);
      await client.query('SELECT id FROM venue_bookings WHERE id=$1 FOR UPDATE',[saved.body.booking.id]);
      const withdrawal = withdrawBooking(f.pool,f.actor,{booking_id:saved.body.booking.id});
      // Attach rejection handling immediately; commit below releases the venue.
      const refused = assert.rejects(withdrawal,{status:409});
      const pid=(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await waitForBlockedWriter(f.q,pid);
      await client.query('UPDATE venue_bookings SET status=$2 WHERE id=$1',[saved.body.booking.id,decision]);
      await client.query('COMMIT'); await refused;
      assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[saved.body.booking.id])).rows[0].status,decision);
    } finally { await client.query('ROLLBACK'); client.release(); await f.close(); }
  }
});

test('TC_E06S03_10 withdrawal winning exposes Released to the waiting decision writer', async () => {
  const f = await fixture();
  try {
    const saved = await submitBooking(f.pool,f.actor,f.input,randomUUID());
    let reached!: () => void, resume!: () => void;
    const locked = new Promise<void>(resolve => { reached=resolve; });
    const proceed = new Promise<void>(resolve => { resume=resolve; });
    let pid=0;
    const withdrawal = withdrawBooking(f.pool,f.actor,{booking_id:saved.body.booking.id},{resolveVenueStaff:async client=>{pid=(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;reached();await proceed;return [];}});
    await locked;
    const decision = inDecisionTransaction();
    try { await waitForBlockedWriter(f.q,pid); } finally { resume(); }
    await withdrawal;
    assert.equal(await decision,0);
    async function inDecisionTransaction() {
      const client = await f.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT id FROM venues WHERE id=$1 FOR NO KEY UPDATE',[f.venues[0]]);
        await client.query('SELECT id FROM venue_bookings WHERE id=$1 FOR UPDATE',[saved.body.booking.id]);
        const update=await client.query("UPDATE venue_bookings SET status='confirmed' WHERE id=$1 AND status='pending'",[saved.body.booking.id]);
        await client.query('COMMIT'); return update.rowCount;
      } finally { await client.query('ROLLBACK');client.release(); }
    }
  } finally { await f.close(); }
});

test('TC_E06S03_10 event-first submission cannot deadlock venue-first withdrawal', async () => {
  const f = await fixture();
  const client = await f.pool.connect();
  try {
    const saved = await submitBooking(f.pool,f.actor,f.input,randomUUID());
    await client.query('BEGIN');
    await client.query('SELECT id FROM events WHERE id=$1 FOR NO KEY UPDATE',[f.event]);
    await assert.rejects(withdrawBooking(f.pool,f.actor,{booking_id:saved.body.booking.id}),{status:409});
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[saved.body.booking.id])).rows[0].status,'pending');
  } finally { await client.query('ROLLBACK');client.release();await f.close(); }
});

test('TC_E06S03_12 upgrading the existing replacement index preserves Released history and uniqueness', async () => {
  const f = await fixture();
  try {
    // Model a database already on 0019, with a Released historical replacement.
    await f.q('DROP INDEX venue_booking_replacement_idx');
    await f.q('CREATE UNIQUE INDEX venue_booking_replacement_idx ON venue_bookings(replaces_booking_id) WHERE replaces_booking_id IS NOT NULL');
    const source=randomUUID(),released=randomUUID();
    await f.q(`INSERT INTO venue_bookings(id,event_id,venue_id,booking_range,status)
      VALUES($1,$2,$3,tstzrange($4,$5,'[)'),'rejected')`,[source,f.event,f.venues[0],f.input.starts_at,f.input.ends_at]);
    await f.q(`INSERT INTO venue_bookings(id,event_id,venue_id,booking_range,status,replaces_booking_id)
      VALUES($1,$2,$3,tstzrange($4,$5,'[)'),'released',$6)`,[released,f.event,f.venues[1],f.input.starts_at,f.input.ends_at,source]);
    const before=(await f.q('SELECT * FROM venue_bookings ORDER BY id')).rows;
    await f.q(await readFile(new URL('../database/migrations/0020_released_booking_replacement_retry.sql',import.meta.url),'utf8'));
    assert.deepEqual((await f.q('SELECT * FROM venue_bookings ORDER BY id')).rows,before);
    await f.q(`INSERT INTO venue_bookings(event_id,venue_id,booking_range,status,replaces_booking_id)
      VALUES($1,$2,tstzrange($3,$4,'[)'),'rejected',$5)`,[f.event,f.venues[1],f.input.starts_at,f.input.ends_at,source]);
    await assert.rejects(f.q(`INSERT INTO venue_bookings(event_id,venue_id,booking_range,status,replaces_booking_id)
      VALUES($1,$2,tstzrange($3,$4,'[)'),'rejected',$5)`,[f.event,f.venues[1],f.input.starts_at,f.input.ends_at,source]),{code:'23505'});
  } finally { await f.close(); }
});

test('TC_E06S03_07 selecting another Confirmed primary changes no lifecycle/occupancy/history',async()=>{
  const f=await fixture();
  try {
    const first=await submitBooking(f.pool,f.actor,f.input,randomUUID());
    const second=await submitBooking(f.pool,f.actor,{...f.input,venue_id:f.venues[1]},randomUUID());
    await assert.rejects(setPrimaryBooking(f.pool,f.actor,{booking_id:second.body.booking.id}),{status:409});
    await f.q("UPDATE venue_bookings SET status='confirmed',is_primary=(id=$1) WHERE event_id=$2",[first.body.booking.id,f.event]);
    await assert.rejects(setPrimaryBooking(f.pool,{...f.actor,id:f.other},{booking_id:second.body.booking.id}),{status:404});
    const before=(await f.q('SELECT id,event_id,venue_id,booking_range,status,expires_at FROM venue_bookings ORDER BY id')).rows;
    const selected=await setPrimaryBooking(f.pool,f.actor,{booking_id:second.body.booking.id});
    assert.equal(selected.body.replayed,false);
    assert.deepEqual((await f.q('SELECT id FROM venue_bookings WHERE event_id=$1 AND is_primary',[f.event])).rows,[{id:second.body.booking.id}]);
    assert.deepEqual((await f.q('SELECT id,event_id,venue_id,booking_range,status,expires_at FROM venue_bookings ORDER BY id')).rows,before);
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1',[f.event])).rows[0].status,'planning');
    assert.equal((await setPrimaryBooking(f.pool,f.actor,{booking_id:second.body.booking.id})).body.replayed,true);
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE action='Primary Venue Changed'")).rows.length,1);
    // Selection remains permitted for assigned Confirmed events.
    await f.q("UPDATE events SET status='confirmed' WHERE id=$1",[f.event]);
    await setPrimaryBooking(f.pool,f.actor,{booking_id:first.body.booking.id});
    const race=await Promise.all([setPrimaryBooking(f.pool,f.actor,{booking_id:first.body.booking.id}),setPrimaryBooking(f.pool,f.actor,{booking_id:second.body.booking.id})]);
    assert.ok(race.every(r=>r.status===200));
    assert.equal((await f.q('SELECT id FROM venue_bookings WHERE event_id=$1 AND is_primary',[f.event])).rows.length,1);
  } finally {await f.close();}
});

test('TC_E06S03_07 selecting primary rolls back both flags when audit persistence fails',async()=>{
  const f=await fixture();
  try {
    const first=await submitBooking(f.pool,f.actor,f.input,randomUUID());
    const second=await submitBooking(f.pool,f.actor,{...f.input,venue_id:f.venues[1]},randomUUID());
    await f.q("UPDATE venue_bookings SET status='confirmed',is_primary=(id=$1) WHERE event_id=$2",[first.body.booking.id,f.event]);
    await f.q("CREATE FUNCTION refuse_primary_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='Primary Venue Changed' THEN RAISE EXCEPTION 'Synthetic primary audit failure'; END IF; RETURN NEW; END $$");
    await f.q('CREATE TRIGGER refuse_primary_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION refuse_primary_audit()');
    await assert.rejects(setPrimaryBooking(f.pool,f.actor,{booking_id:second.body.booking.id}),/Synthetic primary audit failure/);
    assert.deepEqual((await f.q('SELECT id FROM venue_bookings WHERE is_primary')).rows,[{id:first.body.booking.id}]);
  } finally {await f.close();}
});

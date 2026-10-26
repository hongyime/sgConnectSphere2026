// E05-S06 detection is a fixture precondition here, not a claimed trigger test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { submitBooking } from '../src/modules/venueBooking/bookingSubmission.js';
import { decideBooking } from '../src/modules/venueBooking/decisions.js';
import { cancelLostVenueBooking } from '../src/modules/venueBooking/lostVenueRecovery.js';
import { listBookingRequests } from '../src/modules/venueBooking/bookingRequests.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

async function fixture() {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const org=randomUUID(), organiser=randomUUID(), coordinator=randomUUID(), staff=randomUUID(), attendee=randomUUID();
  const event=randomUUID(), old=randomUUID(), next=randomUUID(), lost=randomUUID(), block=randomUUID();
  await q("INSERT INTO client_organisations(id,name) VALUES($1,'Recovery test organisation')",[org]);
  for(const [id,role] of [[organiser,'event_organiser'],[coordinator,'event_coordinator'],[staff,'venue_staff'],[attendee,'attendee']])
    await q("INSERT INTO users(id,client_org_id,email,password_hash,full_name,role) VALUES($1,$2,$3,'unused','Recovery test user',$4)",[id,role==='event_organiser'?org:null,`${id}@example.test`,role]);
  const actor:AuthenticatedUser={id:coordinator,role:'event_coordinator',email:'coordinator@example.test',isActive:true,failedLoginCount:0};
  const decider:AuthenticatedUser={...actor,id:staff,role:'venue_staff'};
  await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance)
    VALUES($1,'EVT-RECOVERY',$2,$3,$4,'Recovery test','planning','[2027-01-15T01:00Z,2027-01-15T04:00Z)',40)`,[event,organiser,coordinator,org]);
  for(const [id,name] of [[old,'Original Hall'],[next,'Replacement Hall']]) {
    await q("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Test campus',100,'00:00','23:59')",[id,name]);
    await q('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)',[id,staff]);
  }
  await q(`INSERT INTO venue_bookings(id,event_id,venue_id,booking_range,status,is_primary) VALUES($1,$2,$3,'[2027-01-15T01:00Z,2027-01-15T04:00Z)','confirmed',true)`,[lost,event,old]);
  await q(`INSERT INTO venue_blocks(id,venue_id,block_range,reason,reason_category) VALUES($1,$2,'[2027-01-15T00:00Z,2027-01-16T00:00Z)','Roof unsafe','safety_concern')`,[block,old]);
  await q("UPDATE venue_bookings SET status='conflicting',status_before_conflict='confirmed',conflict_block_id=$2 WHERE id=$1",[lost,block]);
  await q(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location) VALUES($1,'Published recovery test','2027-01-15T01:00Z','2027-01-15T04:00Z','Original Hall','Test campus')`,[event]);
  await q('INSERT INTO event_registrations(event_id,attendee_id) VALUES($1,$2)',[event,attendee]);
  const input={event_id:event,venue_id:next,replaces_booking_id:lost,starts_at:'2027-01-15T01:00:00Z',ends_at:'2027-01-15T04:00:00Z',purpose:'Programme',headcount:40};
  return {...db,q,actor,decider,event,lost,input,organiser,attendee,staff};
}

test('TC_E10S05_02 TC_E10S05_03 TC_E10S05_04: linked replacement approval publishes and notifies once; original cancellation is explicit',async()=>{
  const f=await fixture();
  try {
    const list=await listBookingRequests(f.q,f.actor,f.event);
    assert.equal(list.bookings[0].conflict_reason,'Roof unsafe');
    await assert.rejects(cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost}),{status:409});
    const submitted=await submitBooking(f.pool,f.actor,f.input,randomUUID());
    const replacement=submitted.body.booking.id;
    assert.equal(submitted.status,201);
    assert.equal((await f.q('SELECT replaces_booking_id FROM venue_bookings WHERE id=$1',[replacement])).rows[0].replaces_booking_id,f.lost);
    assert.equal((await f.q('SELECT venue_name FROM event_publications')).rows[0].venue_name,'Original Hall');
    assert.equal((await f.q('SELECT id FROM notifications WHERE user_id IN ($1,$2)',[f.organiser,f.attendee])).rowCount,0);
    await assert.rejects(submitBooking(f.pool,f.actor,f.input,randomUUID()),{status:409});
    await assert.rejects(cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost}),{status:409});
    const decision=await decideBooking(f.pool,f.decider,replacement,{decision:'approve'});
    assert.equal(decision.status,200);
    assert.equal(decision.body.coordinatorNotified, true);
    const coordinatorNotices = (await f.q('SELECT title FROM notifications WHERE user_id=$1', [f.actor.id])).rows;
    assert.equal(coordinatorNotices.filter(n => n.title === 'Venue booking approved').length, 1);
    assert.equal(coordinatorNotices.filter(n => n.title === 'Event update').length, 1);
    const approvalAudits = (await f.q("SELECT id,action,new_value FROM audit_logs WHERE entity_id=$1 AND action IN ('Booking Approved','Lost Venue Replaced')", [replacement])).rows;
    assert.equal(approvalAudits.length, 2);
    assert.notEqual(approvalAudits[0].id, approvalAudits[1].id);
    const recoveryAudit = approvalAudits.find(a => a.action === 'Lost Venue Replaced');
    assert.equal(JSON.parse(recoveryAudit.new_value).publication_updated, true);
    assert.equal(JSON.parse(recoveryAudit.new_value).is_primary, true);
    const original=(await f.q('SELECT status,is_primary FROM venue_bookings WHERE id=$1',[f.lost])).rows[0];
    assert.deepEqual(original,{status:'conflicting',is_primary:false});
    assert.equal((await f.q('SELECT is_primary FROM venue_bookings WHERE id=$1',[replacement])).rows[0].is_primary,true);
    assert.equal((await f.q('SELECT venue_name FROM event_publications')).rows[0].venue_name,'Replacement Hall');
    assert.equal((await f.q('SELECT status FROM events WHERE id=$1',[f.event])).rows[0].status,'planning');
    const notices=await f.q('SELECT user_id FROM notifications WHERE user_id IN ($1,$2)',[f.organiser,f.attendee]);
    assert.equal(notices.rowCount,2);
    assert.equal((await f.q('SELECT d.id FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.user_id IN ($1,$2)',[f.organiser,f.attendee])).rowCount,2);
    assert.equal((await cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost})).body.replayed,false);
    assert.equal((await cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost})).body.replayed,true);
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE action='Lost Venue Booking Cancelled'")).rowCount,1);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[replacement])).rows[0].status,'confirmed');
  } finally {await f.close();}
});

test('TC_E10S05_03: cancellation checks current authority and ended Events',async()=>{
  const f=await fixture();
  try {
    await assert.rejects(cancelLostVenueBooking(f.pool,undefined,{}),{status:401});
    await assert.rejects(cancelLostVenueBooking(f.pool,f.decider,{}),{status:403});
    await assert.rejects(cancelLostVenueBooking(f.pool,f.actor,{}),{status:400});
    await assert.rejects(cancelLostVenueBooking(f.pool,{...f.actor,id:randomUUID()},{booking_id:f.lost}),{status:404});
    await f.q("UPDATE events SET status='cancelled' WHERE id=$1",[f.event]);
    await assert.rejects(cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost}),{status:409});
  } finally {await f.close();}
});

test('TC_E10S05_04: outbox failure rolls back approval, publication, primary transfer and cancellation',async()=>{
  const f=await fixture();
  try {
    const submitted=await submitBooking(f.pool,f.actor,f.input,randomUUID());
    const id=submitted.body.booking.id;
    await f.q("CREATE FUNCTION reject_recovery_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Recovery outbox failure'; END $$");
    await f.q('CREATE TRIGGER reject_recovery_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_recovery_outbox()');
    await assert.rejects(decideBooking(f.pool,f.decider,id,{decision:'approve'}),/Recovery outbox failure/);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[id])).rows[0].status,'pending');
    assert.equal((await f.q('SELECT is_primary FROM venue_bookings WHERE id=$1',[f.lost])).rows[0].is_primary,true);
    assert.equal((await f.q('SELECT venue_name FROM event_publications')).rows[0].venue_name,'Original Hall');
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE entity_id=$1 AND action IN ('Booking Approved','Lost Venue Replaced')", [id])).rowCount, 0);
    assert.equal((await f.q('SELECT id FROM notifications WHERE user_id IN ($1,$2)', [f.organiser,f.attendee])).rowCount, 0);
    await f.q('DROP TRIGGER reject_recovery_outbox ON notification_deliveries');
    await decideBooking(f.pool,f.decider,id,{decision:'approve'});
    await f.q('CREATE TRIGGER reject_recovery_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_recovery_outbox()');
    await assert.rejects(cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost}),/Recovery outbox failure/);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[f.lost])).rows[0].status,'conflicting');
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE action='Lost Venue Booking Cancelled'")).rowCount,0);
  }finally{await f.close();}
});

async function anotherVenue(f: Awaited<ReturnType<typeof fixture>>, name: string) {
  const id = randomUUID();
  await f.q("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Test campus',100,'00:00','23:59')", [id,name]);
  await f.q('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)', [id,f.staff]);
  return id;
}

test('TC_E10S05_03 TC_E10S05_04: rejected retries and staff suggestions preserve the lost original across the chain', async () => {
  const f = await fixture();
  try {
    const first = await submitBooking(f.pool,f.actor,f.input,randomUUID());
    await decideBooking(f.pool,f.decider,first.body.booking.id,{decision:'reject',reason:'Room unsuitable'});
    const venueB = await anotherVenue(f,'Second recovery hall');
    const retryInput = {...f.input,venue_id:venueB};
    const key = randomUUID();
    const second = await submitBooking(f.pool,f.actor,retryInput,key);
    assert.equal(second.body.booking.replaces_booking_id,first.body.booking.id);
    assert.equal((await submitBooking(f.pool,f.actor,retryInput,key)).body.booking.id,second.body.booking.id);
    await assert.rejects(submitBooking(f.pool,f.actor,retryInput,randomUUID()),{status:409});
    await assert.rejects(cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost}),{status:409});
    const venueC = await anotherVenue(f,'Suggested recovery hall');
    await decideBooking(f.pool,f.decider,second.body.booking.id,{decision:'reject',reason:'Use another room',suggested_venue_id:venueC});
    const final = await submitBooking(f.pool,f.actor,{...f.input,venue_id:venueC,replaces_booking_id:second.body.booking.id},randomUUID());
    assert.equal(final.body.booking.replaces_booking_id,second.body.booking.id);
    assert.equal((await f.q('SELECT id FROM notifications WHERE user_id IN ($1,$2)',[f.organiser,f.attendee])).rowCount,0);
    const approved = await decideBooking(f.pool,f.decider,final.body.booking.id,{decision:'approve'});
    assert.equal(approved.body.coordinatorNotified,true);
    assert.equal((await f.q('SELECT is_primary FROM venue_bookings WHERE id=$1',[final.body.booking.id])).rows[0].is_primary,true);
    assert.equal((await f.q('SELECT venue_name FROM event_publications')).rows[0].venue_name,'Suggested recovery hall');
    assert.equal((await f.q("SELECT id FROM venue_bookings WHERE id IN ($1,$2) AND status='rejected'",[first.body.booking.id,second.body.booking.id])).rowCount,2);
    assert.equal((await f.q('SELECT id FROM notifications WHERE user_id IN ($1,$2)',[f.organiser,f.attendee])).rowCount,2);
    assert.equal((await cancelLostVenueBooking(f.pool,f.actor,{booking_id:f.lost})).status,200);
  } finally { await f.close(); }
});

test('TC_E10S05_04: secondary-room recovery audits internally without changing publication or notifying Attendees', async () => {
  const f = await fixture();
  try {
    await f.q('UPDATE venue_bookings SET is_primary=false WHERE id=$1',[f.lost]);
    const primaryVenue = await anotherVenue(f,'Unaffected primary hall');
    await f.q(`INSERT INTO venue_bookings(event_id,venue_id,booking_range,status,is_primary)
      VALUES($1,$2,'[2027-01-15T01:00Z,2027-01-15T04:00Z)','confirmed',true)`,[f.event,primaryVenue]);
    await f.q("UPDATE event_publications SET venue_name='Unaffected primary hall' WHERE event_id=$1",[f.event]);
    const publication = (await f.q('SELECT * FROM event_publications')).rows;
    const submitted = await submitBooking(f.pool,f.actor,f.input,randomUUID());
    const approved = await decideBooking(f.pool,f.decider,submitted.body.booking.id,{decision:'approve'});
    assert.equal(approved.body.coordinatorNotified,true);
    assert.deepEqual((await f.q('SELECT * FROM event_publications')).rows,publication);
    assert.equal((await f.q('SELECT id FROM notifications WHERE user_id=$1',[f.attendee])).rowCount,0);
    assert.equal((await f.q('SELECT is_primary FROM venue_bookings WHERE id=$1',[submitted.body.booking.id])).rows[0].is_primary,false);
    const audit=(await f.q("SELECT new_value FROM audit_logs WHERE action='Lost Venue Replaced'")).rows[0];
    assert.equal(JSON.parse(audit.new_value).publication_updated,false);
    assert.equal(JSON.parse(audit.new_value).is_primary,false);
  } finally { await f.close(); }
});

test('TC_E10S05_04: failure queuing the Coordinator decision notice rolls back the earlier venue-change effects', async () => {
  const f = await fixture();
  try {
    const submitted = await submitBooking(f.pool,f.actor,f.input,randomUUID());
    const id = submitted.body.booking.id;
    const baseline = (await f.q('SELECT id FROM notifications ORDER BY id')).rows;
    await f.q(`CREATE FUNCTION reject_approval_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM notifications WHERE id=NEW.notification_id AND title='Venue booking approved') THEN
        RAISE EXCEPTION 'Approval outbox failure';
      END IF;
      RETURN NEW;
    END $$`);
    await f.q('CREATE TRIGGER reject_approval_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_approval_outbox()');
    await assert.rejects(decideBooking(f.pool,f.decider,id,{decision:'approve'}),/Approval outbox failure/);
    assert.equal((await f.q('SELECT status FROM venue_bookings WHERE id=$1',[id])).rows[0].status,'pending');
    assert.equal((await f.q('SELECT is_primary FROM venue_bookings WHERE id=$1',[f.lost])).rows[0].is_primary,true);
    assert.equal((await f.q('SELECT venue_name FROM event_publications')).rows[0].venue_name,'Original Hall');
    assert.equal((await f.q("SELECT id FROM audit_logs WHERE entity_id=$1 AND action IN ('Booking Approved','Lost Venue Replaced')",[id])).rowCount,0);
    assert.deepEqual((await f.q('SELECT id FROM notifications ORDER BY id')).rows,baseline);
  } finally { await f.close(); }
});

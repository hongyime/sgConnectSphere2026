import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { inTransaction } from '../src/database/pool.js';
import { PostgresEventLifecycleRepository } from '../src/modules/eventLifecycle/repository.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from '../src/modules/eventNotifications/service.js';
import { updateEventInformationWithNotifications } from '../src/modules/eventNotifications/informationChange.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('E11-S01: real PostgreSQL recipient selection and atomic business changes', async t => {
  const f = await loginDatabase();
  const pool = f.pool;
  async function fixture(status='confirmed') {
    const ids = Object.fromEntries(['event','org','o','c','v','t','r','w','withdrawn','inactive','stranger','venue','request'].map(key => [key,randomUUID()]));
    await pool.query('INSERT INTO client_organisations(id,name) VALUES($1,$2)', [ids.org,ids.org]);
    for (const [key,role] of Object.entries({o:'event_organiser',c:'event_coordinator',v:'venue_staff',t:'technical_support_staff',r:'attendee',w:'attendee',withdrawn:'attendee',inactive:'attendee',stranger:'venue_staff'})) {
      await pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role,is_active)
        VALUES($1,$2,$3,'unused','Synthetic user',$4,$5)`, [ids[key],key==='o'?ids.org:null,`${ids[key]}@example.test`,role,key!=='inactive']);
    }
    await pool.query(`INSERT INTO events(id,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance)
      VALUES($1,$2,$3,$4,'PRIVATE planning details',$5,'[2027-01-01 09:00Z,2027-01-01 12:00Z)',20)`, [ids.event,ids.o,ids.c,ids.org,status]);
    await pool.query(`INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Public venue',100,'08:00','22:00')`,[ids.venue,`Venue ${ids.venue}`]);
    await pool.query(`INSERT INTO venue_bookings(venue_id,event_id,booking_range,status,decided_by)
      VALUES($1,$2,'[2027-01-01 09:00Z,2027-01-01 12:00Z)','confirmed',$3)`,[ids.venue,ids.event,ids.stranger]);
    await pool.query(`INSERT INTO tech_support_requests(id,event_id,support_range,requested_by)
      VALUES($1,$2,'[2027-01-01 09:00Z,2027-01-01 12:00Z)',$3)`,[ids.request,ids.event,ids.c]);
    await pool.query(`INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range)
      VALUES($1,$2,$3,'[2027-01-01 09:00Z,2027-01-01 12:00Z)')`,[ids.request,ids.event,ids.t]);
    for (const [key,registration] of Object.entries({r:'registered',w:'waitlisted',withdrawn:'withdrawn',inactive:'registered'})) {
      await pool.query('INSERT INTO event_registrations(event_id,attendee_id,status) VALUES($1,$2,$3)',[ids.event,ids[key],registration]);
    }
    await pool.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
      VALUES($1,'Public event','2027-01-01 09:00Z','2027-01-01 12:00Z','Public venue','Public location')`,[ids.event]);
    const options: NotificationOptions = {resolveVenueStaff:async (_client,venues) => {
      assert.deepEqual(venues,[ids.venue]);
      return [ids.v,ids.v,ids.inactive,ids.r]; // Validate roles and active status even for trusted adapters.
    }};
    const actor: AuthenticatedUser = {id:ids.c,email:`${ids.c}@example.test`,role:'event_coordinator',isActive:true,failedLoginCount:0};
    return {ids,options,actor,repository:new PostgresEventLifecycleRepository(options,pool)};
  }
  const notifications = async (eventId: string) => (await pool.query(
    `SELECT n.user_id,n.message,d.id AS delivery_id,d.recipient_email,d.html FROM notifications n
     JOIN notification_deliveries d ON d.notification_id=n.id WHERE n.event_id=$1 ORDER BY n.user_id`,[eventId])).rows;
  try {
    await t.test('TC_E11S01_01: real status change commits its audit and correct recipients; same status is silent', async () => {
      const {ids,repository} = await fixture('under_review');
      await repository.updateEventStatus(ids.event,'approved',ids.c,'PRIVATE decision reason');
      const rows = await notifications(ids.event);
      assert.deepEqual(rows.map(r=>r.user_id),[ids.o]);
      assert.match(rows[0].message,/approved.*Changed at/);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM audit_logs WHERE event_id=$1',[ids.event])).rows[0].n,1);
      const before = (await repository.findEventById(ids.event))!.statusChangedAt;
      await repository.updateEventStatus(ids.event,'approved',ids.c,'A retry must not change the decision');
      assert.equal((await notifications(ids.event)).length,1);
      assert.deepEqual((await repository.findEventById(ids.event))!.statusChangedAt,before);
      assert.equal((await pool.query('SELECT decision_reason FROM events WHERE id=$1',[ids.event])).rows[0].decision_reason,'PRIVATE decision reason');
    });
    await t.test('TC_E11S01_02 TC_E11S01_14: actual date edit notifies active linked users using public attendee content', async () => {
      const {ids,options,actor} = await fixture();
      await updateEventInformationWithNotifications(pool,actor,ids.event,{startAt:'2027-01-01T10:00:00Z'},options);
      const rows = await notifications(ids.event);
      assert.deepEqual(rows.map(r=>r.user_id).sort(),[ids.o,ids.v,ids.t,ids.r,ids.w].sort());
      for (const row of rows.filter(r=>[ids.r,ids.w].includes(r.user_id))) {
        assert.match(row.message,/Public event: Event date, time changed/);
        assert.ok(!row.message.includes('PRIVATE') && !row.html.includes('PRIVATE'));
      }
      assert.equal((await pool.query('SELECT lower(event_range) AS starts FROM events WHERE id=$1',[ids.event])).rows[0].starts.toISOString(),'2027-01-01T10:00:00.000Z');
      await updateEventInformationWithNotifications(pool,actor,ids.event,{startAt:'2027-01-01T10:00:00Z'},options);
      await updateEventInformationWithNotifications(pool,actor,ids.event,{description:'Only description changes'},options);
      assert.equal((await notifications(ids.event)).length,5);
    });
    await t.test('TC_E11S01_09: an outbox failure rolls back status, audit, notification and actual date edit', async () => {
      const {ids,repository,options,actor} = await fixture();
      await pool.query(`CREATE FUNCTION fail_event_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_outbox_failure'; END $$;
        CREATE TRIGGER fail_event_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_event_delivery()`);
      try {
        await assert.rejects(repository.updateEventStatus(ids.event,'planning',ids.c),/synthetic_outbox_failure/);
        await assert.rejects(updateEventInformationWithNotifications(pool,actor,ids.event,{startAt:'2027-01-01T10:00:00Z'},options),/synthetic_outbox_failure/);
        const event = (await repository.findEventById(ids.event))!;
        assert.equal(event.status,'confirmed');
        assert.equal(event.startAt!.toISOString(),'2027-01-01T09:00:00.000Z');
        for (const table of ['audit_logs','notifications']) assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE event_id=$1`,[ids.event])).rows[0].n,0);
      } finally {
        await pool.query('DROP TRIGGER fail_event_delivery ON notification_deliveries; DROP FUNCTION fail_event_delivery()');
      }
    });
    await t.test('TC_E11S01_15: concurrent retries yield one in-app and email record per recipient', async () => {
      const {ids,options} = await fixture();
      const audience = await inTransaction(pool, client=>captureEventAudience(client,ids.event,options));
      const changeId=randomUUID(), occurredAt=new Date();
      await Promise.all([1,2].map(()=>inTransaction(pool,client=>notifyEventChange(client,{
        changeId,occurredAt,before:audience,after:audience,change:{kind:'arrangements',fields:['venue']},
      }))));
      const rows = await notifications(ids.event);
      assert.equal(rows.length,6);
      assert.equal(new Set(rows.map(r=>r.user_id)).size,6);
      assert.equal(new Set(rows.map(r=>r.delivery_id)).size,6);
    });
    await t.test('TC_E11S01_12: cancellation notifications retain recipients after registrations and staff are released', async () => {
      const {ids,options} = await fixture();
      await inTransaction(pool,async client=>{
        const before = await captureEventAudience(client,ids.event,options);
        await client.query("UPDATE events SET status='cancelled' WHERE id=$1",[ids.event]);
        await client.query("UPDATE venue_bookings SET status='released' WHERE event_id=$1",[ids.event]);
        await client.query("UPDATE tech_staff_assignments SET status='released' WHERE event_id=$1",[ids.event]);
        await client.query("UPDATE event_registrations SET status='withdrawn' WHERE event_id=$1",[ids.event]);
        const after = await captureEventAudience(client,ids.event,options);
        await notifyEventChange(client,{changeId:randomUUID(),occurredAt:new Date(),actorId:ids.c,before,after,change:{kind:'status',from:'confirmed',to:'cancelled'}});
      });
      assert.deepEqual((await notifications(ids.event)).map(r=>r.user_id).sort(),[ids.o,ids.v,ids.t,ids.r,ids.w].sort());
    });
    await t.test('TC_E11S01_13: decided_by and unrelated Venue Staff never stand in for assignments', async () => {
      const {ids} = await fixture();
      await inTransaction(pool,async client=>{
        const audience = await captureEventAudience(client,ids.event);
        assert.deepEqual(audience.venueStaff,[]);
        assert.deepEqual(audience.unresolvedVenueIds,[ids.venue]);
      });
    });
    await t.test('TC_E11S01_16: uncommitted messages are invisible and rollback leaves no jobs', async () => {
      const {ids,options} = await fixture();
      await assert.rejects(inTransaction(pool,async client=>{
        const audience = await captureEventAudience(client,ids.event,options);
        await notifyEventChange(client,{changeId:randomUUID(),occurredAt:new Date(),before:audience,after:audience,change:{kind:'place_released'}});
        assert.equal((await notifications(ids.event)).length,0);
        throw new Error('rollback_test');
      }),/rollback_test/);
      assert.equal((await notifications(ids.event)).length,0);
    });
  } finally { await f.close(); }
});

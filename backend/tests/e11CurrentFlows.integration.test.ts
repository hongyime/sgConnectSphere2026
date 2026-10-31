import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { registerForEvent, joinWaitingList, withdrawRegistration } from '../src/modules/attendeeRegistration/service.js';
import { manageRegistrations } from '../src/modules/attendeeRegistration/organiser.js';
import { submitChangeRequest, decideChangeRequest } from '../src/modules/changeManagement/requests.js';

// SQL creates a published Confirmed Event and its arrangements, not fake
// registrations/notices. Membership and changes below use the real services.
async function fixture() {
  const db = await loginDatabase();
  const org = randomUUID(), event = randomUUID(), venue = randomUUID();
  await db.pool.query('INSERT INTO client_organisations(id,name) VALUES($1,$2)', [org, 'Synthetic audit client']);
  async function person(role: AuthenticatedUser['role']) {
    const id = randomUUID(), email = `${id}@example.test`;
    await db.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id,contact_number,email_verified_at)
      VALUES($1,$2,'synthetic','Synthetic audit user',$3,$4,'0000',now())`, [id,email,role,role === 'event_organiser' ? org : null]);
    return { id,email,role,clientOrgId:role === 'event_organiser' ? org : null,isActive:true,failedLoginCount:0 } as AuthenticatedUser;
  }
  const organiser = await person('event_organiser'), coordinator = await person('event_coordinator'), staff = await person('venue_staff');
  await db.pool.query(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance,registration_enabled,waitlist_enabled)
    VALUES($1,'EVT-E11-AUDIT','INTERNAL planning title',$2,$3,$4,'confirmed','[2030-05-01 01:00Z,2030-05-01 04:00Z)',1,true,true)`,[event,organiser.id,coordinator.id,org]);
  await db.pool.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,'Audit Hall','Synthetic campus',1,'00:00','23:59')",[venue]);
  await db.pool.query('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)',[venue,staff.id]);
  const session = (await db.pool.query('SELECT id FROM sessions WHERE event_id=$1',[event])).rows[0].id;
  await db.pool.query("INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status,is_primary) SELECT $1,id,$2,session_range,'confirmed',true FROM sessions WHERE id=$3",[event,venue,session]);
  await db.pool.query("INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location) SELECT id,'Published community event',lower(event_range),upper(event_range),'Audit Hall','Synthetic campus' FROM events WHERE id=$1",[event]);
  const register = (user: AuthenticatedUser) => registerForEvent(db.pool,user,event,{sessionIds:[session]});
  return { ...db,org,event,venue,session,person,organiser,coordinator,staff,register };
}

for (const action of ['approve','reject','add'] as const) test(`TC_E11S01_14: E09 organiser ${action} notice uses published name, not internal title`,async () => {
  const f = await fixture();
  try {
    const first = await f.person('attendee'), target = await f.person('attendee');
    assert.equal((await f.register(first)).status,201);
    if (action !== 'add') {
      const pending = await f.register(target);
      assert.equal((pending.body.registration as {status:string}).status,'pending');
    }
    await f.pool.query('UPDATE venues SET max_capacity=2 WHERE id=$1',[f.venue]);
    const row = (await f.pool.query('SELECT id FROM event_registrations WHERE event_id=$1 AND attendee_id=$2',[f.event,target.id])).rows[0];
    const result = await manageRegistrations(f.pool,f.organiser,f.event,action === 'add'
      ? {action,email:target.email,sessionIds:[f.session]} : {action,registrationId:row.id});
    assert.equal(result.status,action === 'add' ? 201 : 200);
    const notice = (await f.pool.query("SELECT message FROM notifications WHERE user_id=$1 AND title IN ('Registration confirmed','Registration request declined')",[target.id])).rows;
    assert.equal(notice.length,1);
    assert.match(notice[0].message,/Published community event/);
    assert.doesNotMatch(notice[0].message,/INTERNAL planning title/);
    assert.equal((await f.pool.query('SELECT count(*) FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.user_id=$1',[target.id])).rows[0].count,action === 'add' ? '1' : '2');
  } finally { await f.close(); }
});

test('TC_E11S01_02 TC_E11S01_03 TC_E11S01_11 TC_E11S01_14: real E09 memberships receive E10 applied dates once with public content',async () => {
  const f = await fixture();
  try {
    const registered = await f.person('attendee'), waiting = await f.person('attendee'), withdrawn = await f.person('attendee'), unrelated = await f.person('attendee');
    assert.equal((await f.register(registered)).status,201);
    assert.equal((await joinWaitingList(f.pool,waiting,f.event)).status,201);
    assert.equal((await joinWaitingList(f.pool,withdrawn,f.event)).status,201);
    assert.equal((await withdrawRegistration(f.pool,withdrawn,f.event)).status,200);
    const request = await submitChangeRequest(f.pool,f.organiser,f.event,{description:'Move event date',changes:{startAt:'2030-05-02T01:00:00Z',endAt:'2030-05-02T04:00:00Z'}});
    const reviewed = await decideChangeRequest(f.pool,f.coordinator,f.event,request.id,{decision:'preview'});
    assert.ok('preview' in reviewed && reviewed.preview?.canApply);
    await decideChangeRequest(f.pool,f.coordinator,f.event,request.id,{decision:'approve',previewToken:reviewed.preview.token});
    const notices = (await f.pool.query("SELECT user_id,message FROM notifications WHERE event_id=$1 AND title='Event update'",[f.event])).rows;
    for (const user of [registered,waiting]) {
      const own = notices.filter(n => n.user_id === user.id);
      assert.equal(own.length,1); assert.match(own[0].message,/Published community event: Event date, time changed/);
      assert.doesNotMatch(own[0].message,/INTERNAL|Move event date/);
      assert.equal((await f.pool.query("SELECT count(*) FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.user_id=$1 AND n.title='Event update'",[user.id])).rows[0].count,'1');
    }
    assert.equal(notices.filter(n => [withdrawn.id,unrelated.id,f.coordinator.id].includes(n.user_id)).length,0);
    assert.equal(notices.filter(n => n.user_id === f.staff.id).length,1,'specific staff reconfirmation is not duplicated by generic date notice');
  } finally { await f.close(); }
});

test('TC_E11S01_10 TC_E11S01_11: withdrawing a real registered place notifies eligible waiting members once',async () => {
  const f = await fixture();
  try {
    const registered = await f.person('attendee'), waiting = await f.person('attendee'), withdrawn = await f.person('attendee');
    await f.register(registered); await joinWaitingList(f.pool,waiting,f.event); await joinWaitingList(f.pool,withdrawn,f.event);
    await withdrawRegistration(f.pool,withdrawn,f.event);
    assert.equal((await withdrawRegistration(f.pool,registered,f.event)).status,200);
    assert.equal((await withdrawRegistration(f.pool,registered,f.event)).status,409);
    const notices = (await f.pool.query("SELECT user_id,message FROM notifications WHERE event_id=$1 AND title='Event update'",[f.event])).rows;
    assert.deepEqual(notices.map(n => n.user_id),[waiting.id]);
    assert.match(notices[0].message,/Published community event: A place is available/);
    assert.doesNotMatch(notices[0].message,/INTERNAL planning title/);
    assert.equal((await f.pool.query('SELECT count(*) FROM notification_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.user_id=$1',[waiting.id])).rows[0].count,'1');
  } finally { await f.close(); }
});


for (const action of ['approve','reject','add'] as const) test(`TC_E11S01_14: unpublished E09 ${action} does not expose the planning title`,async () => {
  const f = await fixture();
  try {
    const first = await f.person('attendee'), target = await f.person('attendee');
    await f.register(first);
    if (action !== 'add') await f.register(target);
    await f.pool.query('UPDATE venues SET max_capacity=2 WHERE id=$1',[f.venue]);
    await f.pool.query('DELETE FROM event_publications WHERE event_id=$1',[f.event]);
    const row = (await f.pool.query('SELECT id FROM event_registrations WHERE event_id=$1 AND attendee_id=$2',[f.event,target.id])).rows[0];
    const before = (await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1',[target.id])).rows[0].count;
    const result = await manageRegistrations(f.pool,f.organiser,f.event,action === 'add'
      ? {action,email:target.email,sessionIds:[f.session]} : {action,registrationId:row.id});
    assert.equal(result.status,action === 'add' ? 201 : 200);
    assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1',[target.id])).rows[0].count,before);
    assert.equal((await f.pool.query("SELECT count(*) FROM notifications WHERE user_id=$1 AND message LIKE '%INTERNAL%'",[target.id])).rows[0].count,'0');
  } finally { await f.close(); }
});


test('TC_E11S01_09: organiser decision and notice roll back together on outbox failure',async () => {
  const f = await fixture();
  try {
    const first = await f.person('attendee'), target = await f.person('attendee');
    await f.register(first); await f.register(target);
    const row = (await f.pool.query('SELECT id FROM event_registrations WHERE event_id=$1 AND attendee_id=$2',[f.event,target.id])).rows[0];
    const before = (await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1',[target.id])).rows[0].count;
    await f.pool.query(`CREATE FUNCTION reject_audit_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic E11 outbox failure'; END $$;
      CREATE TRIGGER reject_audit_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_audit_outbox()`);
    await assert.rejects(manageRegistrations(f.pool,f.organiser,f.event,{action:'reject',registrationId:row.id}),/synthetic E11 outbox failure/);
    assert.equal((await f.pool.query('SELECT status FROM event_registrations WHERE id=$1',[row.id])).rows[0].status,'pending');
    assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1',[target.id])).rows[0].count,before);
    assert.equal((await f.pool.query("SELECT count(*) FROM audit_logs WHERE entity_id=$1 AND action='Registration Rejected'",[row.id])).rows[0].count,'0');
  } finally { await f.close(); }
});

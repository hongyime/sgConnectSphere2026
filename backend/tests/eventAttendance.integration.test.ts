// E09-S06 / SCRUM-68 Scenarios 1–3 and counts checklist. Actual PostgreSQL, isolated schema.
// No mocked registration or attendance storage; verify counts, replay, rollback and authority races.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { getAttendance, recordAttendance } from '../src/modules/eventAttendance/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

async function fixture() {
  const f=await loginDatabase();
  const org=randomUUID(), owner=randomUUID(), coord=randomUUID(), other=randomUUID();
  await f.pool.query('INSERT INTO client_organisations(id,name) VALUES($1,$2)',[org,'Attendance Client']);
  for(const [id,role] of [[owner,'event_organiser'],[coord,'event_coordinator'],[other,'event_coordinator']])
    await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'unused',$3,$4,$5)`,[id,`${id}@example.test`,role,role,role==='event_organiser'?org:null]);
  const event=randomUUID();
  await f.pool.query(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance)
    VALUES($1,'ATTENDANCE-TEST','Attendance test',$2,$3,$4,'completed',tstzrange('2026-01-01','2026-01-02','[)'),10)`,[event,owner,coord,org]);
  const registrations: string[]=[];
  for(const status of ['registered','registered','registered','registered','registered','waitlisted','withdrawn','pending','rejected']) {
    const id=randomUUID();const registration=randomUUID();
    await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role) VALUES($1,$2,'unused',$3,'attendee')`,[id,`${id}@example.test`,`Attendee ${registrations.length}`]);
    await f.pool.query('INSERT INTO event_registrations(id,event_id,attendee_id,status) VALUES($1,$2,$3,$4)',[registration,event,id,status]);
    registrations.push(registration);
  }
  const actor: AuthenticatedUser={id:coord,email:`${coord}@example.test`,role:'event_coordinator',isActive:true,failedLoginCount:0};
  return {...f,event,actor,other,registrations};
}

test('TC_E09S06_01 TC_E09S06_02 TC_E09S06_04 — real attendance persists independently of five registered places, latest correction and replay',async()=>{
 const f=await fixture();try {
   await f.pool.query('INSERT INTO event_registration_sessions(registration_id,event_id,session_id) SELECT r.id,r.event_id,s.id FROM event_registrations r JOIN sessions s ON s.event_id=r.event_id');
   const selectedBefore=(await f.pool.query('SELECT * FROM event_registration_sessions ORDER BY registration_id,session_id')).rows;
   const before=(await f.pool.query('SELECT id,status,registered_at,withdrawn_at FROM event_registrations ORDER BY id')).rows;
   const initial=await getAttendance(f.pool,f.actor,'ATTENDANCE-TEST');
   assert.equal(initial.registeredCount,5);assert.equal(initial.attendedCount,0);assert.ok(initial.attendees.every(a=>!a.attended));
   for(const registrationId of f.registrations.slice(0,4)) await recordAttendance(f.pool,f.actor,f.event,{registrationId,attended:true});
   const result=await getAttendance(f.pool,f.actor,f.event);assert.equal(result.registeredCount,5);assert.equal(result.attendedCount,4);
   assert.equal(result.attendees.filter(a=>!a.attended).length,1);
   assert.equal((await recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[0],attended:true})).changed,false);
   await recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[0],attended:false});
   assert.equal((await getAttendance(f.pool,f.actor,f.event)).attendedCount,3);
   assert.equal((await recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[4],attended:false})).changed,false);
   assert.deepEqual((await f.pool.query('SELECT id,status,registered_at,withdrawn_at FROM event_registrations ORDER BY id')).rows,before);
   assert.deepEqual((await f.pool.query('SELECT * FROM event_registration_sessions ORDER BY registration_id,session_id')).rows,selectedBefore);
   assert.equal((await f.pool.query('SELECT * FROM event_attendance')).rowCount,5);
   const audit=(await f.pool.query("SELECT * FROM audit_logs WHERE entity_type='event_attendance'")).rows;
   assert.equal(audit.length,5);assert.ok(audit.every(a=>a.actor_id===f.actor.id&&a.event_id===f.event));
 }finally{await f.close();}
});

test('TC_E09S06_03 — all non-Completed statuses block writes, server capability matches; missing, foreign and inactive registrations refused',async()=>{
 const f=await fixture();try {
   const statuses=(await f.pool.query("SELECT unnest(enum_range(NULL::event_status))::text AS status")).rows;
   for(const {status} of statuses.filter(r=>r.status!=='completed')){
     await f.pool.query('UPDATE events SET status=$2 WHERE id=$1',[f.event,status]);
     await assert.rejects(()=>recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[0],attended:true}),{status:status==='draft'?403:409});
     if(status!=='draft') assert.equal((await getAttendance(f.pool,f.actor,f.event)).canRecord,false);
   }
   await f.pool.query("UPDATE events SET status='completed' WHERE id=$1",[f.event]);
   for(const registrationId of [...f.registrations.slice(5),randomUUID()])
     await assert.rejects(()=>recordAttendance(f.pool,f.actor,f.event,{registrationId,attended:true}),{status:409});
   const otherEvent=randomUUID();await f.pool.query(`INSERT INTO events(id,title,organiser_id,client_org_id,status,event_range,expected_attendance)
     SELECT $2,'Other',organiser_id,client_org_id,'completed',event_range,10 FROM events WHERE id=$1`,[f.event,otherEvent]);
   await f.pool.query('UPDATE event_registrations SET event_id=$2 WHERE id=$1',[f.registrations[0],otherEvent]);
   await assert.rejects(()=>recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[0],attended:true}),{status:409});
   assert.equal((await f.pool.query('SELECT * FROM event_attendance')).rowCount,0);
 }finally{await f.close();}
});

test('E09-S06 authority is rechecked in DB; no cross-Coordinator roster; concurrent retries produce one history/audit row',async()=>{
 const f=await fixture();try {
   await assert.rejects(()=>getAttendance(f.pool,{...f.actor,id:f.other},f.event),{status:403});
   await assert.rejects(()=>getAttendance(f.pool,f.actor,'missing-event'),{status:403});
   await f.pool.query('UPDATE users SET is_active=false WHERE id=$1',[f.actor.id]);
   await assert.rejects(()=>getAttendance(f.pool,f.actor,f.event),{status:403});
   await f.pool.query('UPDATE users SET is_active=true WHERE id=$1',[f.actor.id]);
   const results=await Promise.all([1,2].map(()=>recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[0],attended:true})));
   assert.equal(results.filter(r=>r.changed).length,1);assert.equal((await f.pool.query('SELECT * FROM event_attendance')).rowCount,1);
   // No write survives a rejected account lock or audit failure.
   const lock=await f.pool.connect();try {await lock.query('BEGIN');await lock.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[f.actor.id]);
     await assert.rejects(()=>recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[1],attended:true}),{status:409});
   }finally{await lock.query('ROLLBACK');lock.release();}
   await f.pool.query(`CREATE FUNCTION reject_attendance_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$;
     CREATE TRIGGER reject_attendance_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_attendance_audit()`);
   await assert.rejects(()=>recordAttendance(f.pool,f.actor,f.event,{registrationId:f.registrations[1],attended:true}),/audit unavailable/);
   assert.equal((await f.pool.query('SELECT * FROM event_attendance')).rowCount,1);
 }finally{await f.close();}
});

// E09-S06 synthetic setup only; subsequent human acceptance must be captured by hand.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
const address=new URL(process.env.TEST_DATABASE_URL || '');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(address.hostname));
assert.match(address.pathname,/^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/);
const pool=new Pool({connectionString:address.href});const client=await pool.connect();
try {
 const users=(await client.query("SELECT id,role,client_org_id FROM users WHERE email IN ('coord_a@connectsphere.com','organiser_a@clienta.com')")).rows;
 const coordinator=users.find(u=>u.role==='event_coordinator'),owner=users.find(u=>u.role==='event_organiser');
 assert.ok(coordinator&&owner,'Seed this isolated database first');
 await client.query('BEGIN');
 const attendees=(await client.query("SELECT id FROM users WHERE email IN ('attendee_a@example.com','attendee_b@example.com') ORDER BY email")).rows.map(u=>u.id);
 assert.equal(attendees.length,2,'Seed the two synthetic Attendees first');
 for(let i=0;i<3;i++){
  const id=randomUUID();await client.query(`INSERT INTO users(id,email,password_hash,full_name,role)
    SELECT $1,$2,password_hash,$3,'attendee' FROM users WHERE id=$4`,[id,`attendance-${id.slice(0,8)}@example.test`,`Attendance guest ${i+1}`,attendees[0]]);attendees.push(id);
 }
 const fixtures=[];
 for(const status of ['completed','confirmed']) {
  const id=randomUUID(),code=`E09-ATTENDANCE-${status.toUpperCase()}-${id.slice(0,8)}`;
  await client.query(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance)
    VALUES($1,$2,$3,$4,$5,$6,$7,tstzrange(now()-interval '2 hours',now()-interval '1 hour','[)'),10)`,[id,code,`Attendance ${status}`,owner.id,coordinator.id,owner.client_org_id,status]);
  for(const attendee of attendees) {
   const registration=(await client.query("INSERT INTO event_registrations(event_id,attendee_id,status) VALUES($1,$2,'registered') RETURNING id",[id,attendee])).rows[0];
   await client.query('INSERT INTO event_registration_sessions(registration_id,event_id,session_id) SELECT $1,$2,id FROM sessions WHERE event_id=$2',[registration.id,id]);
  }
  fixtures.push({status,code,path:`/coordinator/events/${code}/attendance`});
 }
 await client.query('COMMIT');console.log(JSON.stringify(fixtures,null,2));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}

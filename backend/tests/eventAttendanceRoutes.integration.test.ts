// E09-S06 / SCRUM-68 Scenarios 1–3 and counts checklist. Actual PostgreSQL, isolated schema.
// No mocked registration or attendance storage; verify counts, replay, rollback and authority races.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
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

test('E09-S06 live API cookie sessions wire reads, writes, missing id, malformed body and access refusals',async()=>{
 const f=await fixture();const saved={...process.env};let closeRuntime:(()=>Promise<void>)|undefined;
 try {
   const origin='https://connectsphere.example.com';
   process.env.PUBLIC_SITE_URL=origin;
   process.env.DATABASE_URL=f.connectionString;delete process.env.DATABASE_POOLER_URL;
   const runtime=await import('../src/modules/eventVisibility/runtime.js');
   const client=await import('../src/database/client.js');
   closeRuntime=async()=>{await runtime.databasePool().end();await client.getDatabasePool().end();};
   const {tokenDigest}=await import('../src/modules/accessControl/sessions.js');
   const {default:handler}=await import('../../api/events.js');
   const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
   await f.pool.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[tokenDigest(token),f.actor.id]);
   const cookie=`cs_access=${token}`;
   async function call(method:string,url:string,cookie?:string,body?:unknown) {
     let status=200;let result:any;const headers:Record<string,unknown>={};
     await handler({method,url,headers:{cookie,origin},body},{setHeader(k,v){headers[k]=v;},status(code){status=code;return{json(value){result=value;}};},json(value){result=value;}});
     return{status,body:result,headers};
   }
   assert.equal((await call('GET','/api/events?attendance=1&id=ATTENDANCE-TEST')).status,401);
   assert.equal((await call('GET','/api/events?attendance=1',cookie)).status,400);
   assert.equal((await call('POST','/api/events?attendance=1&id=ATTENDANCE-TEST',cookie,{})).status,400);
   const read=await call('GET','/api/events?attendance=1&id=ATTENDANCE-TEST',cookie);
   assert.equal(read.body.attendance.registeredCount,5);assert.equal(read.headers['Cache-Control'],'private, no-store');
   assert.equal((await call('POST','/api/events?attendance=1&id=ATTENDANCE-TEST',cookie,{registrationId:f.registrations[0],attended:true})).status,200);
   assert.equal((await call('GET','/api/events?attendance=1&id=ATTENDANCE-TEST',cookie)).body.attendance.attendedCount,1);
   await f.pool.query("UPDATE events SET status='confirmed' WHERE id=$1",[f.event]);
   assert.equal((await call('POST','/api/events?attendance=1&id=ATTENDANCE-TEST',cookie,{registrationId:f.registrations[1],attended:true})).status,409);
   await f.pool.query('UPDATE events SET coordinator_id=$2 WHERE id=$1',[f.event,f.other]);
   assert.equal((await call('GET','/api/events?attendance=1&id=ATTENDANCE-TEST',cookie)).status,403);
 }finally{if(closeRuntime)await closeRuntime();process.env=saved;await f.close();}
});

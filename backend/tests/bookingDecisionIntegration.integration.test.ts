// Combined E06-S03/E06-S04 tests run unchanged against the actual decisions.ts
// from PR #298. Before that dependency lands, these explicitly skip; they never
// substitute a fake decision writer. See the testing guide for isolated runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { Pool, PoolClient } from 'pg';
import { loginDatabase } from './helpers/loginDatabase.js';
import { submitBooking } from '../src/modules/venueBooking/bookingSubmission.js';
import { withdrawBooking } from '../src/modules/venueBooking/bookingWithdrawal.js';
import { setPrimaryBooking } from '../src/modules/venueBooking/bookingPrimary.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const decisionUrl = new URL('../src/modules/venueBooking/decisions.ts', import.meta.url);
const decideBooking = existsSync(decisionUrl) ? (await import(decisionUrl.href)).decideBooking : undefined;
const dependency = { skip: decideBooking ? false : 'Requires real E06-S04 decisions.ts from PR #298; run in the documented integration checkout', timeout: 15000 };

async function fixture() {
  const db=await loginDatabase();
  const org=randomUUID(),coord=randomUUID(),staff=randomUUID(),organiser=randomUUID(),event=randomUUID();
  await db.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,'Synthetic Combined Org')",[org]);
  for(const [id,role] of [[coord,'event_coordinator'],[staff,'venue_staff'],[organiser,'event_organiser']])
    await db.pool.query("INSERT INTO users(id,client_org_id,email,password_hash,full_name,role) VALUES($1,$2,$3,'unused','Synthetic User',$4)",[id,role==='event_organiser'?org:null,`${id}@example.test`,role]);
  await db.pool.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance)
    VALUES($1,'EVT-COMBINED',$2,$3,$4,'Synthetic Combined Event','planning','[2027-01-15T08:00+08,2027-01-15T18:00+08)',50)`,[event,organiser,coord,org]);
  const venues=[randomUUID(),randomUUID()];
  for(const id of venues) {
    await db.pool.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Synthetic Campus',100,'08:00','22:00')",[id,`Synthetic ${id}`]);
    await db.pool.query('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)',[id,staff]);
  }
  const actor:AuthenticatedUser={id:coord,role:'event_coordinator',email:`${coord}@example.test`,isActive:true,failedLoginCount:0};
  const decider:AuthenticatedUser={...actor,id:staff,role:'venue_staff',email:`${staff}@example.test`};
  const input={event_id:event,venue_id:venues[0],starts_at:'2027-01-15T09:00:00+08:00',ends_at:'2027-01-15T10:00:00+08:00'};
  const saved=await submitBooking(db.pool,actor,input,randomUUID());
  return {...db,event,actor,decider,input,venues,id:saved.body.booking.id as string};
}
function gate() {
  let enter!:()=>void,open!:()=>void;
  const entered=new Promise<void>(resolve=>{enter=resolve;});
  const released=new Promise<void>(resolve=>{open=resolve;});
  return {entered,open,async pause(){enter();await released;}};
}
// No SQL responses are mocked: each service owns BEGIN/COMMIT on one dedicated
// real client. Pause only after a chosen statement has executed in PostgreSQL.
function controlledPool(client:PoolClient,after:(sql:string)=>Promise<void>) {
  const statements:string[]=[];
  const query=async(sql:string,values?:unknown[])=>{
    statements.push(sql);
    const result=await client.query(sql,values);
    await after(sql);
    return result;
  };
  return {pool:{query,connect:async()=>({query,release(){}})} as unknown as Pool,statements};
}
async function waitForBlocked(pool:Pool,blocker:number) {
  for(let attempt=0;attempt<200;attempt++) {
    const result=await pool.query('SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))) AS blocked',[blocker]);
    if(result.rows[0].blocked)return;
    await delay(10);
  }
  assert.fail('Expected real competing transaction to wait on the held lock');
}
async function clients(pool:Pool) {
  const first=await pool.connect(),second=await pool.connect();
  await first.query("SET statement_timeout='6s'");await second.query("SET statement_timeout='6s'");
  return {first,second,async close(){await first.query('ROLLBACK');await second.query('ROLLBACK');first.release();second.release();}};
}
async function effects(pool:Pool) {
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM audit_logs WHERE action IN ('Booking Approved','Booking Rejected')) AS decisions,
    (SELECT count(*)::int FROM audit_logs WHERE action='Booking Withdrawn') AS withdrawals,
    (SELECT count(*)::int FROM notifications) AS notices,
    (SELECT count(*)::int FROM notification_deliveries) AS deliveries`)).rows[0];
}
for(const decision of ['approve','reject']) {
  const body={decision,reason:'Synthetic rejection'};
  test(`TC_E06S03_10 real ${decision}: withdrawal commits first, decision sees Released and creates no effects`,dependency,async()=>{
    const f=await fixture(),c=await clients(f.pool),hold=gate();
    let withdrawing:Promise<unknown>|undefined,deciding:Promise<any>|undefined;
    try {
      const before=await effects(f.pool);
      const w=controlledPool(c.first,async sql=>{if(sql.startsWith("UPDATE venue_bookings SET status='released'"))await hold.pause();});
      const d=controlledPool(c.second,async()=>{});
      withdrawing=withdrawBooking(w.pool,f.actor,{booking_id:f.id});
      await hold.entered;
      deciding=decideBooking(d.pool,f.decider,f.id,body);
      const pid=(await c.first.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await waitForBlocked(f.pool,pid);
      hold.open();await withdrawing;
      const refused=await deciding;
      assert.equal(refused.status,409);assert.match(refused.body.error,/Coordinator withdrew/);
      assert.deepEqual(await effects(f.pool),{decisions:before.decisions,withdrawals:before.withdrawals+1,notices:before.notices+1,deliveries:before.deliveries+1});
      assert.equal((await f.pool.query('SELECT status FROM venue_bookings WHERE id=$1',[f.id])).rows[0].status,'released');
      assert.ok(w.statements.includes('BEGIN'));assert.ok(d.statements.includes('BEGIN'));
    } finally {hold.open();await Promise.allSettled([withdrawing,deciding]);await c.close();await f.close();}
  });
  test(`TC_E06S03_10 real ${decision}: decision holds event, withdrawal NOWAIT refuses without effects`,dependency,async()=>{
    const f=await fixture(),c=await clients(f.pool),hold=gate();
    let deciding:Promise<any>|undefined;
    try {
      const before=await effects(f.pool);
      const d=controlledPool(c.first,async sql=>{if(sql.includes('FROM events')&&sql.includes('FOR NO KEY UPDATE'))await hold.pause();});
      const w=controlledPool(c.second,async()=>{});
      deciding=decideBooking(d.pool,f.decider,f.id,body);
      await hold.entered;
      await assert.rejects(withdrawBooking(w.pool,f.actor,{booking_id:f.id}),{status:409,message:'A Venue Staff decision or an event or account update may be in progress. Refresh the booking list and try again.'});
      assert.deepEqual(await effects(f.pool),before);
      assert.equal((await f.pool.query('SELECT status FROM venue_bookings WHERE id=$1',[f.id])).rows[0].status,'pending');
      hold.open();assert.equal((await deciding).status,200);
      assert.deepEqual(await effects(f.pool),{decisions:before.decisions+1,withdrawals:before.withdrawals,notices:before.notices+1,deliveries:before.deliveries+1});
    } finally {hold.open();await Promise.allSettled([deciding]);await c.close();await f.close();}
  });
  test(`TC_E06S03_10 real ${decision}: venue-first withdrawal rolls back while event-first decision waits`,dependency,async()=>{
    const f=await fixture(),c=await clients(f.pool),hold=gate();
    let withdrawing:Promise<any>|undefined,deciding:Promise<any>|undefined;
    try {
      const before=await effects(f.pool);
      const w=controlledPool(c.first,async sql=>{if(sql.includes('FOR NO KEY UPDATE OF v'))await hold.pause();});
      withdrawing=withdrawBooking(w.pool,f.actor,{booking_id:f.id}).then(value=>({value}),error=>({error}));
      await hold.entered;
      const d=controlledPool(c.second,async()=>{});
      deciding=decideBooking(d.pool,f.decider,f.id,body);
      const pid=(await c.first.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await waitForBlocked(f.pool,pid);
      hold.open();const refusal=await withdrawing;
      assert.equal(refusal.error.status,409);assert.equal(refusal.error.message,'A Venue Staff decision or an event or account update may be in progress. Refresh the booking list and try again.');
      assert.equal((await deciding).status,200);
      assert.deepEqual(await effects(f.pool),{decisions:before.decisions+1,withdrawals:before.withdrawals,notices:before.notices+1,deliveries:before.deliveries+1});
    } finally {hold.open();await Promise.allSettled([withdrawing,deciding]);await c.close();await f.close();}
  });
}
for(const winner of ['selection','approval']) {
  test(`TC_E06S03_07 real approval and explicit primary selection serialize: ${winner} holds event first`,dependency,async()=>{
    const f=await fixture(),c=await clients(f.pool),hold=gate();
    let first:Promise<any>|undefined,second:Promise<any>|undefined;
    try {
      await decideBooking(f.pool,f.decider,f.id,{decision:'approve'});
      // Model a valid legacy Confirmed row with no designated primary.
      await f.pool.query('UPDATE venue_bookings SET is_primary=false WHERE event_id=$1',[f.event]);
      const next=await submitBooking(f.pool,f.actor,{...f.input,venue_id:f.venues[1]},randomUUID());
      const a=controlledPool(c.first,async sql=>{if(sql.includes('FROM events')&&sql.includes('FOR NO KEY UPDATE'))await hold.pause();});
      const b=controlledPool(c.second,async()=>{});
      if(winner==='selection')first=setPrimaryBooking(a.pool,f.actor,{booking_id:f.id});
      else first=decideBooking(a.pool,f.decider,next.body.booking.id,{decision:'approve'});
      await hold.entered;
      if(winner==='selection')second=decideBooking(b.pool,f.decider,next.body.booking.id,{decision:'approve'});
      else second=setPrimaryBooking(b.pool,f.actor,{booking_id:f.id});
      const pid=(await c.first.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await waitForBlocked(f.pool,pid);
      hold.open();assert.equal((await first).status,200);assert.equal((await second).status,200);
      assert.deepEqual((await f.pool.query('SELECT id FROM venue_bookings WHERE event_id=$1 AND is_primary',[f.event])).rows,[{id:f.id}]);
      assert.equal((await f.pool.query("SELECT id FROM venue_bookings WHERE event_id=$1 AND status='confirmed'",[f.event])).rows.length,2);
    } finally {hold.open();await Promise.allSettled([first,second]);await c.close();await f.close();}
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { setPrimaryBooking } from '../src/modules/venueBooking/bookingPrimary.js';
import { createBookingSubmissionHandler } from '../src/modules/venueBooking/bookingSubmissionHandler.js';
import type { VercelResponse } from '../src/vercel.js';

const actor: AuthenticatedUser = { id:randomUUID(),role:'event_coordinator',email:'synthetic@example.test',isActive:true,failedLoginCount:0 };
const id=randomUUID(),event=randomUUID(),old=randomUUID();
type State={published?:boolean;eventStatus?:string;event?:boolean;assigned?:boolean;account?:boolean;active?:boolean;role?:string;failures?:number;lock?:Date|null;missing?:boolean;status?:string;reconfirm?:boolean;primary?:boolean;previous?:boolean;fail?:string;busy?:boolean};
function database(state:State={}) {
  const calls:{sql:string;values?:unknown[]}[]=[];
  const query=async(sql:string,values?:unknown[])=>{
    calls.push({sql,values});
    if(state.busy && sql.includes('NOWAIT'))throw Object.assign(new Error('busy'),{code:'55P03'});
    if(state.fail && sql.includes(state.fail))throw new Error('Synthetic failure');
    let rows:unknown[]=[];
    if(sql.startsWith('SELECT id,coordinator_id'))rows=state.event===false?[]:[{id:event,coordinator_id:state.assigned===false?old:actor.id,status:state.eventStatus??'planning'}];
    else if(sql.startsWith('SELECT is_active'))rows=state.account===false?[]:[{is_active:state.active!==false,role:state.role??actor.role,failed_login_count:state.failures??0,locked_until:state.lock??null}];
    else if(sql.includes('SELECT b.id,b.status'))rows=[...(state.missing?[]:[{id,status:state.status??'confirmed',is_primary:state.primary??false,venue_id:id,name:'Selected Hall',requires_reconfirmation:state.reconfirm??false}]),...(state.previous===false?[]:[{id:old,status:'confirmed',is_primary:true,venue_id:old,name:'Old Hall'}])];
    else if(sql.startsWith('SELECT event_id FROM event_publications'))rows=state.published?[{event_id:event}]:[];
    else if(sql.startsWith('SELECT e.id, e.title'))rows=[{id:event,title:'Internal',public_name:'Public',status:'confirmed',starts_at:new Date(),ends_at:new Date(),organiser_id:actor.id,coordinator_id:actor.id}];
    else if(sql.includes('INSERT INTO audit_logs'))rows=[{id:randomUUID(),occurred_at:new Date()}];
    return {rows,rowCount:rows.length};
  };
  const client={query,release(){}} as unknown as PoolClient;
  return {pool:{connect:async()=>client} as unknown as Pool,calls};
}
test('TC_E06S03_07 primary selection validates actor, identifier and current assignment/account',async()=>{
  const db=database();
  await assert.rejects(setPrimaryBooking(db.pool,undefined,{}),{status:401});
  await assert.rejects(setPrimaryBooking(db.pool,{...actor,role:'venue_staff'},{}),{status:403});
  for(const body of [undefined,'bad',{}, {booking_id:3},{booking_id:'bad'}]) await assert.rejects(setPrimaryBooking(db.pool,actor,body),{status:400});
  assert.equal(db.calls.length,0);
  for(const state of [{event:false},{assigned:false},{account:false},{active:false},{role:'venue_staff'},{failures:5},{lock:new Date(Date.now()+60000)}]) {
    const refused=database(state);
    await assert.rejects(setPrimaryBooking(refused.pool,actor,{booking_id:id}),{status:state.event===false||state.assigned===false?404:403});
    assert.equal(refused.calls.at(-1)?.sql,'ROLLBACK');
  }
});
test('TC_E06S03_07 primary selection locks event first, refuses non-Confirmed and safely retries',async()=>{
  for(const status of ['pending','tentative','rejected','released','expired']) await assert.rejects(setPrimaryBooking(database({status}).pool,actor,{booking_id:id}),{status:409});
  await assert.rejects(setPrimaryBooking(database({missing:true}).pool,actor,{booking_id:id}),{status:404});
  const replay=database({primary:true});
  assert.equal((await setPrimaryBooking(replay.pool,actor,{booking_id:id})).body.replayed,true);
  assert.ok(!replay.calls.some(c=>c.sql.startsWith('UPDATE')||c.sql.includes('INSERT')));
  for(const previous of [true,false]) {
    const db=database({previous,lock:new Date(0)});
    const result=await setPrimaryBooking(db.pool,actor,{booking_id:id});
    assert.equal(result.body.booking.is_primary,true);assert.equal(result.body.replayed,false);
    const eventLock=db.calls.findIndex(c=>c.sql.includes('FOR NO KEY UPDATE'));
    const bookingLock=db.calls.findIndex(c=>c.sql.includes('FOR UPDATE OF b'));
    assert.ok(eventLock>=0 && eventLock<bookingLock);
    const updates=db.calls.filter(c=>c.sql.startsWith('UPDATE'));
    assert.deepEqual(updates.map(c=>c.values),[[event],[id],[event,id,'planning']]);
    assert.ok(updates[0].sql.includes('is_primary=false'));assert.ok(updates[1].sql.includes('is_primary=true'));
    assert.deepEqual(db.calls.find(c=>c.sql.includes('INSERT INTO audit_logs'))?.values?.slice(-2),[previous?'Old Hall':null,'Selected Hall']);
    assert.equal(db.calls.at(-1)?.sql,'COMMIT');
  }
});
test('TC_E06S03_07 primary audit/write failure rolls back and busy account gives 409',async()=>{
  for(const fail of ['SET is_primary=false','SET is_primary=true','UPDATE event_publications','INSERT INTO audit_logs']) {
    const db=database({fail});
    await assert.rejects(setPrimaryBooking(db.pool,actor,{booking_id:id}),/Synthetic failure/);
    assert.equal(db.calls.at(-1)?.sql,'ROLLBACK');
  }
  await assert.rejects(setPrimaryBooking(database({busy:true}).pool,actor,{booking_id:id}),{status:409});
});
test('primary selection shares origin/authentication HTTP boundary, without submission key',async()=>{
  let status=0;
  const response={setHeader(){},status(value:number){status=value;return{json(){}}},json(){}} as VercelResponse;
  const handler=createBookingSubmissionHandler({authenticate:async()=>actor,pool:()=>database().pool,allowedOrigin:()=>true});
  await handler({method:'POST',headers:{},body:{action:'set_primary',booking_id:id}},response);
  assert.equal(status,200);
});


test('TC_E06S03_07 primary selection refuses ended/pre-approval Events even for a replay',async()=>{
  for(const eventStatus of ['completed','cancelled','draft','submitted','under_review','clarification_requested','rejected']) {
    for(const primary of [false,true]) {
      const db=database({eventStatus,primary});
      await assert.rejects(setPrimaryBooking(db.pool,actor,{booking_id:id}),{status:409});
      assert.equal(db.calls.at(-1)?.sql,'ROLLBACK');
      assert.ok(!db.calls.some(c=>c.sql.startsWith('UPDATE')||c.sql.includes('INSERT')));
    }
  }
  for(const eventStatus of ['approved','planning','safety_review','confirmed'])
    assert.equal((await setPrimaryBooking(database({eventStatus}).pool,actor,{booking_id:id})).status,200);
});

test('TC_E06S03_07 confirmed primary must be reconfirmed before attendee publication changes',async()=>{
  await assert.rejects(setPrimaryBooking(database({eventStatus:'confirmed',reconfirm:true}).pool,actor,{booking_id:id}),{status:409});
  const db=database({eventStatus:'confirmed'});await setPrimaryBooking(db.pool,actor,{booking_id:id});
  assert.deepEqual(db.calls.find(c=>c.sql.startsWith('UPDATE event_publications'))?.values,[event,id,'confirmed']);
});


test('TC_E11S01_02 published primary change captures both scoped audiences; self-only audiences emit nothing',async()=>{
  for(const previous of [true,false]){
    const db=database({eventStatus:'confirmed',published:true,previous});
    await setPrimaryBooking(db.pool,actor,{booking_id:id});
    const scopes=db.calls.filter(c=>c.sql.startsWith('SELECT DISTINCT staff_id FROM venue_staff_assignments'));
    assert.deepEqual(scopes.map(c=>c.values?.[0]),previous?[[old],[id]]:[[id]]);
    assert.equal(db.calls.at(-1)?.sql,'COMMIT');
  }
});

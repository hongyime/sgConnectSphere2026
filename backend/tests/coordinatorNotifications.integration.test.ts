import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { PostgresEventLifecycleRepository } from '../src/modules/eventLifecycle/repository.js';
import { requestCoordinatorReassignment, respondToCoordinatorReassignment, assignCoordinatorOnSubmit } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { inTransaction } from '../src/database/pool.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelRequest, VercelResponse } from '../src/vercel.js';

async function fixture() {
  const f=await loginDatabase();
  const ids={org:randomUUID(),organiser:randomUUID(),a:randomUUID(),b:randomUUID()};
  await f.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,'Synthetic organisation')",[ids.org]);
  for (const [id,role] of [[ids.organiser,'event_organiser'],[ids.a,'event_coordinator'],[ids.b,'event_coordinator']]) {
    await f.pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role)
      VALUES($1,$2,$3,'unused','Synthetic user',$4)`,[id,id===ids.organiser?ids.org:null,`${id}@example.test`,role]);
  }
  const repository=new PostgresEventLifecycleRepository({},f.pool);
  const request={title:'Integration event',organiserId:ids.organiser,clientOrgId:ids.org,
    startAt:new Date('2027-01-01T09:00:00Z'),endAt:new Date('2027-01-01T12:00:00Z'),expectedAttendance:10};
  const user=(id:string):AuthenticatedUser=>({id,email:`${id}@example.test`,role:'event_coordinator',isActive:true,failedLoginCount:0});
  const messages=async(eventId:string)=>(await f.pool.query(`SELECT n.user_id,n.title,d.id AS delivery_id,d.recipient_email
    FROM notifications n LEFT JOIN notification_deliveries d ON d.notification_id=n.id WHERE n.event_id=$1`,[eventId])).rows;
  return {...f,ids,repository,request,user,messages};
}

test('TC_E03S01_01 TC_E11S01_11: submission and draft submission notify organiser and assigned Coordinator once each with email jobs',async()=>{
  const f=await fixture();
  try {
    const created=await f.repository.createEvent({...f.request,status:'submitted'});
    const draft=await f.repository.createEvent({...f.request,status:'draft'});
    assert.equal((await f.messages(draft.id)).length,0);
    const submitted=await f.repository.updateEvent(draft.id,{...f.request,status:'submitted'});
    for (const event of [created,submitted]) {
      assert.equal(event.status,'under_review');
      const rows=await f.messages(event.id);
      assert.deepEqual(rows.map(r=>r.user_id).sort(),[f.ids.organiser,event.coordinatorId!].sort());
      assert.equal(rows.find(r=>r.user_id===event.coordinatorId)?.title,'New event assigned');
      assert.equal(rows.find(r=>r.user_id===f.ids.organiser)?.title,'Event update');
      assert.ok(rows.every(r=>r.delivery_id && r.recipient_email===`${r.user_id}@example.test`));
      assert.equal(await inTransaction(f.pool,client=>assignCoordinatorOnSubmit(client,event.id)),null);
      assert.equal((await f.messages(event.id)).length,2,'replaying assignment cannot duplicate either channel');
    }
  } finally { await f.close(); }
});

test('TC_E03S01_05 TC_E03S01_07 TC_E11S01_11: reassignment request and responses produce one outbox job without actor self-notices',async()=>{
  const f=await fixture();
  try {
    const event=await f.repository.createEvent({...f.request,status:'submitted'});
    const from=event.coordinatorId!,to=from===f.ids.a?f.ids.b:f.ids.a;
    for (const decision of ['decline','accept'] as const) {
      const request=await requestCoordinatorReassignment(f.pool,f.user(from),event.id,{toCoordinatorId:to});
      await respondToCoordinatorReassignment(f.pool,f.user(to),request.id,decision);
    }
    const rows=await f.messages(event.id);
    assert.equal(rows.length,6); // Two initial notices plus two requests and two responses.
    assert.equal(rows.filter(r=>r.user_id===to).length,2,'responding actor only receives the earlier requests');
    assert.equal(rows.filter(r=>r.title==='Reassignment requested').length,2);
    assert.equal(rows.filter(r=>r.title==='Reassignment accepted' && r.user_id===from).length,1);
    assert.equal(rows.filter(r=>r.title==='Reassignment declined' && r.user_id===from).length,1);
    assert.ok(rows.every(r=>r.delivery_id));
    assert.equal(new Set(rows.map(r=>r.delivery_id)).size,6);
  } finally { await f.close(); }
});

test('TC_E11S01_09: email-outbox failure rolls back creation, draft submission, reassignment request and each response',async()=>{
  const f=await fixture();
  const totals=async()=>{
    const counts=[];
    for (const table of ['events','audit_logs','notifications','notification_deliveries','coordinator_reassignments']) counts.push((await f.pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n);
    return counts;
  };
  async function failsAtomically(action:()=>Promise<unknown>) {
    const before=await totals();
    await f.pool.query(`CREATE FUNCTION fail_assignment_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_assignment_outbox_failure'; END $$;
      CREATE TRIGGER fail_assignment_outbox BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_assignment_outbox()`);
    try {
      await assert.rejects(action,/synthetic_assignment_outbox_failure/);
      assert.deepEqual(await totals(),before);
    } finally { await f.pool.query('DROP TRIGGER fail_assignment_outbox ON notification_deliveries; DROP FUNCTION fail_assignment_outbox()'); }
  }
  try {
    await failsAtomically(()=>f.repository.createEvent({...f.request,status:'submitted'}));
    const draft=await f.repository.createEvent({...f.request,status:'draft'});
    await failsAtomically(()=>f.repository.updateEvent(draft.id,{...f.request,status:'submitted'}));
    assert.equal((await f.repository.findEventById(draft.id))?.status,'draft');
    const event=await f.repository.createEvent({...f.request,status:'submitted'});
    const from=event.coordinatorId!,to=from===f.ids.a?f.ids.b:f.ids.a;
    await failsAtomically(()=>requestCoordinatorReassignment(f.pool,f.user(from),event.id,{toCoordinatorId:to}));
    const request=await requestCoordinatorReassignment(f.pool,f.user(from),event.id,{toCoordinatorId:to});
    for (const decision of ['accept','decline']) {
      await failsAtomically(()=>respondToCoordinatorReassignment(f.pool,f.user(to),request.id,decision));
      assert.equal((await f.pool.query('SELECT status FROM coordinator_reassignments WHERE id=$1',[request.id])).rows[0].status,'pending');
      assert.equal((await f.repository.findEventById(event.id))?.coordinatorId,from);
    }
  } finally { await f.close(); }
});

// E03-S08 to E03-S10 (C-69, T-83): the Event Coordinator Lead's queue,
// assignment, reassignment and oversight, driven through the real
// api/events.ts handler with cookie sessions. Routes follow
// docs/api-changes-week7.md, Change 5. The handler's pool follows
// DATABASE_URL, so each test points it at its own schema and ends it after.
async function leadRoutes() {
  const f=await loginDatabase();
  const saved={...process.env};
  process.env.DATABASE_URL=f.connectionString;
  delete process.env.DATABASE_POOLER_URL;
  process.env.APP_URL='https://app.example.test';
  const {tokenDigest}=await import('../src/modules/accessControl/sessions.js');
  const {getDatabasePool}=await import('../src/database/client.js');
  const {default:handler}=await import('../../api/events.js');
  const ids={org:randomUUID(),organiser:randomUUID(),coord1:randomUUID(),coord2:randomUUID(),lead:randomUUID()};
  await f.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,'Client A')",[ids.org]);
  const cookies:Record<string,string>={};
  for (const [key,role,name] of [['organiser','event_organiser','Organiser One'],['coord1','event_coordinator','Coordinator One'],
    ['coord2','event_coordinator','Coordinator Two'],['lead','event_coordinator_lead','Lead One']] as const) {
    await f.pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role) VALUES($1,$2,$3,'unused',$4,$5::user_role)`,
      [ids[key],key==='organiser'?ids.org:null,`${key}@example.test`,name,role]);
    const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
    await f.pool.query(`INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')`,[tokenDigest(token),ids[key]]);
    cookies[key]=`cs_access=${token}`;
  }
  let day=0;
  const event=async(code:string,status:string,coordinator:string|null,createdAt='2026-11-01T01:00:00Z')=>{
    const id=randomUUID();
    await f.pool.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7::event_status,tstzrange($8::timestamptz,$8::timestamptz+interval '3 hours','[)'),120,$9::timestamptz)`,
    [id,code,ids.organiser,coordinator,ids.org,`Event ${code}`,status,new Date(Date.UTC(2027,0,10+day++,1)).toISOString(),createdAt]);
    return id;
  };
  async function call(method:'GET'|'POST',url:string,cookie:string,body:unknown={}) {
    let status=200; let reply:Record<string,any>={};
    const response:VercelResponse={setHeader(){},status(code){status=code;return {json(value){reply=value as typeof reply;}};},json(value){reply=value as typeof reply;}};
    await handler({method,url,headers:{cookie,origin:'https://app.example.test'},body} as VercelRequest,response);
    return {status,body:reply};
  }
  const row=async(id:string)=>(await f.pool.query('SELECT status::text AS status,coordinator_id FROM events WHERE id=$1',[id])).rows[0];
  const notices=async(id:string)=>(await f.pool.query('SELECT user_id,title,message FROM notifications WHERE event_id=$1',[id])).rows;
  const audits=async(where:string,values:unknown[])=>(await f.pool.query(`SELECT actor_id,action,field_changed,old_value,new_value FROM audit_logs WHERE ${where} ORDER BY occurred_at,id`,values)).rows;
  const close=async()=>{ await getDatabasePool().end(); process.env=saved; await f.close(); };
  return {...f,ids,cookies,event,call,row,notices,audits,close};
}

test('TC_E03S08_01: a submitted request stays Submitted with no Coordinator, enters the unassigned queue and notifies the Lead only',
  {todo:'Known defect: submission still auto-assigns a Coordinator (repository.ts assignIfSubmitted); E03-S08 not on main'},async()=>{
  const r=await leadRoutes();
  try {
    const created=await new PostgresEventLifecycleRepository({},r.pool).createEvent({title:'Charity Run',organiserId:r.ids.organiser,clientOrgId:r.ids.org,
      status:'submitted',startAt:new Date('2027-02-01T01:00:00Z'),endAt:new Date('2027-02-01T04:00:00Z'),expectedAttendance:300});
    assert.deepEqual(await r.row(created.id),{status:'submitted',coordinator_id:null});
    const queue=await r.call('GET','/api/events?unassigned=1',r.cookies.lead);
    assert.deepEqual(queue.body.events.map((e:{id:string})=>e.id),[created.id]);
    const rows=await r.notices(created.id);
    const lead=rows.filter(n=>n.user_id===r.ids.lead);
    assert.equal(lead.length,1);
    assert.match(lead[0].message,/Charity Run/);
    assert.equal(rows.filter(n=>n.user_id===r.ids.coord1||n.user_id===r.ids.coord2).length,0,'no Coordinator is notified');
  } finally { await r.close(); }
});

test("TC_E03S08_02: the unassigned queue lists each request's basic information oldest first and refuses a Coordinator",async()=>{
  const r=await leadRoutes();
  try {
    const late=await r.event('EVT-Q3','submitted',null,'2026-11-02T02:00:00Z');
    const early=await r.event('EVT-Q1','submitted',null,'2026-11-02T01:00:00Z');
    const middle=await r.event('EVT-Q2','submitted',null,'2026-11-02T01:30:00Z');
    await r.event('EVT-Q4','under_review',r.ids.coord1,'2026-11-01T00:00:00Z');
    const queue=await r.call('GET','/api/events?unassigned=1',r.cookies.lead);
    assert.equal(queue.status,200);
    assert.deepEqual(queue.body.events.map((e:{id:string})=>e.id),[early,middle,late]);
    const first=queue.body.events[0];
    assert.equal(first.title,'Event EVT-Q1');
    assert.equal(first.organisation_name,'Client A');
    assert.ok(first.starts_at instanceof Date && first.ends_at instanceof Date);
    assert.equal(first.expected_attendance,120);
    assert.equal(new Date(first.created_at).toISOString(),'2026-11-02T01:00:00.000Z');
    const refused=await r.call('GET','/api/events?unassigned=1',r.cookies.coord1);
    assert.equal(refused.status,403);
    assert.equal(refused.body.events,undefined);
    assert.equal((await r.audits(`actor_id=$1 AND action='Access Denied'`,[r.ids.coord1])).length,1);
  } finally { await r.close(); }
});

test('TC_E03S08_03: the Lead sees workloads, assigns a queued request, which moves to Under Review, leaves the queue, notifies both and is logged',
  {todo:'Known defect: no Lead workload list or POST ?assign=1 route on main (E03-S08 code only on unmerged feature/SCRUM-153-lead-queue-assignment)'},async()=>{
  const r=await leadRoutes();
  try {
    for (let i=0;i<2;i++) await r.event(`EVT-A${i}`,'under_review',r.ids.coord1);
    for (let i=0;i<5;i++) await r.event(`EVT-B${i}`,'planning',r.ids.coord2);
    const queued=await r.event('EVT-CR','submitted',null);
    const list=await r.call('GET','/api/events?coordinators=1&workload=1',r.cookies.lead);
    assert.equal(list.status,200);
    const load=Object.fromEntries(list.body.coordinators.map((c:{id:string;active_events:number})=>[c.id,c.active_events]));
    assert.deepEqual([load[r.ids.coord1],load[r.ids.coord2]],[2,5]);
    const assigned=await r.call('POST','/api/events?assign=1&id=EVT-CR',r.cookies.lead,{coordinator_id:r.ids.coord1});
    assert.equal(assigned.status,200);
    assert.deepEqual(await r.row(queued),{status:'under_review',coordinator_id:r.ids.coord1});
    assert.deepEqual((await r.call('GET','/api/events?unassigned=1',r.cookies.lead)).body.events,[]);
    const to=(await r.notices(queued)).map(n=>n.user_id);
    assert.ok(to.includes(r.ids.coord1)&&to.includes(r.ids.organiser));
    assert.ok((await r.audits(`event_id=$1 AND field_changed='coordinator_id'`,[queued])).some(a=>a.actor_id===r.ids.lead&&a.new_value===r.ids.coord1));
  } finally { await r.close(); }
});

test("TC_E03S08_04: a Coordinator's assign call on a queued request is refused, leaves it queued and is logged",
  {todo:'Known defect: no POST ?assign=1 route on main, so no Lead check refuses it and no denial is logged'},async()=>{
  const r=await leadRoutes();
  try {
    const queued=await r.event('EVT-CR','submitted',null);
    const refused=await r.call('POST','/api/events?assign=1&id=EVT-CR',r.cookies.coord1,{coordinator_id:r.ids.coord1});
    assert.equal(refused.status,403);
    assert.deepEqual(await r.row(queued),{status:'submitted',coordinator_id:null});
    assert.equal((await r.audits(`actor_id=$1 AND action='Access Denied'`,[r.ids.coord1])).length,1);
  } finally { await r.close(); }
});

test("TC_E03S08_05: after a queue assignment the Organiser's status history shows Submitted then Under Review",
  {todo:'Known defect: no POST ?assign=1 route on main (E03-S08)'},async()=>{
  const r=await leadRoutes();
  try {
    const queued=await r.event('EVT-CR','submitted',null);
    await r.pool.query(`INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,'event',$2,$2,'Status changed to submitted','status','draft','submitted')`,[r.ids.organiser,queued]);
    assert.equal((await r.call('POST','/api/events?assign=1&id=EVT-CR',r.cookies.lead,{coordinator_id:r.ids.coord1})).status,200);
    const read=await r.call('GET','/api/events?id=EVT-CR',r.cookies.organiser);
    assert.equal(read.status,200);
    assert.deepEqual(read.body.event.statusHistory.map((h:{old_value:string;new_value:string})=>[h.old_value,h.new_value]),
      [['draft','submitted'],['submitted','under_review']]);
  } finally { await r.close(); }
});

test('TC_E03S09_01: a Lead reassignment takes effect at once, notifies both Coordinators and the Organiser and is logged',
  {todo:'Known defect: no POST ?reassign=1&by_lead=1 route on main (E03-S09 code only on unmerged feature/SCRUM-154-lead-reassignment)'},async()=>{
  const r=await leadRoutes();
  try {
    const id=await r.event('EVT-CR','under_review',r.ids.coord1);
    const moved=await r.call('POST','/api/events?reassign=1&id=EVT-CR&by_lead=1',r.cookies.lead,{coordinator_id:r.ids.coord2});
    assert.equal(moved.status,200);
    assert.deepEqual(await r.row(id),{status:'under_review',coordinator_id:r.ids.coord2});
    const to=new Set((await r.notices(id)).map(n=>n.user_id));
    for (const user of [r.ids.coord1,r.ids.coord2,r.ids.organiser]) assert.ok(to.has(user),user);
    assert.ok((await r.audits(`event_id=$1 AND field_changed='coordinator_id'`,[id]))
      .some(a=>a.actor_id===r.ids.lead&&a.old_value===r.ids.coord1&&a.new_value===r.ids.coord2));
  } finally { await r.close(); }
});

test('TC_E03S10_01: the oversight view lists every active event with its Coordinator or Unassigned, filters, and shows workloads',
  {todo:'Known defect: no GET ?oversight=1 route on main (E03-S10 code only on unmerged feature/SCRUM-155-lead-oversight)'},async()=>{
  const r=await leadRoutes();
  try {
    for (const code of ['EVT-S1','EVT-S2']) await r.event(code,'submitted',null);
    for (const code of ['EVT-U1','EVT-U2','EVT-U3']) await r.event(code,'under_review',r.ids.coord1);
    await r.event('EVT-P1','planning',r.ids.coord2);
    await r.event('EVT-DONE','completed',r.ids.coord2);
    await r.event('EVT-OFF','cancelled',r.ids.coord1);
    const all=await r.call('GET','/api/events?oversight=1',r.cookies.lead);
    assert.equal(all.status,200);
    assert.equal(all.body.events.length,6);
    assert.equal(all.body.events.filter((e:{coordinator_id:string|null})=>e.coordinator_id===null).length,2);
    assert.equal((await r.call('GET',`/api/events?oversight=1&coordinator=${r.ids.coord1}`,r.cookies.lead)).body.events.length,3);
    assert.equal((await r.call('GET','/api/events?oversight=1&status=submitted',r.cookies.lead)).body.events.length,2);
    const load=Object.fromEntries(all.body.workloads.map((w:{id:string;active_events:number})=>[w.id,w.active_events]));
    assert.deepEqual([load[r.ids.coord1],load[r.ids.coord2]],[3,1]);
  } finally { await r.close(); }
});

// Holds on main only because ?oversight=1 is not routed yet: the call falls
// through to the Organiser event list, which refuses and audits any other role.
test('TC_E03S10_02: a Coordinator opening the oversight view is refused with no event data and the attempt is logged',async()=>{
  const r=await leadRoutes();
  try {
    await r.event('EVT-U1','under_review',r.ids.coord2);
    const refused=await r.call('GET','/api/events?oversight=1',r.cookies.coord1);
    assert.equal(refused.status,403);
    assert.equal(refused.body.events,undefined);
    assert.equal((await r.audits(`actor_id=$1 AND action='Access Denied'`,[r.ids.coord1])).length,1);
  } finally { await r.close(); }
});

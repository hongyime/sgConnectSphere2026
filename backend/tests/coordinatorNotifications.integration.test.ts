import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { PostgresEventLifecycleRepository } from '../src/modules/eventLifecycle/repository.js';
import { requestCoordinatorReassignment, respondToCoordinatorReassignment, assignCoordinatorOnSubmit } from '../src/modules/eventLifecycle/coordinatorAssignment.js';
import { inTransaction } from '../src/database/pool.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

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

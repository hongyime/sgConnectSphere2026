// TC_E08S05_06 controlled HUMAN procedure. No HTTP clock override or OS-clock change.
// The operator types each evaluation command and captures their own output.
// Automated piped input may smoke-test this helper but is never human evidence.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loginDatabase } from '../backend/tests/helpers/loginDatabase.js';
import { evaluateCompletions } from '../backend/src/modules/eventLifecycle/completion.js';

const address = new URL(process.env.TEST_DATABASE_URL || '');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(address.hostname),'Use a disposable loopback test database');
assert.match(address.pathname,/^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/);
const applicationCommit = execFileSync('git',['rev-parse','--short','HEAD'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',
}).trim();
const f = await loginDatabase(); // Random schema, all migrations; never public/manual fixtures.
let reader: ReturnType<typeof createInterface> | undefined;
try {
  const organisation=randomUUID(), organiser=randomUUID(), coordinator=randomUUID(), event=randomUUID();
  await f.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,'TC06 synthetic client')",[organisation]);
  for(const [id,role] of [[organiser,'event_organiser'],[coordinator,'event_coordinator']])
    await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id)
      VALUES($1,$2,'unused',$3,$4,$5)`,[id,`${id}@example.test`,role==='event_coordinator'?'TC06 Coordinator':'TC06 Organiser',role,role==='event_organiser'?organisation:null]);
  await f.pool.query(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance)
    VALUES($1,'EVT-2002','TC06 controlled boundary',$2,$3,$4,'confirmed',tstzrange('2026-11-02T09:00:00+08:00','2026-11-02T17:00:00+08:00','[)'),10)`,[event,organiser,coordinator,organisation]);
  console.log('\nTC_E08S05_06 — controlled manual completion evaluation');
  console.log('Application commit:',applicationCommit);
  console.log('Wall-clock run started:',new Date().toISOString());
  console.log('Event: EVT-2002 | Initial status: Confirmed | End: 02 Nov 2026 17:00:00 +08:00');
  console.log('Clock method: existing evaluator dependency injection, isolated PostgreSQL schema.');
  console.log('Computer clock is unchanged. Audit timestamps use actual database time.');
  console.log('Type before, capture the result; type at, capture the result; type quit to clean up.');
  console.log('before = 02 Nov 2026 16:59:59 +08:00; at = 02 Nov 2026 17:00:00 +08:00.');
  let beforeObserved=false, boundaryObserved=false;
  reader=createInterface({input:process.stdin,output:process.stdout,terminal:Boolean(process.stdin.isTTY)});
  reader.setPrompt('TC06 > ');reader.prompt();
  for await(const line of reader){
    const command=line.trim().toLowerCase();
    if(command==='quit')break;
    if(command!=='before'&&command!=='at') {console.log('Use before, at or quit.');reader.prompt();continue;}
    if(command==='at'&&!beforeObserved){console.log('Run before first so the pre-boundary state is observed.');reader.prompt();continue;}
    if(command==='before'&&boundaryObserved){console.log('This event already completed. Restart for a fresh before/at sequence.');reader.prompt();continue;}
    const instant=command==='before'?'2026-11-02T16:59:59+08:00':'2026-11-02T17:00:00+08:00';
    const result=await evaluateCompletions(f.pool,{clock:()=>new Date(instant)});
    const current=(await f.pool.query('SELECT event_code,status,upper(event_range) AS ends_at FROM events WHERE id=$1',[event])).rows[0];
    const activity=(await f.pool.query(`SELECT l.action,l.old_value,l.new_value,coalesce(u.full_name,'System') AS actor,l.occurred_at
      FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id
      WHERE l.event_id=$1 AND l.entity_type='event' AND l.field_changed='status'
      ORDER BY l.occurred_at,l.id`,[event])).rows;
    console.log('\n--- TC_E08S05_06 observation ---');
    console.log('Application commit:',applicationCommit);
    console.log('Actual observation time:',new Date().toISOString());
    console.log('Controlled evaluation clock:',instant);
    console.log('Expected:',command==='before'?'Confirmed; no completion activity':'Completed; System completion activity');
    console.log('Observed:',JSON.stringify({event:current.event_code,status:current.status,endsAt:current.ends_at,completedThisEvaluation:result.completed}));
    console.log('Actual activity:',JSON.stringify(activity,null,2));
    console.log('--- End observation; human must compare and capture ---\n');
    if(command==='before')beforeObserved=true;else boundaryObserved=true;
    reader.prompt();
  }
} finally {reader?.close();await f.close();}

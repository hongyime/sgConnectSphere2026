// E09-S06 / SCRUM-68 automated real-browser integration. NOT human T-93 evidence.
// Run against an isolated assembly containing #324, #326/#327 and this PR.
// Fixture setup creates only a Confirmed published Event and two Sessions;
// registration, completion and attendance are all performed through live UI/API.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { chromium, expect, type BrowserContext } from '@playwright/test';
import { Pool } from 'pg';
const database = new URL(process.env.TEST_DATABASE_URL || '');
const base = new URL(process.env.BASE_URL || '');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(database.hostname));
assert.match(database.pathname,/^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/);
assert.ok(base.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(base.hostname));
const pool = new Pool({connectionString:database.href});
const browser = await chromium.launch();
const code = `E09-INTEGRATION-${randomUUID().slice(0,8)}`;
try {
  const seed = await readFile(new URL('../tests/seed/SEED_DATA.md',import.meta.url),'utf8');
  function credential(email:string) {
    const row=seed.split('\n').find(line=>line.includes(`\`${email}\``));
    assert.ok(row, 'Synthetic account must be documented in SEED_DATA.md');
    return row.split('|')[3].trim().replaceAll('`','');
  }
  const people=(await pool.query("SELECT id,email,role,client_org_id FROM users WHERE email IN ('organiser_a@clienta.com','coord_a@connectsphere.com','attendee_a@example.com','attendee_b@example.com')")).rows;
  assert.equal(people.length,4,'Seed this disposable database before integration');
  const owner=people.find(u=>u.role==='event_organiser')!,coordinator=people.find(u=>u.role==='event_coordinator')!;
  const eventId=randomUUID();
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO events(id,event_code,title,organiser_id,coordinator_id,client_org_id,status,event_range,expected_attendance,registration_enabled,registration_opens_at,registration_closes_at)
      VALUES($1,$2,'Attendance integration',$3,$4,$5,'confirmed',tstzrange(now()-interval '30 minutes',now()+interval '60 minutes','[)'),20,true,now()-interval '1 day',now()+interval '1 day')`,[eventId,code,owner.id,coordinator.id,owner.client_org_id]);
    await client.query("UPDATE sessions SET title='Integration first Session',session_range=tstzrange(now()-interval '30 minutes',now()+interval '10 minutes','[)') WHERE event_id=$1",[eventId]);
    await client.query("INSERT INTO sessions(event_id,title,session_range,expected_attendance) VALUES($1,'Integration second Session',tstzrange(now()+interval '10 minutes',now()+interval '60 minutes','[)'),20)",[eventId]);
    await client.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
      SELECT id,'Attendance integration',lower(event_range),upper(event_range),'Synthetic integration venue','Synthetic venue location' FROM events WHERE id=$1`,[eventId]);
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
  if (process.argv.includes('--prepare-only')) {
    console.log(JSON.stringify({result:'READY_FOR_HUMAN_RUN',eventCode:code,
      registrationPath:`/attendee/register/${code}`,completionPath:`/coordinator/events/${code}/complete`,
      attendancePath:`/coordinator/events/${code}/attendance`}));
  } else {
  async function signIn(context:BrowserContext,email:string) {
    const page=await context.newPage();await page.goto(new URL('/login',base).href);
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByLabel('Password',{exact:true}).fill(credential(email));
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.waitForURL(url=>url.pathname!=='/login');return page;
  }
  for(const [email,sessionCount] of [['attendee_a@example.com',2],['attendee_b@example.com',1]] as const) {
    const context=await browser.newContext();try {
      const page=await signIn(context,email);
      await page.goto(new URL(`/attendee/register/${code}`,base).href);
      await expect(page.getByRole('heading',{name:'Register for this event',exact:true})).toBeVisible();
      const choices=page.getByRole('checkbox');await expect(choices).toHaveCount(2);
      for(let i=0;i<sessionCount;i++)await choices.nth(i).check();
      await page.getByRole('button',{name:'Confirm registration',exact:true}).click();
      await expect(page.getByText("You're registered",{exact:true})).toBeVisible();
    } finally {await context.close();}
  }
  const before=(await pool.query('SELECT id,status,registered_at,withdrawn_at FROM event_registrations WHERE event_id=$1 ORDER BY id',[eventId])).rows;
  const selections=(await pool.query('SELECT * FROM event_registration_sessions WHERE event_id=$1 ORDER BY registration_id,session_id',[eventId])).rows;
  assert.equal(before.length,2);assert.equal(selections.length,3);
  assert.ok(before.every(r=>r.status==='registered'));
  const context=await browser.newContext();try {
    const page=await signIn(context,'coord_a@connectsphere.com');
    const attendancePath=`/coordinator/events/${code}/attendance`;
    const attendanceApi=new URL(`/api/events?attendance=1&id=${code}`,base).href;
    await page.goto(new URL(attendancePath,base).href);
    await expect(page.getByText('Attendance can only be recorded after the event is Completed.')).toBeVisible();
    await expect(page.getByRole('button',{name:/^Mark attended:/}).first()).toBeDisabled();
    assert.equal((await context.request.post(attendanceApi,{data:{registrationId:before[0].id,attended:true}})).status(),409);
    await page.goto(new URL(`/coordinator/events/${code}/complete`,base).href);
    await page.getByRole('button',{name:'Mark complete…',exact:true}).click();
    await page.getByRole('button',{name:'Mark complete',exact:true}).click();
    await expect(page.getByText('This event is Completed.',{exact:true})).toBeVisible();
    assert.equal((await pool.query('SELECT status FROM events WHERE id=$1',[eventId])).rows[0].status,'completed');
    await page.goto(new URL(attendancePath,base).href);
    const attendee=page.locator('.attendance-list > li').filter({hasText:'attendee_a@example.com'});
    await attendee.getByRole('button',{name:/^Mark attended:/}).click();
    await expect(attendee.getByRole('button',{name:/^Mark not attended:/})).toBeEnabled();
    await page.reload();
    await expect(page.locator('.attendance-list > li').filter({hasText:'attendee_b@example.com'}).getByText('Registered but not attended',{exact:true})).toBeVisible();
    const result=await context.request.get(attendanceApi);assert.equal(result.status(),200);
    const {attendance}=await result.json();assert.equal(attendance.registeredCount,2);assert.equal(attendance.attendedCount,1);
    const registration=attendance.attendees.find((a:{email:string})=>a.email==='attendee_a@example.com');assert.equal(registration.attended,true);
    assert.equal((await context.request.post(attendanceApi,{data:{registrationId:registration.registrationId,attended:true}})).status(),200);
    assert.deepEqual((await pool.query('SELECT id,status,registered_at,withdrawn_at FROM event_registrations WHERE event_id=$1 ORDER BY id',[eventId])).rows,before);
    assert.deepEqual((await pool.query('SELECT * FROM event_registration_sessions WHERE event_id=$1 ORDER BY registration_id,session_id',[eventId])).rows,selections);
    assert.equal((await pool.query('SELECT a.* FROM event_attendance a JOIN event_registrations r ON r.id=a.registration_id WHERE r.event_id=$1',[eventId])).rowCount,1);
    assert.equal((await pool.query("SELECT * FROM audit_logs WHERE event_id=$1 AND entity_type='event_attendance'",[eventId])).rowCount,1);
    const activity=(await pool.query("SELECT actor_id FROM audit_logs WHERE event_id=$1 AND entity_type='event' AND new_value='completed'",[eventId])).rows;
    assert.ok(activity.some(row=>row.actor_id===coordinator.id));
    console.log(JSON.stringify({result:'PASS',eventCode:code,registered:2,attended:1,sessionSelections:3,
      checks:['two live UI registrations','two Session choices in one registration','before-completion UI and API blocked','live UI completion','live UI attendance','reload persistence','registration metadata and Session links unchanged','repeat request no duplicate history/audit'],humanEvidence:false}));
  } finally {await context.close();}
  }
} finally {await browser.close();await pool.end();}

// Real browser, session/API and isolated PostgreSQL coverage for the merged
// E10-S01 foundation and SCRUM-205 prefill. No response interception. Concurrent
// approval is a fixture state change, not evidence of the approval workflow.
import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';

const appUrl = 'http://127.0.0.1:5176';
const password = 'SyntheticChanges12!'; // pragma: allowlist secret - synthetic test credential
let database: Awaited<ReturnType<typeof loginDatabase>>;
let server: ChildProcess;

test.beforeAll(async () => {
  database = await loginDatabase();
  server = spawn(process.execPath, ['--import', 'tsx', 'backend/src/dev.ts'], {
    env: { ...process.env, DATABASE_URL: database.connectionString, DATABASE_POOLER_URL: database.connectionString,
      APP_URL: appUrl, PUBLIC_SITE_URL: appUrl, PORT: '3006', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([once(server.stdout!, 'data'), once(server, 'exit').then(() => { throw new Error('API exited'); }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('API startup timeout')), 15000); })]);
  } finally { clearTimeout(timer); }
});

test.afterAll(async () => {
  if (server && server.exitCode === null) { const exit = once(server, 'exit'); server.kill(); await exit; }
  await database?.close();
});

async function fixture(status = 'confirmed') {
  const org = randomUUID(), organiser = randomUUID(), coordinator = randomUUID(), event = randomUUID();
  const eventCode = `EVT-CHANGES-${event.slice(0,8)}`;
  const hash = await hashPassword(password);
  await database.pool.query('INSERT INTO client_organisations(id,name) VALUES($1,$2)', [org,`Synthetic change ${org}`]);
  for (const [id,role] of [[organiser,'event_organiser'],[coordinator,'event_coordinator']]) {
    await database.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id,email_verified_at)
      VALUES($1,$2,$3,'Synthetic change participant',$4,$5,now())`,
    [id,`${id}@example.test`,hash,role,role==='event_organiser'?org:null]);
  }
  await database.pool.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,description,purpose,status,event_range,expected_attendance)
    VALUES($1,$2,$3,$4,$5,'Original browser Event','Original description','Original purpose',$6,'[2027-03-01T01:00Z,2027-03-01T04:00Z)',40)`,
  [event,eventCode,organiser,coordinator,org,status]);
  await database.pool.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
    VALUES($1,'Original browser Event','2027-03-01T01:00Z','2027-03-01T04:00Z','Synthetic hall','Synthetic campus')`, [event]);
  return { event, eventCode, organiser, coordinator };
}

async function signIn(page: Page, id: string) {
  await page.goto('/login');
  await page.getByLabel('Email', {exact:true}).fill(`${id}@example.test`);
  await page.getByLabel('Password', {exact:true}).fill(password);
  const response = page.waitForResponse(r => r.url().endsWith('/api/auth/session') && r.request().method()==='POST');
  await page.getByRole('button', {name:'Sign in',exact:true}).click();
  expect((await response).status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login$/);
}

async function submit(page: Page, field: string, value: string, description: string) {
  await page.getByRole('checkbox', {name:`Change ${field}`,exact:true}).check();
  await page.getByLabel(`New ${field}`, {exact:true}).fill(value);
  await page.getByLabel('Describe the change').fill(description);
  await page.getByRole('button', {name:'Send change request',exact:true}).click();
  await expect(page.getByText('Change request sent for Coordinator review. Current Event details stay unchanged.')).toBeVisible();
}

test('TC_E10S01_03: Confirmed readonly field opens its real prefilled form without creating a request', async ({page}) => {
  const f = await fixture();
  await signIn(page,f.organiser);
  await page.goto(`/events/${f.eventCode}`);
  await page.getByRole('button', {name:'Edit event',exact:true}).click();
  const attendance = page.getByLabel('Expected attendance', {exact:true});
  await expect(attendance).toHaveAttribute('readonly','');
  await attendance.locator('..').getByRole('link', {name:'Request a change',exact:true}).click();
  await expect(page.getByRole('checkbox', {name:'Change expected attendance',exact:true})).toBeChecked();
  await expect(page.getByLabel('New expected attendance', {exact:true})).toHaveValue('40');
  expect((await database.pool.query('SELECT id FROM change_requests WHERE event_id=$1',[f.event])).rowCount).toBe(0);
});

test('TC_E10S01_01 TC_E10S01_02 TC_E10S01_03: real refused PATCH preserves proposed attendance until explicit submission', async ({page}) => {
  const f = await fixture('under_review');
  await signIn(page,f.organiser);
  await page.goto(`/events/${f.eventCode}`);
  await page.getByRole('button', {name:'Edit event',exact:true}).click();
  const form = page.getByRole('form', {name:'Edit event details'});
  await form.getByLabel('Expected attendance', {exact:true}).fill('75');
  // The Event becomes Approved after this Organiser loaded the editable form.
  await database.pool.query("UPDATE events SET status='approved' WHERE id=$1",[f.event]);
  const refused = page.waitForResponse(r => r.request().method()==='PATCH' && r.url().includes('/api/events'));
  await form.getByRole('button', {name:'Save changes',exact:true}).click();
  expect((await refused).status()).toBe(409);
  await form.locator('.event-edit-alert').getByRole('link', {name:'Request a change',exact:true}).click();
  await expect(page.getByLabel('New expected attendance', {exact:true})).toHaveValue('75');
  await expect(page.getByText('Current: 40', {exact:true})).toBeVisible();
  expect((await database.pool.query('SELECT id FROM change_requests WHERE event_id=$1',[f.event])).rowCount).toBe(0);
  await page.getByLabel('Describe the change').fill('Additional guests after approval');
  await page.getByRole('button', {name:'Send change request',exact:true}).click();
  await expect(page.getByText('Change request sent for Coordinator review. Current Event details stay unchanged.')).toBeVisible();
  await page.reload();
  const row = (await database.pool.query('SELECT status,requested_changes FROM change_requests WHERE event_id=$1',[f.event])).rows[0];
  expect(row.status).toBe('pending');
  expect(row.requested_changes.fields).toEqual({expectedAttendance:75});
  expect(row.requested_changes.before).toEqual({expectedAttendance:40});
  expect((await database.pool.query('SELECT expected_attendance FROM events WHERE id=$1',[f.event])).rows[0].expected_attendance).toBe(40);
  await expect(page.getByRole('table')).toContainText('75');
  expect((await database.pool.query("SELECT id FROM notifications WHERE user_id=$1 AND event_id=$2 AND title='Change requested'",[f.coordinator,f.event])).rowCount).toBe(1);
});

test('TC_E10S01_04 TC_E10S01_05: real safe approval and decline persist their distinct results and notices', async ({page,browser}) => {
  const f = await fixture();
  await signIn(page,f.organiser);
  await page.goto(`/organiser/requests/${f.eventCode}/change`);
  await submit(page,'event name','Updated browser Event','Change the name');
  const coordinator = await browser.newPage({baseURL:appUrl});
  try {
    await signIn(coordinator,f.coordinator);
    await coordinator.goto(`/coordinator/events/${f.eventCode}/changes`);
    await coordinator.getByRole('button', {name:'Approve…',exact:true}).click();
    await coordinator.getByRole('button', {name:'Approve change request',exact:true}).click();
    await expect(coordinator.getByText('Change applied to the Event.', {exact:true})).toBeVisible();
    expect((await database.pool.query('SELECT name FROM event_publications WHERE event_id=$1',[f.event])).rows[0].name).toBe('Updated browser Event');
    await page.reload();
    await submit(page,'purpose','Declined purpose','Change the purpose');
    await coordinator.reload();
    await coordinator.getByRole('button', {name:'Decline…',exact:true}).click();
    await coordinator.getByLabel('Decision note (optional)').fill('Keep the original purpose');
    await coordinator.getByRole('button', {name:'Decline change request',exact:true}).click();
    await expect(coordinator.getByText('Change declined. Current Event details are unchanged.', {exact:true})).toBeVisible();
    const event = (await database.pool.query('SELECT title,purpose FROM events WHERE id=$1',[f.event])).rows[0];
    expect(event).toEqual({title:'Updated browser Event',purpose:'Original purpose'});
    expect((await database.pool.query('SELECT status FROM change_requests WHERE event_id=$1 ORDER BY created_at',[f.event])).rows.map(r=>r.status)).toEqual(['applied','declined']);
    const notices = (await database.pool.query('SELECT title FROM notifications WHERE user_id=$1 AND event_id=$2',[f.organiser,f.event])).rows.map(r=>r.title);
    expect(notices.sort()).toEqual(['Change applied','Change declined']);
  } finally { await coordinator.close(); }
});

test('TC_E10S01_04: real arrangement approval stays unapplied while E10-S02 is absent', async ({page,browser}) => {
  const f = await fixture();
  await signIn(page,f.organiser);
  await page.goto(`/organiser/requests/${f.eventCode}/change`);
  await submit(page,'expected attendance','75','Change attendance');
  const coordinator = await browser.newPage({baseURL:appUrl});
  try {
    await signIn(coordinator,f.coordinator);
    await coordinator.goto(`/coordinator/events/${f.eventCode}/changes`);
    await coordinator.getByRole('button', {name:'Approve…',exact:true}).click();
    await expect(coordinator.getByText(/Nothing in this request is applied until the arrangement check/)).toBeVisible();
    await coordinator.getByRole('button', {name:'Approve change request',exact:true}).click();
    await expect(coordinator.getByText(/Current Event details have not changed/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Current Event details have not changed/)).toBeVisible();
    const request = (await database.pool.query('SELECT id,status FROM change_requests WHERE event_id=$1',[f.event])).rows[0];
    expect(request.status).toBe('approved');
    const blocked = await coordinator.request.post(`/api/events?changeRequests=1&id=${f.event}&requestId=${request.id}`,{
      headers:{origin:appUrl},data:{decision:'apply'},
    });
    expect(blocked.status()).toBe(409);
    expect((await database.pool.query('SELECT expected_attendance FROM events WHERE id=$1',[f.event])).rows[0].expected_attendance).toBe(40);
  } finally { await coordinator.close(); }
});

for (const terminal of ['completed','cancelled'] as const) {
  const tc = terminal==='completed' ? 'TC_E10S01_06' : 'TC_E10S01_07';
  test(`${tc}: real ${terminal} workflow closes Pending requests as Obsolete and disables decisions`, async ({page,browser}) => {
    const f = await fixture();
    if (terminal==='completed') {
      await database.pool.query("UPDATE events SET event_range=tstzrange(now()-interval '2 hours',now()-interval '1 hour','[)') WHERE id=$1",[f.event]);
    }
    await signIn(page,f.organiser);
    await page.goto(`/organiser/requests/${f.eventCode}/change`);
    await submit(page,'event name','Never applied name','Pending when Event ends');
    const coordinator = await browser.newPage({baseURL:appUrl});
    try {
      await signIn(coordinator,f.coordinator);
      const action = terminal==='completed' ? 'completion' : 'cancellation';
      const response = await coordinator.request.post(`/api/events?${action}=1&id=${f.event}`,{
        headers:{origin:appUrl},data:terminal==='cancelled' ? {reason:'Event cancelled during change review'} : {},
      });
      expect(response.status()).toBe(200);
      await page.reload();
      await expect(page.getByText(`This Event is ${terminal}. Change requests cannot be submitted or decided.`)).toBeVisible();
      await expect(page.getByText('Obsolete', {exact:true})).toBeVisible();
      await expect(page.getByRole('button', {name:'Send change request',exact:true})).toHaveCount(0);
      await coordinator.goto(`/coordinator/events/${f.eventCode}/changes`);
      await expect(coordinator.getByText('Obsolete', {exact:true})).toBeVisible();
      await expect(coordinator.getByRole('button', {name:'Approve…',exact:true})).toHaveCount(0);
      const request = (await database.pool.query('SELECT id,status,decision_reason FROM change_requests WHERE event_id=$1',[f.event])).rows[0];
      expect(request.status).toBe('obsolete');
      expect(request.decision_reason).toBe(`Event ${terminal}`);
      expect((await database.pool.query('SELECT title FROM events WHERE id=$1',[f.event])).rows[0].title).toBe('Original browser Event');
      const denied = await coordinator.request.post(`/api/events?changeRequests=1&id=${f.event}&requestId=${request.id}`,{
        headers:{origin:appUrl},data:{decision:'approve'},
      });
      expect(denied.status()).toBe(409);
      const history = (await database.pool.query("SELECT old_value,new_value,actor_id FROM audit_logs WHERE entity_id=$1 AND field_changed='status' AND new_value='obsolete'",[request.id])).rows;
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({old_value:'pending',new_value:'obsolete',actor_id:f.coordinator});
    } finally { await coordinator.close(); }
  });
}

import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';
import { PostgresEventLifecycleRepository } from '../../backend/src/modules/eventLifecycle/repository.js';

const appUrl = 'http://127.0.0.1:5176';
const password = 'SyntheticInbox12!'; // pragma: allowlist secret - synthetic credential
let database: Awaited<ReturnType<typeof loginDatabase>>;
let server: ChildProcess;

test.beforeAll(async () => {
  database = await loginDatabase();
  server = spawn(process.execPath, ['--import','tsx','backend/src/dev.ts'], {
    env: {...process.env, DATABASE_URL:database.connectionString, DATABASE_POOLER_URL:database.connectionString,
      APP_URL:appUrl, PORT:'3006', NODE_ENV:'test'}, stdio:['ignore','pipe','pipe'],
  });
  await Promise.race([once(server.stdout!,'data'), once(server,'exit').then(()=>{throw new Error('API exited');}),
    new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('API startup timeout')),15000);timer.unref();})]);
});
test.afterAll(async () => {
  if (server && server.exitCode===null) {const exit=once(server,'exit');server.kill();await exit;}
  await database?.close();
});

test('TC_E11S01_01 TC_E11S01_06 TC_E11S01_07: real status notification reaches own inbox; opening persists read state', async ({ page }) => {
  const owner=randomUUID(), other=randomUUID(), org=randomUUID(), event=randomUUID();
  const email=`${owner}@example.test`;
  await database.pool.query('INSERT INTO client_organisations(id,name) VALUES($1,$2)',[org,org]);
  const hash=await hashPassword(password);
  for (const id of [owner,other]) await database.pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role)
    VALUES($1,$2,$3,$4,'Browser user','event_organiser')`,[id,org,`${id}@example.test`,hash]);
  await database.pool.query(`INSERT INTO events(id,organiser_id,client_org_id,title,status,event_range,expected_attendance)
    VALUES($1,$2,$3,'Inbox event','under_review','[2027-01-01 09:00Z,2027-01-01 12:00Z)',20)`,[event,owner,org]);
  await new PostgresEventLifecycleRepository({},database.pool).updateEventStatus(event,'approved',other);
  const hidden=(await database.pool.query(`INSERT INTO notifications(user_id,title,message) VALUES($1,'Other account','Private') RETURNING id`,[other])).rows[0].id;
  await database.pool.query(`INSERT INTO notifications(user_id,title,message,created_at) VALUES($1,'Older notification','Older public update','2020-01-01')`,[owner]);
  await page.goto('/notifications');
  await expect(page.getByRole('alert')).toContainText('Sign in');
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(`${appUrl}/events`);
  await page.goto('/notifications');
  const items=page.getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('Event update');
  await expect(items.first()).toHaveClass(/notification-unread/);
  await page.getByRole('button',{name:'Event update',exact:true}).click();
  await expect(page.getByText(/Inbox event: Event status changed to approved.*Changed at/)).toBeVisible();
  await expect(items.first()).not.toHaveClass(/notification-unread/);
  await page.reload();
  await expect(page.getByRole('listitem').first()).not.toHaveClass(/notification-unread/);
  const denied=await page.request.post('/api/notifications',{
    headers:{origin:appUrl},data:{action:'mark_read',id:hidden},
  });
  expect(denied.status()).toBe(404);
  expect((await database.pool.query('SELECT is_read FROM notifications WHERE id=$1',[hidden])).rows[0].is_read).toBe(false);
});

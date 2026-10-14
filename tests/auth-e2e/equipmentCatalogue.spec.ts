// Real login, API, catalogue and notification outbox against isolated PostgreSQL.
import {test,expect} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {loginDatabase} from '../../backend/tests/helpers/loginDatabase.js';
import {hashPassword} from '../../backend/src/modules/accessControl/password.js';
const appUrl='http://127.0.0.1:5176';
const password='SyntheticEquipment12!'; // pragma: allowlist secret - synthetic credential
let database:Awaited<ReturnType<typeof loginDatabase>>;
let server:ChildProcess;
test.beforeAll(async()=>{
  database=await loginDatabase();
  server=spawn(process.execPath,['--import','tsx','backend/src/dev.ts'],{env:{...process.env,DATABASE_URL:database.connectionString,DATABASE_POOLER_URL:database.connectionString,APP_URL:appUrl,PORT:'3006',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
  await Promise.race([once(server.stdout!,'data'),once(server,'exit').then(()=>{throw new Error('API exited');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('API startup timeout')),15000);timer.unref();})]);
});
test.afterAll(async()=>{if(server&&server.exitCode===null){const exit=once(server,'exit');server.kill();await exit;}await database?.close();});
test('TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 real equipment create, edit, flag, notify and retire',async({page})=>{
  const staff=randomUUID(),coordinator=randomUUID(),organiser=randomUUID(),org=randomUUID(),event=randomUUID();
  const q=database.pool.query.bind(database.pool);const hash=await hashPassword(password);
  await q('INSERT INTO client_organisations(id,name) VALUES ($1,\'Equipment test\')',[org]);
  for(const [id,role] of [[staff,'technical_support_staff'],[coordinator,'event_coordinator'],[organiser,'event_organiser']]) await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES ($1,$2,$3,'Equipment test user',$4,$5)`,[id,`${id}@example.test`,hash,role,org]);
  async function login(id:string){await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(`${id}@example.test`);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);}
  await login(staff);await page.getByRole('link',{name:'Equipment catalogue',exact:true}).first().click();
  await page.getByRole('link',{name:'Add equipment'}).click();
  for(const [label,value] of [['Equipment name','Wireless Microphone'],['Type','Audio'],['Description','Handheld UHF'],['Quantity','10'],['Location','Main Storage']]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Save equipment'}).click();await expect(page.getByText('Wireless Microphone saved.')).toBeVisible();
  const item=(await q('SELECT * FROM equipment WHERE name=\'Wireless Microphone\'')).rows[0];expect(item.total_quantity).toBe(10);expect(item.is_active).toBe(true);
  const range=`[${new Date(Date.now()+86400000).toISOString()},${new Date(Date.now()+90000000).toISOString()})`;
  await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status) VALUES ($1,'EVT-REAL',$2,$3,$4,'Equipment event',$5::tstzrange,10,'planning')`,[event,organiser,coordinator,org,range]);
  const request=randomUUID(),reservation=randomUUID();
  await q('INSERT INTO equipment_requests(id,event_id,equipment_id,quantity_requested,requested_by) VALUES ($1,$2,$3,6,$4)',[request,event,item.id,coordinator]);
  await q('INSERT INTO equipment_reservations(id,request_id,event_id,equipment_id,quantity_reserved,reservation_range,reserved_by) VALUES ($1,$2,$3,$4,6,$5::tstzrange,$6)',[reservation,request,event,item.id,range,staff]);
  await page.getByRole('link',{name:'Edit Wireless Microphone'}).click();await page.getByLabel('Quantity',{exact:true}).fill('4');await page.getByLabel('Location',{exact:true}).fill('Annex Storage');await page.getByRole('button',{name:'Save equipment'}).click();
  await expect(page.getByText('EVT-REAL: 6 units reserved')).toBeVisible();
  expect((await q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1',[reservation])).rows[0].requires_reconfirmation).toBe(true);
  expect((await q('SELECT * FROM notifications WHERE user_id=$1 AND event_id=$2',[coordinator,event])).rowCount).toBe(1);
  expect((await q('SELECT * FROM notification_deliveries')).rowCount).toBe(1);
  await page.getByRole('button',{name:'Retire Wireless Microphone…'}).click();await page.getByRole('button',{name:'Confirm retirement'}).click();await expect(page.getByText('Resolve active reservations before retiring this item.')).toBeVisible();
  await q(`UPDATE equipment_reservations SET status='released',reservation_range='[2020-01-01 09:00Z,2020-01-01 10:00Z)',requires_reconfirmation=false WHERE id=$1`,[reservation]);
  await page.getByRole('button',{name:'Confirm retirement'}).click();await expect(page.getByText('No equipment yet')).toBeVisible();
  expect((await q('SELECT * FROM equipment_reservations WHERE id=$1',[reservation])).rowCount).toBe(1);
  await page.goto(`/support/catalogue/${item.id}`);await expect(page.getByText('Annex Storage',{exact:true})).toBeVisible();await expect(page.getByText('EVT-REAL',{exact:true})).toBeVisible();
  await page.request.delete('/api/auth/session',{headers:{origin:appUrl}});await login(coordinator);
  await page.goto('/support/catalogue');await expect(page.getByText('No equipment yet')).toBeVisible();
  const denied=await page.request.post('/api/equipment',{headers:{origin:appUrl},data:{action:'retire',id:item.id}});expect(denied.status()).toBe(403);
  const csrf=await page.request.post('/api/equipment',{headers:{origin:'https://attacker.example.test'},data:{action:'retire',id:item.id}});expect(csrf.status()).toBe(403);
  await page.goto('/notifications');await expect(page.getByRole('button',{name:'Equipment reservation needs review',exact:true})).toBeVisible();
});

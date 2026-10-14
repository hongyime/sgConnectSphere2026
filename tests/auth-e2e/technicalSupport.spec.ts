// Real sessions, API and PostgreSQL acceptance for E07-S06 (SCRUM-56) and
// E07-S07 (SCRUM-57): a Coordinator requests technical support or declares
// none; Technical Support Staff assign, are refused on a clash, remove and
// replace colleagues; the colleague sees it on their schedule and is notified.
import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';

const appUrl = 'http://127.0.0.1:5176';
const password = 'SyntheticSupport12!'; // pragma: allowlist secret - synthetic credential
let database: Awaited<ReturnType<typeof loginDatabase>>;
let server: ChildProcess;

test.beforeAll(async () => {
  database = await loginDatabase();
  server = spawn(process.execPath, ['--import', 'tsx', 'backend/src/dev.ts'], {
    env: { ...process.env, DATABASE_URL: database.connectionString, DATABASE_POOLER_URL: database.connectionString, APP_URL: appUrl, PORT: '3006', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await Promise.race([
    once(server.stdout!, 'data'),
    once(server, 'exit').then(() => { throw new Error('API exited'); }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('API startup timeout')), 15000); timer.unref(); }),
  ]);
});

test.afterAll(async () => {
  if (server && server.exitCode === null) { const exit = once(server, 'exit'); server.kill(); await exit; }
  await database?.close();
});

test('TC_E07S06_01 TC_E07S06_03 TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technical support request and technician staffing on the real stack', async ({ page }) => {
  const q = database.pool.query.bind(database.pool);
  const org = randomUUID(), organiser = randomUUID(), coord = randomUUID(), other = randomUUID();
  const techA = randomUUID(), techB = randomUUID(), techC = randomUUID();
  const hash = await hashPassword(password);
  await q("INSERT INTO client_organisations(id,name) VALUES($1,'Support browser test')", [org]);
  const people: Array<[string, string, string]> = [
    [organiser, 'event_organiser', 'Organiser'], [coord, 'event_coordinator', 'Coordinator'], [other, 'event_coordinator', 'Other Coordinator'],
    [techA, 'technical_support_staff', 'Tech A'], [techB, 'technical_support_staff', 'Tech B'], [techC, 'technical_support_staff', 'Tech C'],
  ];
  for (const [id, role, name] of people) {
    await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,$3,$4,$5,$6)`, [id, `${id}@example.test`, hash, name, role, org]);
  }
  // Tomorrow 09:00-12:00 and 10:00-13:00 UTC: the two events overlap.
  const day = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const range = (from: string, to: string) => `[${day}T${from}:00Z,${day}T${to}:00Z)`;
  const conference = randomUUID(), charity = randomUUID(), gala = randomUUID();
  for (const [id, code, title, status, slot] of [
    [conference, 'EVT-SUP-TC', 'Tech Conference', 'planning', range('09:00', '12:00')],
    [charity, 'EVT-SUP-CR', 'Charity Run', 'approved', range('10:00', '13:00')],
    [gala, 'EVT-SUP-GA', 'Winter Gala', 'approved', range('15:00', '17:00')],
  ] as const) {
    await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
      VALUES($1,$2,$3,$4,$5,$6,$7::tstzrange,50,$8)`, [id, code, organiser, coord, org, title, slot, status]);
  }
  // Tech B already works the Charity Run.
  const charityRequest = randomUUID();
  await q(`INSERT INTO tech_support_requests(id,event_id,support_required,support_description,support_range,status,requested_by)
    VALUES($1,$2,true,'1 sound technician',$3::tstzrange,'staffed',$4)`, [charityRequest, charity, range('10:00', '13:00'), coord]);
  await q(`INSERT INTO tech_staff_assignments(request_id,event_id,staff_id,assignment_range,status) VALUES($1,$2,$3,$4::tstzrange,'assigned')`,
    [charityRequest, charity, techB, range('10:00', '13:00')]);

  async function login(id: string) {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(`${id}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  }
  async function logout() { await page.request.delete('/api/auth/session', { headers: { origin: appUrl } }); }
  const card = (p: Page) => p.locator('section', { has: p.getByRole('heading', { name: 'Technical support' }) });
  const colleagues = (p: Page) => p.getByRole('list', { name: 'Colleagues' });
  async function assign(name: string) {
    await colleagues(page).getByRole('button', { name: `Assign ${name}…` }).click();
    await page.getByRole('button', { name: 'Assign technician' }).click();
  }

  // TC_E07S06_01: the Coordinator requests support for the conference; all three technicians are notified.
  await login(coord);
  await page.goto('/coordinator/events/EVT-SUP-TC');
  await card(page).getByRole('link', { name: 'Request technical support' }).click();
  await page.getByLabel('What support is needed').fill('1 AV technician for the full event');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('3 Technical Support Staff members have been notified.')).toBeVisible();
  const conferenceRequest = (await q(`SELECT id, support_required, status FROM tech_support_requests WHERE event_id=$1`, [conference])).rows;
  expect(conferenceRequest).toMatchObject([{ support_required: true, status: 'open' }]);
  expect((await q(`SELECT * FROM notifications WHERE event_id=$1 AND title='Technical support requested'`, [conference])).rowCount).toBe(3);

  // TC_E07S06_03: the gala needs no support; recorded, nobody notified.
  await page.goto('/coordinator/events/EVT-SUP-GA');
  await card(page).getByRole('button', { name: 'No technical support required' }).click();
  await expect(page.getByText('Marked as needing no technical support. Nobody has been notified.')).toBeVisible();
  expect((await q(`SELECT support_required FROM tech_support_requests WHERE event_id=$1`, [gala])).rows).toEqual([{ support_required: false }]);
  expect((await q(`SELECT * FROM notifications WHERE event_id=$1`, [gala])).rowCount).toBe(0);
  await logout();

  // TC_E07S07_03: Tech B is busy on the overlapping Charity Run, so assigning them is refused and names it.
  await login(techA);
  await page.goto('/support/technicians');
  await page.getByRole('link', { name: 'EVT-SUP-TC Tech Conference' }).click();
  await expect(colleagues(page).getByText(/^Busy: EVT-SUP-CR Charity Run/)).toBeVisible();
  await assign('Tech B');
  await expect(page.getByText('Tech B is already assigned to EVT-SUP-CR Charity Run at an overlapping time.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  // TC_E07S07_01: Tech C is free, so they are assigned and the request is staffed.
  await assign('Tech C');
  await expect(page.getByText("Tech C is assigned and has been notified. It's on their schedule.")).toBeVisible();
  const assignment = (await q(`SELECT id, status FROM tech_staff_assignments WHERE request_id=$1 AND staff_id=$2`, [conferenceRequest[0].id, techC])).rows;
  expect(assignment).toMatchObject([{ status: 'assigned' }]);
  expect((await q(`SELECT status FROM tech_support_requests WHERE id=$1`, [conferenceRequest[0].id])).rows[0].status).toBe('staffed');
  await logout();

  // TC_E07S07_02 and TC_E07S07_06 (assigned): Tech C sees it on their schedule and has the notice.
  await login(techC);
  await page.goto('/support/schedule');
  await expect(page.getByRole('list', { name: 'Upcoming assignments' }).getByRole('link', { name: 'EVT-SUP-TC Tech Conference' })).toBeVisible();
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Technical support assignment', exact: true }).first().click();
  await expect(page.getByText(/You're assigned to EVT-SUP-TC Tech Conference/)).toBeVisible();
  await logout();

  // TC_E07S07_04: removing Tech C frees the slot and reopens the request.
  await login(techA);
  await page.goto(`/support/technicians/${conferenceRequest[0].id}`);
  await page.getByRole('button', { name: 'Remove Tech C…' }).click();
  await page.getByRole('button', { name: 'Remove assignment' }).click();
  await expect(page.getByText('Tech C is no longer assigned and has been notified. Their time is free again.')).toBeVisible();
  await expect(page.getByText('Nobody is assigned yet.')).toBeVisible();
  expect((await q(`SELECT status FROM tech_staff_assignments WHERE id=$1`, [assignment[0].id])).rows[0].status).toBe('released');
  expect((await q(`SELECT status FROM tech_support_requests WHERE id=$1`, [conferenceRequest[0].id])).rows[0].status).toBe('open');

  // TC_E07S07_05: the replacement goes through the same check: Tech B still refused, Tech A assigned.
  await assign('Tech B');
  await expect(page.getByText('Tech B is already assigned to EVT-SUP-CR Charity Run at an overlapping time.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await assign('Tech A');
  await expect(page.getByText("Tech A is assigned and has been notified. It's on their schedule.")).toBeVisible();
  expect((await q(`SELECT staff_id FROM tech_staff_assignments WHERE request_id=$1 AND status='assigned'`, [conferenceRequest[0].id])).rows)
    .toEqual([{ staff_id: techA }]);

  // Refusals: a cross-site POST and a Coordinator are both refused by the API.
  const csrf = await page.request.post('/api/venues?task=staffing', { headers: { origin: 'https://attacker.example.test' }, data: { action: 'assign', request: conferenceRequest[0].id, staff: techC } });
  expect(csrf.status()).toBe(403);
  await logout();
  await login(other);
  const denied = await page.request.get('/api/venues?task=staffing');
  expect(denied.status()).toBe(403);
  await logout();

  // TC_E07S07_06 (removed): Tech C has a separate removal notice.
  await login(techC);
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Technical support assignment removed', exact: true }).click();
  await expect(page.getByText(/You're no longer assigned to EVT-SUP-TC Tech Conference\. That time is free again\./)).toBeVisible();
  expect((await q(`SELECT title FROM notifications WHERE user_id=$1 AND event_id=$2 ORDER BY created_at`, [techC, conference])).rows.map(r => r.title))
    .toEqual(['Technical support requested', 'Technical support assignment', 'Technical support assignment removed']);
});

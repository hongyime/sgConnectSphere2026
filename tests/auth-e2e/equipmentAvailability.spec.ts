import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';
let database: Awaited<ReturnType<typeof loginDatabase>>, server: ChildProcess;
const password = 'SyntheticAvailability12!'; // pragma: allowlist secret - synthetic credential
const appUrl = 'http://127.0.0.1:5176';
test.use({ timezoneId: 'Asia/Singapore' });
test.beforeAll(async () => {
  database = await loginDatabase();
  server = spawn(process.execPath, ['--import', 'tsx', 'backend/src/dev.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: database.connectionString,
      DATABASE_POOLER_URL: database.connectionString,
      APP_URL: appUrl,
      PORT: '3006',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await Promise.race([
    once(server.stdout!, 'data'),
    once(server, 'exit').then(() => {
      throw new Error('API exited');
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error('API startup timeout')),
        15000,
      );
      timer.unref();
    }),
  ]);
});
test.afterAll(async () => {
  if (server && server.exitCode === null) {
    const exit = once(server, 'exit');
    server.kill();
    await exit;
  }
  await database?.close();
});
test('TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real login/API/PostgreSQL availability and role protection', async ({
  page,
}) => {
  const q = database.pool.query.bind(database.pool),
    staff = randomUUID(),
    coord = randomUUID(),
    org = randomUUID(),
    organiser = randomUUID(),
    event = randomUUID(),
    microphone = randomUUID(),
    projector = randomUUID(),
    request = randomUUID();
  const hash = await hashPassword(password);
  await q(
    "INSERT INTO client_organisations(id,name) VALUES($1,'Availability browser')",
    [org],
  );
  for (const [id, role] of [
    [staff, 'technical_support_staff'],
    [coord, 'event_coordinator'],
    [organiser, 'event_organiser'],
  ])
    await q(
      "INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,$3,'Synthetic availability user',$4,$5)",
      [id, `${id}@example.test`, hash, role, org],
    );
  await q(
    "INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status) VALUES($1,'EVT-AVAIL-UI',$2,$3,$4,'Conference','[2026-11-15 09:00+08,2026-11-15 12:00+08)',10,'planning')",
    [event, organiser, coord, org],
  );
  for (const [id, name] of [
    [microphone, 'Wireless Microphone'],
    [projector, 'Projector'],
  ])
    await q(
      "INSERT INTO equipment(id,name,category,total_quantity,home_location) VALUES($1,$2,'Test',10,'Grand Ballroom')",
      [id, name],
    );
  await q(
    'INSERT INTO equipment_requests(id,event_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,3,$4)',
    [request, event, microphone, coord],
  );
  await q(
    "INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range) VALUES($1,$2,$3,3,'[2026-11-15 09:00+08,2026-11-15 12:00+08)')",
    [request, event, microphone],
  );
  await q(
    "INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason) VALUES($1,2,'[2026-11-15 09:00+08,2026-11-15 12:00+08)','Damaged')",
    [microphone],
  );
  async function login(id: string) {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(`${id}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  }
  async function check(start: string, end: string) {
    await page.getByLabel('Start', { exact: true }).fill(start);
    await page.getByLabel('End', { exact: true }).fill(end);
    await page
      .getByRole('button', { name: 'Check availability', exact: true })
      .click();
  }
  // Browser-local input values for the explicit Singapore fixture instants.
  await login(staff);
  await page
    .getByRole('link', { name: 'Equipment availability', exact: true })
    .click();
  await check('2026-11-15T09:00', '2026-11-15T12:00');
  const mic = page.getByRole('row').filter({ hasText: 'Wireless Microphone' });
  await expect(mic.getByRole('cell').nth(4)).toHaveText(
    /(?:Free quantity\s*)?5$/,
  );
  const proj = page.getByRole('row').filter({ hasText: 'Projector' });
  await expect(proj).toContainText('Grand Ballroom');
  await expect(proj.getByRole('cell').nth(4)).toHaveText(
    /(?:Free quantity\s*)?10$/,
  );
  await check('2026-11-15T12:00', '2026-11-15T14:00');
  await expect(mic.getByRole('cell').nth(4)).toHaveText(
    /(?:Free quantity\s*)?10$/,
  );
  await check('2026-11-15T14:00', '2026-11-15T17:00');
  await expect(mic.getByRole('cell').nth(4)).toHaveText(
    /(?:Free quantity\s*)?10$/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/scrum53-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.request.delete('/api/auth/session', {
    headers: { origin: appUrl },
  });
  await login(coord);
  const forbidden = await page.request.get(
    '/api/equipment?mode=availability&start=2026-11-15T01:00:00Z&end=2026-11-15T04:00:00Z',
  );
  expect(forbidden.status()).toBe(403);
});

// Real sign-in, Organiser form, API and disposable PostgreSQL; no intercepted responses.
import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';
import { twoCalendarYearsFromSingaporeDate } from '../../backend/src/modules/eventLifecycle/dateHorizon.js';

const appUrl = 'http://127.0.0.1:5176';
const password = `Synthetic${randomUUID()}12!`; // pragma: allowlist secret - generated synthetic test credential
let database: Awaited<ReturnType<typeof loginDatabase>>;
let server: ChildProcess;
test.use({ timezoneId: 'Asia/Singapore' });

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
const singaporeInput = (value: Date) => new Date(value.getTime() + 8 * 3600000).toISOString().slice(0, 16);

for (const invalid of ['past', 'beyond horizon']) {
  test(`TC_E02S07_01 TC_E02S07_05: ${invalid} Session is identified and corrected before real submission`, async ({ page }) => {
    const org = randomUUID(), owner = randomUUID(), event = randomUUID(), second = randomUUID();
    const tomorrow = new Date(Math.floor(Date.now() / 60000) * 60000 + 86400000);
    const end = new Date(tomorrow.getTime() + 3600000);
    const bad = invalid === 'past' ? new Date(tomorrow.getTime() - 3 * 86400000)
      : new Date(new Date(`${twoCalendarYearsFromSingaporeDate(new Date())}T09:00:00+08:00`).getTime() + 86400000);
    await database.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,$2)", [org, `Synthetic horizon ${org}`]);
    await database.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id,email_verified_at)
      VALUES($1,$2,$3,'Horizon Organiser','event_organiser',$4,now())`, [owner, `${owner}@example.test`, await hashPassword(password), org]);
    await database.pool.query(`INSERT INTO events(id,event_code,organiser_id,client_org_id,title,description,purpose,status,event_range,
      expected_attendance,venue_requirements,accessibility_note,equipment_requirements,layout_preference,registration_setup)
      VALUES($1,$2,$3,$4,'Horizon browser draft','Synthetic description','Synthetic purpose','draft',tstzrange($5,$6,'[)'),
      20,'Small room','Step free','none_required','none_required','none_required')`, [event, `HORIZON-${event.slice(0, 8)}`, owner, org, tomorrow, end]);
    await database.pool.query(`INSERT INTO sessions(id,event_id,title,session_range,expected_attendance)
      VALUES($1,$2,'Afternoon',tstzrange($3::timestamptz,$3::timestamptz+interval '1 hour','[)'),20)`, [second, event, bad]);
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(`${owner}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
    await page.goto(`/organiser/drafts/${event}`);
    await expect(page.getByRole('button', { name: 'Submit request', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Submit request', exact: true }).click();
    const refusal = page.getByRole('alert').filter({ hasText: 'Afternoon' });
    await expect(refusal).toContainText('start date and time');
    await expect(refusal).toContainText(invalid === 'past' ? 'must be in the future' : 'must be on or before');
    await expect(refusal).toContainText('Edit this Session before submitting again.');
    {
      const row = (await database.pool.query('SELECT status FROM events WHERE id=$1', [event])).rows[0];
      expect(row.status).toBe('draft');
      const persisted = (await database.pool.query('SELECT lower(session_range) start FROM sessions WHERE id=$1', [second])).rows[0];
      expect(persisted.start.toISOString()).toBe(bad.toISOString());
    }
    const corrected = new Date(tomorrow.getTime() + 2 * 3600000);
    const session = page.getByRole('listitem', { name: 'Afternoon', exact: true });
    await session.getByLabel('Starts', { exact: true }).fill(singaporeInput(corrected));
    await session.getByLabel('Ends', { exact: true }).fill(singaporeInput(new Date(corrected.getTime() + 3600000)));
    await session.getByRole('button', { name: 'Save session', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Session saved.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('listitem', { name: 'Afternoon', exact: true }).getByLabel('Starts', { exact: true })).toHaveValue(singaporeInput(corrected));
    await page.getByRole('button', { name: 'Submit request', exact: true }).click();
    await expect(page.getByText('Persisted through API and submitted to coordinator queue')).toBeVisible();
    expect((await database.pool.query('SELECT status FROM events WHERE id=$1', [event])).rows[0].status).not.toBe('draft');
    expect((await database.pool.query('SELECT lower(session_range) start FROM sessions WHERE id=$1', [second])).rows[0].start.toISOString()).toBe(corrected.toISOString());
  });
}

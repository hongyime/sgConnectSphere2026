// Real sessions, API and PostgreSQL acceptance for E06-S05 (SCRUM-49, tests
// SCRUM-144): a Coordinator holds a free venue from the event's venue search;
// another Coordinator is refused the same slot; Venue Staff move the expiry
// later; the Coordinator submits a booking request from one hold and releases
// another; a hold whose expiry has passed reads as Expired.
import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';

const appUrl = 'http://127.0.0.1:5176';
const password = 'SyntheticHolds12!'; // pragma: allowlist secret - synthetic credential
const HOUR = 3_600_000;
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

// The browser's datetime-local value for an instant (same machine, same zone).
function localInput(at: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

test('TC_E06S05_01 TC_E06S05_03 TC_E06S05_04 TC_E06S05_07 tentative holds on the real stack', async ({ page }) => {
  const q = database.pool.query.bind(database.pool);
  const org = randomUUID(), organiser = randomUUID(), coord = randomUUID(), other = randomUUID(), staff = randomUUID();
  const hall = randomUUID(), studio = randomUUID();
  const hash = await hashPassword(password);
  await q("INSERT INTO client_organisations(id,name) VALUES($1,'Holds browser test')", [org]);
  for (const [id, role, name, client] of [
    [organiser, 'event_organiser', 'Organiser', org], [coord, 'event_coordinator', 'Coordinator A', null],
    [other, 'event_coordinator', 'Coordinator B', null], [staff, 'venue_staff', 'Venue Staff', null],
  ] as const) {
    await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,$3,$4,$5,$6)`, [id, `${id}@example.test`, hash, name, role, client]);
  }
  for (const [id, name] of [[hall, 'Riverside Hall'], [studio, 'Riverside Studio']]) {
    await q(`INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Test wing',300,'08:00','22:00')`, [id, name]);
  }
  // A week ahead, 09:00-17:00 and 13:00-20:00 Singapore time: the two events overlap.
  const day = new Date(Date.now() + 7 * 24 * HOUR).toISOString().slice(0, 10);
  const range = (from: string, to: string) => `[${day}T${from}:00+08:00,${day}T${to}:00+08:00)`;
  const conference = randomUUID(), charity = randomUUID();
  for (const [id, code, title, coordinator, slot] of [
    [conference, 'EVT-HLD-TC', 'Tech Conference', coord, range('09:00', '17:00')],
    [charity, 'EVT-HLD-CR', 'Charity Run', other, range('13:00', '20:00')],
  ] as const) {
    await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
      VALUES($1,$2,$3,$4,$5,$6,$7::tstzrange,50,'planning')`, [id, code, organiser, coordinator, org, title, slot]);
  }
  const holdsOf = async (eventId: string) => (await q<{ id: string; venue_id: string; status: string; expires_at: Date | null }>(
    `SELECT id, venue_id, status::text, expires_at FROM venue_bookings WHERE event_id=$1 ORDER BY created_at`, [eventId])).rows;

  async function login(id: string) {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(`${id}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  }
  async function logout() { await page.request.delete('/api/auth/session', { headers: { origin: appUrl } }); }
  const cardOf = (p: Page, name: string) => p.getByRole('heading', { name, exact: true }).locator('xpath=ancestor::section[1]');
  const holdsCard = (p: Page) => cardOf(p, 'Venue holds');

  // TC_E06S05_03: Coordinator A holds Riverside Hall from the event's venue search, for 48 hours.
  await login(coord);
  await page.goto('/coordinator/events/EVT-HLD-TC');
  await expect(holdsCard(page).getByText(/No venue is held for this event/)).toBeVisible();
  await holdsCard(page).getByRole('link', { name: 'Find a venue to hold' }).click();
  await page.getByRole('button', { name: 'Search venues' }).click();
  const before = Date.now();
  await cardOf(page, 'Riverside Hall').getByRole('link', { name: 'Hold this venue' }).click();
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(page.getByText(/Riverside Hall is held tentatively until/)).toBeVisible();
  await expect(holdsCard(page).getByText(/^Tentative · expires /)).toBeVisible();
  const [placed] = await holdsOf(conference);
  expect(placed).toMatchObject({ venue_id: hall, status: 'tentative' });
  expect(Math.abs(placed!.expires_at!.getTime() - (before + 48 * HOUR))).toBeLessThan(5 * 60_000);

  // TC_E06S05_01: Coordinator B's overlapping event sees the hall as taken and is refused with the unavailable window only (T-102).
  await logout();
  await login(other);
  await page.goto('/coordinator/events/EVT-HLD-CR/venues');
  await page.getByRole('button', { name: 'Search venues' }).click();
  await expect(cardOf(page, 'Riverside Hall').getByText('Unavailable', { exact: true })).toBeVisible();
  await expect(cardOf(page, 'Riverside Hall').getByRole('link', { name: 'Hold this venue' })).toHaveCount(0);
  await page.goto(`/coordinator/events/EVT-HLD-CR/venues/${hall}/hold`);
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(page.getByText("This venue can't be held")).toBeVisible();
  // T-102: the refusal gives the unavailable window, not the other event's name.
  await expect(page.getByText(/^This venue is unavailable from .+, including setup and turnaround\.$/)).toBeVisible();
  await expect(page.getByText(/Tech Conference/)).toHaveCount(0);
  expect(await holdsOf(charity)).toEqual([]);

  // TC_E06S05_07: Venue Staff see the hold and move its expiry later; the change is logged with who made it.
  await logout();
  await login(staff);
  await page.getByRole('link', { name: 'Tentative holds' }).first().click();
  const held = cardOf(page, 'Riverside Hall');
  await expect(held.getByText('EVT-HLD-TC Tech Conference')).toBeVisible();
  await held.getByRole('button', { name: 'Change expiry' }).click();
  const later = new Date(Date.now() + 72 * HOUR);
  await held.getByLabel('New expiry').fill(localInput(later));
  await held.getByRole('button', { name: 'Save new expiry' }).click();
  await expect(page.getByText(/The hold on Riverside Hall now expires/)).toBeVisible();
  const [extended] = await holdsOf(conference);
  expect(Math.abs(extended!.expires_at!.getTime() - new Date(localInput(later)).getTime())).toBeLessThan(60_000);
  const log = (await q(`SELECT actor_id FROM audit_logs WHERE event_id=$1 AND action='Tentative hold on Riverside Hall extended'`, [conference])).rows;
  expect(log).toEqual([{ actor_id: staff }]);

  // TC_E06S05_04: Coordinator A submits the booking request; the hold becomes pending with no expiry.
  await logout();
  await login(coord);
  await page.goto('/coordinator/events/EVT-HLD-TC');
  // The activity log shows who extended the hold and the expiry as dates, never an internal id.
  const extension = cardOf(page, 'Activity log').getByRole('row', { name: /Tentative hold on Riverside Hall extended/ });
  await expect(extension).toContainText(/Hold expiry: .+ → .+/);
  await expect(extension).toContainText('Venue Staff');
  await holdsCard(page).getByRole('button', { name: 'Submit booking request' }).click();
  await expect(holdsCard(page).getByText('Booking request submitted for Riverside Hall. The hold no longer expires.')).toBeVisible();
  expect((await holdsOf(conference))[0]).toMatchObject({ status: 'pending', expires_at: null });

  // Scenario 4: a second hold, on the studio, is released after confirming.
  await page.goto(`/coordinator/events/EVT-HLD-TC/venues/${studio}/hold`);
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await holdsCard(page).getByRole('button', { name: 'Release' }).click();
  await holdsCard(page).getByRole('button', { name: 'Release hold' }).click();
  await expect(holdsCard(page).getByText('Hold on Riverside Studio released. The period is free again.')).toBeVisible();
  expect((await holdsOf(conference)).map(row => row.status)).toEqual(['pending', 'released']);

  // A hold whose expiry has passed reads as Expired and offers no actions, before the expiry job runs.
  await page.goto(`/coordinator/events/EVT-HLD-TC/venues/${studio}/hold`);
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(holdsCard(page).getByRole('button', { name: 'Release' })).toBeVisible();
  await q(`UPDATE venue_bookings SET expires_at = now() - interval '1 minute' WHERE event_id=$1 AND status='tentative'`, [conference]);
  await page.reload();
  await expect(holdsCard(page).getByText(/^Expired /)).toBeVisible();
  await expect(holdsCard(page).getByText(/no longer holds the venue/)).toBeVisible();
  await expect(holdsCard(page).getByRole('button', { name: 'Release' })).toHaveCount(0);
});

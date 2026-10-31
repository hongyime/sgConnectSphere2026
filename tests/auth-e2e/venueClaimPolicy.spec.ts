// Real sessions, API and PostgreSQL acceptance for E06-S06 (SCRUM-50, T-100):
// a Coordinator is refused a venue whose buffered window is already claimed,
// without learning whose event holds it (T-102); Venue Staff see a buffer-growth
// conflict, cannot approve while it remains, and resolve it by rejecting one
// request; exactly adjacent bookings and one event at two venues both confirm.
// TC_E06S06_03 (two claims at the same instant) cannot be produced by clicking;
// backend/tests/venueClaimPolicy.integration.test.ts covers it.
import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';
import type { AuthenticatedUser } from '../../backend/src/modules/accessControl/types.js';
import { createVenue } from '../../backend/src/modules/venueBooking/catalogue.js';
import { submitBooking } from '../../backend/src/modules/venueBooking/bookingSubmission.js';
import { decideBooking } from '../../backend/src/modules/venueBooking/decisions.js';

const appUrl = 'http://127.0.0.1:5176';
const password = 'SyntheticClaims12!'; // pragma: allowlist secret - synthetic credential
const DAY = 86_400_000;
let database: Awaited<ReturnType<typeof loginDatabase>>;
let server: ChildProcess;
const ids = { org: randomUUID(), organiser: randomUUID(), coordA: randomUUID(), coordB: randomUUID(), staff: randomUUID() };
const actor = (id: string, role: AuthenticatedUser['role']): AuthenticatedUser =>
  ({ id, role, email: `${id}@example.test`, isActive: true, failedLoginCount: 0 });
const coordA = actor(ids.coordA, 'event_coordinator');
const coordB = actor(ids.coordB, 'event_coordinator');
const staff = actor(ids.staff, 'venue_staff');

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  database = await loginDatabase();
  const q = database.pool.query.bind(database.pool);
  const hash = await hashPassword(password);
  await q("INSERT INTO client_organisations(id,name) VALUES($1,'Claims browser test')", [ids.org]);
  for (const [id, role, name, client] of [
    [ids.organiser, 'event_organiser', 'Organiser', ids.org], [ids.coordA, 'event_coordinator', 'Coordinator A', null],
    [ids.coordB, 'event_coordinator', 'Coordinator B', null], [ids.staff, 'venue_staff', 'Venue Staff', null],
  ] as const) {
    await q('INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,$3,$4,$5,$6)',
      [id, `${id}@example.test`, hash, name, role, client]);
  }
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

// Each case uses its own Singapore day and its own venue, so cases never share a claim.
function dayAhead(days: number) {
  return new Date(Date.now() + days * DAY + 8 * 3_600_000).toISOString().slice(0, 10);
}
const at = (day: string, time: string) => `${day}T${time}:00+08:00`;

async function venue(name: string, setup: number, turnaround: number) {
  const created = await createVenue(database.pool, staff, {
    name, location: 'Test wing', max_capacity: 200, opens_at: '08:00', closes_at: '22:00',
    setup_time_minutes: setup, turnaround_time_minutes: turnaround,
    facilities: ['Stage'], accessibility_features: ['Wheelchair Access'], supported_layouts: [{ label: 'Theatre', capacity: 200 }],
  });
  expect(created.status).toBe(201);
  return (created.body as { venue: { id: string } }).venue.id;
}

async function event(code: string, title: string, coordinator: AuthenticatedUser, day: string, from: string, to: string) {
  const id = randomUUID();
  await database.pool.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
    VALUES($1,$2,$3,$4,$5,$6,tstzrange($7::timestamptz,$8::timestamptz,'[)'),50,'approved')`,
  [id, code, ids.organiser, coordinator.id, ids.org, title, at(day, from), at(day, to)]);
  return id;
}

// An accepted claim made through the real submission service.
async function request(coordinator: AuthenticatedUser, eventId: string, venueId: string, day: string, from: string, to: string) {
  const result = await submitBooking(database.pool, coordinator, { event_id: eventId, venue_id: venueId, starts_at: at(day, from), ends_at: at(day, to) }, randomUUID());
  expect(result.status).toBe(201);
  return (result.body as { booking: { id: string } }).booking.id;
}

async function rows(eventId: string) {
  return (await database.pool.query<{ venue_id: string; status: string; buffer_conflict: boolean }>(
    'SELECT venue_id, status::text, buffer_conflict FROM venue_bookings WHERE event_id=$1 ORDER BY venue_id', [eventId])).rows;
}

async function login(page: Page, id: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${id}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

// Venue Staff lengthen the buffers on the real edit form (C-109 retains and flags).
async function editBuffers(page: Page, venueId: string, setup: number, turnaround: number) {
  await page.goto(`/venue/inventory/${venueId}/edit`);
  await page.getByLabel('Setup time').fill(String(setup));
  await page.getByLabel('Turnaround time').fill(String(turnaround));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved, and some bookings now conflict')).toBeVisible();
}

async function expectApprovalBlocked(page: Page, bookingId: string) {
  await page.goto(`/venue/bookings/${bookingId}/decide`);
  await expect(page.getByText('Approval is blocked until this venue conflict is resolved.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reject…' })).toBeEnabled();
}

async function approve(page: Page, bookingId: string) {
  await page.goto(`/venue/bookings/${bookingId}/decide`);
  await expect(page.getByRole('button', { name: 'Approve…' })).toBeEnabled();
  await expect(page.getByText('Approval is blocked until this venue conflict is resolved.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Approve…' }).click();
  await page.getByRole('button', { name: 'Approve request' }).click();
  await expect(page.getByText(/^Approved\. The booking is confirmed\./)).toBeVisible();
}

// Scenario 2: the Coordinator's own submit on the venue's suitability page is refused.
async function expectSubmitRefused(page: Page, eventCode: string, venueId: string, window: RegExp, hiddenTitle: string) {
  await page.goto(`/coordinator/events/${eventCode}/venues/${venueId}/suitability`);
  await page.getByRole('button', { name: 'Submit booking request' }).click();
  await expect(page.getByText(window)).toBeVisible();
  await expect(page.getByText(hiddenTitle)).toHaveCount(0);
  await expect(page.getByText('Booking request submitted')).toHaveCount(0);
}

test('TC_E06S06_02: a later overlapping request is refused with the buffered window and no other event name', async ({ page }) => {
  const day = dayAhead(20);
  const hall = await venue('Claims Orchid Hall 02', 30, 45);
  const charity = await event('EVT-CLM-02A', 'Charity Run', coordA, day, '09:00', '11:00');
  const expo = await event('EVT-CLM-02B', 'Product Expo', coordB, day, '10:00', '12:00');
  await request(coordA, charity, hall, day, '09:00', '11:00');

  await login(page, ids.coordB);
  await expectSubmitRefused(page, 'EVT-CLM-02B', hall,
    /^This venue is unavailable from .+, 8:30 am to .+, 11:45 am, including setup and turnaround\.$/, 'Charity Run');
  expect(await rows(expo)).toEqual([]);
  expect((await rows(charity)).map(row => row.status)).toEqual(['pending']);
});

test('TC_E06S06_05: a one-minute overlap is refused at submission without a new row', async ({ page }) => {
  const day = dayAhead(21);
  const hall = await venue('Claims Orchid Hall 05', 0, 0);
  const charity = await event('EVT-CLM-05A', 'Charity Run', coordA, day, '09:00', '11:00');
  const expo = await event('EVT-CLM-05B', 'Product Expo', coordB, day, '10:59', '13:00');
  expect((await decideBooking(database.pool, staff, await request(coordA, charity, hall, day, '09:00', '11:00'), { decision: 'approve' })).status).toBe(200);

  await login(page, ids.coordB);
  await expectSubmitRefused(page, 'EVT-CLM-05B', hall,
    /^This venue is unavailable from .+, 9:00 am to .+, 11:00 am, including setup and turnaround\.$/, 'Charity Run');
  expect(await rows(expo)).toEqual([]);
  expect((await rows(charity)).map(row => row.status)).toEqual(['confirmed']);
});

test('TC_E06S06_04: a request exactly adjacent to a confirmed booking shows no conflict and is approved', async ({ page }) => {
  const day = dayAhead(22);
  const hall = await venue('Claims Orchid Hall 04', 0, 0);
  const charity = await event('EVT-CLM-04A', 'Charity Run', coordA, day, '09:00', '11:00');
  const expo = await event('EVT-CLM-04B', 'Product Expo', coordB, day, '11:00', '13:00');
  expect((await decideBooking(database.pool, staff, await request(coordA, charity, hall, day, '09:00', '11:00'), { decision: 'approve' })).status).toBe(200);
  const pending = await request(coordB, expo, hall, day, '11:00', '13:00');

  await login(page, ids.staff);
  await approve(page, pending);
  expect([...await rows(charity), ...await rows(expo)].map(row => row.status)).toEqual(['confirmed', 'confirmed']);
});

test('TC_E06S06_01: after Venue Staff lengthen the buffers, the Pending request is flagged and cannot be approved', async ({ page }) => {
  const day = dayAhead(23);
  const hall = await venue('Claims Orchid Hall 01', 0, 0);
  const charity = await event('EVT-CLM-01A', 'Charity Run', coordA, day, '09:00', '11:00');
  const expo = await event('EVT-CLM-01B', 'Product Expo', coordB, day, '11:00', '13:00');
  expect((await decideBooking(database.pool, staff, await request(coordA, charity, hall, day, '09:00', '11:00'), { decision: 'approve' })).status).toBe(200);
  const pending = await request(coordB, expo, hall, day, '11:00', '13:00');

  await login(page, ids.staff);
  await editBuffers(page, hall, 30, 0);
  await expectApprovalBlocked(page, pending);
  expect(await rows(charity)).toEqual([{ venue_id: hall, status: 'confirmed', buffer_conflict: false }]);
  expect(await rows(expo)).toEqual([{ venue_id: hall, status: 'pending', buffer_conflict: true }]);
});

test('TC_E06S06_06: both conflicting requests are blocked until Venue Staff reject one; the other is then approved', async ({ page }) => {
  const day = dayAhead(24);
  const hall = await venue('Claims Orchid Hall 06', 0, 0);
  const charity = await event('EVT-CLM-06A', 'Charity Run', coordA, day, '10:00', '12:00');
  const alumni = await event('EVT-CLM-06B', 'Alumni Dinner', coordB, day, '12:00', '14:00');
  const charityId = await request(coordA, charity, hall, day, '10:00', '12:00');
  const alumniId = await request(coordB, alumni, hall, day, '12:00', '14:00');

  await login(page, ids.staff);
  await editBuffers(page, hall, 30, 45);
  await expectApprovalBlocked(page, charityId);
  await expectApprovalBlocked(page, alumniId);
  expect([...await rows(charity), ...await rows(alumni)].map(row => [row.status, row.buffer_conflict]))
    .toEqual([['pending', false], ['pending', true]]);

  // Primary resolution: reject one conflicting request with a reason.
  await page.goto(`/venue/bookings/${charityId}/decide`);
  await page.getByRole('button', { name: 'Reject…' }).click();
  await page.getByLabel('Reason (required)').fill('Overlaps Alumni Dinner after the buffer change');
  await page.getByRole('button', { name: 'Reject request' }).click();
  await expect(page.getByText(/^Rejected\./)).toBeVisible();

  await approve(page, alumniId);
  // The Rejected request is terminal: there is nothing left to decide.
  await page.goto(`/venue/bookings/${charityId}/decide`);
  await expect(page.getByText("This request is rejected, so there's nothing to decide.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve…' })).toHaveCount(0);
  expect([...await rows(charity), ...await rows(alumni)].map(row => row.status)).toEqual(['rejected', 'confirmed']);
});

test('TC_E06S06_07: one event confirms overlapping bookings at two different venues', async ({ page }) => {
  const day = dayAhead(25);
  const roomA = await venue('Claims Seminar Room A', 0, 0);
  const roomB = await venue('Claims Seminar Room B', 0, 0);
  const summit = await event('EVT-CLM-07', 'Tech Summit', coordA, day, '14:00', '16:00');
  const atA = await request(coordA, summit, roomA, day, '14:00', '16:00');
  const atB = await request(coordA, summit, roomB, day, '14:00', '16:00');

  await login(page, ids.staff);
  await approve(page, atA);
  await approve(page, atB);
  expect((await rows(summit)).map(row => row.status)).toEqual(['confirmed', 'confirmed']);
});

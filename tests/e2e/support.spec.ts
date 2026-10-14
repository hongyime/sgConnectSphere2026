// Playwright tests for /support/* routes (SCRUM-98): equipment dashboard,
// catalogue, the legacy request queue and reservation detail routes (now
// leading to the live E07-S04 list), technician staffing (live, E07-S07) and
// availability. Catalogue uses an intercepted API; technician staffing and
// availability are live. The dashboard uses support mock fixtures.
// Reservation cases are in equipmentReservations.spec.ts; availability
// calculations have dedicated E07-S03 tests.
import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

test('equipment dashboard shows open requests and shortfalls', async ({ page }) => {
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Equipment dashboard' })).toBeVisible();
  await expect(page.getByText('Open requests')).toBeVisible();
  await expect(page.getByText('Shortfalls', { exact: true })).toBeVisible();
});

test('equipment catalogue lists inventory rows', async ({ page }) => {
  await signInAs(page, 'technical_support_staff');
  await page.route('**/api/equipment**', route => route.fulfill({json: {equipment: [
    {id: 'eq-1', name: 'Wireless microphone', category: 'Audio', description: 'Handheld', total_quantity: 10, home_location: 'Main Storage', operational_status: 'available', is_active: true},
    {id: 'eq-2', name: 'Portable PA system', category: 'Audio', description: 'Portable', total_quantity: 2, home_location: 'Main Storage', operational_status: 'available', is_active: true},
  ]}}));
  await page.goto('/support/catalogue');
  await expect(page.getByRole('heading', { name: 'Equipment catalogue' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wireless microphone', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Portable PA system', exact: true })).toBeVisible();
});

// E07-S04 (SCRUM-54, D35): reserving moved to the live event equipment pages,
// so the old mock queue and reservation detail lead to the live list.
for (const path of ['/support/queue', '/support/requests/R-2004'])
  test(`legacy ${path} opens the live equipment requests list`, async ({ page }) => {
    await signInAs(page, 'technical_support_staff');
    await page.route('**/api/equipment?mode=requests', route => route.fulfill({ json: { events: [] } }));
    await page.goto(path);
    await expect(page).toHaveURL(/\/support\/equipment-requests$/);
    await expect(page.getByRole('heading', { name: 'Equipment requests' })).toBeVisible();
  });

// E07-S07 (SCRUM-150): the live staffing queue replaced the mock screen.
test('technician staffing lists support requests needing a technician', async ({ page }) => {
  await signInAs(page, 'technical_support_staff');
  await page.route(/\/api\/venues\?task=staffing/, route => route.fulfill({ json: { requests: [{
    id: '11111111-1111-4111-8111-111111111111', eventId: 'evt-1', eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2026',
    eventStatus: 'planning', description: '1 AV technician', startsAt: '2026-11-12T01:00:00.000Z',
    endsAt: '2026-11-12T04:00:00.000Z', status: 'open', assignees: [],
  }] } }));
  await page.goto('/support/technicians');
  await expect(page.getByRole('heading', { name: 'Technician staffing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'EVT-TC Tech Conference 2026' })).toBeVisible();
  await expect(page.getByText('Needs a technician').first()).toBeVisible();
});

test('legacy conflict route opens live equipment availability', async ({ page }) => {
  await signInAs(page, 'technical_support_staff');
  await page.goto('/support/conflicts');
  await expect(page.getByRole('heading', { name: 'Equipment availability', exact: true })).toBeVisible();
  await expect(page.getByLabel('Start', { exact: true })).toBeVisible();
  await expect(page.getByText('Choose a period')).toBeVisible();
});

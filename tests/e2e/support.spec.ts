// Playwright tests for /support/* routes (SCRUM-98). Six screens for the
// Technical Support Staff role: equipment dashboard, catalogue, request
// queue, reservation detail, technician staffing (live, E07-S07), and availability.
// Catalogue uses an intercepted API; technician staffing and availability are live.
// Remaining screens use support mock fixtures. The
// reservation-detail test exercises the shortfall-recording flow required
// by E07-S04 Scenario 2. Availability calculations have dedicated E07-S03 tests.
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

test('request queue filters by state', async ({ page }) => {
  await page.goto('/support/queue');
  await expect(page.getByRole('heading', { name: 'Request queue' })).toBeVisible();
  const shortfall = page.getByRole('button', { name: 'Shortfall' });
  await shortfall.click();
  await expect(shortfall).toHaveAttribute('aria-pressed', 'true');
});

test('reservation detail records a shortfall', async ({ page }) => {
  await page.goto('/support/requests/R-2004');
  await expect(page.getByRole('heading', { name: /Design Studio Recital/ })).toBeVisible();
  await page.getByRole('button', { name: 'Record shortfall' }).click();
  await expect(page.getByRole('status')).toContainText('Shortfall');
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

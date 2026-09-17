import { test, expect } from '@playwright/test';
const event = { id: 'published-event', name: 'Published event', starts_at: '2027-01-01T09:00:00Z', ends_at: '2027-01-01T10:00:00Z', venue_name: 'Published Hall', venue_location: 'Level 2' };

test('TC_E01S03_01 — attendee sees only published fields for registered events', async ({ page }) => {
  await page.route('**/api/attendee/events?*', route => route.fulfill({ json: { events: [event] } }));
  await page.goto('/attendee/events');
  await expect(page.getByRole('link', { name: 'Published event', exact: true })).toBeVisible();
  await expect(page.getByText('Published Hall')).toBeVisible();
  await expect(page.locator('time')).toHaveCount(2);
  await expect(page.getByText(/Coordinator notes|booking decisions|equipment reservations|internal comments/i)).toHaveCount(0);
  await page.getByRole('link', { name: 'Published event', exact: true }).click();
  await expect(page).toHaveURL(/\/attendee\/events\/published-event$/);
  await expect(page.getByText('Level 2')).toBeVisible();
});

test('TC_E01S03_02 — direct internal planning request is sent for auditing and denied', async ({ page }) => {
  let requested = false;
  await page.route('**/api/internal/planning?*', route => { requested = true; return route.fulfill({ status: 403, json: { error: 'Access denied. Internal planning is not available here.' } }); });
  await page.goto('/internal/planning/EVT-PRIVATE');
  await expect(page.getByRole('alert')).toContainText('Access denied');
  expect(requested).toBe(true);
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to my registered events' })).toBeVisible();
});

test('TC_E01S03_03 — unregistered direct event is refused with no event fields', async ({ page }) => {
  await page.route('**/api/attendee/events?*', route => route.fulfill({ status: 403, json: { error: 'This event is not available in your registered events.' } }));
  await page.goto('/attendee/events/unregistered');
  await expect(page.getByRole('alert')).toContainText('not available');
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('empty registrations and expired sessions have useful states', async ({ page }) => {
  await page.route('**/api/attendee/events?*', route => route.fulfill({ json: { events: [] } }));
  await page.goto('/attendee/events');
  await expect(page.getByText('No published events for your registrations yet.')).toBeVisible();
  await page.unroute('**/api/attendee/events?*');
  await page.route('**/api/attendee/events?*', route => route.fulfill({ status: 401, json: { error: 'Sign in to continue.' } }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Attendee sign in' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

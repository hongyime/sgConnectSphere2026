// Playwright tests for /venue/* routes (SCRUM-97). Covers the four Batch 5
// screens for Venue Staff: dashboard, inventory, availability calendar with
// per-venue filter, and pending booking detail with a confirm/decline action.
// Dashboard, availability, and booking detail are still backed by
// frontend/src/features/venue/mocks.ts fixtures with no live network calls.
// Inventory now calls the real GET /api/venues (E05-S01/E05-S02), so its
// test intercepts that call the same way tests/e2e/e02.spec.ts mocks
// /api/events, rather than needing a real backend in this scaffold job.
// Screens map to E05-S01, E05-S02, E05-S03, E05-S04 in the workbook.
import { test, expect } from '@playwright/test';

test('venue dashboard shows pending and confirmed counts', async ({ page }) => {
  await page.goto('/venue');
  await expect(page.getByRole('heading', { name: 'Venue dashboard' })).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Booking counts' });
  await expect(metrics.getByText('Pending review')).toBeVisible();
  await expect(metrics.getByText('Confirmed', { exact: true })).toBeVisible();
});

test('venue inventory lists every venue with capacity', async ({ page }) => {
  await page.route('**/api/venues*', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        venues: [
          {
            id: 'v-1', name: 'Auditorium A', location: 'Main Campus Level 1', max_capacity: 320,
            opens_at: '08:00', closes_at: '22:00', facilities: ['Stage', 'AV desk'],
            accessibility_features: ['Hearing loop'], supported_layouts: [{ label: 'Theatre', capacity: 300 }],
          },
          {
            id: 'v-2', name: 'Central Hall', location: 'Main Campus Level 2', max_capacity: 324,
            opens_at: '08:00', closes_at: '22:00', facilities: ['Bar', 'Green room'],
            accessibility_features: ['Step-free'], supported_layouts: [{ label: 'Banquet', capacity: 280 }],
          },
        ],
      },
    });
  });
  await page.goto('/venue/inventory');
  await expect(page.getByRole('heading', { name: 'Venue inventory' })).toBeVisible();
  await expect(page.getByText('Auditorium A')).toBeVisible();
  await expect(page.getByText('Central Hall')).toBeVisible();
});

test('inventory search re-fetches venues filtered by the query', async ({ page }) => {
  // Regression coverage for a code-review finding on #89: listVenues() was
  // never called with a search term and there was no search UI, so venues
  // past the backend's 100-result cap could never be found. Mocks the
  // server-side filter so this proves the frontend actually sends ?q= and
  // re-renders with the filtered result, not just that a request fires.
  const allVenues = [
    {
      id: 'v-1', name: 'Auditorium A', location: 'Main Campus', max_capacity: 320,
      opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [],
    },
    {
      id: 'v-2', name: 'Central Hall', location: 'Main Campus', max_capacity: 324,
      opens_at: '08:00', closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [],
    },
  ];
  await page.route('**/api/venues*', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const filtered = allVenues.filter((venue) => venue.name.toLowerCase().includes(q));
    await route.fulfill({ status: 200, json: { venues: filtered } });
  });

  await page.goto('/venue/inventory');
  await expect(page.getByText('Auditorium A')).toBeVisible();
  await expect(page.getByText('Central Hall')).toBeVisible();

  await page.getByLabel('Search venues').fill('Central');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText('Central Hall')).toBeVisible();
  await expect(page.getByText('Auditorium A')).not.toBeVisible();
});

test('pressing Enter in the layout inputs adds the layout instead of submitting the form', async ({ page }) => {
  // Regression coverage for a code-review finding on #89: the layout inputs
  // had no onKeyDown handling (unlike the facilities/accessibility inputs),
  // so Enter fell through to native form submission and silently discarded
  // whatever was typed. Asserts both halves: the layout is actually added,
  // and no POST /api/venues fires from the keypress.
  let postCount = 0;
  await page.route('**/api/venues', async (route) => {
    if (route.request().method() === 'POST') postCount += 1;
    await route.fulfill({ status: 201, json: { venue: {} } });
  });

  await page.goto('/venue/inventory/new');
  await expect(page.getByRole('heading', { name: 'Add venue' })).toBeVisible();

  await page.getByLabel('Venue name').fill('Test Hall');
  await page.getByLabel('Location').fill('Main Campus');
  await page.getByLabel('Max capacity').fill('100');
  await page.getByLabel('Opens at').fill('08:00');
  await page.getByLabel('Closes at').fill('18:00');
  await page.getByRole('textbox', { name: 'Facilities' }).fill('Stage');
  await page.getByRole('textbox', { name: 'Facilities' }).press('Enter');
  await page.getByRole('textbox', { name: 'Accessibility features' }).fill('Step-free');
  await page.getByRole('textbox', { name: 'Accessibility features' }).press('Enter');

  await page.getByLabel('Layout name').fill('Theatre');
  await page.getByLabel('Layout capacity').fill('80');
  await page.getByLabel('Layout name').press('Enter');

  await expect(page.getByText('Theatre — capacity 80')).toBeVisible();
  expect(postCount).toBe(0);
});

test('availability calendar filters bookings by selected venue', async ({ page }) => {
  await page.goto('/venue/availability');
  await expect(page.getByRole('heading', { name: 'Availability calendar' })).toBeVisible();
  await page.getByLabel('Venue').selectOption({ label: 'Central Hall' });
  await expect(page.getByRole('link', { name: 'B-1001' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'B-1003' })).toBeVisible();
});

test('pending booking detail confirms a booking', async ({ page }) => {
  await page.goto('/venue/bookings/B-1001');
  await expect(page.getByRole('heading', { name: /Annual Sustainability Forum/ })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(page.getByRole('status')).toContainText('confirmed');
});

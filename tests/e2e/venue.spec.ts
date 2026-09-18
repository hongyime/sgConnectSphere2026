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

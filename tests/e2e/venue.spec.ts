import { test, expect } from '@playwright/test';

test('venue dashboard shows pending and confirmed counts', async ({ page }) => {
  await page.goto('/venue');
  await expect(page.getByRole('heading', { name: 'Venue dashboard' })).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Booking counts' });
  await expect(metrics.getByText('Pending review')).toBeVisible();
  await expect(metrics.getByText('Confirmed', { exact: true })).toBeVisible();
});

test('venue inventory lists every venue with capacity', async ({ page }) => {
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

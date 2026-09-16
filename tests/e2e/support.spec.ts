import { test, expect } from '@playwright/test';

test('equipment dashboard shows open requests and shortfalls', async ({ page }) => {
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Equipment dashboard' })).toBeVisible();
  await expect(page.getByText('Open requests')).toBeVisible();
  await expect(page.getByText('Shortfalls', { exact: true })).toBeVisible();
});

test('equipment catalogue lists inventory rows', async ({ page }) => {
  await page.goto('/support/catalogue');
  await expect(page.getByRole('heading', { name: 'Equipment catalogue' })).toBeVisible();
  await expect(page.getByText('Wireless microphone')).toBeVisible();
  await expect(page.getByText('Portable PA system')).toBeVisible();
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

test('technician assignment lists available technicians', async ({ page }) => {
  await page.goto('/support/technicians');
  await expect(page.getByRole('heading', { name: 'Technician assignment' })).toBeVisible();
  await expect(page.getByText('Priya Menon')).toBeVisible();
});

test('conflict state lists shortfall requests', async ({ page }) => {
  await page.goto('/support/conflicts');
  await expect(page.getByRole('heading', { name: 'Conflict state' })).toBeVisible();
  await expect(page.getByText(/Design Studio Recital/)).toBeVisible();
});

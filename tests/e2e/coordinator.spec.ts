// Playwright tests for /coordinator/* routes.
//
// The dashboard, queue and event detail are live E03-S01 screens (SCRUM-32):
// these tests run them against the in-memory fake in helpers/coordinatorBackend.ts,
// which answers with the response shapes of api/events.ts. The decision page
// (E03-S03) is tested in e03.spec.ts, and the readiness page that replaced the
// mock confirmation screen (E08-S03) in eventReadiness.spec.ts.
import { test, expect } from '@playwright/test';
import { coordA, fakeCoordinatorBackend } from './helpers/coordinatorBackend';

test('coordinator dashboard shows live workload counts inside the shared header', async ({ page }) => {
  await fakeCoordinatorBackend(page, { eventCode: 'EVT-1004', title: 'Charity Run', assignedTo: coordA });
  await page.goto('/coordinator');
  await expect(page.getByRole('heading', { name: 'Workload dashboard' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Workload counts' })).toContainText('Active events1');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: /Charity Run/ })).toBeVisible();
});

test('review queue filters assigned events by status', async ({ page }) => {
  await fakeCoordinatorBackend(page, { eventCode: 'EVT-1004', title: 'Charity Run', assignedTo: coordA });
  await page.goto('/coordinator/queue');
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();
  const all = page.getByRole('button', { name: /^All/ });
  const clarification = page.getByRole('button', { name: /Awaiting organiser/ });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Charity Run' })).toBeVisible();
  await clarification.click();
  await expect(clarification).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('No events in “Awaiting organiser”')).toBeVisible();
});

test('request detail shows the assigned Coordinator and request details', async ({ page }) => {
  await fakeCoordinatorBackend(page, { eventCode: 'EVT-1004', title: 'Charity Run', assignedTo: coordA });
  await page.goto('/coordinator/events/EVT-1004');
  await expect(page.getByRole('heading', { level: 1, name: 'Charity Run' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Event summary' })).toContainText('Assigned CoordinatorCoord A');
  await expect(page.getByText('Outdoor start line')).toBeVisible();
});

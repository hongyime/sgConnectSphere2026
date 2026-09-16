// Playwright tests for /coordinator/* routes (SCRUM-96). Each test exercises a
// user-visible flow — dashboard rendering, queue filtering, decision-panel
// validation, readiness gating — against the mock data in
// frontend/src/features/coordinator/mocks.ts. No backend is hit; these tests
// confirm that the mock-data functional screens satisfy the acceptance
// criteria captured in E03-S01, E03-S03, and E06-S03 without depending on
// implementation of the coordinator API endpoints.
import { test, expect } from '@playwright/test';

test('coordinator dashboard renders the workload metrics', async ({ page }) => {
  await page.goto('/coordinator');
  await expect(page.getByRole('heading', { name: 'Workload dashboard' })).toBeVisible();
  await expect(page.getByText('Assigned', { exact: true })).toBeVisible();
});

test('review queue filters between all and needs-decision', async ({ page }) => {
  await page.goto('/coordinator/queue');
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();
  const all = page.getByRole('button', { name: /All \(/ });
  const needsDecision = page.getByRole('button', { name: 'Needs decision' });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await needsDecision.click();
  await expect(needsDecision).toHaveAttribute('aria-pressed', 'true');
});

test('request detail exposes the event workflow tabs', async ({ page }) => {
  await page.goto('/coordinator/events/EVT-C01');
  await expect(page.getByRole('heading', { name: /Annual Sustainability Forum/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Decide' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Confirm' })).toBeVisible();
});

test('decision panel requires a reason when rejecting or clarifying', async ({ page }) => {
  await page.goto('/coordinator/events/EVT-C01/decide');
  const record = page.getByRole('button', { name: 'Record decision' });
  await expect(record).toBeDisabled();
  await page.getByRole('radio', { name: 'Reject' }).check();
  await expect(record).toBeDisabled();
  await page.getByLabel('Reason (required)').fill('Requested date conflicts with an existing hold.');
  await expect(record).toBeEnabled();
});

test('final confirmation blocks until readiness is met', async ({ page }) => {
  await page.goto('/coordinator/events/EVT-C01/confirm');
  await expect(page.getByRole('button', { name: 'Confirm event' })).toBeDisabled();
  await expect(page.getByText('Complete the readiness checklist first.')).toBeVisible();
  await page.goto('/coordinator/events/EVT-C03/confirm');
  const confirmButton = page.getByRole('button', { name: 'Confirm event' });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(page.getByRole('status')).toContainText('Event confirmed');
});

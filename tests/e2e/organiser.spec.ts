// Playwright tests for /organiser/* routes (SCRUM-105 frontend coverage).
// Covers the four Organiser screens added on top of the existing
// OrganiserRequestFlow: dashboard, request list with filters, submitted
// detail with clarification banner, and clarification response requiring
// answers to every open question. Backed by
// frontend/src/features/organiser/mocks.ts fixtures.
import { test, expect } from '@playwright/test';

test('TC_E02S02_01 — organiser dashboard shows request status counts', async ({ page }) => {
  await page.goto('/organiser');
  await expect(page.getByRole('heading', { name: 'My events' })).toBeVisible();
  await expect(page.getByText('Drafts', { exact: true })).toBeVisible();
  await expect(page.getByText('Awaiting review')).toBeVisible();
  await expect(page.getByText('Need clarification')).toBeVisible();
});

test('TC_E02S02_02 — request list filters between drafts and awaiting review', async ({ page }) => {
  await page.goto('/organiser/requests');
  await expect(page.getByRole('heading', { name: 'Requests' })).toBeVisible();
  const drafts = page.getByRole('button', { name: 'Drafts' });
  await drafts.click();
  await expect(drafts).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Design Studio Recital')).toBeVisible();
});

test('TC_E03S02_01 — submitted detail surfaces the clarification banner', async ({ page }) => {
  await page.goto('/organiser/requests/EVT-O01');
  await expect(page.getByRole('heading', { name: /Annual Sustainability Forum/ })).toBeVisible();
  await expect(page.getByText(/Coordinator has requested clarification/)).toBeVisible();
});

test('TC_E03S02_02 — clarification response requires every answer before submit', async ({ page }) => {
  await page.goto('/organiser/requests/EVT-O01/clarify');
  const submit = page.getByRole('button', { name: 'Resubmit for review' });
  await submit.click();
  // Empty responses do not record success.
  await expect(page.getByRole('status')).toBeEmpty();
  await page.getByLabel(/1\./).fill('Split is 60% faculty, 40% external.');
  await page.getByLabel(/2\./).fill('Afternoon panel needs vegetarian only.');
  await submit.click();
  await expect(page.getByRole('status')).toContainText('Responses recorded');
});

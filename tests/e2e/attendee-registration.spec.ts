// Playwright tests for the attendee registration flow (/attendee/discover,
// /attendee/register/:eventCode, /attendee/withdraw/:eventCode,
// /attendee/feedback/:eventCode) added by SCRUM-105 for frontend coverage.
// Backed by mock fixtures inside AttendeeRegistration.tsx; no backend hit.
import { test, expect } from '@playwright/test';

test('TC_E09S01_01 — event discovery lists published events with capacity', async ({ page }) => {
  await page.goto('/attendee/discover');
  await expect(page.getByRole('heading', { name: 'Discover events' })).toBeVisible();
  await expect(page.getByText('Sustainability Forum')).toBeVisible();
  await expect(page.getByText('100 / 220 seats')).toBeVisible();
});

test('TC_E09S02_01 — registration confirms with a mock success on submit', async ({ page }) => {
  await page.goto('/attendee/register/EVT-A03');
  await expect(page.getByRole('heading', { name: 'Register for the event' })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Confirm registration/ }).click();
  await expect(page.getByRole('status')).toContainText('You are registered');
});

test('TC_E09S02_02 — full event routes registration into a waitlist join', async ({ page }) => {
  await page.goto('/attendee/register/EVT-A01');
  await expect(page.getByRole('heading', { name: 'Join the waitlist' })).toBeVisible();
});

test('TC_E09S05_01 — withdrawal requires a reason before recording', async ({ page }) => {
  await page.goto('/attendee/withdraw/EVT-A03');
  const submit = page.getByRole('button', { name: 'Confirm withdrawal' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Reason (required)').fill('Cannot attend anymore.');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole('status')).toContainText('withdrawal has been recorded');
});

test('TC_E09S06_01 — feedback requires a rating', async ({ page }) => {
  await page.goto('/attendee/feedback/EVT-A03');
  const send = page.getByRole('button', { name: 'Send feedback' });
  await expect(send).toBeDisabled();
  await page.getByRole('radio', { name: '5' }).check();
  await send.click();
  await expect(page.getByRole('status')).toContainText('Thanks for the feedback');
});

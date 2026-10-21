// Playwright tests for the attendee registration flow. Discover, the event page
// and registration (/attendee/discover, /attendee/discover/:eventCode,
// /attendee/register/:eventCode) are live for E09-S01 and run against a fake
// api/attendee/events.ts. Withdrawal and feedback (/attendee/withdraw/:eventCode,
// /attendee/feedback/:eventCode) are still mock screens with fixture data.
import { test, expect } from '@playwright/test';
import { fakeRegistrationBackend } from './helpers/registrationBackend';

test('TC_E09S01_01 — Discover, open an event and register for Sessions A and B with a confirmation', async ({ page }) => {
  const posts = await fakeRegistrationBackend(page);
  await page.goto('/attendee/discover');
  await expect(page.getByRole('heading', { name: 'Discover events' })).toBeVisible();
  await expect(page.getByText('Open for registration')).toBeVisible();
  await page.getByRole('link', { name: 'Tech Summit' }).click();
  await expect(page.getByRole('heading', { name: 'Tech Summit' })).toBeVisible();
  await page.getByRole('link', { name: 'Register' }).click();
  const sessions = page.getByRole('group', { name: 'Choose your Sessions' });
  await sessions.getByRole('checkbox', { name: /Session A/ }).check();
  await sessions.getByRole('checkbox', { name: /Session B/ }).check();
  await page.getByRole('button', { name: 'Confirm registration' }).click();
  await expect(page.getByText("You're registered", { exact: true })).toBeVisible();
  await expect(page.getByText("We've sent a confirmation to your notifications and by email.")).toBeVisible();
  const yours = page.getByRole('table', { name: 'Sessions' });
  await expect(yours.getByText('Session A')).toBeVisible();
  await expect(yours.getByText('Seminar Room B, Level 2')).toBeVisible();
  expect(posts).toEqual([{ sessionIds: ['s-a', 's-b'] }]);
});

test('TC_E09S01_07 — one submission creates one Event registration with both Sessions', async ({ page }) => {
  const posts = await fakeRegistrationBackend(page);
  await page.goto('/attendee/register/EVT-TECH');
  const sessions = page.getByRole('group', { name: 'Choose your Sessions' });
  await sessions.getByRole('checkbox', { name: /Session A/ }).check();
  await sessions.getByRole('checkbox', { name: /Session B/ }).check();
  await page.getByRole('button', { name: 'Confirm registration' }).click();
  await expect(page.getByRole('link', { name: 'View my events' })).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toEqual({ sessionIds: ['s-a', 's-b'] });
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

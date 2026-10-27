// Playwright tests for the attendee registration flow. Discover, the event page
// and registration (/attendee/discover, /attendee/discover/:eventCode,
// /attendee/register/:eventCode) are live for E09-S01 and run against a fake
// api/attendee/events.ts. Withdrawal (E09-S05) is on the event page, tested in
// EventRegistration.test.tsx and the backend; feedback (/attendee/feedback/:eventCode)
// is still a mock screen with fixture data.
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

test('feedback requires a rating', async ({ page }) => {
  await page.goto('/attendee/feedback/EVT-A03');
  const send = page.getByRole('button', { name: 'Send feedback' });
  await expect(send).toBeDisabled();
  await page.getByRole('radio', { name: '5' }).check();
  await send.click();
  await expect(page.getByRole('status')).toContainText('Thanks for the feedback');
});

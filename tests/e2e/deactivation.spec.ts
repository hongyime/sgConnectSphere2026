import { test, expect } from '@playwright/test';
const profile = { full_name: 'Test User', email: 'user@example.test', contact_number: '9000 0000', organisation_name: null };

test('explicit confirmation is required and success redirects to signed-out login', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/account/profile', async route => {
    if (route.request().method() === 'DELETE') {
      requests++; expect(route.request().postDataJSON()).toEqual({ confirm: true });
      await route.fulfill({ json: { deactivated: true, signedOut: true } });
    } else await route.fulfill({ json: { profile } });
  });
  await page.route('**/api/auth/session', route => route.fulfill({ status: 401, json: { error: 'Sign in to continue.' } }));
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Deactivate Account', exact: true }).click();
  await expect(page.getByText(/historical records will be retained/)).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Cancel deactivation' }).click();
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Deactivate Account', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deactivation' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(requests).toBe(1);
});

test('blocked coordinator stays on profile and sees assignments requiring reassignment', async ({ page }) => {
  await page.route('**/api/account/profile', route => route.fulfill(route.request().method() === 'DELETE'
    ? { status: 409, json: { error: 'Reassign your active events before deactivating your account.', events: [{ id: 'event', event_code: 'EVT-A', title: 'Assigned conference' }] } }
    : { json: { profile } }));
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Deactivate Account', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deactivation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Reassign your active events' })).toBeVisible();
  await expect(page.getByText('EVT-A: Assigned conference')).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Full name')).toHaveValue('Test User');
});

// Playwright tests for the /verify email-verification frontend page
// (SCRUM-93 companion). The API is intercepted so these tests do not
// depend on the backend being live. Each test title includes the workbook
// TC_ID it covers so scripts/tc_coverage_audit.py picks them up.
import { test, expect } from '@playwright/test';

test('TC_E01S12_01 — verify success renders confirmation and sign-in link', async ({ page }) => {
  await page.route('**/api/auth/verify', async route => {
    const body = route.request().postDataJSON();
    expect(body?.token).toBeTruthy();
    await route.fulfill({ status: 200, json: { verified: true } });
  });
  await page.goto('/verify?token=' + 'a'.repeat(64));
  await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('TC_E01S12_02 — verify expired token surfaces expired copy and register link', async ({ page }) => {
  await page.route('**/api/auth/verify', route => route.fulfill({ status: 410, json: { error: 'expired' } }));
  await page.goto('/verify?token=' + 'b'.repeat(64));
  await expect(page.getByRole('heading', { name: /expired/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register again' })).toBeVisible();
});

test('TC_E01S12_03 — verify already-verified token shows the idempotent message', async ({ page }) => {
  await page.route('**/api/auth/verify', route => route.fulfill({ status: 409, json: { error: 'already_verified' } }));
  await page.goto('/verify?token=' + 'c'.repeat(64));
  await expect(page.getByRole('heading', { name: 'Already verified' })).toBeVisible();
});

test('TC_E01S12_04 — missing token bypasses the API and shows invalid', async ({ page }) => {
  let apiHit = false;
  await page.route('**/api/auth/verify', route => { apiHit = true; return route.fulfill({ status: 200, json: {} }); });
  await page.goto('/verify');
  await expect(page.getByRole('heading', { name: /not valid/ })).toBeVisible();
  expect(apiHit).toBe(false);
});

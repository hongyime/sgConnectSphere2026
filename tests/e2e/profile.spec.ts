import { test, expect } from '@playwright/test';

const initial = { full_name: 'Alex', email: 'alex@example.test', contact_number: '9123 4567', organisation_name: 'Client A' };

test('TC_E01S04_01 TC_E01S04_05 — edit profile, save normalized values and reload; organisation stays read-only', async ({ page }) => {
  let profile = { ...initial };
  await page.route('**/api/account/profile', async route => {
    if (route.request().method() === 'PUT') {
      const data = route.request().postDataJSON();
      expect(Object.keys(data).sort()).toEqual(['contact_number', 'email', 'full_name']);
      profile = { ...profile, ...data, email: data.email.trim().toLowerCase() };
    }
    await route.fulfill({ json: { profile } });
  });
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toHaveValue('Alex');
  await expect(page.getByText('Organisation: Client A')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByLabel('Full name').fill('Alexandra');
  await page.getByLabel('Email', { exact: true }).fill('NEW@EXAMPLE.TEST');
  await page.getByLabel('Contact number').fill('9876 5432');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Your profile has been saved.')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('new@example.test');
  await page.reload();
  await expect(page.getByLabel('Full name')).toHaveValue('Alexandra');
  await expect(page.getByLabel('Contact number')).toHaveValue('9876 5432');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('new@example.test');
  await expect(page.getByText('Organisation: Client A')).toBeVisible();
  await expect(page.getByText(/contact your Coordinator/)).toBeVisible();
});

test('TC_E01S04_02 TC_E01S04_03 — field errors remain visible and form can be corrected', async ({ page }) => {
  await page.route('**/api/account/profile', route => route.fulfill(route.request().method() === 'GET'
    ? { json: { profile: initial } }
    : { status: 400, json: { errors: { email: ['Please enter a valid email address'], contact_number: ['Contact number is required'] } } }));
  await page.goto('/profile');
  await page.getByLabel('Email', { exact: true }).fill('bad-email');
  await page.getByLabel('Contact number').fill('');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Contact number is required')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeEnabled();
});

test('TC_E01S01_01 — unauthenticated user signs in through existing session endpoint', async ({ page }) => {
  let signedIn = false;
  await page.route('**/api/account/profile', route => route.fulfill(signedIn ? { json: { profile: initial } } : { status: 401, json: { error: 'Sign in to continue.' } }));
  await page.route('**/api/auth/session', async route => {
    expect(route.request().method()).toBe('POST'); signedIn = true;
    await route.fulfill({ json: { signedIn: true } });
  });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('alex@example.test');
  await page.getByLabel('Password', { exact: true }).fill('SyntheticTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Alex');
});

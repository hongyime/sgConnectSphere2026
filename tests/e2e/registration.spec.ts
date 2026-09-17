import { test, expect } from '@playwright/test';

test('TC_E01S08_01 TC_E01S08_04 — registration submits required fields without role and displays success', async ({ page }) => {
  await page.route('**/api/auth/register', async route => {
    expect(route.request().postDataJSON()).toEqual({ full_name: 'Jamie Lee', email: 'jamie@example.com', password: 'LongPassword12!', contact_number: '+65 9000 0000' }); // pragma: allowlist secret - synthetic test credential
    await route.fulfill({ status: 201, json: { account: { id: 'test-id', email: 'jamie@example.com', role: 'attendee' } } });
  });
  await page.goto('/register');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByLabel('Full name').fill('Jamie Lee');
  await page.getByLabel('Email', { exact: true }).fill('jamie@example.com');
  await page.getByLabel('Password', { exact: true }).fill('LongPassword12!');
  await page.getByLabel('Contact number').fill('+65 9000 0000');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('status')).toHaveText('Your Attendee account has been created.');
});

test('TC_E01S08_02 TC_E01S08_03 — registration displays server field errors and allows correction', async ({ page }) => {
  await page.route('**/api/auth/register', route => route.fulfill({ status: 400, json: { errors: { full_name: ['Name is required'], password: ['Password must be at least 12 characters.'] } } }));
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByText('Name is required')).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled();
  await page.unroute('**/api/auth/register');
  await page.route('**/api/auth/register', route => route.fulfill({ status: 409, json: { errors: { email: ['This email address is already in use'] } } }));
  await page.getByLabel('Full name').fill('Jamie Lee');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByText('This email address is already in use')).toBeVisible();
});

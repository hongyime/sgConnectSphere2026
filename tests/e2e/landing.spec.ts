import { test, expect } from '@playwright/test';

test('landing page renders at / and links to login and register', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Coordinate every event');
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Create an attendee account' })).toHaveAttribute('href', '/register');
});

test('login page posts to /api/auth/session and surfaces server errors without leaking credentials', async ({ page }) => {
  await page.route('**/api/auth/session', route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 401, json: { error: 'Sign in to continue.' } });
    expect(route.request().postDataJSON()).toEqual({ email: 'coordinator@example.com', password: 'WrongPassword12!' }); // pragma: allowlist secret - synthetic test credential
    return route.fulfill({ status: 401, json: { error: 'Unable to sign in. Check your credentials or contact your administrator.' } });
  });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email').fill('coordinator@example.com');
  await page.getByLabel('Password').fill('WrongPassword12!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to sign in');
  // Still on /login; no unintended navigation on failure.
  await expect(page).toHaveURL(/\/login$/);
});

test('login page redirects to the role home on success', async ({ page }) => {
  let step = 0;
  await page.route('**/api/auth/session', route => {
    const method = route.request().method();
    if (method === 'GET' && step === 0) return route.fulfill({ status: 401, json: { error: 'Sign in to continue.' } });
    if (method === 'POST') { step = 1; return route.fulfill({ status: 200, json: { signedIn: true } }); }
    return route.fulfill({ status: 200, json: { user: { id: 'test-id', email: 'attendee@example.com', role: 'attendee' } } });
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill('attendee@example.com');
  await page.getByLabel('Password').fill('AnyPassword12!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/attendee\/events$/);
});

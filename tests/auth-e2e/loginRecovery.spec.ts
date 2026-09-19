import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from '../../backend/tests/helpers/loginDatabase.js';
import { hashPassword } from '../../backend/src/modules/accessControl/password.js';
import { postgresDeliveryStore } from '../../backend/src/modules/notificationDispatcher/postgres.js';
import { dispatchCommittedDeliveries } from '../../backend/src/modules/notificationDispatcher/dispatch.js';

const appUrl = 'http://127.0.0.1:5176';
const password = 'SyntheticBrowser12!'; // pragma: allowlist secret - synthetic credential
const newPassword = 'SyntheticBrowser34!'; // pragma: allowlist secret - synthetic credential
let database: Awaited<ReturnType<typeof loginDatabase>>;
let server: ChildProcess;
let passwordHash: string;

test.beforeAll(async () => {
  database = await loginDatabase();
  passwordHash = await hashPassword(password);
  server = spawn(process.execPath, ['--import', 'tsx', 'backend/src/dev.ts'], {
    env: { ...process.env, DATABASE_URL: database.connectionString, DATABASE_POOLER_URL: database.connectionString, APP_URL: appUrl, PORT: '3006', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await Promise.race([
    once(server.stdout!, 'data'),
    once(server, 'exit').then(() => { throw new Error('Test API exited before startup'); }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Test API startup timed out')), 15_000); timer.unref(); }),
  ]);
});
test.afterAll(async () => {
  if (server && server.exitCode === null) { const exit = once(server, 'exit'); server.kill(); await exit; }
  await database?.close();
});

async function account(active = true) {
  const id = randomUUID(), org = randomUUID(), email = `${id}@example.test`;
  await database.pool.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
  await database.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role, is_active)
    VALUES ($1, $2, $3, $4, 'Browser organiser', 'event_organiser', $5)`, [id, org, email, passwordHash, active]);
  return { id, email };
}

async function deliver(email: string) {
  const { rows } = await database.pool.query(`SELECT d.id FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id
    JOIN users u ON u.id = n.user_id WHERE u.email = $1 AND d.delivery_status = 'queued'`, [email]);
  expect(rows).toHaveLength(1);
  let html = '';
  const result = await dispatchCommittedDeliveries(postgresDeliveryStore(database.pool, appUrl), {
    async publish() {}, async peek() { return [rows[0].id]; }, async acknowledge() {}, async defer() {},
  }, async lease => { expect(lease.to).toBe(email); html = lease.html; return { kind: 'sent' }; });
  expect(result.sent).toBe(1);
  return /href="([^"]+)"/.exec(html)![1].replaceAll('&amp;', '&');
}

test('TC_E01S01_01 — real login normalizes email, reaches organiser events and protects the signed-out route', async ({ page }) => {
  const a = await account();
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Sign in as an Event Organiser' })).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(` ${a.email.toUpperCase()} `);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(`${appUrl}/events`);
  await expect(page.getByRole('heading', { name: 'My organisation’s events' })).toBeVisible();
  await expect(page.getByText('0 events shown')).toBeVisible();
});

test('TC_E01S01_02 — wrong, unknown and inactive accounts show the same error', async ({ page }) => {
  const a = await account(), inactive = await account(false);
  let message = '';
  for (const [email, value] of [[a.email, 'wrong'], ['unknown@example.test', password], [inactive.email, password]]) {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(value);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
    const error = await page.getByRole('alert').innerText();
    if (message) expect(error).toBe(message); else message = error;
    await expect(page).toHaveURL(`${appUrl}/login`);
    await expect(page.getByRole('link', { name: 'Forgot password or locked out?' })).toBeVisible();
  }
});

test('TC_E01S01_03 TC_E01S01_04 TC_E01S01_05 TC_E01S01_06 TC_E01S01_07 — lock, audit, emailed reset, unlock and single-use recovery', async ({ page, context }) => {
  const a = await account();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(a.email);
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.getByLabel('Password', { exact: true }).fill(attempt === 5 ? password : 'wrong');
    const response = page.waitForResponse(response => response.url().endsWith('/api/auth/session') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    expect((await response).status()).toBe(401);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  }
  const locked = (await database.pool.query('SELECT failed_login_count, locked_until FROM users WHERE id = $1', [a.id])).rows[0];
  expect(locked.failed_login_count).toBe(5); expect(locked.locked_until).not.toBeNull();
  const logs = await database.pool.query("SELECT occurred_at FROM audit_logs WHERE entity_id = $1 AND action = 'Account Locked'", [a.id]);
  expect(logs.rows).toHaveLength(1); expect(logs.rows[0].occurred_at).toBeTruthy();
  await page.getByRole('link', { name: 'Forgot password or locked out?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(a.email.toUpperCase());
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an active account matches');
  const link = await deliver(a.email);
  await page.goto(link);
  await expect(page).toHaveURL(`${appUrl}/reset-password`);
  await page.getByLabel('New password', { exact: true }).fill('weak');
  await page.getByLabel('Confirm new password').fill('different');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords must match.');
  await page.getByLabel('Confirm new password').fill('weak');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('at least 12 characters');
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('status')).toContainText('Your password has been reset');
  const recovered = (await database.pool.query('SELECT failed_login_count, locked_until FROM users WHERE id = $1', [a.id])).rows[0];
  expect(recovered).toEqual({ failed_login_count: 0, locked_until: null });
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(a.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  await page.getByLabel('Password', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(`${appUrl}/events`);
  await expect(page.getByText('0 events shown')).toBeVisible();
  await context.clearCookies();
  await page.goto(link);
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid, expired, or already used');
});

test('invalid and expired reset links guide the user back to recovery', async ({ page }) => {
  await page.goto('/reset-password#token=invalid');
  await expect(page.getByRole('alert')).toContainText('This reset link is invalid');
  const a = await account();
  await page.goto('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(a.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an active account matches');
  const link = await deliver(a.email);
  await database.pool.query("UPDATE password_reset_tokens SET expires_at = now() - interval '1 second' WHERE user_id = $1", [a.id]);
  await page.goto(link);
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid, expired, or already used');
  await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  await page.getByRole('link', { name: 'Request a new reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password', exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

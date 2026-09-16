import { test, expect } from '@playwright/test';

test('admin home shows system-wide counts', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'System overview' })).toBeVisible();
  await expect(page.getByText('Active users')).toBeVisible();
  await expect(page.getByText('Audit entries')).toBeVisible();
});

test('user management filters by role', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
  const coordinatorFilter = page.getByRole('button', { name: 'Event Coordinator' });
  await coordinatorFilter.click();
  await expect(coordinatorFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Daniel Ong')).toBeVisible();
});

test('role assignment saves a role change', async ({ page }) => {
  await page.goto('/admin/users/U-06/role');
  await expect(page.getByRole('heading', { name: /Assign role/ })).toBeVisible();
  await page.getByLabel('Role').selectOption('event_coordinator');
  await page.getByRole('button', { name: 'Save role' }).click();
  await expect(page.getByRole('status')).toContainText('Role saved');
});

test('audit log viewer filters by free-text query', async ({ page }) => {
  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await page.getByPlaceholder('actor, action, or entity').fill('deactivated');
  await expect(page.getByText('Farid Iskandar deactivated')).toBeVisible();
});

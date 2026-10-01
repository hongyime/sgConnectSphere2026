// Frontend skeleton (ADR-017): the page templates work in a real browser, and
// the signInAs helper gives any signed-in page the right shared header.
import { expect, test } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

test('the page templates run end to end on sample data', async ({ page }) => {
  await page.goto('/ui-kit');
  await page.getByRole('link', { name: 'List', exact: true }).click();
  await page.getByRole('link', { name: 'Leadership Summit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Leadership Summit' })).toBeVisible();
  await page.getByRole('link', { name: 'Decide' }).click();
  await page.getByRole('button', { name: 'Approve…' }).click();
  await page.getByRole('button', { name: 'Approve request' }).click();
  await expect(page.getByText('Approved. Organiser A has been notified.')).toBeVisible();
});

test('signInAs gives a signed-in page the role navigation', async ({ page }) => {
  await signInAs(page, 'venue_staff');
  await page.route('**/api/venues**', route => route.fulfill({ json: { venues: [] } }));
  await page.goto('/home');
  await expect(page).toHaveURL(/\/venue\/inventory$/);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Inventory' })).toHaveAttribute('aria-current', 'page');
});

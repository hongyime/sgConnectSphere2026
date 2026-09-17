import { test, expect } from '@playwright/test';

const event = { id: 'a2', event_code: 'EVT-A02', title: 'Colleague conference', status: 'draft', starts_at: '2027-01-01T09:00:00Z', creator_name: 'Colleague A' };

test('TC_E01S02_03 TC_E01S02_04 — organisation events show colleague attribution and an accessible empty search state', async ({ page }) => {
  await page.route('**/api/events?*', async route => {
    const search = new URL(route.request().url()).searchParams.get('q');
    await route.fulfill({ json: { events: search ? [] : [event], notifications: [] } });
  });
  await page.goto('/events');
  await expect(page.getByRole('link', { name: 'Colleague conference' })).toBeVisible();
  await expect(page.getByText('Created by Colleague A')).toBeVisible();
  await page.getByRole('searchbox').fill('Confidential');
  await expect(page.getByText('No events found. Try another name or event ID.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Colleague conference' })).toHaveCount(0);
});

test('TC_E01S02_02 — direct access denial shows no event details and offers a return path', async ({ page }) => {
  await page.route('**/api/events?*', route => route.fulfill({ status: 403, json: { error: 'Access denied. This event is not available to your organisation.' } }));
  await page.goto('/events/EVT-B01');
  await expect(page.getByRole('alert')).toContainText('Access denied');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'All organisation events' })).toHaveAttribute('href', '/events');
});

test('expired sessions prompt for sign-in without exposing cached events', async ({ page }) => {
  await page.route('**/api/events?*', route => route.fulfill({ status: 401, json: { error: 'Your session has expired. Please sign in again.' } }));
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Sign in as an Event Organiser' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

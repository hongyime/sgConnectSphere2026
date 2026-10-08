// Traceability: SCRUM-46 / E06-S02 AC1-3 and AC5 (T-77).
// Evidence: feature/SCRUM-46-venue-suitability; see docs/testing/venue-suitability.md.
// AC4 real booking integration remains pending E06-S03/S04.
import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

test.beforeEach(async ({ page }) => { await signInAs(page, 'event_coordinator'); });
for (const suitable of [false, true]) test(`TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: ${suitable ? 'suitable' : 'unsuitable'} event assessment`, async ({ page }) => {
  await page.route('**/api/venues?*', route => route.fulfill({ json: {
    event: { id: 'e', title: 'Synthetic Event', start: '2026-11-10T00:00:00Z', end: '2026-11-10T15:00:00Z', accessibility_note: 'Check stage access manually' },
    assessment: { id: 'v', name: 'Central Hall', location: 'Central', suitable, available: true, advisory: true,
      mismatches: suitable ? [] : ['Event is outside operating hours.', 'Missing facility: WiFi'],
      comparisons: [
        { criterion: 'Capacity', required: '80', provided: '100' },
        { criterion: 'Operating hours (Singapore time)', required: '', provided: '08:00 - 22:00' },
      ],
    },
  } }));
  await page.goto('/coordinator/events/e/venues/v/suitability');
  await expect(page.getByRole('heading', { name: 'Venue suitability', exact: true })).toBeVisible();
  await expect(page.getByText(suitable ? 'Suitable' : 'Unsuitable', { exact: true })).toBeVisible();
  await expect(page.getByText('Event is outside operating hours.', { exact: true })).toHaveCount(suitable ? 0 : 1);
  await expect(page.getByText(/An unsuitable venue may still be requested/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to venue search' })).toHaveAttribute('href', '/coordinator/events/e/venues');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('venue-suitability.png'), fullPage: true });
});
test('unauthorised assessment displays a safe error', async ({ page }) => {
  await page.route('**/api/venues?*', route => route.fulfill({ status: 403, json: { error: 'Access denied.' } }));
  await page.goto('/coordinator/events/e/venues/v/suitability');
  await expect(page.getByRole('alert')).toContainText('Access denied.');
  await expect(page.getByText('Event requirement', { exact: true })).toHaveCount(0);
});

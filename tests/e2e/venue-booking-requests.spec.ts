// E06-S03 read-only slice. Mocked API browser checks; PostgreSQL privacy tests
// are in backend/tests/venueBookingRequests.integration.test.ts.
import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

test.beforeEach(async ({ page }) => { await signInAs(page, 'event_coordinator'); });
test('TC_E06S03_05: own event booking statuses use the shared desktop/mobile layout', async ({ page }) => {
  await page.route('**/api/venues?*', route => route.fulfill({ json: {
    event: { id: 'e', event_code: 'EVT-1', title: 'Synthetic Conference', status: 'planning' },
    bookings: [
      { id: 'a', venue_id: 'v1', venue_name: 'Riverside Hall', location: 'Main Campus', status: 'pending', starts_at: '2027-01-15T01:00:00Z', ends_at: '2027-01-15T03:00:00Z', decision_reason: null },
      { id: 'b', venue_id: 'v2', venue_name: 'Grand Ballroom', location: 'City Campus', status: 'confirmed', starts_at: '2027-01-15T03:00:00Z', ends_at: '2027-01-15T06:00:00Z', decision_reason: null },
    ],
  } }));
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await expect(page.getByRole('heading', { name: 'Venue booking requests', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Riverside Hall' })).toContainText('Pending');
  await expect(page.getByRole('region', { name: 'Grand Ballroom' })).toContainText('Confirmed');
  await expect(page.getByRole('link', { name: 'Search venues for this event' })).toHaveAttribute('href', '/coordinator/events/EVT-1/venues');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('booking-requests.png'), fullPage: true });
});
test('booking list shows an empty state and a safe refusal without event details', async ({ page }) => {
  await page.route('**/api/venues?*', route => route.fulfill({ json: { event: { id: 'e', title: 'Synthetic Event', status: 'approved' }, bookings: [] } }));
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await expect(page.getByText('No venue bookings recorded')).toBeVisible();
  await page.unroute('**/api/venues?*');
  await page.route('**/api/venues?*', route => route.fulfill({ status: 404, json: { error: 'Event not found.' } }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Event not found.');
  await expect(page.getByText('Synthetic Event', { exact: true })).toHaveCount(0);
});

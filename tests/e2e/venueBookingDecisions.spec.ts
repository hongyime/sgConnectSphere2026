// E06-S04 (SCRUM-48) acceptance cases in the browser, against a stateful fake
// of the /api/venues decision endpoints shaped like
// backend/src/modules/venueBooking/decisions.ts, and of the assigned
// Coordinator's event read for the Activity log. The rules themselves (stored
// decision, audit row, notice, buffered clash, races) are proven against
// PostgreSQL in backend/tests/venueBookingDecisions.integration.test.ts.
// TC_E06S04_07 (release logging) waits for E10-S04 and stays a placeholder in
// tests/e2e/e06.spec.ts.
import { test, expect, type Page, type Route } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

const REASON = 'Capacity too small for expected attendance';
const CLASH = `This can't be approved: with setup and turnaround time it overlaps the confirmed booking for "EVT-2001 Confirmed Registration Event" (25 Oct 2026, 2:00 pm – 4:00 pm) at Orchid Hall.`;

const pending = {
  id: 'b-1', status: 'pending', startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T14:00:00.000Z',
  venue: { id: 'v-orchid', name: 'Orchid Hall' },
  event: { id: 'e-1', code: 'EVT-3003', title: 'Planning Phase Gala', expectedAttendance: 120, coordinatorName: 'Coordinator A' },
  decisionReason: null, suggestedVenue: null, decidedBy: null, decidedAt: null, requestedAt: '2026-10-01T01:00:00.000Z',
};

// Venue Staff side: one pending request; a decision changes it on reload.
async function venueStaff(page: Page, options: { clash?: boolean } = {}) {
  const state: { booking: Record<string, unknown>; posts: Record<string, unknown>[] } = { booking: { ...pending }, posts: [] };
  await signInAs(page, 'venue_staff');
  await page.route('**/api/venues**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, string | null>;
      state.posts.push(body);
      if (options.clash) return route.fulfill({ status: 409, json: { error: CLASH, conflict: { bookingId: 'b-2', status: 'confirmed', eventCode: 'EVT-2001' } } });
      state.booking = body.decision === 'approve'
        ? { ...pending, status: 'confirmed', decidedBy: 'Venue Staff A', decidedAt: '2026-10-15T02:00:00.000Z' }
        : { ...pending, status: 'rejected', decidedBy: 'Venue Staff A', decidedAt: '2026-10-15T02:00:00.000Z', decisionReason: body.reason,
          suggestedVenue: body.suggested_venue_id ? { id: body.suggested_venue_id, name: 'Jasmine Hall' } : null };
      return route.fulfill({ json: { booking: state.booking, coordinatorNotified: true } });
    }
    if (url.searchParams.get('bookings') === 'pending') return route.fulfill({ json: { bookings: state.booking.status === 'pending' ? [state.booking] : [] } });
    if (url.searchParams.has('booking')) return route.fulfill({ json: { booking: state.booking } });
    if (url.searchParams.get('calendar') === '1') return route.fulfill({ json: {
      venue: { id: 'v-orchid', name: 'Orchid Hall', opens_at: '08:00', closes_at: '22:00', is_active: true },
      from: url.searchParams.get('from'), to: url.searchParams.get('to'), timezone: 'Asia/Singapore', entries: [],
    } });
    if (url.searchParams.has('id')) return route.fulfill({ json: { venue: {
      id: 'v-orchid', name: 'Orchid Hall', location: 'Singapore', max_capacity: 200, opens_at: '08:00', closes_at: '22:00',
      facilities: [], accessibility_features: [], supported_layouts: [], setup_time_minutes: 0, turnaround_time_minutes: 0,
    } } });
    return route.fulfill({ json: { venues: [{ id: 'v-orchid', name: 'Orchid Hall' }, { id: 'v-jasmine', name: 'Jasmine Hall' }] } });
  });
  return state;
}

async function openDecision(page: Page) {
  await page.goto('/venue/bookings');
  await page.getByRole('link', { name: 'Planning Phase Gala' }).click();
  await page.getByRole('link', { name: 'Decide on request' }).click();
}

test('TC_E06S04_01: approving a pending request confirms it and tells Venue Staff the Coordinator was notified', async ({ page }) => {
  const state = await venueStaff(page);
  await openDecision(page);
  await page.getByRole('button', { name: 'Approve…' }).click();
  await expect(page.getByRole('form', { name: 'Approve this booking request?' })).toContainText('shows it on its calendar');
  await page.getByRole('button', { name: 'Approve request' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Approved. The booking is confirmed. Coordinator A has been notified.' })).toBeVisible();
  expect(state.posts).toEqual([{ action: 'decide', booking_id: 'b-1', decision: 'approve' }]);
  await page.getByRole('link', { name: 'View request' }).click();
  await expect(page.getByText('Confirmed').first()).toBeVisible();
  await expect(page.getByText('Venue Staff A')).toBeVisible();
});

test('TC_E06S04_02: rejecting records the reason and a suggested venue, and both show on the request', async ({ page }) => {
  const state = await venueStaff(page);
  await openDecision(page);
  await page.getByRole('button', { name: 'Reject…' }).click();
  const panel = page.getByRole('form', { name: 'Reject this booking request?' });
  await expect(panel.getByRole('option', { name: 'Jasmine Hall' })).toBeAttached();
  await expect(panel.getByRole('option', { name: 'Orchid Hall' })).toHaveCount(0);
  await panel.getByLabel('Suggest another venue (optional)').selectOption('v-jasmine');
  await panel.getByLabel('Reason (required)').fill(REASON);
  await panel.getByRole('button', { name: 'Reject request' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Rejected. Coordinator A has been notified, with your reason.' })).toBeVisible();
  expect(state.posts).toEqual([{ action: 'decide', booking_id: 'b-1', decision: 'reject', reason: REASON, suggested_venue_id: 'v-jasmine' }]);
  await page.getByRole('link', { name: 'View request' }).click();
  await expect(page.getByText(REASON)).toBeVisible();
  await expect(page.getByText('Jasmine Hall')).toBeVisible();
});

test('TC_E06S04_03: rejecting without a reason is blocked and nothing is sent', async ({ page }) => {
  const state = await venueStaff(page);
  await openDecision(page);
  await page.getByRole('button', { name: 'Reject…' }).click();
  const panel = page.getByRole('form', { name: 'Reject this booking request?' });
  await panel.getByRole('button', { name: 'Reject request' }).click();

  await expect(panel).toContainText('Add a reason for rejecting this request.');
  expect(state.posts).toEqual([]);
  await expect(page.getByRole('status').filter({ hasText: /Rejected\. Coordinator A has been notified/ })).toHaveCount(0);
});

test('TC_E06S04_04: an approval blocked by a buffered clash names the booking in the way', async ({ page }) => {
  const state = await venueStaff(page, { clash: true });
  await openDecision(page);
  await page.getByRole('button', { name: 'Approve…' }).click();
  await page.getByRole('button', { name: 'Approve request' }).click();

  await expect(page.getByRole('alert')).toContainText(CLASH);
  expect(state.posts).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Approve…' })).toBeDisabled();
});

// Coordinator side (T-75): the assigned Coordinator reads the decision in the
// event Activity log, as a booking change rather than an event status change.
async function coordinatorWithActivity(page: Page, decision: { action: string; to: string }) {
  await signInAs(page, 'event_coordinator');
  const event = {
    id: 'e-1', event_code: 'EVT-3003', title: 'EVT-3003 Planning Phase Gala', status: 'planning', status_changed_at: '2026-10-01T01:00:00.000Z',
    starts_at: '2026-10-25T10:00:00.000Z', ends_at: '2026-10-25T14:00:00.000Z', expected_attendance: 120, coordinator_assigned_at: '2026-09-07T01:00:00.000Z',
    organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com', description: null, purpose: null,
    venue_requirements: null, accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'test-event_coordinator', coordinator_name: 'Coordinator A', pendingReassignment: null, outstandingQuestions: [],
    activityLog: [{
      occurred_at: '2026-10-15T02:00:00.000Z', action: decision.action, field_changed: 'status', old_value: 'pending', new_value: decision.to,
      actor_name: 'Venue Staff A', entity_type: 'venue_booking', venue_name: 'Orchid Hall',
    }],
  };
  const support = { event: {}, requests: [], noSupportRequired: false, canEdit: true };
  await page.route('**/api/venues**', route => route.fulfill({ json: support }));
  await page.route('**/api/events**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.searchParams.get('task') === 'support' ? support : { event } });
  });
  await page.goto('/coordinator/events/EVT-3003');
  // Phones hide the header row, so find the entry by its text, not its position.
  return page.getByRole('table', { name: 'Changes to this event, oldest first' }).getByRole('row');
}

test('TC_E06S04_05: the Coordinator sees an approval in the Activity log with who, what and when', async ({ page }) => {
  const rows = await coordinatorWithActivity(page, { action: 'Booking Approved', to: 'confirmed' });
  const row = rows.filter({ hasText: 'Booking approved' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Booking approved');
  await expect(row).toContainText('Orchid Hall: Pending → Confirmed');
  await expect(row).toContainText('Venue Staff A');
  await expect(row).toContainText('15 Oct 2026');
  await expect(row).not.toContainText('Status changed');
});

test('TC_E06S04_06: the Coordinator sees a rejection in the Activity log with who, what and when', async ({ page }) => {
  const rows = await coordinatorWithActivity(page, { action: 'Booking Rejected', to: 'rejected' });
  const row = rows.filter({ hasText: 'Booking rejected' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Booking rejected');
  await expect(row).toContainText('Orchid Hall: Pending → Rejected');
  await expect(row).toContainText('Venue Staff A');
  await expect(row).toContainText('15 Oct 2026');
});

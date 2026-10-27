// E05-S06 (SCRUM-152) Scenario 3: the venue-conflict flag on the assigned
// Coordinator's event page, against a stubbed fetch shaped like the backend's
// GET /api/venues?mode=booking_requests reply (bookingRequests.ts). The server
// decides which bookings are Conflicting and who may read them; these tests
// check the page names each lost venue with its category, links to the
// details, and stays quiet when there is nothing to flag or the list is refused.
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { RequestDetail } from './CoordinatorWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const EVENT = 'GET /api/events?assigned=1&id=EVT-TECH';
const BOOKINGS = 'GET /api/venues?mode=booking_requests&event_id=EVT-TECH';

function detail(status = 'planning') {
  return { event: {
    id: 'evt-1', event_code: 'EVT-TECH', title: 'Tech Conference 2027', status,
    status_changed_at: '2026-10-01T01:00:00.000Z', starts_at: '2027-01-15T01:00:00.000Z', ends_at: '2027-01-15T09:00:00.000Z',
    expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A',
    organiser_email: 'organiser_a@clienta.com', description: 'Annual conference', purpose: null, venue_requirements: null,
    accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'c-a', coordinator_name: 'Coordinator A', pendingReassignment: null, outstandingQuestions: [],
  } };
}

const booking = (id: string, venue: string, status: string, category: string | null = null) => ({
  id, venue_id: `v-${id}`, venue_name: venue, location: 'Campus', status, starts_at: '2027-01-15T01:00:00.000Z',
  ends_at: '2027-01-15T09:00:00.000Z', created_at: '2026-10-01T01:00:00.000Z', decision_reason: null, conflict_reason_category: category,
});

function bookings(list: unknown[]) {
  return { event: { id: 'evt-1', event_code: 'EVT-TECH', title: 'Tech Conference 2027', status: 'planning' }, bookings: list };
}

function renderAt(path = '/coordinator/events/EVT-TECH') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('TC_E05S06_02 Scenario 3: the event page flags each venue lost to an unavailability with its reason category', async () => {
  const calls = stubApi({
    [EVENT]: { body: detail('planning') },
    [BOOKINGS]: { body: bookings([
      booking('a', 'Riverside Hall', 'conflicting', 'safety_concern'),
      booking('b', 'Studio', 'confirmed'),
      booking('c', 'Annex', 'conflicting'),
    ]) },
  }, { role: 'event_coordinator' });
  renderAt();

  const flag = (await screen.findByText('Venue unavailable')).closest('[role="alert"]') as HTMLElement;
  const venues = within(flag).getByRole('list', { name: 'Venues no longer available' });
  expect(within(venues).getAllByRole('listitem').map(item => item.textContent?.trim())).toEqual(['Riverside Hall — Safety concern', 'Annex']);
  expect(flag).toHaveTextContent('Alternative arrangements are required.');
  expect(within(flag).getByRole('link', { name: 'View venue bookings' })).toHaveAttribute('href', '/coordinator/events/EVT-TECH/venue-bookings');
  expect(calls.some(call => call.url.searchParams.get('mode') === 'booking_requests')).toBe(true);
});

test('no flag when no booking is Conflicting', async () => {
  stubApi({
    [EVENT]: { body: detail('confirmed') },
    [BOOKINGS]: { body: bookings([booking('b', 'Studio', 'confirmed')]) },
  }, { role: 'event_coordinator' });
  renderAt();
  await screen.findByRole('heading', { name: 'Tech Conference 2027' });
  await screen.findByText(/Confirmed since/);
  expect(screen.queryByText('Venue unavailable')).not.toBeInTheDocument();
});

test('a refused booking list shows no flag and no error', async () => {
  stubApi({
    [EVENT]: { body: detail('approved') },
    [BOOKINGS]: { status: 403, body: { error: 'Access denied.' } },
  }, { role: 'event_coordinator' });
  renderAt();
  await screen.findByText(/Approved since/);
  expect(screen.queryByText('Venue unavailable')).not.toBeInTheDocument();
  expect(screen.queryByText('Access denied.')).not.toBeInTheDocument();
});

test('an event past the stages where a venue can be lost does not ask for its bookings', async () => {
  const calls = stubApi({ [EVENT]: { body: detail('completed') } }, { role: 'event_coordinator' });
  renderAt();
  await screen.findByText(/Completed since/);
  expect(calls.some(call => call.url.searchParams.get('mode') === 'booking_requests')).toBe(false);
});

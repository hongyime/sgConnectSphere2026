// E08-S04 Scenario 4 (SCRUM-243): Venue Staff reconfirm a flagged Confirmed
// booking from the Booking requests page.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi, type FakeReply } from '../../testing/fakeApi';
import { BookingsToReconfirm } from './BookingReconfirmation';
import { BookingRequests } from './BookingRequests';
import type { BookingRequest } from './bookingDecisionApi';
import { formatDateRange } from '../../shared';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const OLD = { startsAt: '2027-01-15T02:00:00.000Z', endsAt: '2027-01-15T04:00:00.000Z' };
const NEW = { startsAt: '2027-01-20T02:00:00.000Z', endsAt: '2027-01-20T04:00:00.000Z' };

function flagged(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    id: 'b-1', status: 'confirmed', ...OLD, reconfirmFor: NEW, requiresReconfirmation: true,
    venue: { id: 'v-small', name: 'Small Room' },
    event: { id: 'e-1', code: 'EVT-6001', title: 'Product Expo 2026', expectedAttendance: 150, coordinatorName: 'Coordinator A' },
    decisionReason: null, suggestedVenue: null, decidedBy: 'Venue Staff A', decidedAt: '2026-12-01T00:00:00.000Z', requestedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

// The list answers in turn: what is waiting first, then after a reconfirmation.
function stubList(...lists: BookingRequest[][]) {
  return (): FakeReply => ({ body: { bookings: lists.length > 1 ? lists.shift() : lists[0] } });
}

// ErrorState links back to the dashboard, so the section sits in a router as on the page.
const show = () => render(<MemoryRouter><BookingsToReconfirm /></MemoryRouter>);
const table = () => screen.findByRole('table', { name: 'Confirmed bookings to reconfirm, soonest first' });

test('the list shows each flagged booking with its booked time and the time it would move to', async () => {
  stubApi({ 'GET /api/venues?bookings=reconfirm': stubList([flagged(), flagged({ id: 'b-2', reconfirmFor: OLD, venue: { id: 'v-hall', name: 'Riverside Hall' }, event: { ...flagged().event, code: null, coordinatorName: null } })]) }, { role: 'venue_staff' });
  show();
  const rows = within(await table()).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Product Expo 2026');
  expect(rows[0]).toHaveTextContent(`Small Room${formatDateRange(OLD.startsAt, OLD.endsAt)}${formatDateRange(NEW.startsAt, NEW.endsAt)}Coordinator A`);
  // A capacity-only flag keeps the time, and an unassigned event says so.
  expect(rows[1]).toHaveTextContent('No code');
  expect(rows[1]).toHaveTextContent('Same time');
  expect(rows[1]).toHaveTextContent('Not yet assigned');
});

test('reconfirming asks first, then says who was told and that the reverted event is back in Safety Review', async () => {
  const calls = stubApi({
    'GET /api/venues?bookings=reconfirm': stubList([flagged()], []),
    'POST /api/venues': { body: { booking: flagged({ requiresReconfirmation: false }), coordinatorNotified: true, enteredSafetyReview: true } },
  }, { role: 'venue_staff' });
  show();
  fireEvent.click(within(await table()).getByRole('button', { name: 'Reconfirm Small Room for Product Expo 2026' }));
  const panel = screen.getByRole('form', { name: 'Reconfirm this booking?' });
  expect(panel).toHaveTextContent(`Small Room moves from ${formatDateRange(OLD.startsAt, OLD.endsAt)} to ${formatDateRange(NEW.startsAt, NEW.endsAt)} for "Product Expo 2026". It no longer needs reconfirmation, and the Coordinator is notified.`);
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);

  fireEvent.click(within(panel).getByRole('button', { name: 'Reconfirm booking' }));

  expect(await screen.findByText(`Reconfirmed Small Room for "Product Expo 2026" (${formatDateRange(NEW.startsAt, NEW.endsAt)}). The Coordinator was notified. All its arrangements are confirmed again, so the event is now in Safety Review.`)).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ action: 'reconfirm', booking_id: 'b-1' });
  expect(await screen.findByText(/^Nothing to reconfirm\./)).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Reconfirm this booking?' })).not.toBeInTheDocument();
});

test('a booking kept at the same time says so, and an event without a Coordinator or other outstanding work says that', async () => {
  stubApi({
    'GET /api/venues?bookings=reconfirm': stubList([flagged({ reconfirmFor: undefined })], []),
    'POST /api/venues': { body: { booking: flagged(), coordinatorNotified: false, enteredSafetyReview: false } },
  }, { role: 'venue_staff' });
  show();
  fireEvent.click(within(await table()).getByRole('button', { name: /^Reconfirm Small Room/ }));
  const panel = screen.getByRole('form', { name: 'Reconfirm this booking?' });
  expect(panel).toHaveTextContent(`Small Room stays booked for ${formatDateRange(OLD.startsAt, OLD.endsAt)}`);
  fireEvent.click(within(panel).getByRole('button', { name: 'Reconfirm booking' }));
  const done = await screen.findByText(/^Reconfirmed Small Room/);
  expect(done).toHaveTextContent('The event has no Coordinator to notify yet.');
  expect(done).not.toHaveTextContent('Safety Review');
});

test('a refused reconfirmation shows the reason in the panel and keeps the booking listed', async () => {
  const refusal = 'This can\'t be reconfirmed: Small Room is blocked for "Roof repair" (20 Jan 2027).';
  stubApi({
    'GET /api/venues?bookings=reconfirm': stubList([flagged()]),
    'POST /api/venues': { status: 409, body: { error: refusal } },
  }, { role: 'venue_staff' });
  show();
  fireEvent.click(within(await table()).getByRole('button', { name: /^Reconfirm Small Room/ }));
  const panel = screen.getByRole('form', { name: 'Reconfirm this booking?' });
  fireEvent.click(within(panel).getByRole('button', { name: 'Reconfirm booking' }));
  expect(await within(panel).findByText(refusal)).toBeInTheDocument();
  expect(screen.queryByText(/^Reconfirmed/)).not.toBeInTheDocument();
  expect(within(await table()).getAllByRole('row')).toHaveLength(2);
});

test('cancelling closes the panel and sends nothing; choosing again clears the last result', async () => {
  const calls = stubApi({
    'GET /api/venues?bookings=reconfirm': stubList([flagged(), flagged({ id: 'b-2', venue: { id: 'v-hall', name: 'Riverside Hall' } })]),
    'POST /api/venues': { body: { booking: flagged(), coordinatorNotified: true, enteredSafetyReview: false } },
  }, { role: 'venue_staff' });
  show();
  fireEvent.click(within(await table()).getByRole('button', { name: /^Reconfirm Small Room/ }));
  fireEvent.click(within(screen.getByRole('form', { name: 'Reconfirm this booking?' })).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('form', { name: 'Reconfirm this booking?' })).not.toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);

  fireEvent.click(within(await table()).getByRole('button', { name: /^Reconfirm Small Room/ }));
  fireEvent.click(within(screen.getByRole('form', { name: 'Reconfirm this booking?' })).getByRole('button', { name: 'Reconfirm booking' }));
  expect(await screen.findByText(/^Reconfirmed Small Room/)).toBeInTheDocument();
  fireEvent.click(within(await table()).getByRole('button', { name: /^Reconfirm Riverside Hall/ }));
  expect(screen.queryByText(/^Reconfirmed Small Room/)).not.toBeInTheDocument();
});

test('the Reconfirm buttons are disabled while a reconfirmation is being saved', async () => {
  const held = deferred<FakeReply>();
  stubApi({
    'GET /api/venues?bookings=reconfirm': stubList([flagged()], []),
    'POST /api/venues': () => held.promise,
  }, { role: 'venue_staff' });
  show();
  fireEvent.click(within(await table()).getByRole('button', { name: /^Reconfirm Small Room/ }));
  fireEvent.click(within(screen.getByRole('form', { name: 'Reconfirm this booking?' })).getByRole('button', { name: 'Reconfirm booking' }));
  expect(within(await table()).getByRole('button', { name: /^Reconfirm Small Room/ })).toBeDisabled();
  await act(async () => { held.resolve({ body: { booking: flagged(), coordinatorNotified: true, enteredSafetyReview: false } }); });
  expect(await screen.findByText(/^Reconfirmed Small Room/)).toBeInTheDocument();
});

test('an empty list and a failed load each say so', async () => {
  stubApi({ 'GET /api/venues?bookings=reconfirm': { body: { bookings: [] } } }, { role: 'venue_staff' });
  show();
  expect(await screen.findByText('Nothing to reconfirm. When a change to a confirmed event affects one of your bookings, it appears here.')).toBeInTheDocument();
  cleanup();
  stubApi({ 'GET /api/venues?bookings=reconfirm': { status: 403, body: { error: 'Access denied. Only Venue Staff can decide on booking requests.' } } }, { role: 'event_coordinator' });
  show();
  expect(await screen.findByText('Access denied. Only Venue Staff can decide on booking requests.')).toBeInTheDocument();
});

test('the Booking requests page shows the bookings to reconfirm under the pending requests', async () => {
  stubApi({
    'GET /api/venues?bookings=pending': { body: { bookings: [] } },
    'GET /api/venues?bookings=reconfirm': stubList([flagged()]),
  }, { role: 'venue_staff' });
  render(<MemoryRouter><BookingRequests /></MemoryRouter>);
  expect(await screen.findByText('No booking requests waiting')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Bookings to reconfirm' })).toBeInTheDocument();
  expect(within(await table()).getByText('Product Expo 2026')).toBeInTheDocument();
});

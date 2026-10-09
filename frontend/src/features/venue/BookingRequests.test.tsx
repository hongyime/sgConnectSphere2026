// E06-S04 (SCRUM-48) Venue Staff screens: the pending queue, one booking
// request with its decision, and the approve-or-reject page (Scenarios 1 to 3).
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi } from '../../testing/fakeApi';
import { BookingDecision, BookingDetail, BookingRequests } from './BookingRequests';
import type { BookingRequest } from './bookingDecisionApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function booking(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    id: 'b-1', status: 'pending', startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T14:00:00.000Z',
    venue: { id: 'v-orchid', name: 'Orchid Hall' },
    event: { id: 'e-1', code: 'EVT-3003', title: 'Planning Phase Gala', expectedAttendance: 120, coordinatorName: 'Coordinator A' },
    decisionReason: null, suggestedVenue: null, decidedBy: null, decidedAt: null, requestedAt: '2026-10-01T01:00:00.000Z',
    ...overrides,
  };
}

const venues = { venues: [
  { id: 'v-orchid', name: 'Orchid Hall' }, { id: 'v-jasmine', name: 'Jasmine Hall' }, { id: 'v-lotus', name: 'Lotus Room' },
] };

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/venue/bookings" element={<BookingRequests />} />
        <Route path="/venue/bookings/:bookingId" element={<BookingDetail />} />
        <Route path="/venue/bookings/:bookingId/decide" element={<BookingDecision />} />
      </Routes>
    </MemoryRouter>,
  );
}

// --- Queue ----------------------------------------------------------------

test('Venue Staff see pending booking requests, each linking to its request', async () => {
  stubApi({ 'GET /api/venues?bookings=pending': { body: { bookings: [booking(), booking({ id: 'b-2', event: { ...booking().event, code: null, title: 'Unassigned Expo', coordinatorName: null } })] } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings');
  const table = await screen.findByRole('table', { name: 'Pending booking requests, soonest first' });
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Orchid Hall');
  expect(rows[0]).toHaveTextContent('Coordinator A');
  expect(within(rows[0]!).getByRole('link', { name: 'Planning Phase Gala' })).toHaveAttribute('href', '/venue/bookings/b-1');
  expect(rows[1]).toHaveTextContent('No code');
  expect(rows[1]).toHaveTextContent('Not yet assigned');
});

test('an empty queue says nothing is waiting', async () => {
  stubApi({ 'GET /api/venues?bookings=pending': { body: { bookings: [] } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings');
  expect(await screen.findByText('No booking requests waiting')).toBeInTheDocument();
});

test('a refused queue shows the server message', async () => {
  stubApi({ 'GET /api/venues?bookings=pending': { status: 403, body: { error: 'Access denied. Only Venue Staff can decide on booking requests.' } } }, { role: 'event_coordinator' });
  renderAt('/venue/bookings');
  expect(await screen.findByText(/Only Venue Staff can decide on booking requests/)).toBeInTheDocument();
});

// --- One request ----------------------------------------------------------

test('a pending request shows its details and a way to decide', async () => {
  stubApi({ 'GET /api/venues?booking=b-1': { body: { booking: booking() } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1');
  expect(await screen.findByRole('heading', { name: 'Planning Phase Gala' })).toBeInTheDocument();
  expect(screen.getByText('Pending')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Decide on request' })).toHaveAttribute('href', '/venue/bookings/b-1/decide');
  expect(screen.queryByRole('heading', { name: 'Decision' })).toBeNull();
});

test('a rejected request shows who decided, the reason and the suggested venue', async () => {
  stubApi({ 'GET /api/venues?booking=b-1': { body: { booking: booking({
    status: 'rejected', decisionReason: 'Capacity too small', suggestedVenue: { id: 'v-jasmine', name: 'Jasmine Hall' },
    decidedBy: 'Venue Staff A', decidedAt: '2026-10-09T02:00:00.000Z',
  }) } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1');
  const decision = (await screen.findByRole('heading', { name: 'Decision' })).closest('section') as HTMLElement;
  expect(decision).toHaveTextContent('Venue Staff A');
  expect(decision).toHaveTextContent('Capacity too small');
  expect(decision).toHaveTextContent('Jasmine Hall');
  expect(screen.queryByRole('link', { name: 'Decide on request' })).toBeNull();
});

test('a rejected request with no reason or suggestion on record says so', async () => {
  stubApi({ 'GET /api/venues?booking=b-1': { body: { booking: booking({ status: 'rejected', decidedBy: 'Venue Staff A' }) } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1');
  const decision = (await screen.findByRole('heading', { name: 'Decision' })).closest('section') as HTMLElement;
  expect(decision).toHaveTextContent('None recorded');
  expect(decision).toHaveTextContent('None suggested');
});

test('a confirmed request shows its decision without a reason, and missing facts read as not recorded', async () => {
  stubApi({ 'GET /api/venues?booking=b-1': { body: { booking: booking({
    status: 'confirmed', decidedBy: null, decidedAt: null,
    event: { ...booking().event, code: null, expectedAttendance: null, coordinatorName: null },
  }) } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1');
  const decision = (await screen.findByRole('heading', { name: 'Decision' })).closest('section') as HTMLElement;
  expect(decision).toHaveTextContent('Not recorded');
  expect(decision).not.toHaveTextContent('Reason');
  expect(screen.getByText('Confirmed')).toBeInTheDocument();
  expect(screen.getByText('None recorded')).toBeInTheDocument();
});

test('an unknown request shows the server message and a way back', async () => {
  stubApi({ 'GET /api/venues?booking=missing': { status: 404, body: { error: 'Booking not found.' } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/missing');
  expect(await screen.findByRole('heading', { name: 'Booking request unavailable' })).toBeInTheDocument();
});

test('a late answer for the previous request never replaces the current one', async () => {
  const first = deferred<{ status: number; body: unknown }>();
  stubApi({
    'GET /api/venues?booking=b-1': () => first.promise,
    'GET /api/venues?booking=b-2': { body: { booking: booking({ id: 'b-2', event: { ...booking().event, title: 'Second Event' } }) } },
  }, { role: 'venue_staff' });
  let go: (path: string) => void = () => {};
  function Navigator() { go = useNavigate(); return null; }
  render(
    <MemoryRouter initialEntries={['/venue/bookings/b-1']}>
      <Navigator />
      <Routes><Route path="/venue/bookings/:bookingId" element={<BookingDetail />} /></Routes>
    </MemoryRouter>,
  );
  act(() => go('/venue/bookings/b-2'));
  expect(await screen.findByRole('heading', { name: 'Second Event' })).toBeInTheDocument();
  await act(async () => { first.resolve({ status: 200, body: { booking: booking() } }); await first.promise; });
  expect(screen.getByRole('heading', { name: 'Second Event' })).toBeInTheDocument();
});

// --- Decide ---------------------------------------------------------------

test('TC_E06S04_01: approving asks for confirmation, then shows the booking is confirmed', async () => {
  let current = booking();
  const calls = stubApi({
    'GET /api/venues?booking=b-1': () => ({ body: { booking: current } }),
    'POST /api/venues': () => { current = booking({ status: 'confirmed', decidedBy: 'Venue Staff A' }); return { body: { booking: current, coordinatorNotified: true } }; },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  const panel = screen.getByRole('form', { name: 'Approve this booking request?' });
  expect(panel).toHaveTextContent('The booking becomes Confirmed');
  fireEvent.click(within(panel).getByRole('button', { name: 'Approve request' }));

  expect(await screen.findByText('Approved. The booking is confirmed. Coordinator A has been notified.')).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ action: 'decide', booking_id: 'b-1', decision: 'approve' });
  expect(await screen.findByText('Confirmed')).toBeInTheDocument();
  expect(screen.queryByText(/so there's nothing to decide/)).toBeNull();
  expect(screen.getByRole('link', { name: 'View request' })).toHaveAttribute('href', '/venue/bookings/b-1');
});

test('TC_E06S04_02: rejecting sends the reason and the suggested venue, and says the Coordinator has both', async () => {
  const calls = stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?q=': { body: venues },
    'POST /api/venues': { body: { booking: booking({ status: 'rejected' }), coordinatorNotified: true } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  const panel = screen.getByRole('form', { name: 'Reject this booking request?' });
  const select = within(panel).getByLabelText('Suggest another venue (optional)');
  await within(panel).findByRole('option', { name: 'Jasmine Hall' });
  // The requested venue is not offered as its own alternative.
  expect(within(panel).queryByRole('option', { name: 'Orchid Hall' })).toBeNull();
  fireEvent.change(select, { target: { value: 'v-jasmine' } });
  fireEvent.change(within(panel).getByLabelText('Reason (required)'), { target: { value: '  Capacity too small  ' } });
  fireEvent.click(within(panel).getByRole('button', { name: 'Reject request' }));

  expect(await screen.findByText('Rejected. Coordinator A has been notified, with your reason.')).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({
    action: 'decide', booking_id: 'b-1', decision: 'reject', reason: 'Capacity too small', suggested_venue_id: 'v-jasmine',
  });
});

test('TC_E06S04_02: a rejection without a suggestion sends none', async () => {
  const calls = stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?q=': { body: venues },
    'POST /api/venues': { body: { booking: booking({ status: 'rejected' }), coordinatorNotified: true } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: 'Venue closed that week' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
  await screen.findByText(/^Rejected\./);
  expect((calls.find(call => call.method === 'POST')?.body as Record<string, unknown>).suggested_venue_id).toBeNull();
});

test('TC_E06S04_03: rejecting without a reason is blocked before anything is sent', async () => {
  const calls = stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?q=': { body: venues },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
  expect(await screen.findByText('Add a reason for rejecting this request.')).toBeInTheDocument();
  expect(calls.some(call => call.method === 'POST')).toBe(false);
});

test('the server\'s field messages are shown in the panel', async () => {
  stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?q=': { body: venues },
    'POST /api/venues': { status: 400, body: { error: 'validation_failed', errors: { suggested_venue_id: ['Choose an active venue from the list.'] } } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: 'Too small' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose an active venue from the list.');
});

test('a request someone else has just decided shows the server refusal, and cancelling clears it', async () => {
  stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'POST /api/venues': { status: 409, body: { error: 'This request has already been decided, so it can no longer be changed.' } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already been decided');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Approve…' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('a decision on an event with no Coordinator says nobody was notified', async () => {
  stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?q=': { body: venues },
    'POST /api/venues': { body: { booking: booking({ status: 'rejected' }), coordinatorNotified: false } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: 'Too small' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
  expect(await screen.findByText('Rejected. No Coordinator is assigned yet, so nobody was notified.')).toBeInTheDocument();
});

test('the approval message falls back when the Coordinator name is missing', async () => {
  stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking({ event: { ...booking().event, coordinatorName: null } }) } },
    'POST /api/venues': { body: { booking: booking({ status: 'confirmed' }), coordinatorNotified: true } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve request' }));
  expect(await screen.findByText('Approved. The booking is confirmed. The Coordinator has been notified.')).toBeInTheDocument();
});

test('when the venue list cannot load, the reason can still be sent without a suggestion', async () => {
  stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?q=': { status: 500, body: { error: 'Service unavailable. Please try again.' } },
  }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  expect(await screen.findByText("Couldn't load venues. You can still reject without a suggestion.")).toBeInTheDocument();
  expect(screen.getByLabelText('Suggest another venue (optional)')).toBeDisabled();
});

test('a request that is no longer pending has nothing to decide', async () => {
  stubApi({ 'GET /api/venues?booking=b-1': { body: { booking: booking({ status: 'rejected' }) } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/b-1/decide');
  expect(await screen.findByText("This request is rejected, so there's nothing to decide.")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve…' })).toBeNull();
});

test('an unknown request on the decision page shows the server message', async () => {
  stubApi({ 'GET /api/venues?booking=missing': { status: 404, body: { error: 'Booking not found.' } } }, { role: 'venue_staff' });
  renderAt('/venue/bookings/missing/decide');
  expect(await screen.findByText('Booking not found.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Decide on a booking request' })).toBeInTheDocument();
});

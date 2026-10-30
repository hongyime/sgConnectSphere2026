import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { stubApi } from '../../testing/fakeApi';
import type { BookingRequest } from '../venue/bookingDecisionApi';
import { BookingDecision as VenueBookingDecisions } from '../venue/BookingRequests';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function booking(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    id: 'b-1', status: 'pending', startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T12:00:00.000Z',
    venue: { id: 'v-orchid', name: 'Orchid Hall' },
    event: { id: 'e-1', code: 'EVT-1001', title: 'Planning Event', expectedAttendance: 100, coordinatorName: 'Coordinator A' },
    decisionReason: null, suggestedVenue: null, decidedBy: null, decidedAt: null, requestedAt: '2026-10-01T01:00:00.000Z',
    ...overrides,
  };
}

const venue = { venue: {
  id: 'v-orchid', name: 'Orchid Hall', location: 'Singapore', max_capacity: 200, opens_at: '08:00', closes_at: '22:00',
  facilities: [], accessibility_features: [], supported_layouts: [], setup_time_minutes: 0, turnaround_time_minutes: 0,
} };

function calendar(entries: unknown[] = []) {
  return { venue: { id: 'v-orchid', name: 'Orchid Hall', opens_at: '08:00', closes_at: '22:00', is_active: true },
    from: '2026-10-25', to: '2026-10-25', timezone: 'Asia/Singapore', entries };
}

function ownEntry() {
  return { kind: 'booking', state: 'tentative', start: booking().startsAt, end: booking().endsAt,
    event: { id: booking().event.id, code: booking().event.code, title: booking().event.title } };
}

function renderDecision() {
  render(<MemoryRouter initialEntries={['/venue/bookings/b-1/decide']}>
    <Routes><Route path="/venue/bookings/:bookingId/decide" element={<VenueBookingDecisions />} /></Routes>
  </MemoryRouter>);
}

function stubDecision(entries: unknown[] = [], post: { status?: number; body?: unknown } = { body: { booking: booking({ status: 'confirmed' }), coordinatorNotified: true } }) {
  return stubApi({
    'GET /api/venues?booking=b-1': { body: { booking: booking() } },
    'GET /api/venues?id=v-orchid&calendar=1&from=2026-10-25&to=2026-10-25': { body: calendar(entries) },
    'GET /api/venues?id=v-orchid': { body: venue },
    'POST /api/venues': post,
  }, { role: 'venue_staff' });
}

describe('VenueBookingDecisions (SCRUM-50 / E06-S06)', () => {
  it('warns and disables approval for an overlapping confirmed booking while leaving rejection available', async () => {
    stubDecision([ownEntry(), {
      kind: 'booking', state: 'confirmed', start: '2026-10-25T11:00:00Z', end: '2026-10-25T14:00:00Z',
      event: { id: 'e-2', code: 'EVT-2002', title: 'Confirmed Event' },
    }]);
    renderDecision();

    expect(await screen.findByText('Booking Conflict: overlaps with confirmed booking [EVT-2002]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject…' })).toBeEnabled();
  });

  it('warns and disables approval for an overlapping active hold', async () => {
    stubDecision([ownEntry(), {
      kind: 'booking', state: 'tentative', start: '2026-10-25T09:00:00Z', end: '2026-10-25T10:30:00Z',
      event: { id: 'e-2', code: 'EVT-2002', title: 'Held Event' },
    }]);
    renderDecision();

    expect(await screen.findByText('Booking Conflict: overlaps with active booking or hold [EVT-2002]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve…' })).toBeDisabled();
  });

  it('allows approval when the calendar has no overlap', async () => {
    const calls = stubDecision([ownEntry(), {
      kind: 'booking', state: 'confirmed', start: booking().endsAt, end: '2026-10-25T14:00:00Z',
      event: { id: 'e-2', code: 'EVT-2002', title: 'Later Event' },
    }]);
    renderDecision();

    const approve = await screen.findByRole('button', { name: 'Approve…' });
    expect(approve).toBeEnabled();
    fireEvent.click(approve);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve request' }));
    expect(await screen.findByText('Approved. The booking is confirmed. Coordinator A has been notified.')).toBeInTheDocument();
    expect(calls.some(call => call.method === 'POST')).toBe(true);
  });

  it('shows availability-check failure without hiding server-side approval protection', async () => {
    stubApi({
      'GET /api/venues?booking=b-1': { body: { booking: booking() } },
      'GET /api/venues?id=v-orchid': { status: 500, body: { error: 'Venue unavailable.' } },
    }, { role: 'venue_staff' });
    renderDecision();

    expect(await screen.findByText('Availability could not be checked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve…' })).toBeEnabled();
  });

  it('reports an unavailable calendar and leaves approval to the server', async () => {
    stubApi({
      'GET /api/venues?booking=b-1': { body: { booking: booking() } },
      'GET /api/venues?id=v-orchid&calendar=1&from=2026-10-25&to=2026-10-25': { body: { venue: venue.venue } },
      'GET /api/venues?id=v-orchid': { body: venue },
    }, { role: 'venue_staff' });
    renderDecision();

    expect(await screen.findByText('Availability could not be checked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve…' })).toBeEnabled();
  });

  it('keeps a non-venue 409 message in the confirmation panel', async () => {
    const message = 'The request is no longer pending.';
    stubDecision([ownEntry()], { status: 409, body: { error: message } });
    renderDecision();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve request' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve request' })).toBeInTheDocument();
  });

  it('does not show availability conflicts for a decided booking', async () => {
    stubApi({ 'GET /api/venues?booking=b-1': { body: { booking: booking({ status: 'confirmed' }) } } }, { role: 'venue_staff' });
    renderDecision();

    expect(await screen.findByText('This request is confirmed, so there\'s nothing to decide.')).toBeInTheDocument();
    expect(screen.queryByText('Booking Conflict')).not.toBeInTheDocument();
  });

  it('skips an availability query when a venue buffer exceeds the calendar date range', async () => {
    const calls = stubApi({
      'GET /api/venues?booking=b-1': { body: { booking: booking() } },
      'GET /api/venues?id=v-orchid': { body: { venue: { ...venue.venue, setup_time_minutes: Number.MAX_SAFE_INTEGER } } },
    }, { role: 'venue_staff' });
    renderDecision();

    expect(await screen.findByText('Availability could not be checked')).toBeInTheDocument();
    expect(calls.some(call => call.url.searchParams.has('calendar'))).toBe(false);
  });

  it('keeps a server-detected 409 conflict visible and blocks another approval attempt', async () => {
    const message = 'This venue was just taken for an overlapping time. Reload the request to see what is now in the way.';
    stubDecision([ownEntry()], { status: 409, body: { error: message } });
    renderDecision();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve request' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject…' })).toBeEnabled();
  });
});

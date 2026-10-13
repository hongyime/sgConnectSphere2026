import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { useState } from 'react';
import { VenueBookingRequests } from './VenueBookingRequests';
import { VenueBookingRequestForm, type BookingRequestDraft } from './VenueBookingRequestForm';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const data = { event: { id: 'event', event_code: 'EVT-1', title: 'Assigned Event', status: 'planning' }, bookings: [
  { id: 'one', venue_id: 'v', venue_name: 'Main Hall', location: 'Campus', status: 'pending', starts_at: '2027-01-15T01:00:00Z', ends_at: '2027-01-15T02:00:00Z', decision_reason: null },
  { id: 'two', venue_id: 'v2', venue_name: 'Breakout Room', location: 'Campus', status: 'rejected', starts_at: '2027-01-15T02:00:00Z', ends_at: '2027-01-15T03:00:00Z', decision_reason: 'Room unavailable' },
] };
function mount(path = '/events/EVT-1') {
  render(<MemoryRouter initialEntries={[path]}><Link to="/events/OTHER">Other event</Link><Routes>
    <Route path="/events/:eventCode" element={<VenueBookingRequests />} />
    <Route path="/fallback" element={<VenueBookingRequests />} />
  </Routes></MemoryRouter>);
}
test('TC_E06S03_05: list shows every request status and period without submission controls', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetcher); mount();
  expect(await screen.findByText('Main Hall')).toBeInTheDocument();
  expect(screen.getByText('Breakout Room')).toBeInTheDocument();
  expect(screen.getByText('Pending', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Rejected', { exact: true })).toBeInTheDocument();
  expect(screen.getByText(/Room unavailable/)).toBeInTheDocument();
  expect(screen.getAllByText('Booking period')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /submit|request booking/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Search venues for this event' })).toHaveAttribute('href', '/coordinator/events/EVT-1/venues');
  expect(fetcher.mock.calls[0][0]).toContain('mode=booking_requests&event_id=EVT-1');
});
test('empty list, error retry and missing route parameter use shared states', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'Please retry.' }) })
    .mockResolvedValue({ ok: true, json: async () => ({ ...data, bookings: [] }) }));
  mount('/fallback');
  expect(await screen.findByRole('alert')).toHaveTextContent('Please retry.');
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByText('No venue bookings recorded')).toBeInTheDocument();
});
test('refused access shows no private event details', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Event not found.' }) }));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('Event not found.');
  expect(screen.queryByText('Assigned Event')).not.toBeInTheDocument();
});
test('route change ignores a late response for the previous event', async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; }))
    .mockResolvedValue({ ok: true, json: async () => ({ ...data, event: { ...data.event, title: 'New event' }, bookings: [] }) }));
  mount(); expect(screen.getByText('Loading venue booking requests...')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Other event'));
  expect(await screen.findByText('New event')).toBeInTheDocument();
  await act(async () => resolve({ ok: true, json: async () => data }));
  expect(screen.queryByText('Main Hall')).not.toBeInTheDocument();
});

const draft: BookingRequestDraft = { starts_at: '2027-01-15T09:00', ends_at: '2027-01-15T18:00', purpose: '', headcount: '' };
test('request form preserves optional fields, date edits and advisory failures when reviewed', () => {
  const onReview = vi.fn();
  function Form() {
    const [value, onChange] = useState(draft);
    return <VenueBookingRequestForm value={value} onChange={onChange} onReview={onReview} expectedAttendance={150} mismatches={['Capacity is too low.']} />;
  }
  render(<Form />);
  expect(screen.getByText(/Leave blank to use the event attendance of 150/)).toBeInTheDocument();
  expect(screen.getByText('Capacity is too low.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review request' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Purpose (optional)'), { target: { value: 'Breakout A' } });
  fireEvent.change(screen.getByLabelText('Headcount (optional)'), { target: { value: '80' } });
  fireEvent.change(screen.getByLabelText('Booking start (required)'), { target: { value: '2027-01-15T14:00' } });
  fireEvent.change(screen.getByLabelText('Booking end (required)'), { target: { value: '2027-01-15T16:00' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(onReview).toHaveBeenCalledWith({ starts_at: '2027-01-15T14:00', ends_at: '2027-01-15T16:00', purpose: 'Breakout A', headcount: '80' });
});
test('request form shows server validation and busy state prevents duplicate reviews', () => {
  const onReview = vi.fn();
  render(<VenueBookingRequestForm value={draft} onChange={vi.fn()} onReview={onReview} expectedAttendance={150} busy error="Review failed."
    errors={{ starts_at: ['Bad start.'], ends_at: ['Bad end.'], purpose: ['Too long.'], headcount: ['Invalid count.'], booking_range: ['Outside event.'] }} />);
  for (const text of ['Review failed.', 'Bad start.', 'Bad end.', 'Too long.', 'Invalid count.', 'Outside event.']) expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Reviewing request/ })).toBeDisabled();
  fireEvent.submit(screen.getByRole('form'));
  expect(onReview).not.toHaveBeenCalled();
});

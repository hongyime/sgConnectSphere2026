import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueBookingRequests } from './VenueBookingRequests';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const data = { event: { id: 'event', event_code: 'EVT-1', title: 'Assigned Event', status: 'planning' }, bookings: [
  { id: 'one', venue_id: 'v', venue_name: 'Main Hall', location: 'Campus', status: 'pending', starts_at: '2027-01-15T01:00:00Z', ends_at: '2027-01-15T02:00:00Z', decision_reason: null,
    purpose: 'Main programme', headcount: 120, is_primary: false, suitability_snapshot: { mismatches: ['Event is outside operating hours.'] } },
  { id: 'two', venue_id: 'v2', venue_name: 'Breakout Room', location: 'Campus', status: 'confirmed', starts_at: '2027-01-15T02:00:00Z', ends_at: '2027-01-15T03:00:00Z', decision_reason: 'Room confirmed', is_primary: true },
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
  expect(screen.getByText('Confirmed', { exact: true })).toBeInTheDocument();
  expect(screen.getByText(/Room confirmed/)).toBeInTheDocument();
  expect(screen.getByText('Primary venue')).toBeInTheDocument();
  expect(screen.getByText('Main programme')).toBeInTheDocument();
  expect(screen.getByText('120')).toBeInTheDocument();
  expect(screen.getByText('Event is outside operating hours.')).toBeInTheDocument();
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


test('suggested venue switch prefills a new request and retains the rejected card', async () => {
  const rejected={...data.bookings[0],status:'rejected',decision_reason:'Use another room',suggested_venue_id:'suggested',suggested_venue_name:'Suggested Hall'};
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({...data,bookings:[rejected]})})
    .mockResolvedValueOnce({ok:true,json:async()=>({booking:{id:'new'},suitability:{mismatches:[]}})});
  vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.click(await screen.findByRole('button',{name:'Request suggested venue'}));
  expect(screen.getByLabelText('Purpose (optional)')).toHaveValue('Main programme');
  expect(screen.getByLabelText('Headcount (optional)')).toHaveValue(120);
  expect(screen.getByText('Rejected',{exact:true})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(await screen.findByText('Booking request submitted')).toBeInTheDocument();
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({venue_id:'suggested',replaces_booking_id:'one',purpose:'Main programme',headcount:120});
});

test('existing replacement or ineligible event suppresses the suggested-venue action', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({...data,event:{...data.event,status:'confirmed'},bookings:[{...data.bookings[0],status:'rejected',suggested_venue_id:'suggested',has_replacement:true}]})}));
  mount();expect(await screen.findByText('A replacement request has already been submitted.')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Request suggested venue'})).not.toBeInTheDocument();
});


test('legacy rejected booking prefills blank metadata and uses current event bounds', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({...data,event:{...data.event,starts_at:'2027-01-15T00:00:00Z',ends_at:'2027-01-15T10:00:00Z'},bookings:[{...data.bookings[0],purpose:null,headcount:null,status:'rejected',suggested_venue_id:'suggested'}]})}));
  mount();fireEvent.click(await screen.findByRole('button',{name:'Request suggested venue'}));
  expect(screen.getByLabelText('Purpose (optional)')).toHaveValue('');
  expect(screen.getByLabelText('Headcount (optional)')).toHaveValue(null);
});

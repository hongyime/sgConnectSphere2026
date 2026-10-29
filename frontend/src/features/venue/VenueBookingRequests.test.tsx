import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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


test('suggested venue switch automatically reloads the Pending replacement and retains rejected history', async () => {
  const rejected={...data.bookings[0],status:'rejected',decision_reason:'Use another room',suggested_venue_id:'suggested',suggested_venue_name:'Suggested Hall'};
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({...data,bookings:[rejected]})})
    .mockResolvedValueOnce({ok:true,json:async()=>({booking:{id:'new'},suitability:{mismatches:[]}})})
    .mockResolvedValue({ok:true,json:async()=>({...data,bookings:[{...rejected,has_replacement:true},{...data.bookings[0],id:'new',venue_name:'Suggested Hall'}]})});
  vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.click(await screen.findByRole('button',{name:'Request suggested venue'}));
  expect(screen.getByLabelText('Purpose (optional)')).toHaveValue('Main programme');
  expect(screen.getByLabelText('Headcount (optional)')).toHaveValue(120);
  expect(screen.getByText('Rejected',{exact:true})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(await screen.findByText('Replacement booking request submitted. The new request is Pending.')).toBeInTheDocument();
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({venue_id:'suggested',replaces_booking_id:'one',purpose:'Main programme',headcount:120});
  expect(await screen.findByText('A replacement request has already been submitted.')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Suggested Hall'})).toBeInTheDocument();
  expect(screen.queryByText('Booking request submitted')).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(3);
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

test('TC_E06S03_08 TC_E06S03_09 withdrawal confirms only Pending and refreshes the independent bookings', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ok:true,json:async()=>data})
    .mockResolvedValueOnce({ok:true,json:async()=>({booking:{id:'one',status:'released'},unresolved_venue_ids:[]})})
    .mockResolvedValue({ok:true,json:async()=>({...data,bookings:[{...data.bookings[0],status:'released'},data.bookings[1]]})});
  vi.stubGlobal('fetch',fetcher); mount();
  const withdraw = await screen.findByRole('button',{name:'Withdraw request'});
  expect(screen.getAllByRole('button',{name:'Withdraw request'})).toHaveLength(1);
  fireEvent.click(withdraw);
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(withdraw);
  fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));
  expect(await screen.findByText('Booking request withdrawn. Other bookings are unchanged.')).toBeInTheDocument();
  expect(await screen.findByText('Released',{exact:true})).toBeInTheDocument();
  expect(screen.getByText('Confirmed',{exact:true})).toBeInTheDocument();
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({action:'withdraw_booking',booking_id:'one'});
});

test('TC_E06S03_10 withdrawal conflict keeps the refusal visible and offers a refresh', async () => {
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>data})
    .mockResolvedValueOnce({ok:false,status:409,json:async()=>({error:'Only Pending venue requests can be withdrawn. Refresh the booking list to see its current status.'})})
    .mockResolvedValue({ok:true,json:async()=>({...data,bookings:[{...data.bookings[0],status:'confirmed'}]})});
  vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.click(await screen.findByRole('button',{name:'Withdraw request'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only Pending');
  fireEvent.click(screen.getByRole('button',{name:'Refresh booking list'}));
  await waitFor(() => expect(screen.queryByRole('button',{name:'Withdraw request'})).not.toBeInTheDocument());
  expect(await screen.findByText('Confirmed',{exact:true})).toBeInTheDocument();
});

test('TC_E06S03_12 Released replacement history permits the suggestion control returned by the server', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({...data,bookings:[
    {...data.bookings[0],status:'rejected',suggested_venue_id:'new',has_replacement:false},
    {...data.bookings[1],status:'released',is_primary:false,replaces_booking_id:'one'},
  ]})}));mount();
  expect(await screen.findByRole('button',{name:'Request suggested venue'})).toBeInTheDocument();
  expect(screen.getByText('Released',{exact:true})).toBeInTheDocument();
});

test('a withdrawal in flight disables controls and does not submit twice', async () => {
  let finish!: (response: unknown) => void;
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>data})
    .mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}))
    .mockResolvedValue({ok:true,json:async()=>({...data,bookings:[]})});
  vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.click(await screen.findByRole('button',{name:'Withdraw request'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));
  expect(screen.getByRole('button',{name:'Withdrawing...'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Cancel'})).toBeDisabled();
  fireEvent.submit(screen.getByRole('form',{name:'Withdraw request for Main Hall?'}));
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async()=>finish({ok:true,json:async()=>({booking:{id:'one',status:'released'},unresolved_venue_ids:[]})}));
  expect(await screen.findByText('Booking request withdrawn. Other bookings are unchanged.')).toBeInTheDocument();
});

test('TC_E06S03_07 selects another Confirmed primary and retains booking statuses',async()=>{
  const confirmed={...data.bookings[0],status:'confirmed',is_primary:false};
  const initial={...data,bookings:[confirmed,data.bookings[1]]};
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>initial})
    .mockResolvedValueOnce({ok:true,json:async()=>({booking:{id:'one',status:'confirmed',is_primary:true},replayed:false})})
    .mockResolvedValue({ok:true,json:async()=>({...data,bookings:[{...confirmed,is_primary:true},{...data.bookings[1],is_primary:false}]})});
  vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.click(await screen.findByRole('button',{name:'Set as primary venue'}));
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Set as primary venue'}));
  fireEvent.click(screen.getByRole('button',{name:'Set primary venue'}));
  expect(await screen.findByText('Primary venue updated. Booking statuses are unchanged.')).toBeInTheDocument();
  await waitFor(()=>expect(screen.getByText('Primary venue',{exact:true}).closest('.card')).toHaveTextContent('Main Hall'));
  expect(screen.getAllByText('Confirmed',{exact:true})).toHaveLength(2);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({action:'set_primary',booking_id:'one'});
});

test('TC_E06S03_07 primary conflict refreshes and busy submission runs only once',async()=>{
  let finish!:(response:unknown)=>void;
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({...data,bookings:[{...data.bookings[0],status:'confirmed'}]})})
    .mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}))
    .mockResolvedValue({ok:true,json:async()=>data});
  vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.click(await screen.findByRole('button',{name:'Set as primary venue'}));
  fireEvent.click(screen.getByRole('button',{name:'Set primary venue'}));
  expect(screen.getByRole('button',{name:'Updating...'})).toBeDisabled();
  fireEvent.submit(screen.getByRole('form',{name:'Make Main Hall the primary venue?'}));
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async()=>finish({ok:false,status:409,json:async()=>({error:'Only Confirmed bookings can be the primary venue. Refresh the booking list.'})}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only Confirmed');
  fireEvent.click(screen.getByRole('button',{name:'Refresh booking list'}));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Set as primary venue'})).not.toBeInTheDocument());
});


test.each(['completed','cancelled'])('TC_E06S03_07 primary selection is hidden for %s Events',async status=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({...data,event:{...data.event,status},bookings:[{...data.bookings[0],status:'confirmed',is_primary:false}]}),{status:200,headers:{'Content-Type':'application/json'}})));
  render(<MemoryRouter initialEntries={['/events/EVT-1']}><Routes><Route path="/events/:eventCode" element={<VenueBookingRequests/>}/></Routes></MemoryRouter>);
  await screen.findByText('Main Hall');
  expect(screen.queryByRole('button',{name:'Set as primary venue'})).not.toBeInTheDocument();
});

test('TC_E05S06_02 E05-S06 Scenario 3: a Conflicting booking shows the venue-conflict flag with category, note, period and earlier status', async () => {
  const conflicting = { ...data.bookings[1], status: 'conflicting', status_before_conflict: 'confirmed', conflict_reason_category: 'safety_concern',
    conflict_note: 'Ceiling inspection', conflict_starts_at: '2027-01-15T00:00:00.000Z', conflict_ends_at: '2027-01-15T10:00:00.000Z' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...data, bookings: [conflicting] }) }));
  mount();
  const flag = await screen.findByRole('alert');
  expect(flag).toHaveTextContent('Venue unavailable');
  expect(flag).toHaveTextContent('Safety concern · Ceiling inspection, 15 Jan 2027, 8:00 am – 6:00 pm. Alternative arrangements are required. Before this it was Confirmed.');
  expect(screen.getByText('Conflicting', { exact: true })).toHaveClass('status-warning');
  // The event itself is back in Planning, not cancelled (T-81).
  expect(screen.getByText('Planning', { exact: true })).toBeInTheDocument();
});

test('E05-S06: an open-ended unavailability reads until lifted, and missing details still say what is needed', async () => {
  const base = { ...data.bookings[0], status: 'conflicting' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...data, bookings: [
    { ...base, status_before_conflict: 'tentative', conflict_reason_category: 'renovation', conflict_note: '', conflict_starts_at: '2027-01-15T00:00:00.000Z', conflict_ends_at: null },
    { ...base, id: 'bare', venue_name: 'Annex', status_before_conflict: null, conflict_reason_category: null, conflict_note: null, conflict_starts_at: null, conflict_ends_at: null },
  ] }) }));
  mount();
  const [open, bare] = await screen.findAllByRole('alert');
  expect(open).toHaveTextContent('Renovation, from 15 Jan 2027, 8:00 am until lifted. Alternative arrangements are required. Before this it was Tentative.');
  expect(bare).toHaveTextContent(/^Venue unavailableAlternative arrangements are required\.$/);
});

test('E10-S02: a confirmed booking flagged for reconfirmation says so; an unflagged one does not', async () => {
  const flagged = { ...data, bookings: [{ ...data.bookings[1], requires_reconfirmation: true }, { ...data.bookings[1], id: 'three', venue_name: 'Side Room', requires_reconfirmation: false }] };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => flagged }));
  mount();
  expect(await screen.findByText('Needs reconfirmation')).toBeInTheDocument();
  expect(screen.getAllByText('Needs reconfirmation')).toHaveLength(1);
  expect(screen.getByText(/Venue Staff need to reconfirm this booking/)).toBeInTheDocument();
});

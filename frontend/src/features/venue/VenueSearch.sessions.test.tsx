// E04-S02 (SCRUM-239) Scenarios 3 and 4: an event with several Sessions is
// searched, checked and requested one Session at a time.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueSearch } from './VenueSearch';
import { VenueSuitability } from './VenueSuitability';
import { VenueBookingRequests } from './VenueBookingRequests';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const options = { layouts: [{ id: 'theatre', label: 'Theatre' }], accessibility: [{ id: 'step-free', label: 'Step-free access' }], facilities: [] };
const sessions = [
  { id: 's-a', title: 'Morning talks', start: '2027-03-12T01:00:00.000Z', end: '2027-03-12T03:00:00.000Z', attendance: 40 },
  { id: 's-b', title: null, start: '2027-03-13T05:00:00.000Z', end: '2027-03-13T08:00:00.000Z', attendance: 120 },
];
const eventDefaults = { title: 'Two-day forum', start: '2027-03-12T01:00:00.000Z', end: '2027-03-13T08:00:00.000Z', attendance: 160 };
const sessionDefaults: Record<string, object> = {
  's-a': { ...eventDefaults, start: sessions[0]!.start, end: sessions[0]!.end, attendance: 40, accessibility: ['step-free'] },
  's-b': { ...eventDefaults, start: sessions[1]!.start, end: sessions[1]!.end, attendance: 120, layout: 'theatre', accessibility: [] },
};
const venue = { id: 'hall', name: 'Main Hall', location: 'Level 1', max_capacity: 200, effective_capacity: 200, available: true,
  suitable: true, mismatches: [], layouts: [], facilities: [], accessibility: [] };

function stub(eventSessions = sessions) {
  const calls: URL[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    calls.push(url);
    const session = url.searchParams.get('session_id');
    const body = url.searchParams.get('search') === '1'
      ? { venues: [venue] }
      : { options, defaults: session ? sessionDefaults[session] : eventDefaults, sessions: eventSessions };
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
  return calls;
}

function Where() {
  const location = useLocation();
  return <output aria-label="location">{location.pathname + location.search}</output>;
}

function renderSearch(path = '/coordinator/events/EVT-1/venues') {
  render(<MemoryRouter initialEntries={[path]}><Where /><Routes>
    <Route path="/coordinator/events/:eventCode/venues" element={<VenueSearch />} />
  </Routes></MemoryRouter>);
}

test('TC_E04S02_03: choosing a Session refills the criteria from that Session alone', async () => {
  const calls = stub();
  renderSearch();
  const picker = await screen.findByLabelText('Session') as HTMLSelectElement;
  expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual([
    'Whole event (choose a Session to request a venue)',
    expect.stringMatching(/^Morning talks: .*, 40 attendees$/),
    expect.stringMatching(/^Session 2: .*, 120 attendees$/),
  ]);

  fireEvent.change(picker, { target: { value: 's-b' } });
  expect(await screen.findByText('Search criteria are filled from Session 2. Changing them here does not update the Session.')).toBeTruthy();
  expect(screen.getByLabelText('location').textContent).toBe('/coordinator/events/EVT-1/venues?session_id=s-b');
  expect((screen.getByLabelText('Expected attendance (required)') as HTMLInputElement).value).toBe('120');
  expect((screen.getByLabelText('Room layout') as HTMLSelectElement).value).toBe('theatre');
  expect((screen.getByLabelText('Step-free access') as HTMLInputElement).checked).toBe(false);
  expect(calls.at(-1)!.searchParams.get('session_id')).toBe('s-b');

  fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));
  const check = await screen.findByRole('link', { name: 'Check this Session’s requirements' });
  expect(check).toHaveAttribute('href', '/coordinator/events/EVT-1/venues/hall/suitability?session_id=s-b');
  const search = calls.find(url => url.searchParams.get('search') === '1')!;
  expect(search.searchParams.get('session_id')).toBe('s-b');
  // A hold has no Session, so it is not offered on a multi-Session event.
  expect(screen.queryByRole('link', { name: 'Hold this venue' })).toBeNull();
});

test('E04-S02: the whole-event view asks for a Session before a venue can be checked', async () => {
  stub();
  renderSearch();
  await screen.findByLabelText('Session');
  fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));
  expect(await screen.findByText('Choose a Session above to check a venue against that Session and request it.')).toBeTruthy();
  expect(screen.queryByRole('link', { name: /requirements/ })).toBeNull();
});

test('E04-S02: a single-Session event keeps the original search, with no picker', async () => {
  stub([sessions[0]!]);
  renderSearch();
  await screen.findByText('Search criteria are filled from this event. Changing them here does not update the event.');
  expect(screen.queryByLabelText('Session')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));
  expect(await screen.findByRole('link', { name: 'Check recorded event requirements' }))
    .toHaveAttribute('href', '/coordinator/events/EVT-1/venues/hall/suitability');
  expect(screen.getByRole('link', { name: 'Hold this venue' })).toBeTruthy();
});

test('TC_E04S02_04: the suitability check and booking request are for the chosen Session', async () => {
  const calls: { url: URL; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    calls.push({ url, init });
    const body = init?.method === 'POST'
      ? { booking: { id: 'b-2' }, suitability: { suitable: true, mismatches: [] } }
      : { event: { id: 'event-1', title: 'Two-day forum', status: 'planning', start: sessions[1]!.start, end: sessions[1]!.end },
        session: { id: 's-b', title: 'Afternoon panel' },
        assessment: { id: 'hall', name: 'Main Hall', location: 'Level 1', suitable: true, available: true, advisory: true, mismatches: [], comparisons: [] } };
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
  render(<MemoryRouter initialEntries={['/coordinator/events/EVT-1/venues/hall/suitability?session_id=s-b']}><Routes>
    <Route path="/coordinator/events/:eventCode/venues/:venueId/suitability" element={<VenueSuitability />} />
  </Routes></MemoryRouter>);

  expect(await screen.findByText('Afternoon panel')).toBeTruthy();
  expect(screen.getByText('Session period')).toBeTruthy();
  expect(calls[0]!.url.searchParams.get('session_id')).toBe('s-b');
  expect(screen.getByRole('link', { name: 'Back to venue search' })).toHaveAttribute('href', '/coordinator/events/EVT-1/venues?session_id=s-b');
  expect(screen.getByText(/must be within its Session/)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Submit booking request' }));
  await waitFor(() => expect(calls.some(call => call.init?.method === 'POST')).toBe(true));
  const body = JSON.parse(String(calls.find(call => call.init?.method === 'POST')!.init!.body));
  expect(body).toMatchObject({ action: 'request_booking', event_id: 'event-1', venue_id: 'hall', session_id: 's-b',
    starts_at: sessions[1]!.start, ends_at: sessions[1]!.end });
});

test('TC_E04S02_04: each booking names the Session it covers', async () => {
  const booking = (id: string, session: string | null) => ({ id, venue_id: 'hall', venue_name: 'Main Hall', location: 'Level 1', status: 'pending',
    starts_at: '2027-03-12T01:00:00.000Z', ends_at: '2027-03-12T03:00:00.000Z', created_at: '2027-01-01T00:00:00.000Z', decision_reason: null,
    session_id: session ? `s-${id}` : null, session_title: session });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({
    event: { id: 'event-1', event_code: 'EVT-1', title: 'Two-day forum', status: 'planning' },
    bookings: [booking('1', 'Morning talks'), booking('2', 'Afternoon panel'), booking('3', null)],
  }) }) as Response));
  render(<MemoryRouter initialEntries={['/coordinator/events/EVT-1/venue-bookings']}><Routes>
    <Route path="/coordinator/events/:eventCode/venue-bookings" element={<VenueBookingRequests />} />
  </Routes></MemoryRouter>);

  expect(await screen.findByText('Morning talks')).toBeTruthy();
  expect(screen.getByText('Afternoon panel')).toBeTruthy();
  expect(screen.getAllByText('Session')).toHaveLength(2);
});

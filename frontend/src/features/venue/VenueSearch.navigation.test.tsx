// Late-response guard for venue search (/coordinator/events/:eventCode/venues).
// MemoryRouter keeps VenueSearch mounted between event URLs, so a slow load or
// search for event A must never land on event B's page.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueSearch } from './VenueSearch';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

type Reply = { status: number; body: unknown };

const options = { layouts: [], accessibility: [], facilities: [] };
const defaults = (event: string) => ({ options, defaults: {
  title: `Event ${event}`, start: '2026-11-10T01:00:00.000Z', end: '2026-11-10T04:00:00.000Z', attendance: 80,
} });
const results = (event: string) => ({ venues: [{
  id: `v-${event}`, name: `Hall for event ${event}`, location: 'Level 1', max_capacity: 200, effective_capacity: 200,
  available: true, suitable: true, mismatches: [], layouts: [], facilities: [], accessibility: [],
}] });

// Holds the first request matching `hold` until released; everything else answers at once.
function stubFetch(hold: (url: URL) => boolean) {
  let release!: (reply: Reply) => void;
  const calls: URL[] = [];
  let held = false;
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    calls.push(url);
    const event = url.searchParams.get('event_id') ?? '';
    const isSearch = url.searchParams.get('search') === '1';
    let reply: Reply = { status: 200, body: isSearch ? results(event) : defaults(event) };
    if (!held && hold(url)) {
      held = true;
      reply = await new Promise<Reply>(resolve => { release = resolve; });
    }
    // Mirror fetch: an aborted request rejects instead of resolving.
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return { calls, release: (reply: Reply) => release(reply) };
}

function renderEventA() {
  render(
    <MemoryRouter initialEntries={['/coordinator/events/A/venues']}>
      <Link to="/coordinator/events/B/venues">Open event B</Link>
      <Routes><Route path="/coordinator/events/:eventCode/venues" element={<VenueSearch />} /></Routes>
    </MemoryRouter>,
  );
}

test.each([
  ['success', { status: 200, body: defaults('A') }],
  ['error', { status: 503, body: { error: 'Event A failed' } }],
])('a late %s loading event A does not replace event B', async (_kind, lateReply) => {
  const { calls, release } = stubFetch(url => url.searchParams.get('event_id') === 'A');
  renderEventA();
  await waitFor(() => expect(calls.map(url => url.searchParams.get('event_id'))).toContain('A'));

  fireEvent.click(screen.getByText('Open event B'));
  expect(await screen.findByRole('heading', { name: 'Event B' })).toBeInTheDocument();

  await act(async () => { release(lateReply); });
  expect(screen.getByRole('heading', { name: 'Event B' })).toBeInTheDocument();
  expect(screen.queryByText('Event A')).not.toBeInTheDocument();
  expect(screen.queryByText('Event A failed')).not.toBeInTheDocument();
});

test.each([
  ['success', { status: 200, body: results('A') }],
  ['error', { status: 503, body: { error: 'Search for event A failed' } }],
])('a late %s from event A\'s search does not land on event B', async (_kind, lateReply) => {
  const { calls, release } = stubFetch(url => url.searchParams.get('search') === '1');
  renderEventA();
  expect(await screen.findByRole('heading', { name: 'Event A' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));
  await waitFor(() => expect(calls.some(url => url.searchParams.get('search') === '1')).toBe(true));

  fireEvent.click(screen.getByText('Open event B'));
  expect(await screen.findByRole('heading', { name: 'Event B' })).toBeInTheDocument();

  await act(async () => { release(lateReply); });
  expect(screen.queryByText('Hall for event A')).not.toBeInTheDocument();
  expect(screen.queryByText('Search for event A failed')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Search venues' })).toBeEnabled();
});

// E06-S05 (SCRUM-143): from an event's search, an available venue offers
// "Hold this venue"; an unavailable one doesn't.
test('event-scoped results offer Hold this venue only for an available venue', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    const isSearch = url.searchParams.get('search') === '1';
    const body = isSearch ? { venues: [
      { ...results('A').venues[0], id: 'v-free', name: 'Free Hall' },
      { ...results('A').venues[0], id: 'v-busy', name: 'Busy Hall', available: false, suitable: false, mismatches: ['Unavailable during the requested period.'] },
    ] } : defaults('A');
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
  renderEventA();
  fireEvent.click(await screen.findByRole('button', { name: 'Search venues' }));
  const free = (await screen.findByRole('heading', { name: 'Free Hall' })).closest('section')!;
  const busy = screen.getByRole('heading', { name: 'Busy Hall' }).closest('section')!;
  expect(free.querySelector('a[href="/coordinator/events/A/venues/v-free/hold"]')?.textContent).toBe('Hold this venue');
  expect(busy.querySelector('a[href$="/hold"]')).toBeNull();
});

test('TC_E10S05_03: a rejected replacement reopens search with the lost booking period and preserves its link', async () => {
  const fetcher=vi.fn(async(input:string)=>{
    const url=new URL(input,'http://localhost');
    const body=url.searchParams.get('mode')==='booking_requests'
      ? {event:{id:'A'},bookings:[{id:'lost',status:'conflicting',conflict_block_id:'block',has_replacement:true,starts_at:'2027-01-15T01:00:00Z',ends_at:'2027-01-15T02:00:00Z',headcount:40},{id:'rejected',status:'rejected',replaces_booking_id:'lost'}]}
      : url.searchParams.get('search')==='1' ? results('A') : defaults('A');
    return {ok:true,json:async()=>body};
  });
  vi.stubGlobal('fetch',fetcher);
  render(<MemoryRouter initialEntries={['/coordinator/events/A/venues?replaces_booking_id=lost']}><Routes><Route path="/coordinator/events/:eventCode/venues" element={<VenueSearch/>}/></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Event A'})).toBeInTheDocument();
  expect(screen.getByLabelText('Expected attendance (required)')).toHaveValue(40);
  fireEvent.click(screen.getByRole('button',{name:'Search venues'}));
  const link=await screen.findByRole('link',{name:'Check recorded event requirements'});
  expect(link).toHaveAttribute('href','/coordinator/events/A/venues/v-A/suitability?replaces_booking_id=lost');
  const search=fetcher.mock.calls.map(([input])=>new URL(input,'http://localhost')).find(url=>url.searchParams.get('search')==='1');
  expect(search?.searchParams.get('start')).toBe('2027-01-15T01:00:00.000Z');
  expect(search?.searchParams.get('end')).toBe('2027-01-15T02:00:00.000Z');
});

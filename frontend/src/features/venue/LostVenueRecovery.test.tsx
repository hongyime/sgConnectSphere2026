import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { LostVenueRecovery } from './LostVenueRecovery';
import { VenueSuitability } from './VenueSuitability';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const original = { id: 'original', venue_name: 'Lost Hall', status: 'conflicting', conflict_block_id: 'block', conflict_category: 'safety_concern', conflict_reason: 'Roof unsafe', conflict_starts_at: '2027-01-15T00:00Z', conflict_ends_at: null, starts_at: '2027-01-15T01:00Z', ends_at: '2027-01-15T04:00Z', purpose: 'Programme', headcount: 40, has_replacement: false };
const data = (status?: string) => ({ event: { title: 'Same Event', status: 'planning' }, bookings: [{ ...original, has_replacement: !!status }, ...(status ? [{ id: 'replacement', venue_name: 'New Hall', status, replaces_booking_id: original.id }] : [])] });
function mount() { render(<MemoryRouter initialEntries={['/events/EVT-1']}><Routes><Route path="/events/:eventCode" element={<LostVenueRecovery />} /></Routes></MemoryRouter>); }
const response = (value: unknown) => ({ ok: true, json: async () => value });

test('TC_E10S05_02: preserves original context and links same-event search to the lost booking', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(data()))); mount();
  expect(await screen.findByText('Roof unsafe')).toBeInTheDocument();
  expect(screen.getByText('safety concern')).toBeInTheDocument();
  expect(screen.getByText(/no end recorded/)).toBeInTheDocument();
  expect(screen.getByText('Programme')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Search for a replacement venue' })).toHaveAttribute('href', '/coordinator/events/EVT-1/venues?replaces_booking_id=original');
  expect(screen.queryByRole('button', { name: 'Cancel original booking' })).not.toBeInTheDocument();
});

test('TC_E10S05_03: Pending replacement cannot cancel original; Confirmed requires explicit confirmation', async () => {
  const fetcher = vi.fn().mockResolvedValue(response(data('confirmed')));
  vi.stubGlobal('fetch', fetcher); mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel original booking' }));
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValueOnce(response({ booking: { id: 'original', status: 'released' }, replayed: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
  expect(await screen.findByText('Original booking cancelled.')).toBeInTheDocument();
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ action: 'cancel_lost_booking', booking_id: 'original' });
});

test('TC_E10S05_03: Pending or reconfirmation-required replacements do not expose cancellation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(data('pending')))); mount();
  expect(await screen.findByText('Replacement: New Hall - pending')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancel original booking' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Search for a replacement venue' })).not.toBeInTheDocument();
});

test('empty recovery uses shared state', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ event: { title: 'Event', status: 'planning' }, bookings: [] }))); mount();
  expect(await screen.findByText('No lost venues to recover')).toBeInTheDocument();
});

test('TC_E10S05_03: suitability preserves replacement context and submits the original link', async () => {
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return response({ booking: { id: 'new' }, suitability: { mismatches: [] } });
    if (String(url).includes('booking_requests')) return response({ ...data(), event: { id: 'event', title: 'Same Event', status: 'planning' } });
    return response({ event: { id: 'event', title: 'Same Event', status: 'planning', start: original.starts_at, end: original.ends_at }, assessment: { name: 'New Hall', location: 'Campus', suitable: true, mismatches: [], comparisons: [] } });
  });
  vi.stubGlobal('fetch', fetcher);
  render(<MemoryRouter initialEntries={['/events/EVT-1/venues/new?replaces_booking_id=original']}><Routes><Route path="/events/:eventCode/venues/:venueId" element={<VenueSuitability />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('Request replacement venue')).toBeInTheDocument();
  expect(screen.getByLabelText('Purpose (optional)')).toHaveValue('Programme');
  fireEvent.click(screen.getByRole('button', { name: 'Submit booking request' }));
  expect(await screen.findByText('Booking request submitted')).toBeInTheDocument();
  const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ replaces_booking_id: 'original', event_id: 'event', venue_id: 'new', purpose: 'Programme', headcount: 40 });
});

test('TC_E10S05_03: rejected recovery retains history and offers same-event search again', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(data('rejected')))); mount();
  expect(await screen.findByText('Replacement: New Hall - rejected')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Search for a replacement venue'})).toHaveAttribute('href','/coordinator/events/EVT-1/venues?replaces_booking_id=original');
  expect(screen.queryByRole('button',{name:'Cancel original booking'})).not.toBeInTheDocument();
});

test('TC_E10S05_03: confirmed suggested descendant permits original cancellation without another search', async () => {
  const chain=data('rejected');
  chain.bookings.push({id:'descendant',venue_name:'Suggested Hall',status:'confirmed',replaces_booking_id:'replacement'});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(chain))); mount();
  expect(await screen.findByText('Replacement: Suggested Hall - confirmed')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Cancel original booking'})).toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Search for a replacement venue'})).not.toBeInTheDocument();
});

test('TC_E10S05_03: suitability permits a new linked request after a rejected recovery attempt', async () => {
  vi.stubGlobal('fetch',vi.fn(async (url:string)=>{
    if(String(url).includes('booking_requests'))return response(data('rejected'));
    return response({event:{id:'event',title:'Same Event',status:'planning',start:original.starts_at,end:original.ends_at},assessment:{name:'New Hall',location:'Campus',suitable:true,mismatches:[],comparisons:[]}});
  }));
  render(<MemoryRouter initialEntries={['/events/EVT-1/venues/new?replaces_booking_id=original']}><Routes><Route path="/events/:eventCode/venues/:venueId" element={<VenueSuitability/>}/></Routes></MemoryRouter>);
  expect(await screen.findByText('Request replacement venue')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Submit booking request'})).toBeInTheDocument();
});

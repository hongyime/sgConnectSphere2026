// E05-S05 Scenario 4 (TC_E05S05_03): a buffer change that makes bookings
// overlap is saved, and the form lists the conflicts instead of leaving.
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { VenueInventory } from './Venue';
import { conflictLine, VenueForm } from './VenueForm';
import type { BufferConflict, Venue } from './venueApi';

const venue: Venue = {
  id: 'venue-1', name: 'Orchid Hall', location: 'Level 2', max_capacity: 200,
  opens_at: '08:00', closes_at: '22:00', facilities: ['Projector'],
  accessibility_features: ['Wheelchair access'],
  supported_layouts: [{ label: 'Theatre', capacity: 120 }],
  setup_time_minutes: 0, turnaround_time_minutes: 0,
};

// 15 Jan 2027, 12:30 pm to 2:00 pm Singapore time.
const later: BufferConflict = {
  eventCode: 'EVT-2003', title: 'Client B Isolation Event',
  startsAt: '2027-01-15T04:30:00.000Z', endsAt: '2027-01-15T06:00:00.000Z',
  conflictingWith: [{ eventId: 'event-101', title: 'Client A Planning Event' }],
};

const scrollIntoView = vi.fn();
beforeEach(() => { Element.prototype.scrollIntoView = scrollIntoView; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); scrollIntoView.mockReset(); });

// Each POST takes the next reply's bufferConflicts value (undefined leaves the
// field out, as an older server would).
function installApi(replies: unknown[]) {
  let posts = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    if (init?.method === 'POST') {
      const conflicts = replies[posts++];
      const body = conflicts === undefined ? { venue } : { venue, bufferConflicts: conflicts };
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (url.searchParams.has('id')) return new Response(JSON.stringify({ venue }), { status: 200 });
    return new Response(JSON.stringify({ venues: [venue] }), { status: 200 });
  }));
}

function renderEdit({ strict = false } = {}) {
  const tree = (
    <MemoryRouter initialEntries={['/venue/inventory/venue-1/edit']}>
      <Routes>
        <Route path="/venue/inventory/:venueId/edit" element={<VenueForm mode="edit" />} />
        <Route path="/venue/inventory" element={<VenueInventory />} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

async function saveTurnaround(minutes: string) {
  fireEvent.change(await screen.findByLabelText('Turnaround time'), { target: { value: minutes } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
}

test('TC_E05S05_03: a save that creates a conflict stays on the form and lists the pair', async () => {
  installApi([[later]]);
  renderEdit();
  await saveTurnaround('45');

  const alert = await screen.findByRole('alert');
  expect(within(alert).getByText('Changes saved, and some bookings now conflict')).toBeInTheDocument();
  expect(alert).toHaveTextContent('They keep their status, the calendar marks them for review, and their assigned Coordinators have been notified.');
  const list = within(alert).getByRole('list', { name: 'Bookings that now conflict' });
  expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Client B Isolation Event (EVT-2003), 15 Jan 2027, 12:30 pm – 2:00 pm: conflicts with Client A Planning Event',
  ]);
  expect(within(alert).getByRole('link', { name: 'Back to venue inventory' })).toHaveAttribute('href', '/venue/inventory');
  expect(screen.queryByRole('heading', { name: 'Venue inventory' })).not.toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
});

test('TC_E05S05_03: a chain of conflicts lists every later booking, with or without an event code, and each booking it clashes with', async () => {
  const third: BufferConflict = {
    eventCode: null, title: 'Evening Talk',
    startsAt: '2027-01-15T06:15:00.000Z', endsAt: '2027-01-15T08:00:00.000Z',
    conflictingWith: [
      { eventId: 'event-101', title: 'Client A Planning Event' },
      { eventId: 'event-2003', title: 'Client B Isolation Event' },
    ],
  };
  installApi([[later, third]]);
  renderEdit();
  await saveTurnaround('45');

  const items = within(await screen.findByRole('list', { name: 'Bookings that now conflict' })).getAllByRole('listitem');
  expect(items.map((item) => item.textContent)).toEqual([
    'Client B Isolation Event (EVT-2003), 15 Jan 2027, 12:30 pm – 2:00 pm: conflicts with Client A Planning Event',
    'Evening Talk (no code), 15 Jan 2027, 2:15 pm – 4:00 pm: conflicts with Client A Planning Event, Client B Isolation Event',
  ]);
});

test('TC_E05S05_03: the conflict list renders and survives inside StrictMode', async () => {
  installApi([[later]]);
  renderEdit({ strict: true });
  await saveTurnaround('45');

  expect(await screen.findByText('Changes saved, and some bookings now conflict')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save changes' })).not.toHaveAttribute('aria-busy', 'true');
});

test('TC_E05S05_03: saving again with no new conflicts clears the list and returns to the inventory', async () => {
  installApi([[later], []]);
  renderEdit();
  await saveTurnaround('45');
  await screen.findByText('Changes saved, and some bookings now conflict');

  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('heading', { name: 'Venue inventory' })).toBeInTheDocument();
  expect(screen.queryByText('Changes saved, and some bookings now conflict')).not.toBeInTheDocument();
});

test('TC_E05S05_03: a reply without a conflict list is treated as no conflicts', async () => {
  installApi([undefined]);
  renderEdit();
  await saveTurnaround('45');

  expect(await screen.findByRole('heading', { name: 'Venue inventory' })).toBeInTheDocument();
  expect(scrollIntoView).not.toHaveBeenCalled();
});

test('TC_E05S05_03: a conflict line without an event code or partners still reads plainly', () => {
  const bare = { ...later, eventCode: null, conflictingWith: undefined } as unknown as BufferConflict;
  expect(conflictLine(bare)).toBe('Client B Isolation Event (no code), 15 Jan 2027, 12:30 pm – 2:00 pm');
  expect(conflictLine({ ...later, conflictingWith: [] })).toBe(
    'Client B Isolation Event (EVT-2003), 15 Jan 2027, 12:30 pm – 2:00 pm');
});

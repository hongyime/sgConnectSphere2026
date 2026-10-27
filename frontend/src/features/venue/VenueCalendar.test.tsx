// E05-S03 calendar screen against a stubbed fetch shaped like PR #134's
// GET /api/venues?id=&calendar=1&from=&to= response. Who may see which event
// details is enforced (and tested) server-side; these tests check the screen
// renders each kind of entry faithfully and asks for the right periods.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { VenueCalendar } from './VenueCalendar';
import type { CalendarEntry } from './venueCalendarApi';

const venues = [
  { id: 'v-1', name: 'Grand Ballroom', location: 'Level 1', max_capacity: 300, opens_at: '08:00', closes_at: '22:00',
    facilities: [], accessibility_features: [], supported_layouts: [] },
  { id: 'v-2', name: 'Lotus Room', location: 'Level 2', max_capacity: 40, opens_at: '08:00', closes_at: '22:00',
    facilities: [], accessibility_features: [], supported_layouts: [] },
];

// Singapore is UTC+8, so 09:00 SGT is 01:00Z.
const novemberEntries: CalendarEntry[] = [
  { state: 'free', kind: 'free', start: '2026-11-10T00:00:00.000Z', end: '2026-11-10T14:00:00.000Z' },
  { state: 'tentative', kind: 'booking', start: '2026-11-11T01:00:00.000Z', end: '2026-11-11T04:00:00.000Z',
    event: { id: 'e-1', code: 'EVT-2001', title: 'Spring Networking Night' } },
  { state: 'confirmed', kind: 'booking', start: '2026-11-12T01:00:00.000Z', end: '2026-11-12T04:00:00.000Z',
    event: { id: 'e-2', code: 'EVT-2002', title: 'Annual Tech Summit' } },
  { state: 'unavailable', kind: 'booking', start: '2026-11-12T06:00:00.000Z', end: '2026-11-12T08:00:00.000Z' },
  // 13/11 00:00 to 14/11 00:00 SGT.
  { state: 'blocked', kind: 'block', start: '2026-11-12T16:00:00.000Z', end: '2026-11-13T16:00:00.000Z',
    reason: 'Scheduled maintenance' },
];

type CalendarReply = { status?: number; body: unknown };
let calendarReply: (url: URL) => CalendarReply;
let fetchMock: ReturnType<typeof vi.fn>;

function calendarBody(url: URL, entries: CalendarEntry[], isActive = true) {
  const id = url.searchParams.get('id');
  const venue = venues.find(item => item.id === id) ?? venues[0];
  return {
    venue: { id: venue.id, name: venue.name, opens_at: '08:00', closes_at: '22:00', is_active: isActive },
    from: url.searchParams.get('from'), to: url.searchParams.get('to'), timezone: 'Asia/Singapore', entries,
  };
}

function calendarRequests() {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://localhost'))
    .filter(url => url.searchParams.get('calendar') === '1');
}

beforeEach(() => {
  // Fake only the clock so "this month" is November 2026; promises still resolve normally.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-15T04:00:00Z'));
  calendarReply = url => ({ body: calendarBody(url, novemberEntries) });
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    const reply: CalendarReply = url.searchParams.get('calendar') === '1' ? calendarReply(url) : { body: { venues } };
    const status = reply.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => reply.body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderCalendar(path = '/venue/availability') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/venue/availability" element={<VenueCalendar audience="venue" />} />
        <Route path="/coordinator/venues/:venueId/calendar" element={<VenueCalendar audience="coordinator" />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function dayItem(datePattern: RegExp) {
  const heading = await screen.findByRole('heading', { level: 3, name: datePattern });
  return heading.closest('li') as HTMLElement;
}

test('loads the current month for the first venue', async () => {
  renderCalendar();
  expect(await screen.findByRole('heading', { level: 2, name: 'November 2026' })).toBeInTheDocument();
  await dayItem(/10 Nov 2026/);
  const [request] = calendarRequests();
  expect(request.searchParams.get('id')).toBe('v-1');
  expect(request.searchParams.get('from')).toBe('2026-11-01');
  expect(request.searchParams.get('to')).toBe('2026-11-30');
  expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: 'same-origin' });
});

test('labels free, tentative, confirmed and blocked entries distinctly', async () => {
  renderCalendar();
  expect(within(await dayItem(/10 Nov 2026/)).getByText('Free')).toBeInTheDocument();
  expect(within(await dayItem(/11 Nov 2026/)).getByText('Tentative')).toBeInTheDocument();
  expect(within(await dayItem(/12 Nov 2026/)).getByText('Confirmed')).toBeInTheDocument();
  const blockedDay = await dayItem(/13 Nov 2026/);
  expect(within(blockedDay).getByText('Blocked')).toBeInTheDocument();

  const classes = ['entry-free', 'entry-tentative', 'entry-confirmed', 'entry-blocked'];
  for (const className of classes) expect(document.querySelectorAll(`.calendar-entry.${className}`).length).toBeGreaterThan(0);
});

test('shows a maintenance block with its reason and never as a booking', async () => {
  renderCalendar();
  const blockedDay = await dayItem(/13 Nov 2026/);
  const entry = within(blockedDay).getByText('Blocked').closest('li') as HTMLElement;
  expect(entry).toHaveClass('entry-blocked');
  expect(entry).toHaveTextContent('Maintenance block');
  expect(entry).toHaveTextContent('Scheduled maintenance');
  expect(entry).toHaveTextContent('All day');
  expect(within(entry).queryByRole('button')).not.toBeInTheDocument();
});

test('E05-S06 Scenario 1: a Blocked period shows its reason category before the note', async () => {
  calendarReply = url => ({ body: calendarBody(url, [
    { state: 'blocked', kind: 'block', start: '2026-11-20T00:00:00.000Z', end: '2026-11-20T10:00:00.000Z',
      reasonCategory: 'equipment_failure', reason: 'Projector rig fault' },
    { state: 'blocked', kind: 'block', start: '2026-11-21T00:00:00.000Z', end: '2026-11-21T10:00:00.000Z', reasonCategory: 'other', reason: '' },
    // A block with neither (older data) reads simply as a maintenance block.
    { state: 'blocked', kind: 'block', start: '2026-11-23T00:00:00.000Z', end: '2026-11-23T10:00:00.000Z' },
  ]) });
  renderCalendar();
  expect(within(await dayItem(/23 Nov 2026/)).getByText('Blocked').closest('li')).toHaveTextContent(/Maintenance block$/);
  const entry = within(await dayItem(/20 Nov 2026/)).getByText('Blocked').closest('li') as HTMLElement;
  expect(entry).toHaveTextContent('08:00–18:00');
  expect(entry).toHaveTextContent('Maintenance block · Equipment failure · Projector rig fault');
  expect(within(await dayItem(/21 Nov 2026/)).getByText('Blocked').closest('li')).toHaveTextContent(/Maintenance block · Other$/);
});

test('E05-S06 Scenario 2: a Conflicting booking stays visible inside the Blocked period with its own label and the reason', async () => {
  calendarReply = url => ({ body: calendarBody(url, [
    { state: 'blocked', kind: 'block', start: '2026-11-20T00:00:00.000Z', end: '2026-11-20T10:00:00.000Z',
      reasonCategory: 'safety_concern', reason: 'Ceiling inspection' },
    { state: 'conflicting', kind: 'booking', start: '2026-11-20T06:00:00.000Z', end: '2026-11-20T08:00:00.000Z',
      event: { id: 'e-5', code: 'EVT-2005', title: 'Alumni Dinner' }, reasonCategory: 'safety_concern' },
    { state: 'conflicting', kind: 'booking', start: '2026-11-22T06:00:00.000Z', end: '2026-11-22T08:00:00.000Z',
      event: { id: 'e-6', code: null, title: 'Book Fair' } },
  ]) });
  renderCalendar();
  const day = await dayItem(/20 Nov 2026/);
  const entry = within(day).getByText('Conflicting').closest('li') as HTMLElement;
  expect(entry).toHaveClass('entry-conflicting');
  expect(entry).toHaveTextContent('14:00–16:00');
  expect(within(entry).getByRole('button', { name: 'Alumni Dinner · Venue unavailable — needs an alternative · Safety concern' })).toBeInTheDocument();
  expect(within(day).getByText('Blocked')).toBeInTheDocument();
  // Without a category the label still says what is needed.
  expect(within(await dayItem(/22 Nov 2026/)).getByRole('button', { name: 'Book Fair · Venue unavailable — needs an alternative' })).toBeInTheDocument();
});

test('E05-S06: the legend lists all six states, Conflicting included', async () => {
  renderCalendar();
  await dayItem(/10 Nov 2026/);
  const legend = screen.getByRole('list', { name: 'Legend' });
  expect(within(legend).getAllByRole('listitem').map(item => item.textContent?.trim()))
    .toEqual(['Free', 'Tentative', 'Confirmed', 'Conflicting', 'Blocked', 'Unavailable']);
});

test('E05-S06 Scenario 1 (T-80): an open-ended block, clipped by the server to the range, shows as Blocked on every day', async () => {
  // Open-ended from 28/11 00:00 SGT; the server ends it at the end of the requested range.
  calendarReply = url => ({ body: calendarBody(url, [
    { state: 'blocked', kind: 'block', start: '2026-11-27T16:00:00.000Z', end: '2026-11-30T16:00:00.000Z', reasonCategory: 'renovation', reason: 'Roof works' },
  ]) });
  renderCalendar();
  for (const pattern of [/28 Nov 2026/, /29 Nov 2026/, /30 Nov 2026/]) {
    const day = await dayItem(pattern);
    expect(day).toHaveTextContent('All day');
    expect(day).toHaveTextContent('Renovation · Roof works');
  }
});

test('shows an unavailable period without any event details', async () => {
  renderCalendar();
  const day = await dayItem(/12 Nov 2026/);
  const entry = within(day).getByText('Unavailable').closest('li') as HTMLElement;
  expect(entry).toHaveTextContent('14:00–16:00');
  expect(entry).toHaveTextContent('Event details are not shown');
  expect(within(entry).queryByRole('button')).not.toBeInTheDocument();
});

test('expands a permitted booking to show event, code, date and time', async () => {
  renderCalendar();
  const day = await dayItem(/12 Nov 2026/);
  const toggle = within(day).getByRole('button', { name: 'Annual Tech Summit' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const details = document.getElementById(toggle.getAttribute('aria-controls') ?? '') as HTMLElement;
  expect(details).toHaveTextContent('Annual Tech Summit');
  expect(details).toHaveTextContent('EVT-2002');
  expect(details).toHaveTextContent('12 Nov 2026');
  expect(details).toHaveTextContent('09:00–12:00');
});

test('navigates to the next month and then to a custom range', async () => {
  renderCalendar();
  await dayItem(/10 Nov 2026/);

  fireEvent.click(screen.getByRole('button', { name: /Next month/ }));
  expect(await screen.findByRole('heading', { level: 2, name: 'December 2026' })).toBeInTheDocument();
  let latest = calendarRequests().at(-1)!;
  expect([latest.searchParams.get('from'), latest.searchParams.get('to')]).toEqual(['2026-12-01', '2026-12-31']);

  const range = screen.getByRole('form', { name: 'Custom date range' });
  fireEvent.change(within(range).getByLabelText('From'), { target: { value: '2026-12-05' } });
  fireEvent.change(within(range).getByLabelText('To'), { target: { value: '2026-12-10' } });
  fireEvent.click(within(range).getByRole('button', { name: 'Show range' }));

  await dayItem(/10 Dec 2026/);
  latest = calendarRequests().at(-1)!;
  expect([latest.searchParams.get('from'), latest.searchParams.get('to')]).toEqual(['2026-12-05', '2026-12-10']);
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
});

test('refuses a reversed or oversized range without calling the API', async () => {
  renderCalendar();
  await dayItem(/10 Nov 2026/);
  const requestsBefore = calendarRequests().length;
  const range = screen.getByRole('form', { name: 'Custom date range' });

  fireEvent.change(within(range).getByLabelText('From'), { target: { value: '2026-12-10' } });
  fireEvent.change(within(range).getByLabelText('To'), { target: { value: '2026-12-05' } });
  fireEvent.click(within(range).getByRole('button', { name: 'Show range' }));
  expect(within(range).getByRole('alert')).toHaveTextContent('on or after the start date');

  fireEvent.change(within(range).getByLabelText('From'), { target: { value: '2026-11-01' } });
  fireEvent.change(within(range).getByLabelText('To'), { target: { value: '2027-01-15' } });
  fireEvent.click(within(range).getByRole('button', { name: 'Show range' }));
  expect(within(range).getByRole('alert')).toHaveTextContent('62 days or fewer');

  expect(calendarRequests()).toHaveLength(requestsBefore);
});

test('splits a multi-day block across each day it covers', async () => {
  // 14/11 00:00 to 16/11 00:00 SGT.
  calendarReply = url => ({ body: calendarBody(url, [
    { state: 'blocked', kind: 'block', start: '2026-11-13T16:00:00.000Z', end: '2026-11-15T16:00:00.000Z', reason: 'Renovation' },
  ]) });
  renderCalendar();
  for (const pattern of [/14 Nov 2026/, /15 Nov 2026/]) {
    const day = await dayItem(pattern);
    expect(day).toHaveTextContent('All day');
    expect(day).toHaveTextContent('Renovation');
  }
  expect(await dayItem(/16 Nov 2026/)).toHaveTextContent('No bookable hours');
});

test('opens the venue named in a coordinator calendar link', async () => {
  renderCalendar('/coordinator/venues/v-2/calendar');
  expect(await screen.findByText('Event coordinator')).toBeInTheDocument();
  await dayItem(/10 Nov 2026/);
  expect(calendarRequests()[0].searchParams.get('id')).toBe('v-2');
  expect(screen.getByRole('combobox', { name: 'Venue' })).toHaveValue('v-2');
});

test('reloads when a different venue is chosen', async () => {
  renderCalendar();
  await dayItem(/10 Nov 2026/);
  fireEvent.change(screen.getByRole('combobox', { name: 'Venue' }), { target: { value: 'v-2' } });
  expect(await screen.findByRole('list', { name: /Availability for Lotus Room/ })).toBeInTheDocument();
  expect(calendarRequests().at(-1)!.searchParams.get('id')).toBe('v-2');
});

test('notes that a retired venue offers no free time', async () => {
  calendarReply = url => ({ body: calendarBody(url, [], false) });
  renderCalendar();
  expect(await screen.findByText(/is retired, so none of its time is offered as Free/)).toBeInTheDocument();
});

test('shows the server refusal on 403', async () => {
  calendarReply = () => ({ status: 403, body: { error: 'Access denied.' } });
  renderCalendar();
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Access refused');
  expect(alert).toHaveTextContent('Access denied.');
  expect(within(alert).getByRole('link', { name: 'Back to my home page' })).toHaveAttribute('href', '/home');
});

test('shows a failed load and retries on request', async () => {
  calendarReply = () => ({ status: 500, body: {} });
  renderCalendar();
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('The calendar could not be loaded.');

  calendarReply = url => ({ body: calendarBody(url, novemberEntries) });
  fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
  await dayItem(/10 Nov 2026/);
});

test('does not present a plain venue record as an empty calendar', async () => {
  // What the same URL returns before the calendar API (PR #134) is deployed.
  calendarReply = () => ({ body: { venue: venues[0] } });
  renderCalendar();
  expect(await screen.findByRole('alert')).toHaveTextContent('not available yet');
  expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
});

test('two blocks clipped to the same start get separate rows and keys', async () => {
  // venue_blocks allows overlapping blocks, and the API clips any block that
  // began before the window to the window's start, so both of these arrive
  // starting at 00:00 on 1 Nov (16:00Z the day before).
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  calendarReply = url => ({ body: calendarBody(url, [
    { state: 'blocked', kind: 'block', start: '2026-10-31T16:00:00.000Z', end: '2026-11-01T04:00:00.000Z', reason: 'Roof repair' },
    { state: 'blocked', kind: 'block', start: '2026-10-31T16:00:00.000Z', end: '2026-11-01T08:00:00.000Z', reason: 'Fire inspection' },
  ]) });
  renderCalendar();

  const day = await dayItem(/\b1 Nov 2026/);
  expect(within(day).getAllByText('Blocked')).toHaveLength(2);
  expect(day).toHaveTextContent('Roof repair');
  expect(day).toHaveTextContent('Fire inspection');
  const duplicateKeyWarnings = consoleError.mock.calls.filter(call => call.some(arg => String(arg).includes('same key')));
  consoleError.mockRestore();
  expect(duplicateKeyWarnings).toHaveLength(0);
});


test('buffer segments and review flags are labelled without changing booking state', async () => {
  const confirmed = novemberEntries.find(entry => entry.state === 'confirmed')!;
  calendarReply = url => ({ body: calendarBody(url, [{ ...confirmed, reason: 'Setup time', bufferConflict: true }]) });
  renderCalendar();
  expect(await screen.findByRole('button', { name: 'Annual Tech Summit · Setup time · Buffer conflict — needs review' })).toBeInTheDocument();
  const day = await dayItem(/12 Nov/);
  expect(within(day).getByText('Confirmed')).toBeInTheDocument();
});

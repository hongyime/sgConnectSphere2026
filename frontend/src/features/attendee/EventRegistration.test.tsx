// E09-S01 (SCRUM-208) Discover, event page and registration form against a
// stubbed fetch shaped like api/attendee/events.ts (?open=1, ?registration=1).
// The server owns the rules (Confirmed only, one active registration, account
// details); these tests check the screens show its answers faithfully.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { EventDetail, EventDiscovery, RegisterForEvent, missingMessage, windowText } from './EventRegistration';
import type { PublicEvent, RegistrationForm } from './registrationApi';
import { stubApi, type FakeHandler } from '../../testing/fakeApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const event: PublicEvent = {
  id: 'e-1', eventCode: 'EVT-9001', name: 'Community Meetup',
  startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z',
  venueName: 'Grand Auditorium', venueLocation: 'Level 1',
  registrationState: 'open', opensAt: '2027-02-01T00:00:00.000Z', closesAt: '2027-03-30T00:00:00.000Z', withdrawalDeadline: null,
};
const sessions = [
  { id: 's-a', title: 'Morning keynote', startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T04:00:00.000Z', venueName: 'Grand Auditorium', venueLocation: 'Level 1' },
  { id: 's-b', title: null, startsAt: '2027-04-01T05:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z', venueName: 'Seminar Room B', venueLocation: null },
];
const details = { name: 'Casey Tan', email: 'casey@example.test', contactNumber: '+65 8123 4567' };

function form(overrides: Partial<RegistrationForm> = {}): RegistrationForm {
  return { event, sessions, details, missingDetails: [], registration: null,
    capacity: { eventFull: false, waitlistEnabled: false, fullSessionIds: [] }, withdrawal: null, ...overrides };
}

const FORM_URL = 'GET /api/attendee/events?registration=1&id=EVT-9001';
const POST_URL = 'POST /api/attendee/events?registration=1&id=EVT-9001';

function renderAt(path: string, handlers: Record<string, FakeHandler>) {
  const calls = stubApi(handlers, { role: 'attendee' });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/attendee/discover" element={<EventDiscovery />} />
        <Route path="/attendee/discover/:eventCode" element={<EventDetail />} />
        <Route path="/attendee/register/:eventCode" element={<RegisterForEvent />} />
        <Route path="/profile" element={<h1>Profile</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return calls;
}

test('windowText and missingMessage describe the window and missing details in plain words', () => {
  expect(windowText({ ...event, closesAt: null })).toBe('Open');
  expect(windowText(event)).toMatch(/^Open until 30 Mar 2027/);
  expect(windowText({ ...event, registrationState: 'not_yet_open' })).toMatch(/^Opens on 1 Feb 2027/);
  expect(windowText({ ...event, registrationState: 'closed' })).toBe('Closed');
  expect(missingMessage(['Name', 'Contact number'])).toBe('Add your name, contact number to your profile before registering.');
});

test('Discover lists open events with the registration state and links to each event', async () => {
  renderAt('/attendee/discover', { 'GET /api/attendee/events?open=1': { body: { events: [
    { ...event, myRegistrationStatus: null },
    { ...event, id: 'e-2', eventCode: null, name: 'Opening later', registrationState: 'not_yet_open', myRegistrationStatus: null },
    { ...event, id: 'e-3', eventCode: 'EVT-9003', name: 'Already in', myRegistrationStatus: 'registered' },
    { ...event, id: 'e-4', eventCode: 'EVT-9004', name: 'Under review', myRegistrationStatus: 'pending' },
    { ...event, id: 'e-5', eventCode: 'EVT-9005', name: 'Closed one', registrationState: 'closed', myRegistrationStatus: null },
  ] } } });
  const link = await screen.findByRole('link', { name: 'Community Meetup' });
  expect(link).toHaveAttribute('href', '/attendee/discover/EVT-9001');
  expect(screen.getByRole('link', { name: 'Opening later' })).toHaveAttribute('href', '/attendee/discover/e-2');
  for (const label of ['Open for registration', 'Opening soon', 'Registered', 'Pending review', 'Closed']) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getAllByText('Grand Auditorium, Level 1').length).toBeGreaterThan(0);
});

test('Discover shows an empty state and a retryable error', async () => {
  let attempt = 0;
  renderAt('/attendee/discover', { 'GET /api/attendee/events?open=1': () => (++attempt === 1
    ? { status: 503, body: { error: 'Service unavailable. Please try again.' } }
    : { body: { events: [] } }) });
  expect(await screen.findByText('Service unavailable. Please try again.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByText('No events are open for registration')).toBeInTheDocument();
});

test('TC_E09S01_06 - the event page shows its primary venue and each Session its own venue', async () => {
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form() } });
  expect(await screen.findByRole('heading', { name: 'Community Meetup' })).toBeInTheDocument();
  const sessionsCard = screen.getByRole('table', { name: 'Sessions' });
  expect(within(sessionsCard).getByText('Morning keynote')).toBeInTheDocument();
  expect(within(sessionsCard).getByText('Session 2')).toBeInTheDocument();
  expect(within(sessionsCard).getByText('Seminar Room B')).toBeInTheDocument();
  expect(screen.getAllByText('Grand Auditorium, Level 1').length).toBe(2); // Event venue + Session A.
  expect(screen.getByRole('link', { name: /Register/ })).toHaveAttribute('href', '/attendee/register/EVT-9001');
});

test('the event page marks a registered Attendee’s Sessions and explains a closed or unopened window', async () => {
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({
    registration: { id: 'r-1', status: 'registered', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-b'] },
  }) } });
  expect(await screen.findByText("You're registered for this event")).toBeInTheDocument();
  expect(screen.getByText('Selected')).toBeInTheDocument();
  expect(screen.getByText('Not selected')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^Register$/ })).not.toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({ event: { ...event, registrationState: 'closed' }, sessions: [] }) } });
  expect(await screen.findByText('Registration for this event has closed.')).toBeInTheDocument();
  expect(screen.getByText('This event has no Sessions to choose from yet.')).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({ event: { ...event, registrationState: 'not_yet_open' } }) } });
  expect(await screen.findByText(/^Registration opens on 1 Feb 2027/)).toBeInTheDocument();
});

test('TC_E09S01_05 - an unconfirmed event shows the server’s refusal', async () => {
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { status: 409,
    body: { error: 'Registration is only open for confirmed events that take registrations.' } } });
  expect(await screen.findByText('Registration is only open for confirmed events that take registrations.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Event unavailable' })).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { status: 409,
    body: { error: 'Registration is only open for confirmed events that take registrations.' } } });
  expect(await screen.findByText('Registration is only open for confirmed events that take registrations.')).toBeInTheDocument();
});

test('TC_E09S01_01 / TC_E09S01_07 - selecting two Sessions sends one registration and shows the confirmation', async () => {
  const calls = renderAt('/attendee/register/EVT-9001', {
    [FORM_URL]: { body: form() },
    [POST_URL]: { status: 201, body: {
      registration: { id: 'r-1', status: 'registered', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a', 's-b'] },
      event, sessions,
    } },
  });
  const group = await screen.findByRole('group', { name: 'Choose your Sessions' });
  expect(screen.getByText('Casey Tan')).toBeInTheDocument();
  expect(screen.getByText('+65 8123 4567')).toBeInTheDocument();
  fireEvent.click(within(group).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(within(group).getByRole('checkbox', { name: /Session 2/ }));
  fireEvent.click(within(group).getByRole('checkbox', { name: /Session 2/ }));
  fireEvent.click(within(group).getByRole('checkbox', { name: /Session 2/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect(await screen.findByText("You're registered")).toBeInTheDocument();
  const posts = calls.filter(call => call.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body).toEqual({ sessionIds: ['s-a', 's-b'] });
  const yours = screen.getByRole('table', { name: 'Sessions' });
  expect(within(yours).getByText('Morning keynote')).toBeInTheDocument();
  expect(within(yours).getByText('Session 2')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View my events' })).toHaveAttribute('href', '/attendee/events');
  await waitFor(() => expect(document.activeElement?.textContent).toContain("You're registered"));
});

test('choosing no Session blocks registration without calling the server', async () => {
  const calls = renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form() } });
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm registration' }));
  expect(screen.getByText('Choose at least one Session.')).toBeInTheDocument();
  expect(screen.getByText('Choose at least one Session, then register again.')).toBeInTheDocument();
  for (const box of within(screen.getByRole('group', { name: 'Choose your Sessions' })).getAllByRole('checkbox')) {
    expect(box).toHaveAttribute('aria-describedby', 'session-choice-error');
    expect(box).toHaveAttribute('aria-invalid', 'true');
  }
  expect(calls.some(call => call.method === 'POST')).toBe(false);
  fireEvent.click(within(screen.getByRole('group', { name: 'Choose your Sessions' })).getByRole('checkbox', { name: /Morning keynote/ }));
  expect(screen.queryByText('Choose at least one Session.')).not.toBeInTheDocument();
});

test('TC_E09S01_04 - a missing contact number is named and registration is blocked', async () => {
  const calls = renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({
    details: { ...details, contactNumber: null }, missingDetails: ['Contact number'],
  }) } });
  expect(await screen.findByText('Missing: Contact number')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Update your profile' })).toHaveAttribute('href', '/profile');
  fireEvent.click(within(screen.getByRole('group', { name: 'Choose your Sessions' })).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect(screen.getAllByText('Add your contact number to your profile before registering.').length).toBe(2);
  expect(calls.some(call => call.method === 'POST')).toBe(false);
});

test('every blank account detail reads Missing, and a Session without a venue says so', async () => {
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({
    details: { name: null, email: null, contactNumber: null }, missingDetails: ['Name', 'Email', 'Contact number'],
    sessions: [{ ...sessions[0]!, venueName: null, venueLocation: null }],
  }) } });
  expect(await screen.findByText('Missing: Name, Email, Contact number')).toBeInTheDocument();
  expect(screen.getAllByText('Missing')).toHaveLength(3);
  expect(screen.getByRole('checkbox', { name: /Venue to be confirmed/ })).toBeInTheDocument();
});

test('the server’s missing-details refusal is shown when the form had none missing', async () => {
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form() },
    [POST_URL]: { status: 400, body: { error: 'Add your contact number to your profile before registering.', missingFields: ['Contact number'] } } });
  fireEvent.click(within(await screen.findByRole('group', { name: 'Choose your Sessions' })).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect(await screen.findByText('Missing: Contact number')).toBeInTheDocument();
});

test('TC_E09S01_03 - a second registration is refused and the first is shown unchanged', async () => {
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form() },
    [POST_URL]: { status: 409, body: { error: "You're already registered for this event.",
      registration: { id: 'r-1', status: 'registered', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a'] } } } });
  fireEvent.click(within(await screen.findByRole('group', { name: 'Choose your Sessions' })).getByRole('checkbox', { name: /Session 2/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect(await screen.findByText("You're already registered for this event")).toBeInTheDocument();
  expect(screen.getByText(/Your Sessions: Morning keynote\./)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to the event' })).toHaveAttribute('href', '/attendee/discover/EVT-9001');
});

test('an existing registration, a closed window and other refusals are shown before or after submitting', async () => {
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({
    registration: { id: 'r-1', status: 'registered', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: [] },
  }) } });
  expect(await screen.findByText("You're already registered for this event")).toBeInTheDocument();
  expect(screen.queryByText(/Your Sessions:/)).not.toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({ event: { ...event, registrationState: 'closed' } }) } });
  expect(await screen.findByText('Registration for this event has closed.')).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({ event: { ...event, registrationState: 'not_yet_open' } }) } });
  expect(await screen.findByText(/^Registration opens on 1 Feb 2027/)).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({ sessions: [] }) },
    [POST_URL]: { status: 409, body: { error: 'Registration for this event has closed.', registrationState: 'closed' } } });
  expect(await screen.findByText('This event has no Sessions to choose from yet.')).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form() },
    [POST_URL]: { status: 409, body: { error: 'Registration for this event has closed.', registrationState: 'closed' } } });
  fireEvent.click(within(await screen.findByRole('group', { name: 'Choose your Sessions' })).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Registration for this event has closed.');
});

test('leaving the form while registering drops the late reply', async () => {
  let release!: () => void;
  const calls = stubApi({ [FORM_URL]: { body: form() }, [POST_URL]: () => new Promise(resolve => {
    release = () => resolve({ status: 201, body: { registration: { id: 'r-1', status: 'registered', registeredAt: '', sessionIds: ['s-a'] }, event, sessions } });
  }) }, { role: 'attendee' });
  render(
    <MemoryRouter initialEntries={['/attendee/register/EVT-9001']}>
      <Link to="/elsewhere">Leave</Link>
      <Routes>
        <Route path="/attendee/register/:eventCode" element={<RegisterForEvent />} />
        <Route path="/elsewhere" element={<h1>Elsewhere</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(within(await screen.findByRole('group', { name: 'Choose your Sessions' })).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  await waitFor(() => expect(calls.some(call => call.method === 'POST')).toBe(true));
  fireEvent.click(screen.getByText('Leave'));
  await act(async () => { release(); });
  expect(screen.getByRole('heading', { name: 'Elsewhere' })).toBeInTheDocument();
  expect(screen.queryByText("You're registered")).not.toBeInTheDocument();
});

test.each([
  ['success', { status: 200, body: form({ event: { ...event, eventCode: 'EVT-A', name: 'Event A' } }) }],
  ['error', { status: 503, body: { error: 'Event A failed' } }],
])('a late %s for event A does not replace event B on the event page', async (_kind, lateReply) => {
  let releaseA!: (reply: { status: number; body: unknown }) => void;
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const id = new URL(input, 'http://localhost').searchParams.get('id') ?? '';
    requested.push(id);
    const reply = id === 'EVT-A'
      ? await new Promise<{ status: number; body: unknown }>(resolve => { releaseA = resolve; })
      : { status: 200, body: form({ event: { ...event, eventCode: 'EVT-B', name: 'Event B' } }) };
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  render(
    <MemoryRouter initialEntries={['/attendee/discover/EVT-A']}>
      <Link to="/attendee/discover/EVT-B">Open event B</Link>
      <Routes><Route path="/attendee/discover/:eventCode" element={<EventDetail />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(requested).toContain('EVT-A'));
  fireEvent.click(screen.getByText('Open event B'));
  await waitFor(() => expect(requested).toContain('EVT-B'));
  expect(await screen.findByRole('heading', { name: 'Event B' })).toBeInTheDocument();
  await act(async () => { releaseA(lateReply); });
  expect(screen.getByRole('heading', { name: 'Event B' })).toBeInTheDocument();
  expect(screen.queryByText('Event A')).not.toBeInTheDocument();
  expect(screen.queryByText('Event A failed')).not.toBeInTheDocument();
});

// ─── E09-S02 capacity (SCRUM-211) ───────────────────────────────────────

test('TC_E09S02_09 - choosing a full Session marks it and sends the request for review, then says it is Pending', async () => {
  const calls = renderAt('/attendee/register/EVT-9001', {
    [FORM_URL]: { body: form({ capacity: { eventFull: false, waitlistEnabled: false, fullSessionIds: ['s-a'] } }) },
    [POST_URL]: { status: 201, body: {
      registration: { id: 'r-1', status: 'pending', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a'] }, event, sessions: [sessions[0]],
    } },
  });
  const group = await screen.findByRole('group', { name: 'Choose your Sessions' });
  const morning = within(group).getByRole('checkbox', { name: /Morning keynote/ });
  expect(morning.closest('label')).toHaveTextContent('Full');
  expect(within(group).getByRole('checkbox', { name: /Session 2/ }).closest('label')).not.toHaveTextContent('Full');
  expect(screen.getByRole('button', { name: 'Confirm registration' })).toBeInTheDocument();
  fireEvent.click(morning);
  expect(screen.getByText('A Session you chose is full, so your request goes to the organiser to review.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send request for review' }));
  expect(await screen.findByText('Request sent for review')).toBeInTheDocument();
  expect(screen.queryByText("You're registered")).not.toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST')[0]!.body).toEqual({ sessionIds: ['s-a'] });
});

test('TC_E09S02_04 - a full event with its waiting list on offers the list alongside a request for review', async () => {
  renderAt('/attendee/register/EVT-9001', {
    [FORM_URL]: { body: form({ capacity: { eventFull: true, waitlistEnabled: true, fullSessionIds: ['s-a', 's-b'] } }) },
  });
  expect(await screen.findByText('This event is full')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Join the waiting list' })).toHaveAttribute('href', '/attendee/waitlist/EVT-9001');
  // No per-Session waiting list (T-98, O-50): only the Event-level link.
  expect(screen.getAllByRole('link', { name: /waiting list/i })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Send request for review' })).toBeInTheDocument();
  expect(screen.queryByText('A Session you chose is full, so your request goes to the organiser to review.')).not.toBeInTheDocument();
});

test('a full event with its waiting list off offers only a request for review, on the event page too', async () => {
  renderAt('/attendee/discover/EVT-9001', {
    [FORM_URL]: { body: form({ capacity: { eventFull: true, waitlistEnabled: false, fullSessionIds: ['s-a', 's-b'] } }) },
  });
  expect(await screen.findByText('This event is full')).toBeInTheDocument();
  expect(screen.getByText('You can still send a registration request. The organiser reviews requests over capacity.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Join the waiting list' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
});

test('a Pending request is described as waiting for the organiser, on the event page and the form', async () => {
  const pending = { id: 'r-1', status: 'pending', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a'] };
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({ registration: pending, capacity: { eventFull: true, waitlistEnabled: true, fullSessionIds: [] } }) } });
  expect(await screen.findByText('Your request is waiting for the organiser')).toBeInTheDocument();
  expect(screen.queryByText('This event is full')).not.toBeInTheDocument();
  cleanup();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({ registration: pending }) } });
  expect(await screen.findByText('You already have a request waiting for the organiser')).toBeInTheDocument();
});

test('a waitlisted registration is described consistently on the event page and form', async () => {
  const waitlisted = { id: 'r-1', status: 'waitlisted', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a'] };
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({ registration: waitlisted }) } });
  expect(await screen.findByText("You're on the waiting list")).toBeInTheDocument();
  cleanup();
  renderAt('/attendee/register/EVT-9001', { [FORM_URL]: { body: form({ registration: waitlisted }) } });
  expect(await screen.findByText("You're already on the waiting list for this event")).toBeInTheDocument();
});

// ─── E09-S05 withdrawal (SCRUM-220) ─────────────────────────────────────

// More specific than POST_URL, so it must come first in each stub (stubApi matches by parameters).
const WITHDRAW_URL = 'POST /api/attendee/events?registration=1&withdraw=1&id=EVT-9001';
const registered = { id: 'r-1', status: 'registered', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: ['s-a', 's-b'] };
const withdrawnReply = { body: { registration: { id: 'r-1', status: 'withdrawn', withdrawnAt: '2027-03-02T00:00:00.000Z' } } };

test('an approved place shows the deadline, asks to confirm, then reads as not registered (D100, D101, D102)', async () => {
  const calls = renderAt('/attendee/discover/EVT-9001', {
    [WITHDRAW_URL]: withdrawnReply,
    [FORM_URL]: { body: form({ registration: registered, event: { ...event, withdrawalDeadline: '2027-03-25T15:59:59.000Z' },
      withdrawal: { open: true, contact: null } }) },
  });
  expect(await screen.findByText(/^You can withdraw until 25 Mar 2027/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw…' }));
  const panel = screen.getByRole('form', { name: 'Withdraw your registration?' });
  expect(within(panel).getByText(/Your place in every Session you chose is released/)).toBeInTheDocument();
  fireEvent.click(within(panel).getByRole('button', { name: 'Withdraw registration' }));
  expect(await screen.findByText('Registration withdrawn. Your place in every Session you chose has been released.')).toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST').map(call => call.url.search)).toEqual(['?registration=1&withdraw=1&id=EVT-9001']);
  expect(screen.queryByText("You're registered for this event")).not.toBeInTheDocument();
  expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  expect(screen.getByText('Open for registration')).toBeInTheDocument();
  // The capacity on screen predates the withdrawal, so Register stays hidden until the page is reopened.
  expect(screen.queryByRole('link', { name: /^Register$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Withdraw…' })).not.toBeInTheDocument();
});

test('a Pending request can be withdrawn until the event starts, with its own wording (D88, D106)', async () => {
  const pending = { ...registered, status: 'pending' };
  renderAt('/attendee/discover/EVT-9001', {
    [WITHDRAW_URL]: withdrawnReply,
    [FORM_URL]: { body: form({ registration: pending, event: { ...event, withdrawalDeadline: '2027-02-01T00:00:00.000Z' },
      withdrawal: { open: true, contact: null } }) },
  });
  expect(await screen.findByText('You can withdraw until the event starts.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw request…' }));
  fireEvent.click(within(screen.getByRole('form', { name: 'Withdraw your request?' })).getByRole('button', { name: 'Withdraw request' }));
  expect(await screen.findByText('Request withdrawn. The organiser will not review it.')).toBeInTheDocument();
});

test('after the deadline the contact replaces the button; a waitlisted entry gets no button here (TC_E09S05_03 screen, D89)', async () => {
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({ registration: registered,
    event: { ...event, registrationState: 'closed' }, withdrawal: { open: false, contact: 'events@client.example.test' } }) } });
  expect(await screen.findByText('Withdrawal has closed')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'events@client.example.test' })).toHaveAttribute('href', 'mailto:events@client.example.test');
  expect(screen.queryByRole('button', { name: /^Withdraw/ })).not.toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/discover/EVT-9001', { [FORM_URL]: { body: form({ registration: { ...registered, status: 'waitlisted' },
    withdrawal: { open: true, contact: null } }) } });
  expect(await screen.findByText("You're on the waiting list")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Withdraw/ })).not.toBeInTheDocument();
});

test('a refused withdrawal shows the server sentence in the panel, and Cancel goes back', async () => {
  renderAt('/attendee/discover/EVT-9001', {
    [WITHDRAW_URL]: { status: 409, body: { error: 'Withdrawal has closed. For help, contact events@client.example.test.' } },
    // A deadline after the start isn't promised: the server closes withdrawal at the start.
    [FORM_URL]: { body: form({ registration: registered, event: { ...event, withdrawalDeadline: '2027-04-02T00:00:00.000Z' },
      withdrawal: { open: true, contact: null } }) },
  });
  expect(await screen.findByText('You can withdraw until the event starts.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw registration' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Withdrawal has closed. For help, contact events@client.example.test.');
  expect(screen.getByText("You're registered for this event")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Withdraw…' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('withdrawing works under StrictMode, and leaving the page drops a late reply', async () => {
  let release!: () => void;
  const renderStrict = () => {
    const calls = stubApi({
      [WITHDRAW_URL]: () => new Promise(resolve => { release = () => resolve(withdrawnReply); }),
      [FORM_URL]: { body: form({ registration: registered, withdrawal: { open: true, contact: null } }) },
    }, { role: 'attendee' });
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/attendee/discover/EVT-9001']}>
          <Link to="/elsewhere">Leave</Link>
          <Routes>
            <Route path="/attendee/discover/:eventCode" element={<EventDetail />} />
            <Route path="/elsewhere" element={<h1>Elsewhere</h1>} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
    return calls;
  };
  const calls = renderStrict();
  fireEvent.click(await screen.findByRole('button', { name: 'Withdraw…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw registration' }));
  await waitFor(() => expect(calls.some(call => call.method === 'POST')).toBe(true));
  expect(screen.getByRole('button', { name: 'Withdrawing…' })).toBeInTheDocument();
  await act(async () => { release(); });
  expect(await screen.findByText(/^Registration withdrawn\./)).toBeInTheDocument();
  // Second round: leave while the reply is outstanding.
  cleanup(); vi.unstubAllGlobals();
  renderStrict();
  fireEvent.click(await screen.findByRole('button', { name: 'Withdraw…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw registration' }));
  fireEvent.click(screen.getByText('Leave'));
  await act(async () => { release(); });
  expect(screen.getByRole('heading', { name: 'Elsewhere' })).toBeInTheDocument();
  expect(screen.queryByText(/^Registration withdrawn\./)).not.toBeInTheDocument();
});

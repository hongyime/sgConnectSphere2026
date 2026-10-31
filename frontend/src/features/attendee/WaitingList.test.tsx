import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { WaitingList } from './WaitingList';
import { RegisterForEvent } from './EventRegistration';
import type { PublicEvent, RegistrationForm } from './registrationApi';
import { deferred, stubApi, type FakeHandler } from '../../testing/fakeApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const event: PublicEvent = {
  id: 'e-1', eventCode: 'EVT-9001', name: 'Community Meetup',
  startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z',
  venueName: 'Grand Auditorium', venueLocation: 'Level 1', registrationState: 'open',
  opensAt: '2027-02-01T00:00:00.000Z', closesAt: '2027-03-30T00:00:00.000Z', withdrawalDeadline: null,
};
const waiting = { id: 'r-1', status: 'waitlisted', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: [] };
const sessions = [{ id: 's-a', title: 'Session A', startsAt: event.startsAt, endsAt: event.endsAt, venueName: 'Grand Auditorium', venueLocation: 'Level 1' }];

function form(overrides: Partial<RegistrationForm> = {}): RegistrationForm {
  return { event, sessions, details: { name: 'Casey Tan', email: 'casey@example.test', contactNumber: '+65 8123 4567' },
    missingDetails: [], registration: null, capacity: { eventFull: true, waitlistEnabled: true, fullSessionIds: [] },
    withdrawal: null, ...overrides };
}

const FORM = 'GET /api/attendee/events?registration=1&id=EVT-9001';
const JOIN = 'POST /api/attendee/events?waitlist=1&id=EVT-9001';
const LEAVE = 'POST /api/attendee/events?registration=1&withdraw=1&id=EVT-9001';

function renderAt(path: string, handlers: Record<string, FakeHandler>) {
  const calls = stubApi(handlers, { role: 'attendee' });
  render(<StrictMode><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/attendee/waitlist/:eventCode" element={<WaitingList />} />
    <Route path="/attendee/register/:eventCode" element={<RegisterForEvent />} />
    <Route path="/attendee/discover/:eventCode" element={<h1>Event page</h1>} />
  </Routes></MemoryRouter></StrictMode>);
  return calls;
}

test('TC_E09S04_01 - join a full enabled Event and show position-free status and claim link', async () => {
  let current = form();
  const calls = renderAt('/attendee/waitlist/EVT-9001', {
    [FORM]: () => ({ body: current }),
    [JOIN]: () => { current = form({ registration: waiting, withdrawal: { open: true, contact: null } }); return { status: 201, body: { registration: waiting, event } }; },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Join the waiting list' }));
  expect(await screen.findByText("You're on the waiting list")).toBeInTheDocument();
  expect(screen.getByText(/Everyone on the list is notified; joining does not reserve a place/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Claim a released place' })).toHaveAttribute('href', '/attendee/register/EVT-9001?claim=1');
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({});
  expect(await screen.findByRole('button', { name: 'Leave waiting list…' })).toBeInTheDocument();
});

test('TC_E09S04_05 - cancel leaving, then confirm leaving and offer rejoin', async () => {
  let current = form({ registration: waiting, withdrawal: { open: true, contact: null } });
  const calls = renderAt('/attendee/waitlist/EVT-9001', {
    [FORM]: () => ({ body: current }),
    [JOIN]: () => { current = form({ registration: waiting, withdrawal: { open: true, contact: null } }); return { status: 201, body: { registration: waiting, event } }; },
    [LEAVE]: () => { current = form(); return { body: { registration: { id: 'r-1', status: 'withdrawn', withdrawnAt: event.startsAt } } }; },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Leave waiting list…' }));
  expect(screen.getByRole('form', { name: 'Leave the waiting list?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByText("You're on the waiting list")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave waiting list…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Leave waiting list' }));
  expect(await screen.findByText(/You've left the waiting list/)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Join again' })).toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Join again' }));
  expect(await screen.findByText("You're on the waiting list")).toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(2);
});

test('TC_E09S04_02 - join errors stay visible and a place race can be retried', async () => {
  let attempt = 0;
  renderAt('/attendee/waitlist/EVT-9001', {
    [FORM]: { body: form() },
    [JOIN]: () => (++attempt === 1
      ? { status: 409, body: { error: 'This event has places available; register directly.' } }
      : { status: 409, body: { error: 'That place has just been taken; you\'re still on the waiting list.' } }),
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Join the waiting list' }));
  expect(await screen.findByText('This event has places available; register directly.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Join the waiting list' }));
  expect(await screen.findByText(/That place has just been taken/)).toBeInTheDocument();
});

test('TC_E09S04_04 - full Events with the list disabled do not offer joining', async () => {
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ capacity: { eventFull: true, waitlistEnabled: false, fullSessionIds: [] } }) } });
  expect(await screen.findByText('This event is full and the Organiser has disabled its waiting list.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /join the waiting list/i })).not.toBeInTheDocument();
});

test('an Event with room points to registration, and an active registration cannot join the list', async () => {
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ capacity: { eventFull: false, waitlistEnabled: true, fullSessionIds: [] } }) } });
  expect(await screen.findByRole('link', { name: 'Register for the event' })).toHaveAttribute('href', '/attendee/register/EVT-9001');
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ registration: { ...waiting, status: 'pending' } }) } });
  expect(await screen.findByText('Your request is with the organiser')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /join the waiting list/i })).not.toBeInTheDocument();
});

test('a closed list stays visible without a claim or leave action, and closed registration explains why joining is unavailable', async () => {
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({
    event: { ...event, registrationState: 'closed' }, registration: waiting,
    withdrawal: { open: false, contact: 'organiser@example.test' },
  }) } });
  expect(await screen.findByText("You're on the waiting list")).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Claim a released place' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Leave waiting list…' })).not.toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();

  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ event: { ...event, registrationState: 'closed' } }) } });
  expect(await screen.findByText('Registration for this event is not open, so the waiting list cannot be joined.')).toBeInTheDocument();
});

test('a registered attendee sees why they cannot join the waiting list', async () => {
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ registration: { ...waiting, status: 'registered' } }) } });
  expect(await screen.findByText('You already have a registration')).toBeInTheDocument();
});

test('leave failures keep the confirmation open and show the server response', async () => {
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ registration: waiting, withdrawal: { open: true, contact: null } }) },
    [LEAVE]: { status: 409, body: { error: 'The waiting list entry can no longer be withdrawn.' } } });
  fireEvent.click(await screen.findByRole('button', { name: 'Leave waiting list…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Leave waiting list' }));
  await waitFor(() => expect(screen.getByRole('form', { name: 'Leave the waiting list?' }))
    .toHaveTextContent('The waiting list entry can no longer be withdrawn.'));
});

test('failed status loads offer a retry', async () => {
  let attempt = 0;
  renderAt('/attendee/waitlist/EVT-9001', { [FORM]: () => (++attempt <= 2
    ? { status: 503, body: { error: 'Waiting list is unavailable.' } } : { body: form() }) });
  expect(await screen.findByText("Couldn't load this waiting list")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('button', { name: 'Join the waiting list' })).toBeInTheDocument();
});

test('late join and leave responses after unmount do not update the screen', async () => {
  const joinReply = deferred<{ status: number; body: unknown }>();
  const joining = renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form() }, [JOIN]: () => joinReply.promise });
  fireEvent.click(await screen.findByRole('button', { name: 'Join the waiting list' }));
  await waitFor(() => expect(joining.some(call => call.method === 'POST')).toBe(true));
  cleanup();
  await act(async () => { joinReply.resolve({ status: 201, body: { registration: waiting, event } }); });
  vi.unstubAllGlobals();

  const leaveReply = deferred<{ status: number; body: unknown }>();
  const leaving = renderAt('/attendee/waitlist/EVT-9001', { [FORM]: { body: form({ registration: waiting, withdrawal: { open: true, contact: null } }) },
    [LEAVE]: () => leaveReply.promise });
  fireEvent.click(await screen.findByRole('button', { name: 'Leave waiting list…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Leave waiting list' }));
  await waitFor(() => expect(leaving.some(call => call.method === 'POST')).toBe(true));
  cleanup();
  await act(async () => { leaveReply.resolve({ status: 200, body: { registration: { ...waiting, status: 'withdrawn' } } }); });
});

test('TC_E09S04_03 - claiming sends the chosen Session through the registration flow', async () => {
  const calls = renderAt('/attendee/register/EVT-9001?claim=1', {
    [FORM]: { body: form({ registration: waiting }) },
    'POST /api/attendee/events?registration=1&id=EVT-9001': { status: 201, body: {
      registration: { id: waiting.id, status: 'registered', registeredAt: event.startsAt, sessionIds: ['s-a'] }, event, sessions,
    } },
  });
  fireEvent.click(await screen.findByRole('checkbox', { name: /Session A/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Claim a place' }));
  expect(await screen.findByText("You're registered")).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ sessionIds: ['s-a'], claimWaitlist: true });
});

test('a taken place keeps the claim form and its error; a stale claim link is refused', async () => {
  renderAt('/attendee/register/EVT-9001?claim=1', {
    [FORM]: { body: form({ registration: waiting }) },
    'POST /api/attendee/events?registration=1&id=EVT-9001': { status: 409,
      body: { error: "That place has just been taken; you're still on the waiting list." } },
  });
  fireEvent.click(await screen.findByRole('checkbox', { name: /Session A/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Claim a place' }));
  expect(await screen.findByText(/That place has just been taken/)).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  renderAt('/attendee/register/EVT-9001?claim=1', { [FORM]: { body: form() } });
  expect(await screen.findByText("You're no longer on the waiting list for this event.")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Claim a place' })).not.toBeInTheDocument();
});

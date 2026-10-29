// E09-S02 (SCRUM-211) Organiser registrations page against a stubbed fetch
// shaped like api/events.ts ?registrations=1. The server owns the capacity
// rules; these tests check the page shows its answers and sends the right actions.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { EventRegistrationsPage } from './EventRegistrations';
import type { EventRegistrations } from './registrationsApi';
import { stubApi, type FakeHandler } from '../../testing/fakeApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const sessions = [
  { id: 's-a', title: 'Morning keynote', startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T04:00:00.000Z',
    venueName: 'Grand Auditorium', venueLocation: 'Level 1', capacity: 80, registered: 80 },
  { id: 's-b', title: null, startsAt: '2027-04-01T05:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z',
    venueName: null, venueLocation: null, capacity: 40, registered: 12 },
];
const casey = { id: 'r-1', name: 'Casey Tan', email: 'casey@example.test', requestedAt: '2027-03-01T02:00:00.000Z',
  sessionIds: ['s-a'], overCapacity: '"Morning keynote" is full (80 of 80 places).' };
const dana = { id: 'r-2', name: null, email: 'dana@example.test', requestedAt: '2027-03-01T03:00:00.000Z', sessionIds: ['s-b', 's-x'], overCapacity: null };

function view(overrides: Partial<EventRegistrations> = {}): EventRegistrations {
  return {
    event: { id: 'e-1', eventCode: 'EVT-2001', name: 'Community Meetup', status: 'confirmed', waitlistEnabled: true,
      startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z', registrationEnabled: true,
      opensAt: null, closesAt: null, withdrawalDeadline: null, canManage: true },
    capacity: { capacity: 120, registered: 92, remaining: 28 }, sessions, pending: [casey, dana], registered: [], waitlisted: [], ...overrides,
  };
}

const URL_ = 'GET /api/events?registrations=1&id=EVT-2001';
const POST = 'POST /api/events?registrations=1&id=EVT-2001';

function renderPage(handlers: Record<string, FakeHandler>) {
  const calls = stubApi(handlers, { role: 'event_organiser' });
  render(
    <MemoryRouter initialEntries={['/organiser/requests/EVT-2001/registrations']}>
      <Link to="/elsewhere">Leave</Link>
      <Routes>
        <Route path="/organiser/requests/:eventCode/registrations" element={<EventRegistrationsPage />} />
        <Route path="/elsewhere" element={<h1>Elsewhere</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return calls;
}

const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST').map(call => call.body);

test('TC_E09S02_12 - places per Session add up to the event, with full Sessions and pending reasons shown', async () => {
  renderPage({ [URL_]: { body: view() } });
  expect(await screen.findByRole('heading', { name: 'Registrations · Community Meetup' })).toBeInTheDocument();
  expect(screen.getByText(/^92 of 120 taken/)).toBeInTheDocument();
  expect(screen.getByText('On, 0 waiting')).toBeInTheDocument();
  const placesTable = screen.getByRole('table', { name: 'Places by Session' });
  const morning = within(placesTable).getByText('Morning keynote').closest('tr')!;
  expect(morning).toHaveTextContent('80 of 80');
  expect(morning).toHaveTextContent('Full');
  const second = within(placesTable).getByText('Session 2').closest('tr')!;
  expect(second).toHaveTextContent('No confirmed venue');
  expect(second).not.toHaveTextContent('Full');
  const pending = screen.getByRole('table', { name: 'Pending requests' });
  const caseyRow = within(pending).getByText('Casey Tan').closest('tr')!;
  expect(caseyRow).toHaveTextContent('"Morning keynote" is full (80 of 80 places).');
  // Scenario 3: no approving while a limit is full.
  expect(within(caseyRow).getByRole('button', { name: 'Approve' })).toBeDisabled();
  const danaRow = within(pending).getAllByText('dana@example.test')[0]!.closest('tr')!;
  expect(danaRow).toHaveTextContent('Fits');
  expect(danaRow).toHaveTextContent('Session 2, Removed Session');
  expect(within(danaRow).getByRole('button', { name: 'Approve' })).toBeEnabled();
});

test('TC_E09S02_11 - approving a request that fits sends it and shows the refreshed places', async () => {
  const calls = renderPage({
    [URL_]: { body: view() },
    [POST]: { body: view({ capacity: { capacity: 120, registered: 93, remaining: 27 }, pending: [casey] }) },
  });
  const danaRow = (await screen.findAllByText('dana@example.test'))[0]!.closest('tr')!;
  fireEvent.click(within(danaRow).getByRole('button', { name: 'Approve' }));
  expect(await screen.findByText('dana@example.test is now registered.')).toBeInTheDocument();
  expect(posts(calls)).toEqual([{ action: 'approve', registrationId: 'r-2' }]);
  expect(screen.getByText(/^93 of 120 taken/)).toBeInTheDocument();
  expect(screen.queryAllByText('dana@example.test')).toHaveLength(0);
});

test('the server refusing an approval is shown and the list is left as it was', async () => {
  renderPage({ [URL_]: { body: view() }, [POST]: { status: 409, body: { error: "Can't approve yet. The event is full (120 of 120 places)." } } });
  const danaRow = (await screen.findAllByText('dana@example.test'))[0]!.closest('tr')!;
  fireEvent.click(within(danaRow).getByRole('button', { name: 'Approve' }));
  expect(await screen.findByText("Can't approve yet. The event is full (120 of 120 places).")).toBeInTheDocument();
  expect(screen.getByText(/^92 of 120 taken/)).toBeInTheDocument();
});

test('declining asks once more, can be kept, and then declines the request', async () => {
  const calls = renderPage({ [URL_]: { body: view() }, [POST]: { body: view({ pending: [dana] }) } });
  const caseyRow = (await screen.findByText('Casey Tan')).closest('tr')!;
  fireEvent.click(within(caseyRow).getByRole('button', { name: 'Decline' }));
  fireEvent.click(within(caseyRow).getByRole('button', { name: 'Keep' }));
  expect(posts(calls)).toEqual([]);
  fireEvent.click(within(caseyRow).getByRole('button', { name: 'Decline' }));
  fireEvent.click(within(caseyRow).getByRole('button', { name: 'Decline request' }));
  expect(await screen.findByText("Casey Tan's request was declined.")).toBeInTheDocument();
  expect(posts(calls)).toEqual([{ action: 'reject', registrationId: 'r-1' }]);
  expect(screen.queryByText('Casey Tan')).not.toBeInTheDocument();
});

test('a failed decline keeps the confirm step open', async () => {
  renderPage({ [URL_]: { body: view() }, [POST]: { status: 409, body: { error: 'This request has already been decided. Refresh the list.' } } });
  const caseyRow = (await screen.findByText('Casey Tan')).closest('tr')!;
  fireEvent.click(within(caseyRow).getByRole('button', { name: 'Decline' }));
  fireEvent.click(within(caseyRow).getByRole('button', { name: 'Decline request' }));
  expect(await screen.findByText('This request has already been decided. Refresh the list.')).toBeInTheDocument();
  expect(within(caseyRow).getByRole('button', { name: 'Decline request' })).toBeInTheDocument();
});

test('TC_E09S02_06 - a manual addition checks its fields, then adds the attendee and clears the form', async () => {
  const calls = renderPage({
    [URL_]: { body: view() },
    [POST]: { status: 201, body: view({ capacity: { capacity: 120, registered: 93, remaining: 27 }, sessions: [sessions[0]!, { ...sessions[1]!, registered: 13 }] }) },
  });
  const form = (await screen.findByRole('button', { name: 'Add attendee' })).closest('form')!;
  fireEvent.click(within(form).getByRole('button', { name: 'Add attendee' }));
  expect(within(form).getByText("Enter the attendee's email address.")).toBeInTheDocument();
  expect(within(form).getByText('Choose at least one Session.')).toBeInTheDocument();
  expect(posts(calls)).toEqual([]);
  const email = within(form).getByLabelText("Attendee's account email");
  fireEvent.change(email, { target: { value: ' vip@example.test ' } });
  expect(within(form).queryByText("Enter the attendee's email address.")).not.toBeInTheDocument();
  const group = within(form).getByRole('group', { name: 'Attendee and Sessions' });
  expect(within(group).getByRole('checkbox', { name: /Morning keynote/ }).closest('label')).toHaveTextContent('Full');
  fireEvent.click(within(group).getByRole('checkbox', { name: /Session 2/ }));
  fireEvent.click(within(group).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(within(group).getByRole('checkbox', { name: /Morning keynote/ }));
  expect(within(form).queryByText('Choose at least one Session.')).not.toBeInTheDocument();
  fireEvent.click(within(form).getByRole('button', { name: 'Add attendee' }));
  expect(await screen.findByText('vip@example.test is registered and marked as a manual addition.')).toBeInTheDocument();
  expect(posts(calls)).toEqual([{ action: 'add', email: 'vip@example.test', sessionIds: ['s-b'] }]);
  expect(within(form).getByLabelText("Attendee's account email")).toHaveValue('');
  expect(within(form).getByRole('checkbox', { name: /Session 2/ })).not.toBeChecked();
});

test('TC_E09S02_07 - a blocked manual addition shows why and keeps what was entered', async () => {
  renderPage({ [URL_]: { body: view() }, [POST]: { status: 409, body: { error: 'Can\'t add them. "Morning keynote" is full (80 of 80 places).' } } });
  const form = (await screen.findByRole('button', { name: 'Add attendee' })).closest('form')!;
  fireEvent.change(within(form).getByLabelText("Attendee's account email"), { target: { value: 'vip@example.test' } });
  fireEvent.click(within(form).getByRole('checkbox', { name: /Morning keynote/ }));
  fireEvent.click(within(form).getByRole('button', { name: 'Add attendee' }));
  expect(await screen.findByText('Can\'t add them. "Morning keynote" is full (80 of 80 places).')).toBeInTheDocument();
  expect(within(form).getByLabelText("Attendee's account email")).toHaveValue('vip@example.test');
});

test('an unconfirmed event, an empty list and a load failure are each explained', async () => {
  renderPage({ [URL_]: { body: view({ event: { ...view().event, status: 'planning', waitlistEnabled: false, eventCode: null }, pending: [] }) } });
  expect(await screen.findByText('Registrations can be managed once the event is Confirmed.')).toBeInTheDocument();
  expect(screen.getByText('No pending requests')).toBeInTheDocument();
  expect(screen.getByText('Off')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add attendee' })).toBeDisabled();
  cleanup();
  renderPage({ [URL_]: { body: view({ capacity: { capacity: 120, registered: 120, remaining: 0 } }) } });
  expect(await screen.findByText(/^120 of 120 taken/)).toBeInTheDocument();
  cleanup();
  renderPage({ [URL_]: { status: 404, body: { error: 'Event not found.' } } });
  expect(await screen.findByRole('heading', { name: 'Registrations unavailable' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Back to the event' })[0]).toHaveAttribute('href', '/organiser/requests/EVT-2001');
});

test('leaving the page while an approval is saving drops the late reply', async () => {
  let release!: () => void;
  const calls = renderPage({ [URL_]: { body: view() }, [POST]: () => new Promise(resolve => {
    release = () => resolve({ body: view({ pending: [] }) });
  }) });
  const danaRow = (await screen.findAllByText('dana@example.test'))[0]!.closest('tr')!;
  fireEvent.click(within(danaRow).getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(calls.some(call => call.method === 'POST')).toBe(true));
  expect(within(danaRow).getByRole('button', { name: /Approving/ })).toBeInTheDocument();
  fireEvent.click(screen.getByText('Leave'));
  await act(async () => { release(); });
  expect(screen.getByRole('heading', { name: 'Elsewhere' })).toBeInTheDocument();
});

// ─── E09-S07 registration list (SCRUM-217) ───────────────────────────────

const ann = { id: 'r-a', name: 'Attendee A', email: 'attendee_a@example.com', contactNumber: '+65 9123 4567', sessionIds: ['s-a', 's-b'],
  registeredAt: '2027-03-01T02:00:00.000Z', manuallyAdded: false };
const ben = { id: 'r-b', name: null, email: 'attendee_b@example.com', contactNumber: null, sessionIds: ['s-b'],
  registeredAt: '2027-03-01T03:00:00.000Z', manuallyAdded: true };
const wai = { id: 'w-1', name: 'Attendee I', email: 'attendee_i@example.com', contactNumber: '+65 9500 0009', sessionIds: ['s-a'], joinedAt: '2027-03-02T02:00:00.000Z' };
const jay = { id: 'w-2', name: null, email: 'attendee_j@example.com', contactNumber: '+65 9500 0010', sessionIds: ['s-a'], joinedAt: '2027-03-02T03:00:00.000Z' };

test('TC_E09S07_01, _02 - the registered list shows name, email and contact number, with the count and places remaining', async () => {
  renderPage({ [URL_]: { body: view({ registered: [ann, ben], capacity: { capacity: 150, registered: 100, remaining: 50 } }) } });
  expect(await screen.findByText('100 registered')).toBeInTheDocument();
  expect(screen.getByText('50 remaining')).toBeInTheDocument();
  const list = screen.getByRole('table', { name: 'Registered attendees' });
  const first = within(list).getByText('Attendee A').closest('tr')!;
  expect(first).toHaveTextContent('attendee_a@example.com');
  expect(first).toHaveTextContent('+65 9123 4567');
  expect(first).toHaveTextContent('Morning keynote, Session 2');
  expect(first).not.toHaveTextContent('Added manually');
  // No name on file falls back to the email; no contact number says so.
  const second = within(list).getAllByText('attendee_b@example.com')[0]!.closest('tr')!;
  expect(second).toHaveTextContent('Not given');
  expect(second).toHaveTextContent('Added manually');
  expect(screen.getByRole('heading', { name: 'Registered attendees (2)' })).toBeInTheDocument();
});

test('TC_E09S07_04 - waitlisted Attendees are listed separately, in joining order', async () => {
  renderPage({ [URL_]: { body: view({ registered: [ann], waitlisted: [wai, jay] }) } });
  const waiting = await screen.findByRole('table', { name: 'Waiting list' });
  expect(screen.getByRole('heading', { name: 'Waiting list (2)' })).toBeInTheDocument();
  expect(screen.getByText('On, 2 waiting')).toBeInTheDocument();
  const rows = within(waiting).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('1');
  expect(rows[0]).toHaveTextContent('Attendee I');
  // No name on file: the email stands in.
  expect(rows[1]).toHaveTextContent('attendee_j@example.com');
  // Neither list mixes the other's people.
  expect(within(screen.getByRole('table', { name: 'Registered attendees' })).queryByText('Attendee I')).not.toBeInTheDocument();
  expect(within(waiting).queryByText('Attendee A')).not.toBeInTheDocument();
});

test('empty lists say so, and a closed waiting list says it is off', async () => {
  renderPage({ [URL_]: { body: view({ event: { ...view().event, waitlistEnabled: false } }) } });
  expect(await screen.findByText('No one has registered yet')).toBeInTheDocument();
  expect(screen.getByText('The waiting list is off for this event.')).toBeInTheDocument();
  cleanup();
  renderPage({ [URL_]: { body: view() } });
  expect(await screen.findByText('No one is on the waiting list.')).toBeInTheDocument();
});

test("a colleague's event shows the lists but no decisions or manual additions", async () => {
  renderPage({ [URL_]: { body: view({ event: { ...view().event, canManage: false }, registered: [ann] }) } });
  expect(await screen.findByText("This is a colleague's event. You can see its registrations; only its Organiser can approve requests or add attendees.")).toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: 'Registered attendees' })).getByText('Attendee A')).toBeInTheDocument();
  const pending = screen.getByRole('table', { name: 'Pending requests' });
  expect(within(pending).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  expect(within(pending).queryByText('Decision')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Add an attendee manually' })).not.toBeInTheDocument();
});

test("TC_E09S07_03 - another organisation's event is refused", async () => {
  renderPage({ [URL_]: { status: 403, body: { error: 'Access denied. This event is not available to your organisation.' } } });
  expect(await screen.findByText('Access denied. This event is not available to your organisation.')).toBeInTheDocument();
  expect(screen.queryByRole('table', { name: 'Registered attendees' })).not.toBeInTheDocument();
});

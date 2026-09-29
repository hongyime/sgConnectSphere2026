// Behaviour of the live E03-S01 Coordinator screens against a stubbed API:
// reassignment request (Scenario 3), refusals (Scenario 6), accept/decline
// (Scenarios 4 and 5), and the empty, error and sign-in states.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { CoordinatorHome, Reassignments, RequestDetail, ReviewQueue } from './CoordinatorWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

type Handler = (url: URL, init?: RequestInit) => { status: number; body: unknown } | undefined;

function stub(handler: Handler) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    calls.push({ url, init });
    const reply = url.pathname === '/api/auth/session'
      ? { status: 200, body: { user: { id: 'c-a', email: 'coord_a@example.com', role: 'event_coordinator', clientOrgId: null } } }
      : url.pathname === '/api/notifications'
        ? { status: 200, body: { notifications: [] } }
        : handler(url, init) ?? { status: 404, body: { error: 'Unexpected request' } };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return calls;
}

const baseEvent = {
  id: 'evt-1004', event_code: 'EVT-1004', title: 'Charity Run', status: 'under_review', status_changed_at: '2026-09-20T01:00:00.000Z',
  starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z', expected_attendance: 300,
  coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Olivia Tan',
};

function detail(overrides: Record<string, unknown> = {}) {
  return { event: {
    ...baseEvent, organiser_email: 'olivia@example.com', description: 'Annual fundraiser.', purpose: null,
    venue_requirements: 'Outdoor start line', accessibility_note: null, equipment_requirements: null,
    layout_preference: null, registration_setup: null, coordinator_id: 'c-a', coordinator_name: 'Coord A',
    pendingReassignment: null, ...overrides,
  } };
}

const pending = {
  id: 'r-1', eventId: 'evt-1004', eventCode: 'EVT-1004', eventTitle: 'Charity Run', status: 'pending',
  requestedAt: '2026-09-28T02:00:00.000Z', decidedAt: null,
  fromCoordinator: { id: 'c-a', name: 'Coord A' }, toCoordinator: { id: 'c-b', name: 'Coord B' },
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator" element={<CoordinatorHome />} />
        <Route path="/coordinator/queue" element={<ReviewQueue />} />
        <Route path="/coordinator/reassignments" element={<Reassignments />} />
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('requesting a reassignment sends the chosen colleague and keeps the current Coordinator assigned', async () => {
  let requested = false;
  const calls = stub((url, init) => {
    if (url.searchParams.get('coordinators') === '1') {
      return { status: 200, body: { coordinators: [{ id: 'c-b', full_name: 'Coord B', email: 'b@example.com', active_events: 2 }] } };
    }
    if (url.searchParams.get('reassign') === '1' && init?.method === 'POST') {
      requested = true;
      return { status: 201, body: { reassignment: pending } };
    }
    if (url.searchParams.get('assigned') === '1') return { status: 200, body: detail(requested ? { pendingReassignment: pending } : {}) };
    return undefined;
  });
  renderAt('/coordinator/events/EVT-1004');

  fireEvent.click(await screen.findByRole('button', { name: 'Reassign event' }));
  const select = await screen.findByLabelText('Colleague');
  expect(within(select).getByRole('option', { name: 'Coord B — 2 active events' })).toBeInTheDocument();
  fireEvent.change(select, { target: { value: 'c-b' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

  expect(await screen.findByText('Request sent to Coord B. You stay assigned until they accept.')).toBeInTheDocument();
  expect(await screen.findByText('Waiting for Coord B to respond')).toBeInTheDocument();
  expect(screen.getByText(/Coord A stays the assigned Coordinator until Coord B accepts/)).toBeInTheDocument();
  const post = calls.find(call => call.init?.method === 'POST');
  expect(post?.url.search).toBe('?reassign=1&id=evt-1004');
  expect(JSON.parse(String(post?.init?.body))).toEqual({ toCoordinatorId: 'c-b' });
});

test('sending without choosing a colleague is blocked with a message', async () => {
  const calls = stub(url => {
    if (url.searchParams.get('coordinators') === '1') {
      return { status: 200, body: { coordinators: [{ id: 'c-b', full_name: 'Coord B', email: 'b@example.com', active_events: 1 }] } };
    }
    if (url.searchParams.get('assigned') === '1') return { status: 200, body: detail() };
    return undefined;
  });
  renderAt('/coordinator/events/EVT-1004');
  fireEvent.click(await screen.findByRole('button', { name: 'Reassign event' }));
  await screen.findByLabelText('Colleague');
  fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose the colleague to reassign this event to.');
  expect(calls.some(call => call.init?.method === 'POST')).toBe(false);
});

test('a refused reassignment shows the server reason', async () => {
  stub((url, init) => {
    if (url.searchParams.get('coordinators') === '1') {
      return { status: 200, body: { coordinators: [{ id: 'c-b', full_name: 'Coord B', email: 'b@example.com', active_events: 1 }] } };
    }
    if (init?.method === 'POST') return { status: 403, body: { error: 'Only the assigned Coordinator can reassign this event.' } };
    if (url.searchParams.get('assigned') === '1') return { status: 200, body: detail() };
    return undefined;
  });
  renderAt('/coordinator/events/EVT-1004');
  fireEvent.click(await screen.findByRole('button', { name: 'Reassign event' }));
  fireEvent.change(await screen.findByLabelText('Colleague'), { target: { value: 'c-b' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the assigned Coordinator can reassign this event.');
});

test('an unassigned Coordinator is refused and sees no reassignment action', async () => {
  stub(url => url.searchParams.get('assigned') === '1'
    ? { status: 403, body: { error: 'Access denied. This event is not assigned to you.' } }
    : undefined);
  renderAt('/coordinator/events/EVT-1004');
  expect(await screen.findByRole('alert')).toHaveTextContent('Access denied. This event is not assigned to you.');
  expect(screen.getByRole('heading', { level: 1, name: 'Event unavailable' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reassign event' })).not.toBeInTheDocument();
});

test('an event that is no longer active cannot be reassigned', async () => {
  stub(url => url.searchParams.get('assigned') === '1' ? { status: 200, body: detail({ status: 'completed' }) } : undefined);
  renderAt('/coordinator/events/EVT-1004');
  expect(await screen.findByText('This event is completed, so it can no longer be reassigned.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reassign event' })).not.toBeInTheDocument();
});

test('declining leaves the original Coordinator assigned', async () => {
  let answered = false;
  const calls = stub((url, init) => {
    if (url.searchParams.get('reassignment') === 'r-1' && init?.method === 'POST') {
      answered = true;
      return { status: 200, body: { reassignment: { ...pending, status: 'declined', decidedAt: '2026-09-28T03:00:00.000Z' } } };
    }
    if (url.searchParams.get('reassignments') === '1') return { status: 200, body: { incoming: answered ? [] : [pending], outgoing: [] } };
    return undefined;
  });
  renderAt('/coordinator/reassignments');
  const request = await screen.findByRole('article', { name: 'Reassignment of Charity Run' });
  fireEvent.click(within(request).getByRole('button', { name: 'Decline' }));
  expect(await screen.findByText('You declined. Coord A remains the assigned Coordinator for Charity Run and has been notified.')).toBeInTheDocument();
  expect(await screen.findByText('Nothing waiting for you')).toBeInTheDocument();
  expect(calls.find(call => call.init?.method === 'POST')?.url.search).toBe('?reassignment=r-1&decision=decline');
});

test('accepting moves the event to the incoming Coordinator and links to it', async () => {
  stub((url, init) => {
    if (init?.method === 'POST') return { status: 200, body: { reassignment: { ...pending, status: 'accepted' } } };
    if (url.searchParams.get('reassignments') === '1') return { status: 200, body: { incoming: [pending], outgoing: [] } };
    return undefined;
  });
  renderAt('/coordinator/reassignments');
  fireEvent.click(within(await screen.findByRole('article', { name: 'Reassignment of Charity Run' })).getByRole('button', { name: 'Accept' }));
  expect(await screen.findByText('You accepted. Charity Run is now assigned to you.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open event' })).toHaveAttribute('href', '/coordinator/events/EVT-1004');
});

test('an answer that was already recorded shows the server reason', async () => {
  stub((url, init) => {
    if (init?.method === 'POST') return { status: 409, body: { error: 'This reassignment has already been answered.' } };
    if (url.searchParams.get('reassignments') === '1') return { status: 200, body: { incoming: [pending], outgoing: [] } };
    return undefined;
  });
  renderAt('/coordinator/reassignments');
  fireEvent.click(within(await screen.findByRole('article', { name: 'Reassignment of Charity Run' })).getByRole('button', { name: 'Accept' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This reassignment has already been answered.');
});

test('the dashboard counts active work and flags incoming requests', async () => {
  stub(url => {
    if (url.searchParams.get('assigned') === '1') {
      return { status: 200, body: { events: [
        { ...baseEvent, reassignment_pending: false },
        { ...baseEvent, id: 'evt-2', event_code: 'EVT-2', title: 'Alumni Night', status: 'approved', reassignment_pending: true },
        { ...baseEvent, id: 'evt-3', event_code: 'EVT-3', title: 'Old Fair', status: 'completed', reassignment_pending: false },
      ] } };
    }
    if (url.searchParams.get('reassignments') === '1') return { status: 200, body: { incoming: [pending], outgoing: [] } };
    return undefined;
  });
  renderAt('/coordinator');
  const metrics = await screen.findByRole('region', { name: 'Workload counts' });
  expect(within(metrics).getByText('Active events').nextSibling).toHaveTextContent('2');
  expect(screen.getByText('A colleague has asked you to take over an event')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Alumni Night/ })).toHaveTextContent('Reassignment pending');
  expect(screen.queryByText('Old Fair')).not.toBeInTheDocument();
});

test('the dashboard explains automatic assignment when nothing is assigned', async () => {
  stub(url => {
    if (url.searchParams.get('assigned') === '1') return { status: 200, body: { events: [] } };
    if (url.searchParams.get('reassignments') === '1') return { status: 200, body: { incoming: [], outgoing: [] } };
    return undefined;
  });
  renderAt('/coordinator');
  expect(await screen.findByText('No events assigned to you yet')).toBeInTheDocument();
});

test('the queue filters by status and shows a filter-specific empty state', async () => {
  stub(url => url.searchParams.get('assigned') === '1'
    ? { status: 200, body: { events: [{ ...baseEvent, reassignment_pending: false }] } }
    : undefined);
  renderAt('/coordinator/queue');
  expect(await screen.findByRole('link', { name: 'Charity Run' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Awaiting organiser/ }));
  expect(screen.getByText('No events in “Awaiting organiser”')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Needs review/ }));
  expect(screen.getByRole('link', { name: 'Charity Run' })).toBeInTheDocument();
});

test('a signed-out Coordinator is asked to sign in', async () => {
  stub(url => url.searchParams.get('assigned') === '1' ? { status: 401, body: { error: 'Sign in to continue.' } } : undefined);
  renderAt('/coordinator/queue');
  expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Sign in' }).some(link => link.getAttribute('href') === '/login')).toBe(true);
});

test('a failed load can be retried', async () => {
  let attempts = 0;
  stub(url => {
    if (url.searchParams.get('assigned') !== '1') return undefined;
    attempts += 1;
    return attempts === 1
      ? { status: 503, body: { error: 'Service unavailable.' } }
      : { status: 200, body: { events: [{ ...baseEvent, reassignment_pending: false }] } };
  });
  renderAt('/coordinator/queue');
  expect(await screen.findByText('Service unavailable.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByRole('link', { name: 'Charity Run' })).toBeInTheDocument());
});

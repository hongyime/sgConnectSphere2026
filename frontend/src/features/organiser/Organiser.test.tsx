// Organiser dashboard, request list and request detail against a stubbed
// fetch shaped like the live endpoints: GET /api/events?mine=1[&id=] (own
// requests, camelCase) and GET /api/events?id= (organisation read with event
// code, status history and comments, snake_case).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { OrganiserDashboard, RequestList, SubmittedDetail } from './Organiser';
import type { OwnRequest } from './organiserRequestsApi';

// 01:00Z is 09:00 in Singapore.
const ownRequests: OwnRequest[] = [
  { id: 'id-draft', title: 'Design Studio Recital', purpose: 'Student showcase', status: 'draft',
    startAt: '2026-12-01T01:00:00.000Z', endAt: '2026-12-01T04:00:00.000Z', expectedAttendance: 60 },
  { id: 'id-review', title: 'Annual Sustainability Forum', purpose: 'Green campus seminar', status: 'under_review',
    startAt: '2026-10-08T01:00:00.000Z', endAt: '2026-10-08T09:00:00.000Z', expectedAttendance: 220 },
  { id: 'id-clarify', title: 'Robotics Open Day', purpose: 'Outreach', status: 'awaiting_clarification',
    startAt: '2026-10-20T02:00:00.000Z', endAt: '2026-10-20T06:00:00.000Z', expectedAttendance: 150 },
  { id: 'id-approved', title: 'Faculty Career Mixer', purpose: 'Networking', status: 'approved',
    startAt: '2026-09-30T10:00:00.000Z', endAt: '2026-09-30T14:00:00.000Z', expectedAttendance: 180,
    venueRequirements: 'Standing room with a stage' },
  { id: 'id-rejected', title: 'Midnight Hackathon', purpose: 'Coding', status: 'rejected',
    startAt: '2026-11-02T14:00:00.000Z', endAt: '2026-11-02T22:00:00.000Z', expectedAttendance: 90 },
];

type Reply = { status?: number; body: unknown };
let reply: (url: URL) => Reply;
let fetchMock: ReturnType<typeof vi.fn>;

function orgRead(id: string, eventCode: string, extra: Record<string, unknown> = {}) {
  const own = ownRequests.find(request => request.id === id)!;
  return { event: {
    id, event_code: eventCode, title: own.title, status: own.status, status_changed_at: '2026-09-16T01:40:00.000Z',
    starts_at: own.startAt, ends_at: own.endAt, creator_name: 'Olivia Organiser',
    statusHistory: [
      { occurred_at: '2026-09-11T06:12:00.000Z', old_value: 'draft', new_value: 'submitted' },
      { occurred_at: '2026-09-12T02:00:00.000Z', old_value: 'submitted', new_value: 'under_review' },
    ],
    comments: [{ id: 'c-1', body: 'See attached plan', created_at: '2026-09-13T02:00:00.000Z', author_name: 'Olivia Organiser' }],
    ...extra,
  } };
}

function defaultReply(url: URL): Reply {
  const mine = url.searchParams.get('mine') === '1';
  const id = url.searchParams.get('id');
  if (mine && !id) return { body: { events: ownRequests } };
  if (mine && id) {
    const own = ownRequests.find(request => request.id === id);
    return own ? { body: { event: own } } : { status: 404, body: { error: 'not_found' } };
  }
  if (id === 'id-review' || id === 'EVT-2001') return { body: orgRead('id-review', 'EVT-2001') };
  if (id === 'id-clarify') return { body: orgRead('id-clarify', 'EVT-2003') };
  if (id === 'id-colleague') return { body: { event: { id: 'id-colleague', event_code: 'EVT-9', title: 'Theirs', status: 'approved' } } };
  return { status: 403, body: { error: 'Access denied.' } };
}

function requestUrls() {
  return fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost'));
}

beforeEach(() => {
  reply = defaultReply;
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const { status = 200, body } = reply(new URL(String(input), 'http://localhost'));
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organiser" element={<OrganiserDashboard />} />
        <Route path="/organiser/requests" element={<RequestList />} />
        <Route path="/organiser/requests/:eventCode" element={<SubmittedDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('dashboard counts come from the live own-requests list', async () => {
  renderAt('/organiser');
  const metrics = screen.getByRole('region', { name: 'Request status counts' });
  expect(await within(metrics).findByText('Drafts')).toBeInTheDocument();
  const valueFor = (label: string) => within(metrics).getByText(label).closest('article')!.querySelector('strong')!.textContent;
  await screen.findByText('Faculty Career Mixer');
  expect(valueFor('Drafts')).toBe('1');
  expect(valueFor('Awaiting review')).toBe('2');
  expect(valueFor('Need clarification')).toBe('1');
  expect(valueFor('Approved')).toBe('1');
  expect(requestUrls()[0].search).toBe('?mine=1');
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'same-origin' });
});

test('dashboard next actions list open requests by date, without drafts or closed ones', async () => {
  renderAt('/organiser');
  const list = screen.getByRole('region', { name: 'Next actions' });
  await within(list).findByText('Faculty Career Mixer');
  const titles = within(list).getAllByRole('link').map(link => link.querySelector('strong')?.textContent);
  expect(titles).toEqual(['Faculty Career Mixer', 'Annual Sustainability Forum', 'Robotics Open Day']);
});

test('request list shows every own request with plain-language status and Singapore times', async () => {
  renderAt('/organiser/requests');
  const row = (await screen.findByRole('link', { name: 'Annual Sustainability Forum' })).closest('tr')!;
  expect(row).toHaveTextContent('Green campus seminar');
  expect(row).toHaveTextContent('8 Oct 2026, 09:00–17:00');
  expect(row).toHaveTextContent('220');
  expect(row).toHaveTextContent('Under review');
  expect(screen.getByRole('button', { name: 'All (5)' })).toHaveAttribute('aria-pressed', 'true');
});

test('request list filters by status group', async () => {
  renderAt('/organiser/requests');
  await screen.findByRole('link', { name: 'Faculty Career Mixer' });

  fireEvent.click(screen.getByRole('button', { name: 'Drafts' }));
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'Design Studio Recital' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Awaiting review' }));
  expect(screen.getByRole('link', { name: 'Annual Sustainability Forum' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Robotics Open Day' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Faculty Career Mixer' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
  expect(screen.getByRole('link', { name: 'Faculty Career Mixer' })).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(2);
});

test('drafts link to the draft editor and other requests to the detail page', async () => {
  renderAt('/organiser/requests');
  expect(await screen.findByRole('link', { name: 'Design Studio Recital' })).toHaveAttribute('href', '/organiser/drafts/id-draft');
  expect(screen.getByRole('link', { name: 'Annual Sustainability Forum' })).toHaveAttribute('href', '/organiser/requests/id-review');
});

test('request list says so when there are no requests', async () => {
  reply = url => (url.searchParams.get('mine') ? { body: { events: [] } } : defaultReply(url));
  renderAt('/organiser/requests');
  expect(await screen.findByText('You have no requests yet.')).toBeInTheDocument();
});

test('request list shows a sign-in message on 401 and retries', async () => {
  reply = () => ({ status: 401, body: { error: 'unauthenticated' } });
  renderAt('/organiser/requests');
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Sign in as an Event Organiser');

  reply = defaultReply;
  fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: 'Faculty Career Mixer' })).toBeInTheDocument();
});

test('detail combines the organisation read and the own-request read', async () => {
  renderAt('/organiser/requests/id-review');
  expect(await screen.findByRole('heading', { level: 1, name: 'Annual Sustainability Forum' })).toBeInTheDocument();
  expect(screen.getByText('EVT-2001')).toBeInTheDocument();
  expect(screen.getByText(/^Since 16 Sept? 2026$/)).toBeInTheDocument();

  const summary = screen.getByRole('region', { name: 'Request summary' });
  expect(summary).toHaveTextContent('Green campus seminar');
  expect(summary).toHaveTextContent('8 Oct 2026, 09:00–17:00');
  expect(summary).toHaveTextContent('220');

  const [orgCall, ownCall] = requestUrls();
  expect(orgCall.searchParams.get('id')).toBe('id-review');
  expect(orgCall.searchParams.has('mine')).toBe(false);
  expect([ownCall.searchParams.get('mine'), ownCall.searchParams.get('id')]).toEqual(['1', 'id-review']);
});

test('detail timeline shows the real status history, newest first', async () => {
  renderAt('/organiser/requests/id-review');
  const heading = await screen.findByRole('heading', { name: 'Timeline' });
  const timeline = within(heading.closest('article')!).getAllByRole('listitem');
  expect(timeline).toHaveLength(2);
  expect(timeline[0]).toHaveTextContent('Submitted → Under review');
  expect(timeline[0]).toHaveTextContent(/12 Sept? 2026/);
  expect(timeline[1]).toHaveTextContent('Draft → Submitted');
});

test('detail accepts an event code and resolves it to the request', async () => {
  renderAt('/organiser/requests/EVT-2001');
  expect(await screen.findByRole('heading', { level: 1, name: 'Annual Sustainability Forum' })).toBeInTheDocument();
  expect(requestUrls()[1].searchParams.get('id')).toBe('id-review');
});

test('detail links to the event page for comments', async () => {
  renderAt('/organiser/requests/id-review');
  expect(await screen.findByRole('heading', { name: /Comments \(1\)/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Read and post comments/ })).toHaveAttribute('href', '/events/EVT-2001');
});

test('detail flags a clarification request without linking to the unbuilt response form', async () => {
  renderAt('/organiser/requests/id-clarify');
  const alert = await screen.findByText(/Your coordinator has requested clarification/);
  expect(alert.closest('p')!.querySelector('a')).toBeNull();
});

test('detail treats a colleague\'s event as not found', async () => {
  renderAt('/organiser/requests/id-colleague');
  expect(await screen.findByRole('heading', { name: 'Request not found' })).toBeInTheDocument();
  expect(screen.queryByText('Theirs')).not.toBeInTheDocument();
});

test('detail treats an unknown or refused id as not found', async () => {
  renderAt('/organiser/requests/EVT-NOPE');
  expect(await screen.findByRole('heading', { name: 'Request not found' })).toBeInTheDocument();
  expect(requestUrls()).toHaveLength(1);
});

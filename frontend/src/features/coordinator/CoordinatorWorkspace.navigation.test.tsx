// Late-response guard for the Coordinator event page
// (/coordinator/events/:eventCode). React Router keeps RequestDetail mounted
// when only the param changes, so event A's slow load must never land on
// event B, and navigating to B must request B.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { RequestDetail } from './CoordinatorWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

type Reply = { status: number; body: unknown };

function detail(code: string, title: string) {
  return { event: {
    id: `id-${code}`, event_code: code, title, status: 'under_review', status_changed_at: '2026-09-20T01:00:00.000Z',
    starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z', expected_attendance: 120,
    coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Olivia Tan', organiser_email: 'olivia@example.com',
    description: null, purpose: null, venue_requirements: null, accessibility_note: null, equipment_requirements: null,
    layout_preference: null, registration_setup: null, coordinator_id: 'c-1', coordinator_name: 'Casey Lim',
    pendingReassignment: null,
  } };
}

function stubFetch() {
  let releaseA!: (reply: Reply) => void;
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    if (url.pathname === '/api/auth/session') return { ok: false, status: 401, json: async () => ({}) } as Response;
    const id = url.searchParams.get('id') ?? '';
    requested.push(id);
    const reply: Reply = id === 'EVT-A'
      ? await new Promise<Reply>(resolve => { releaseA = resolve; })
      : { status: 200, body: detail('EVT-B', 'Event B') };
    // Mirror fetch: an aborted request rejects instead of resolving.
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return { requested, releaseA: (reply: Reply) => releaseA(reply) };
}

test.each([
  ['success', { status: 200, body: detail('EVT-A', 'Event A') }],
  ['error', { status: 503, body: { error: 'Event A failed' } }],
])('a late %s for event A does not replace event B', async (_kind, lateReply) => {
  const { requested, releaseA } = stubFetch();
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-A']}>
      <Link to="/coordinator/events/EVT-B">Open event B</Link>
      <Routes><Route path="/coordinator/events/:eventCode" element={<RequestDetail />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(requested).toContain('EVT-A'));

  fireEvent.click(screen.getByText('Open event B'));
  await waitFor(() => expect(requested).toContain('EVT-B'));
  expect(await screen.findByRole('heading', { level: 1, name: 'Event B' })).toBeInTheDocument();

  await act(async () => { releaseA(lateReply); });
  expect(screen.getByRole('heading', { level: 1, name: 'Event B' })).toBeInTheDocument();
  expect(screen.queryByText('Event A')).not.toBeInTheDocument();
  expect(screen.queryByText('Event A failed')).not.toBeInTheDocument();
});

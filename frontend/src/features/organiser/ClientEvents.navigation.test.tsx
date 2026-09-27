// Late-response guard for the organisation event page (/events/:identifier).
// ClientEvents reads window.location, so these tests use BrowserRouter (which
// updates it) rather than MemoryRouter. Event A's slow load must never land on
// event B, and navigating to B must load B.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ClientEvents } from './ClientEvents';

beforeEach(() => { window.history.replaceState(null, '', '/events/EVT-A'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

type Reply = { status: number; body: unknown };

function event(code: string, title: string) {
  return { event: { id: `id-${code}`, event_code: code, title, status: 'submitted', description: '',
    starts_at: '2026-11-12T01:00:00.000Z', status_changed_at: '2026-09-20T01:00:00.000Z', creator_name: 'Olivia',
    statusHistory: [], comments: [] } };
}

function stubFetch() {
  let releaseA!: (reply: Reply) => void;
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const id = new URL(input, 'http://localhost').searchParams.get('id') ?? '';
    requested.push(id);
    const reply: Reply = id === 'EVT-A'
      ? await new Promise<Reply>(resolve => { releaseA = resolve; })
      : { status: 200, body: event('EVT-B', 'Event B') };
    // Mirror fetch: an aborted request rejects instead of resolving.
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return { requested, releaseA: (reply: Reply) => releaseA(reply) };
}

function renderEventA() {
  render(
    <BrowserRouter>
      <Link to="/events/EVT-B">Open event B</Link>
      <Routes><Route path="/events/*" element={<ClientEvents />} /></Routes>
    </BrowserRouter>,
  );
}

test.each([
  ['success', { status: 200, body: event('EVT-A', 'Event A') }],
  ['error', { status: 503, body: { error: 'Event A failed' } }],
])('a late %s for event A does not replace event B', async (_kind, lateReply) => {
  const { requested, releaseA } = stubFetch();
  renderEventA();
  await waitFor(() => expect(requested).toContain('EVT-A'));

  fireEvent.click(screen.getByText('Open event B'));
  await waitFor(() => expect(requested).toContain('EVT-B'));
  expect(await screen.findByRole('heading', { name: 'Event B' })).toBeInTheDocument();

  await act(async () => { releaseA(lateReply); });
  expect(screen.getByRole('heading', { name: 'Event B' })).toBeInTheDocument();
  expect(screen.queryByText('Event A')).not.toBeInTheDocument();
  expect(screen.queryByText('Event A failed')).not.toBeInTheDocument();
});

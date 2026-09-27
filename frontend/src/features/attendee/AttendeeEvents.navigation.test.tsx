// Late-response guard for the attendee event page (/attendee/events/:id).
// AttendeeEvents reads window.location, so these tests use BrowserRouter
// (which updates it) rather than MemoryRouter. Event A's slow load must never
// land on event B, and navigating to B must load B.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AttendeeEvents } from './AttendeeEvents';

beforeEach(() => { window.history.replaceState(null, '', '/attendee/events/a'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

type Reply = { status: number; body: unknown };

function events(id: string, name: string) {
  return { events: [{ id, name, starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z',
    venue_name: 'Grand Ballroom', venue_location: 'Level 1' }] };
}

function stubFetch() {
  let releaseA!: (reply: Reply) => void;
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const id = new URL(input, 'http://localhost').searchParams.get('id') ?? '';
    requested.push(id);
    const reply: Reply = id === 'a'
      ? await new Promise<Reply>(resolve => { releaseA = resolve; })
      : { status: 200, body: events('b', 'Event B') };
    // Mirror fetch: an aborted request rejects instead of resolving.
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return { requested, releaseA: (reply: Reply) => releaseA(reply) };
}

function renderEventA() {
  render(
    <BrowserRouter>
      <Link to="/attendee/events/b">Open event B</Link>
      <Routes><Route path="/attendee/events/*" element={<AttendeeEvents />} /></Routes>
    </BrowserRouter>,
  );
}

test.each([
  ['success', { status: 200, body: events('a', 'Event A') }],
  ['error', { status: 503, body: { error: 'Event A failed' } }],
])('a late %s for event A does not replace event B', async (_kind, lateReply) => {
  const { requested, releaseA } = stubFetch();
  renderEventA();
  await waitFor(() => expect(requested).toContain('a'));

  fireEvent.click(screen.getByText('Open event B'));
  await waitFor(() => expect(requested).toContain('b'));
  expect(await screen.findByRole('heading', { name: 'Event B' })).toBeInTheDocument();

  await act(async () => { releaseA(lateReply); });
  expect(screen.getByRole('heading', { name: 'Event B' })).toBeInTheDocument();
  expect(screen.queryByText('Event A')).not.toBeInTheDocument();
  expect(screen.queryByText('Event A failed')).not.toBeInTheDocument();
});

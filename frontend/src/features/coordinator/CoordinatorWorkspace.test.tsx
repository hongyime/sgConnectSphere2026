import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { CoordinatorHome } from './CoordinatorWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('Coordinator dashboard lists only assigned work and has no reassignment request flow', async () => {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    if (url.pathname === '/api/auth/session') return new Response(JSON.stringify({ user: { id: 'coord-1', role: 'event_coordinator' } }), { status: 200 });
    if (url.pathname === '/api/notifications') return new Response(JSON.stringify({ notifications: [] }), { status: 200 });
    if (url.searchParams.get('assigned') === '1') return new Response(JSON.stringify({ events: [{
      id: 'event-1', event_code: 'EVT-1', title: 'Charity Run', status: 'under_review',
      status_changed_at: '2026-11-01T00:00:00Z', starts_at: '2026-12-01T01:00:00Z', ends_at: '2026-12-01T04:00:00Z',
      expected_attendance: 100, coordinator_assigned_at: '2026-11-01T00:00:00Z', organiser_name: 'Olivia Tan',
    }] }), { status: 200 });
    return new Response(JSON.stringify({ error: 'Unexpected request' }), { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><CoordinatorHome /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: /Charity Run/ })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/events?assigned=1', expect.anything());
  expect(fetchMock.mock.calls.some(([input]) => String(input).includes('reassign'))).toBe(false);
});

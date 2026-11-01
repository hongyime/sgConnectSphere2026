import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { LeadQueue, SafetyQueue } from './RoleQueues';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderQueue(Component: typeof LeadQueue | typeof SafetyQueue) {
  render(<MemoryRouter><Component /></MemoryRouter>);
}

test('Lead queue loads submitted unassigned requests', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events: [{
    id: 'event-1', event_code: 'EVT-1', title: 'Charity Run', status: 'submitted',
    created_at: '2026-11-01T00:00:00Z', starts_at: '2026-12-01T01:00:00Z', ends_at: '2026-12-01T04:00:00Z',
    expected_attendance: 100, organisation_name: 'Client A',
  }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  renderQueue(LeadQueue);

  expect(await screen.findByText('Charity Run')).toBeInTheDocument();
  expect(screen.getByText('Client A')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/events?unassigned=1', expect.objectContaining({ credentials: 'same-origin' }));
});

test('Safety queue loads events awaiting Operational Safety Check', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events: [{
    id: 'event-2', event_code: 'EVT-2', title: 'Annual Gala', status: 'safety_review',
    starts_at: '2026-12-02T01:00:00Z', ends_at: '2026-12-02T04:00:00Z', expected_attendance: 80,
    coordinator_name: 'Coordinator A', organiser_name: 'Olivia Tan',
  }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  renderQueue(SafetyQueue);

  expect(await screen.findByText('Annual Gala')).toBeInTheDocument();
  expect(screen.getByText('Coordinator A')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/events?safetyQueue=1', expect.objectContaining({ credentials: 'same-origin' }));
});

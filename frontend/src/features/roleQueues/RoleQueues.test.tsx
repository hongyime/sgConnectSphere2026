import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { LeadOversight, LeadQueue, SafetyQueue } from './RoleQueues';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderQueue(Component: typeof LeadQueue | typeof SafetyQueue) {
  render(<MemoryRouter><Component /></MemoryRouter>);
}

test('Lead queue loads submitted unassigned requests and assigns one', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('coordinators=1')) return new Response(JSON.stringify({ coordinators: [{ id: 'coord-1', full_name: 'Coordinator A', active_events: 2 }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('assign=1')) return new Response(JSON.stringify({ assignment: { eventId: 'event-1', coordinatorId: 'coord-1' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ events: [{
    id: 'event-1', event_code: 'EVT-1', title: 'Charity Run', status: 'submitted',
    created_at: '2026-11-01T00:00:00Z', starts_at: '2026-12-01T01:00:00Z', ends_at: '2026-12-01T04:00:00Z',
    expected_attendance: 100, organisation_name: 'Client A',
    }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  renderQueue(LeadQueue);

  expect(await screen.findByText('Charity Run')).toBeInTheDocument();
  expect(screen.getByText('Client A')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/events?unassigned=1', expect.objectContaining({ credentials: 'same-origin' }));
  await screen.findByRole('option', { name: 'Coordinator A (2)' });
  await import('@testing-library/user-event').then(({ default: userEvent }) => userEvent.setup().selectOptions(screen.getByRole('combobox'), 'coord-1'));
  await import('@testing-library/user-event').then(({ default: userEvent }) => userEvent.setup().click(screen.getByRole('button', { name: 'Assign' })));
  expect(await screen.findByRole('status')).toHaveTextContent('Assigned');
  expect(fetchMock).toHaveBeenCalledWith('/api/events?assign=1&id=event-1', expect.objectContaining({ method: 'POST' }));
});

test('Safety queue loads events awaiting Operational Safety Check', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('safetyReview=1')) return new Response(JSON.stringify({ review: {
      event: { id: 'event-2', event_code: 'EVT-2', title: 'Annual Gala', status: 'safety_review', status_changed_at: '2026-12-01T00:00:00Z', starts_at: '2026-12-02T01:00:00Z', ends_at: '2026-12-02T04:00:00Z', expected_attendance: 80, accessibility_note: 'Wheelchair access', coordinator_id: 'coord-1', coordinator_name: 'Coordinator A', organiser_name: 'Olivia Tan' },
      venues: [{ id: 'venue-1', name: 'Hall A', capacity: 100, layout: 'Theatre', restrictions: [] }], equipment: [], support: [], factors: ['attendance_capacity', 'venue_layout', 'emergency_access', 'accessibility', 'equipment_placement', 'crowd_movement', 'venue_restrictions'],
    } }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (url.includes('safetyDecision=1')) return new Response(JSON.stringify({ decision: { status: 'confirmed', decision: 'approve' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ events: [{
    id: 'event-2', event_code: 'EVT-2', title: 'Annual Gala', status: 'safety_review',
    starts_at: '2026-12-02T01:00:00Z', ends_at: '2026-12-02T04:00:00Z', expected_attendance: 80,
    coordinator_name: 'Coordinator A', organiser_name: 'Olivia Tan',
  }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  renderQueue(SafetyQueue);

  expect(await screen.findByText('Annual Gala')).toBeInTheDocument();
  expect(screen.getByText('Coordinator A')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/events?safetyQueue=1', expect.objectContaining({ credentials: 'same-origin' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open review' }));
  expect(await screen.findByText('Hall A — capacity 100, Theatre')).toBeInTheDocument();
  await screen.findByRole('textbox', { name: 'attendance capacity comment' });
  for (const factor of ['attendance capacity', 'venue layout', 'emergency access', 'accessibility', 'equipment placement', 'crowd movement', 'venue restrictions']) {
    fireEvent.change(screen.getByRole('textbox', { name: `${factor} comment` }), { target: { value: `${factor} checked` } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Decision saved');
  expect(fetchMock).toHaveBeenCalledWith('/api/events?safetyDecision=1&id=event-2', expect.objectContaining({ method: 'POST' }));
});

test('Lead oversight loads workload and active event assignments', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events: [{
    id: 'event-3', event_code: 'EVT-3', title: 'Annual Gala', status: 'planning',
    starts_at: '2026-12-02T01:00:00Z', ends_at: '2026-12-02T04:00:00Z', expected_attendance: 80,
    coordinator_id: 'coord-1', coordinator_name: 'Coordinator A', organiser_name: 'Olivia Tan',
  }], workloads: [{ id: 'coord-1', full_name: 'Coordinator A', active_events: 1 }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  renderQueue(LeadOversight);

  expect(await screen.findByText('Assignment oversight')).toBeInTheDocument();
  expect(screen.getAllByText('Coordinator A').length).toBeGreaterThan(0);
  expect(screen.getByText('Annual Gala')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/events?oversight=1', expect.objectContaining({ credentials: 'same-origin' }));
});

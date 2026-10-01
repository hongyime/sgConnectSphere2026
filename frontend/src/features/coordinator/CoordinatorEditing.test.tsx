// E03-S07 (SCRUM-37) on the Coordinator event page: the assigned Coordinator
// edits an approved event (Scenario 2); edits are unavailable before approval;
// a server refusal (Scenario 5, e.g. after a reassignment) is shown as-is.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { RequestDetail } from './CoordinatorWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1004', event_code: 'EVT-1004', title: 'Annual Tech Summit', status: 'approved', status_changed_at: '2026-09-20T01:00:00.000Z',
    starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z', expected_attendance: 200,
    coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com',
    description: 'A summit.', purpose: null, venue_requirements: 'Lecture theatre', accessibility_note: null,
    equipment_requirements: null, layout_preference: null, registration_setup: null, coordinator_id: 'c-1',
    coordinator_name: 'Coord A', pendingReassignment: null, ...overrides,
  };
}

function stub(options: { event?: Record<string, unknown>; patchReply?: { status: number; body: unknown } } = {}) {
  let current = detail(options.event);
  const patches: { url: URL; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    let reply: { status: number; body: unknown };
    if (url.pathname === '/api/auth/session') reply = { status: 401, body: {} };
    else if (url.pathname === '/api/notifications') reply = { status: 200, body: { notifications: [] } };
    else if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      patches.push({ url, body });
      reply = options.patchReply ?? { status: 200, body: { updated: true, eventId: 'evt-1004', fields: Object.keys(body) } };
      if (reply.status === 200 && typeof body.venueRequirements === 'string') current = { ...current, venue_requirements: body.venueRequirements };
    } else reply = { status: 200, body: { event: current } };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return patches;
}

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-1004']}>
      <Routes><Route path="/coordinator/events/:eventCode" element={<RequestDetail />} /></Routes>
    </MemoryRouter>,
  );
}

test('the assigned Coordinator edits an approved event and only the changed field is sent', async () => {
  const patches = stub();
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  const form = screen.getByRole('form', { name: 'Edit event details' });
  expect(within(form).getByLabelText('Expected attendance')).toHaveValue(200);
  expect(within(form).getByRole('button', { name: 'Save changes' })).toBeDisabled();

  fireEvent.change(within(form).getByLabelText('Venue requirements'), { target: { value: 'Lecture theatre with step-free access' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByText("Saved your changes to the venue requirements. They're recorded in the event's activity log.")).toBeInTheDocument();
  expect(await screen.findByText('Lecture theatre with step-free access')).toBeInTheDocument();
  expect(patches).toHaveLength(1);
  expect(patches[0].url.search).toBe('?edit=1&id=evt-1004');
  expect(patches[0].body).toEqual({ venueRequirements: 'Lecture theatre with step-free access' });
});

test('before approval the Coordinator sees the details read-only with an explanation', async () => {
  stub({ event: { status: 'under_review' } });
  renderDetail();
  expect(await screen.findByText('You can edit these details once the event is approved. Until then, the Organiser keeps them up to date.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
});

test('a refused edit keeps the form open and shows the server reason', async () => {
  stub({ patchReply: { status: 403, body: { error: 'Only the assigned Coordinator may edit an approved event.' } } });
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Tech Summit 2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the assigned Coordinator may edit an approved event.');
  expect(screen.getByRole('form', { name: 'Edit event details' })).toBeInTheDocument();
});

test('invalid values are flagged next to the field and nothing is sent', async () => {
  const patches = stub();
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Venue requirements'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Fix the highlighted fields, then save again.');
  expect(screen.getByLabelText('Expected attendance')).toHaveAccessibleDescription('Enter a whole number greater than 0.');
  expect(screen.getByLabelText('Venue requirements')).toHaveAccessibleDescription("Venue requirements can't be left empty.");
  expect(patches).toHaveLength(0);
});

test('cancelling closes the form without saving', async () => {
  const patches = stub();
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Something else' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('form', { name: 'Edit event details' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Annual Tech Summit' })).toBeInTheDocument();
  expect(patches).toHaveLength(0);
});

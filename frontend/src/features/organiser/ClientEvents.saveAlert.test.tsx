// E03-S12 (SCRUM-196): the Organiser's saved-edit confirmation on the event
// page uses the shared success Alert, as the Coordinator's does, instead of a
// plain paragraph. A failed, invalid or cancelled attempt never shows it.
// Against a stubbed API shaped like PATCH /api/events?edit=1; the edit rules
// and their audit rows are tested in backend/tests/eventVisibility.test.ts and
// backend/tests/decision.integration.test.ts.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { ClientEvents } from './ClientEvents';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

const ALL_FIELDS = ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements',
  'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationSetup', 'registrationDates'];

function orgRead(title: string, overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-plan', event_code: 'EVT-PLAN', title, description: 'Quarterly planning day', purpose: 'Agree the roadmap',
    status: 'submitted', status_changed_at: '2026-10-01T02:00:00.000Z',
    starts_at: '2026-12-01T01:00:00.000Z', ends_at: '2026-12-01T04:00:00.000Z', expected_attendance: 40,
    venue_requirements: null, accessibility_note: null, equipment_requirements: null, layout_preference: null,
    registration_setup: null, creator_name: 'Organiser A', coordinator_name: 'Coord B',
    statusHistory: [], activityLog: [], comments: [], outstandingQuestions: [],
    canEdit: true, editableFields: ALL_FIELDS,
    ...overrides,
  } };
}

function renderEventPage() {
  window.history.replaceState(null, '', '/events/EVT-PLAN');
  return render(<BrowserRouter><Routes><Route path="/events/*" element={<ClientEvents />} /></Routes></BrowserRouter>);
}

async function editTitle(value: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Edit event' }, { timeout: 2000 }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
}

const successAlert = () => document.querySelector('.ui-alert-success');

test('TC_E03S12_01 - a saved edit is confirmed in the shared success Alert, not plain text', async () => {
  let title = 'Planning event';
  stubApi({
    'GET /api/events?id=EVT-PLAN': () => ({ body: orgRead(title) }),
    'PATCH /api/events?edit=1&id=evt-plan': () => { title = 'Updated planning event'; return { body: { fields: ['title'] } }; },
  });
  renderEventPage();
  await editTitle('Updated planning event');

  // Saving triggers a debounced event reload. The old page may briefly show
  // the success text before loading hides it, so assert against the refreshed
  // event instead of retaining a node from that transient render.
  await screen.findByRole('heading', { name: 'Updated planning event' });
  const message = await screen.findByText(/^Saved your changes to the .+\. The activity log has been updated\.$/);
  const alert = successAlert();
  expect(alert).not.toBeNull();
  expect(alert).toContainElement(message);
  // Polite, like every success Alert; an urgent role="alert" would interrupt.
  expect(alert).toHaveAttribute('role', 'status');
  expect(message.closest('p[role="status"]')).toBeNull();
});

test('TC_E03S12_02 - the saved value survives a reload, and the confirmation causes no second write', async () => {
  let title = 'Planning event';
  const calls = stubApi({
    'GET /api/events?id=EVT-PLAN': () => ({ body: orgRead(title) }),
    'PATCH /api/events?edit=1&id=evt-plan': () => { title = 'Persisted planning event'; return { body: { fields: ['title'] } }; },
  });
  renderEventPage();
  await editTitle('Persisted planning event');
  await screen.findByText(/^Saved your changes to the /);
  expect(await screen.findByRole('heading', { name: 'Persisted planning event' })).toBeInTheDocument();

  cleanup();
  renderEventPage();
  expect(await screen.findByRole('heading', { name: 'Persisted planning event' }, { timeout: 2000 })).toBeInTheDocument();
  expect(successAlert()).toBeNull();
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(1);
});

test('TC_E03S12_03 - an invalid edit keeps its validation feedback and shows no success', async () => {
  const calls = stubApi({ 'GET /api/events?id=EVT-PLAN': { body: orgRead('Planning event') } });
  renderEventPage();
  await editTitle('');

  expect(await screen.findByText('Fix the highlighted fields, then save again.')).toBeInTheDocument();
  expect(screen.getByLabelText('Event name')).toHaveAttribute('aria-invalid', 'true');
  expect(successAlert()).toBeNull();
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(0);
});

test('TC_E03S12_04 - a failed save after a success leaves no stale or false confirmation', async () => {
  let title = 'Planning event';
  let saves = 0;
  const calls = stubApi({
    'GET /api/events?id=EVT-PLAN': () => ({ body: orgRead(title) }),
    'PATCH /api/events?edit=1&id=evt-plan': () => {
      saves += 1;
      if (saves === 1) { title = 'First change'; return { body: { fields: ['title'] } }; }
      return { status: 500, body: { error: 'Unable to save your changes.' } };
    },
  });
  renderEventPage();
  await editTitle('First change');
  await screen.findByText(/^Saved your changes to the /);
  await screen.findByRole('heading', { name: 'First change' });

  // Starting the next edit clears the earlier confirmation.
  await editTitle('Failed second change');
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save your changes.');
  expect(successAlert()).toBeNull();
  expect(screen.getByRole('heading', { name: 'First change' })).toBeInTheDocument();
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(2);
});

test('TC_E03S12_05 - cancelling an approved event\'s edit confirms nothing, and restricted fields still route to a change request', async () => {
  const calls = stubApi({ 'GET /api/events?id=EVT-PLAN': { body: orgRead('Planning event', {
    status: 'approved', editableFields: ['title', 'description', 'purpose', 'registrationDates'],
  }) } });
  renderEventPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit event' }, { timeout: 2000 }));

  expect(screen.getByLabelText(/^Start/)).toHaveAttribute('readonly');
  expect(screen.getAllByRole('link', { name: 'Request a change' })[0]).toHaveAttribute('href', '/change-requests/new?event=evt-plan');

  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Not kept' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('form', { name: 'Edit event details' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Planning event' })).toBeInTheDocument();
  expect(successAlert()).toBeNull();
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(0);
});

// E03-S12: the Organiser's saved-edit confirmation uses the shared success
// Alert, as the Coordinator's event page does, against a stubbed API shaped
// like the live endpoints. Saving, validation, permissions and the audit
// write are unchanged; they are proven against PostgreSQL in
// backend/tests/eventVisibility.integration.test.ts.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi, type FakeCall } from '../../testing/fakeApi';
import { ClientEvents } from './ClientEvents';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

const SAVED = 'Saved your changes to the event name. The activity log has been updated.';
const BEFORE_APPROVAL = ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements',
  'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationSetup', 'registrationDates'];

function eventRead(title: string, overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-gala', event_code: 'EVT-GALA', title, description: 'An evening of talks and networking',
    purpose: 'Bring the community together', status: 'under_review', status_changed_at: '2026-09-10T02:00:00.000Z',
    starts_at: '2026-12-01T01:00:00.000Z', ends_at: '2026-12-01T04:00:00.000Z', expected_attendance: 120,
    venue_requirements: 'Auditorium with a stage', accessibility_note: 'Step-free access', equipment_requirements: 'None required',
    layout_preference: 'Theatre', registration_setup: 'Free registration', creator_name: 'Organiser A',
    statusHistory: [], activityLog: [], comments: [], canEdit: true, editableFields: BEFORE_APPROVAL,
    ...overrides,
  } };
}

// The event read reflects whatever the last successful PATCH stored.
function stubEvent(saves: { status: number; body: unknown }[], overrides: Record<string, unknown> = {}) {
  let title = 'Winter Gala';
  const replies = [...saves];
  const calls = stubApi({
    'GET /api/events?id=EVT-GALA': () => ({ body: eventRead(title, overrides) }),
    'PATCH /api/events?edit=1&id=evt-gala': (_url, init) => {
      const reply = replies.shift() ?? { status: 500, body: { error: 'Unexpected save' } };
      if (reply.status === 200) title = (JSON.parse(String(init?.body)) as { title: string }).title;
      return reply;
    },
  });
  window.history.replaceState(null, '', '/events/EVT-GALA');
  render(<BrowserRouter><Routes><Route path="/events/*" element={<ClientEvents />} /></Routes></BrowserRouter>);
  return calls;
}

async function editTitle(value: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Edit event' }, { timeout: 2000 }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
}

const patches = (calls: FakeCall[]) => calls.filter(call => call.method === 'PATCH');
const reads = (calls: FakeCall[]) => calls.filter(call => call.method === 'GET' && call.url.searchParams.get('id') === 'EVT-GALA');
const successAlert = () => document.querySelector('.ui-alert-success');

test('TC_E03S12_01 - a saved edit is confirmed in the shared success Alert, announced politely', async () => {
  stubEvent([{ status: 200, body: { fields: ['title'] } }]);
  await editTitle('Winter Gala (revised)');

  const status = await screen.findByText(SAVED);
  const alert = status.closest('.ui-alert');
  expect(alert).toHaveClass('ui-alert-success');
  expect(alert).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('TC_E03S12_02 - the saved value is shown after the reload, and the confirmation sends no second save', async () => {
  const calls = stubEvent([{ status: 200, body: { fields: ['title'] } }]);
  await editTitle('Winter Gala (revised)');

  expect(await screen.findByRole('heading', { name: 'Winter Gala (revised)' })).toBeInTheDocument();
  expect(screen.getByText(SAVED)).toBeInTheDocument();
  await waitFor(() => expect(reads(calls).length).toBe(2));
  expect(patches(calls)).toHaveLength(1);
  expect(patches(calls)[0]!.body).toEqual({ title: 'Winter Gala (revised)' });
});

test('TC_E03S12_03 - an invalid edit keeps its validation message and claims no success', async () => {
  const calls = stubEvent([]);
  await editTitle('   ');

  expect(await screen.findByText("Event name can't be left empty.")).toBeInTheDocument();
  expect(successAlert()).toBeNull();
  expect(patches(calls)).toHaveLength(0);
});

test('TC_E03S12_04 - a failed save after an earlier success shows only the error, not the old confirmation', async () => {
  const calls = stubEvent([
    { status: 200, body: { fields: ['title'] } },
    { status: 500, body: { error: 'Unable to save your changes.' } },
  ]);
  await editTitle('First change');
  // Wait for the reload after the save, then the confirmation is shown.
  expect(await screen.findByRole('heading', { name: 'First change' })).toBeInTheDocument();
  expect(screen.getByText(SAVED)).toBeInTheDocument();

  // Starting the next edit clears the earlier confirmation.
  fireEvent.click(await screen.findByRole('button', { name: 'Edit event' }));
  expect(successAlert()).toBeNull();
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Failed second change' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save your changes.');
  expect(successAlert()).toBeNull();
  expect(screen.getByRole('heading', { name: 'First change' })).toBeInTheDocument();
  expect(patches(calls)).toHaveLength(2);
});

test('TC_E03S12_05 - cancelling saves nothing, and restricted fields still point to a change request', async () => {
  const calls = stubEvent([], { status: 'approved', editableFields: ['title', 'description', 'purpose', 'registrationDates'] });
  fireEvent.click(await screen.findByRole('button', { name: 'Edit event' }, { timeout: 2000 }));

  expect(screen.getByLabelText('Expected attendance')).toHaveAttribute('readonly');
  expect(screen.getAllByRole('link', { name: 'Request a change' })[0]).toHaveAttribute('href', '/change-requests/new?event=evt-gala');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByLabelText('Event name')).not.toBeInTheDocument();
  expect(successAlert()).toBeNull();
  expect(patches(calls)).toHaveLength(0);
});

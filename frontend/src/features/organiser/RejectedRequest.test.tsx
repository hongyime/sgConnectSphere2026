// E03-S03 (SCRUM-34) Scenario 5, the Organiser side, against a stubbed API
// shaped like the live endpoints: the request page shows the decision date and
// reason in plain language (TC_E03S03_05, D30), and the organisation event
// page offers no edit on a rejected request; a stale edit is refused with the
// server's sentence and no change-request link (TC_E03S03_11). The read-only
// rule itself is proven against PostgreSQL in
// backend/tests/decision.integration.test.ts.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { ClientEvents } from './ClientEvents';
import { SubmittedDetail } from './Organiser';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

const REASON = 'Requested date unavailable across all venues';
const READ_ONLY = 'This request is rejected, so it can no longer be changed.';

function orgRead(overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-gala', event_code: 'EVT-GALA', title: 'Winter Gala', description: 'An evening of talks and networking',
    purpose: 'Bring the community together', status: 'rejected', status_changed_at: '2026-09-10T02:00:00.000Z',
    starts_at: '2026-12-01T01:00:00.000Z', ends_at: '2026-12-01T04:00:00.000Z', expected_attendance: 120,
    venue_requirements: 'Auditorium with a stage', accessibility_note: 'Step-free access to the stage',
    equipment_requirements: 'None required', layout_preference: 'Theatre', registration_setup: 'Free registration',
    creator_name: 'Organiser A', coordinator_name: 'Coord B', statusHistory: [], activityLog: [], comments: [],
    outstandingQuestions: [],
    // 02:00Z on 10 Sept is 10:00 in Singapore, so the date reads "10 Sept 2026".
    decision: { outcome: 'rejected', reason: REASON, decidedAt: '2026-09-10T02:00:00.000Z' },
    canEdit: false, editableFields: [],
    ...overrides,
  } };
}

const ownRead = (status = 'rejected') => ({ event: {
  id: 'evt-gala', title: 'Winter Gala', purpose: 'Bring the community together', status,
  startAt: '2026-12-01T01:00:00.000Z', endAt: '2026-12-01T04:00:00.000Z', expectedAttendance: 120,
} });

function renderRequestPage() {
  render(
    <MemoryRouter initialEntries={['/organiser/requests/EVT-GALA']}>
      <Routes><Route path="/organiser/requests/:eventCode" element={<SubmittedDetail />} /></Routes>
    </MemoryRouter>,
  );
}

function renderEventPage() {
  window.history.replaceState(null, '', '/events/EVT-GALA');
  render(<BrowserRouter><Routes><Route path="/events/*" element={<ClientEvents />} /></Routes></BrowserRouter>);
}

test('TC_E03S03_05 - the Organiser sees the rejection date and reason in plain language, with nothing to edit or answer', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-gala': { body: ownRead() },
    'GET /api/events?id=EVT-GALA': { body: orgRead() },
  });
  renderRequestPage();
  expect(await screen.findByText(`Rejected on 10 Sept 2026 — ${REASON}`)).toBeInTheDocument();
  // A fact about the record, announced politely (D34); the pill is the colour.
  expect(screen.getByRole('status')).toHaveTextContent(`Rejected on 10 Sept 2026 — ${REASON}`);
  expect(document.querySelector('.ui-page-heading .status-pill')).toHaveTextContent('Rejected');
  expect(screen.queryByRole('link', { name: 'Respond now' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
});

test('a seeded rejection with no recorded reason says so (D30)', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-gala': { body: ownRead() },
    'GET /api/events?id=EVT-GALA': { body: orgRead({ decision: { outcome: 'rejected', reason: null, decidedAt: '2026-09-16T01:40:00.000Z' } }) },
  });
  renderRequestPage();
  expect(await screen.findByText('Rejected on 16 Sept 2026. No reason was recorded.')).toBeInTheDocument();
});

test('a request that is not rejected shows no rejection notice', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-gala': { body: ownRead('approved') },
    'GET /api/events?id=EVT-GALA': { body: orgRead({
      status: 'approved', decision: { outcome: 'approved', reason: null, decidedAt: '2026-09-10T02:00:00.000Z' }, canEdit: true,
    }) },
  });
  renderRequestPage();
  expect(await screen.findByRole('heading', { level: 1, name: 'Winter Gala' })).toBeInTheDocument();
  expect(screen.queryByText(/Rejected on/)).not.toBeInTheDocument();
});

test('TC_E03S03_11 - the organisation event page offers no Edit event on a rejected request', async () => {
  stubApi({ 'GET /api/events?id=EVT-GALA': { body: orgRead() } });
  renderEventPage();
  expect(await screen.findByRole('heading', { name: 'Winter Gala' }, { timeout: 2000 })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit event' })).not.toBeInTheDocument();
});

test('TC_E03S03_11 - an edit from a tab opened before the rejection is refused, with no change-request link', async () => {
  // The tab loaded while the request was still Under Review.
  const calls = stubApi({
    'GET /api/events?id=EVT-GALA': { body: orgRead({
      status: 'under_review', decision: null, canEdit: true,
      editableFields: ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements',
        'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationDates'],
    }) },
    'PATCH /api/events?edit=1&id=evt-gala': { status: 409, body: { error: READ_ONLY } },
  });
  renderEventPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit event' }, { timeout: 2000 }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Winter Gala (revised)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(READ_ONLY);
  expect(screen.queryByRole('link', { name: 'Request a change' })).not.toBeInTheDocument();
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(1);
});

// E08-S03 (SCRUM-60) Coordinator side against a stubbed API shaped like the
// live endpoints: the readiness page (/coordinator/events/:eventCode/readiness),
// the old /confirm link, and the event page's "Check readiness" link. Each
// refusal test checks the exact sentence in
// docs/plans/scrum-60-implementation-status.md ("What the user sees"). The
// rules themselves are proven against PostgreSQL in
// backend/tests/eventReadiness.integration.test.ts.
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi, type FakeReply } from '../../testing/fakeApi';
import { RequestDetail } from './CoordinatorWorkspace';
import { ConfirmRedirect, EventReadiness } from './EventReadiness';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const READ = 'GET /api/events?readiness=1&id=EVT-3003';
const SUBMIT = 'POST /api/events?safetyReview=1&id=evt-3003';
const BLOCKED = "This event can't be submitted for its safety check until every outstanding item is resolved.";
const SUBMITTED = 'Submitted. The event is now in Safety Review; the Organiser and the Safety Officer have been notified.';

const ready = {
  eventId: 'evt-3003', eventCode: 'EVT-3003', title: 'Planning Phase Gala', status: 'planning',
  startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T14:00:00.000Z',
  equipmentNoneRequired: false, supportNoneRequired: false,
  venueBookings: [{ id: 'b-1', venueName: 'Orchid Hall', status: 'confirmed', purpose: 'Gala dinner',
    startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T14:00:00.000Z', state: 'ready' }],
  equipment: [{ id: 'r-1', name: 'Projector-HD', requested: 3, reserved: 3, state: 'ready' }],
  support: [{ id: 's-1', description: 'Sound desk operator', startsAt: '2026-10-25T10:00:00.000Z',
    endsAt: '2026-10-25T14:00:00.000Z', status: 'staffed', state: 'ready' }],
  blockers: [], canSubmit: true,
};
function readiness(overrides: Record<string, unknown> = {}) {
  return { readiness: { ...ready, ...overrides } };
}
const blocked = readiness({
  venueBookings: [{ ...ready.venueBookings[0], status: 'pending', purpose: null, state: 'outstanding' }],
  equipment: [{ id: 'r-1', name: 'Projector-HD', requested: 3, reserved: 2, state: 'outstanding' }],
  support: [{ ...ready.support[0], status: 'open', state: 'outstanding' }],
  blockers: [
    { kind: 'no-confirmed-venue', message: 'No venue booking is Confirmed yet.' },
    { kind: 'venue-booking-outstanding', message: 'Orchid Hall — Pending' },
    { kind: 'equipment-shortfall', message: 'Projector-HD — 2 of 3 reserved; 1 outstanding' },
    { kind: 'support-unassigned', message: 'Technical support — no staff assigned yet: Sound desk operator' },
  ],
  canSubmit: false,
});

function renderAt(path: string, strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
        <Route path="/coordinator/events/:eventCode/readiness" element={<EventReadiness />} />
        <Route path="/coordinator/events/:eventCode/confirm" element={<ConfirmRedirect />} />
      </Routes>
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}
const outstanding = () => within(screen.getByRole('alert'));
const pill = () => document.querySelector('.ui-page-heading .status-pill');
const openSubmit = async () => fireEvent.click(await screen.findByRole('button', { name: 'Submit for safety check…' }));
const confirmSubmit = () => fireEvent.click(screen.getByRole('button', { name: 'Submit for safety check' }));

test('TC_E08S03_09: an outstanding venue, equipment and support are listed before submitting, each by name', async () => {
  stubApi({ [READ]: { body: blocked } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByRole('heading', { level: 1, name: 'Readiness: Planning Phase Gala' })).toBeInTheDocument();
  expect(screen.getByText('Resolve these before submitting')).toBeInTheDocument();
  for (const message of ['No venue booking is Confirmed yet.', 'Orchid Hall — Pending', 'Projector-HD — 2 of 3 reserved; 1 outstanding',
    'Technical support — no staff assigned yet: Sound desk operator']) {
    expect(outstanding().getByText(message)).toBeInTheDocument();
  }
  expect(screen.getByText('Some arrangements are still outstanding. You can submit once every item above is ready.')).toBeInTheDocument();
  const venues = screen.getByRole('table', { name: 'Venue bookings for this event' });
  expect(within(venues).getByText('Pending')).toBeInTheDocument();
  expect(within(venues).getByText('None recorded')).toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: 'Equipment requested for this event' })).getByText('Outstanding')).toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: 'Technical support requested for this event' })).getByText('No staff assigned')).toBeInTheDocument();
});

test('TC_E08S03_03 and TC_E08S03_04: a blocked submission shows the server sentence and the refreshed outstanding items, and nothing changes', async () => {
  let reads = 0;
  const calls = stubApi({
    // A stale tab: the page still shows everything ready.
    [READ]: () => { reads += 1; return { body: readiness() }; },
    [SUBMIT]: { status: 409, body: { error: BLOCKED, readiness: blocked.readiness } },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByText('Every arrangement is ready. Submit the event for its Operational Safety Check.')).toBeInTheDocument();
  await openSubmit();
  confirmSubmit();
  expect(await screen.findByText(BLOCKED)).toBeInTheDocument();
  expect(screen.getByText('Projector-HD — 2 of 3 reserved; 1 outstanding')).toBeInTheDocument();
  expect(screen.getByText('Technical support — no staff assigned yet: Sound desk operator')).toBeInTheDocument();
  expect(pill()).toHaveTextContent('Planning');
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
  expect(reads).toBe(1);

  // Cancel goes back to the choice, and the submit button gets focus again.
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit for safety check…' })).toHaveFocus());
});

test('TC_E08S03_08: submitting a ready event moves it to Safety Review and says who was notified', async () => {
  let status = 'planning';
  const calls = stubApi({
    [READ]: () => ({ body: readiness({ status, canSubmit: status === 'planning' }) }),
    [SUBMIT]: () => {
      status = 'safety_review';
      return { body: { submission: { eventId: 'evt-3003', eventCode: 'EVT-3003', status: 'safety_review', statusChangedAt: '2026-10-16T02:00:00.000Z' } } };
    },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness', true);
  await openSubmit();
  expect(screen.getByRole('form', { name: 'Submit for its safety check?' })).toHaveTextContent(
    'The event moves to Safety Review. The Organiser and the Safety Officer are notified, and the event is confirmed only once the Safety Officer approves it.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
  confirmSubmit();
  expect(await screen.findByText(SUBMITTED)).toBeInTheDocument();
  await waitFor(() => expect(pill()).toHaveTextContent('Safety Review'));
  expect(screen.getByRole('link', { name: 'View event' })).toHaveAttribute('href', '/coordinator/events/EVT-3003');
  expect(screen.queryByRole('button', { name: 'Submit for safety check…' })).not.toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
});

test('TC_E08S03_10: none required and no support needed read as words, not as missing items', async () => {
  stubApi({ [READ]: { body: readiness({ equipment: [], support: [], equipmentNoneRequired: true, supportNoneRequired: true }) } },
    { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByText('None required. Nothing to reserve.')).toBeInTheDocument();
  expect(screen.getByText('No technical support needed.')).toBeInTheDocument();
  expect(screen.queryByText('Resolve these before submitting')).not.toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();

  stubApi({ [READ]: { body: readiness({ equipment: [], support: [], venueBookings: [] }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByText('No equipment requests. Nothing to reserve.')).toBeInTheDocument();
  expect(screen.getByText('No technical support requested.')).toBeInTheDocument();
  expect(screen.getByText('No venue bookings yet. Every booking must be Confirmed or withdrawn, and at least one Confirmed.')).toBeInTheDocument();
});

test('SCRUM-60: an event in Safety Review, or not yet in Planning, offers nothing to submit', async () => {
  stubApi({ [READ]: { body: readiness({ status: 'safety_review', canSubmit: false }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByText('This event is in Safety Review. It is confirmed only once the Safety Officer approves it.')).toBeInTheDocument();
  expect(pill()).toHaveTextContent('Safety Review');
  expect(screen.queryByRole('button', { name: 'Submit for safety check…' })).not.toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();

  stubApi({ [READ]: { body: readiness({ status: 'approved', canSubmit: false }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByText('This event is approved. Only an event in Planning can be submitted for its safety check.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Submit for safety check…' })).not.toBeInTheDocument();
});

test('SCRUM-60: another Coordinator is refused with the server sentence, and the old confirm link opens the readiness page', async () => {
  stubApi({ [READ]: { status: 403, body: { error: 'Access denied. This event is not assigned to you.' } } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  expect(await screen.findByText('Access denied. This event is not assigned to you.')).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();

  stubApi({ [READ]: { body: readiness() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/confirm');
  expect(await screen.findByRole('heading', { level: 1, name: 'Readiness: Planning Phase Gala' })).toBeInTheDocument();
});

test('SCRUM-60: a submission that fails for another reason shows that sentence and keeps the page', async () => {
  stubApi({
    [READ]: { body: readiness() },
    [SUBMIT]: { status: 409, body: { error: 'This event is already in Safety Review.' } },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003/readiness');
  await openSubmit();
  confirmSubmit();
  expect(await screen.findByText('This event is already in Safety Review.')).toBeInTheDocument();
  expect(screen.queryByText('Resolve these before submitting')).not.toBeInTheDocument();
});

test('SCRUM-60: leaving the page while a submission is in flight drops its answer', async () => {
  const held = deferred<FakeReply>();
  stubApi({ [READ]: { body: readiness() }, [SUBMIT]: () => held.promise }, { role: 'event_coordinator' });
  function Leave() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/elsewhere')}>Leave</button>;
  }
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-3003/readiness']}>
      <Leave />
      <Routes>
        <Route path="/coordinator/events/:eventCode/readiness" element={<EventReadiness />} />
        <Route path="/elsewhere" element={<p>Somewhere else</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await openSubmit();
  confirmSubmit();
  fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
  await act(async () => { held.resolve({ status: 409, body: { error: BLOCKED, readiness: blocked.readiness } }); });
  expect(screen.getByText('Somewhere else')).toBeInTheDocument();
});

test('SCRUM-60: a late answer for the previous event never replaces the current one', async () => {
  const first = deferred<FakeReply>();
  stubApi({
    'GET /api/events?readiness=1&id=EVT-A': () => first.promise,
    'GET /api/events?readiness=1&id=EVT-B': { body: readiness({ eventId: 'evt-b', eventCode: 'EVT-B', title: 'Winter Gala' }) },
  }, { role: 'event_coordinator' });
  function Jump() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/coordinator/events/EVT-B/readiness')}>Go to B</button>;
  }
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-A/readiness']}>
      <Jump />
      <Routes><Route path="/coordinator/events/:eventCode/readiness" element={<EventReadiness />} /></Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Go to B' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Readiness: Winter Gala' })).toBeInTheDocument();
  await act(async () => { first.resolve({ body: readiness({ title: 'Planning Phase Gala' }) }); });
  expect(screen.getByRole('heading', { level: 1, name: 'Readiness: Winter Gala' })).toBeInTheDocument();
});

// The Coordinator's event page (Amareet's RequestDetail): the readiness link,
// and fix (b), no raw id as the eyebrow.
function eventDetail(overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-3003', event_code: 'EVT-3003', title: 'Planning Phase Gala', status: 'planning',
    status_changed_at: '2026-10-01T01:00:00.000Z', starts_at: '2026-10-25T10:00:00.000Z', ends_at: '2026-10-25T14:00:00.000Z',
    expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A',
    organiser_email: 'organiser_a@clienta.com', description: 'Gala', purpose: 'Fundraising', venue_requirements: 'Ballroom',
    accessibility_note: 'Step-free', equipment_requirements: 'none_required', layout_preference: 'Banquet',
    registration_setup: 'Invite only', coordinator_id: 'c-a', coordinator_name: 'Coord A', pendingReassignment: null,
    outstandingQuestions: [], activityLog: [],
    ...overrides,
  } };
}

test('SCRUM-60: the event page links to readiness in Planning and Safety Review, and never shows a raw id as its eyebrow', async () => {
  const extra = {
    'GET /api/venues?task=holds&event=EVT-3003': { body: { holds: [] } },
    'GET /api/venues?task=support&event=EVT-3003': { body: { requests: [] } },
  };
  stubApi({ 'GET /api/events?assigned=1&id=EVT-3003': { body: eventDetail() }, ...extra }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003');
  const link = await screen.findByRole('link', { name: 'Check readiness' });
  expect(link).toHaveAttribute('href', '/coordinator/events/EVT-3003/readiness');
  cleanup(); vi.unstubAllGlobals();

  stubApi({ 'GET /api/events?assigned=1&id=EVT-3003': { body: eventDetail({ status: 'safety_review' }) }, ...extra }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-3003');
  expect(await screen.findByRole('link', { name: 'Check readiness' })).toBeInTheDocument();
  expect(pill()).toHaveTextContent('Safety Review');
  cleanup(); vi.unstubAllGlobals();

  stubApi({ 'GET /api/events?assigned=1&id=0f6c': { body: eventDetail({ id: '0f6c', event_code: null, status: 'approved' }) } },
    { role: 'event_coordinator' });
  renderAt('/coordinator/events/0f6c');
  expect(await screen.findByRole('heading', { level: 1, name: 'Planning Phase Gala' })).toBeInTheDocument();
  expect(document.querySelector('.ui-page-heading .eyebrow, .ui-page-heading p')).toHaveTextContent('Request');
  expect(screen.queryByRole('link', { name: 'Check readiness' })).not.toBeInTheDocument();
});

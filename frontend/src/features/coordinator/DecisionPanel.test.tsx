// E03-S03 (SCRUM-34) Coordinator side against a stubbed API shaped like the
// live endpoints: the decide page (/coordinator/events/:eventCode/decide) and
// the event page's "Decide on request" button. Each refusal test checks the
// exact sentence in docs/plans/scrum-34-implementation-status.md ("What the
// user sees"). The rules themselves are proven against PostgreSQL in
// backend/tests/decision.integration.test.ts.
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi, type FakeReply } from '../../testing/fakeApi';
import { RequestDetail } from './CoordinatorWorkspace';
import { DecisionPanel } from './DecisionPanel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const READ = 'GET /api/events?assigned=1&id=EVT-ANNUAL';
const DECIDE = 'POST /api/events?decide=1&id=evt-1';

const sentences = {
  notAssigned: 'Only the assigned Coordinator can decide on this request.',
  notUnderReview: 'A decision can only be made while the request is Under Review.',
  incomplete: "This request can't be approved until its required information is complete.",
  reasonRequired: 'Add a reason for rejecting this request.',
  reasonTooLong: 'The reason must be 2000 characters or fewer.',
  readNotAssigned: 'Access denied. This event is not assigned to you.',
  readNotCoordinator: 'Access denied. This action is for Event Coordinators.',
};

function detail(overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-1', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', status: 'under_review',
    status_changed_at: '2026-09-07T01:00:00.000Z', starts_at: '2026-10-10T01:00:00.000Z', ends_at: '2026-10-10T04:00:00.000Z',
    expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A',
    organiser_email: 'organiser_a@clienta.com', description: 'Summit', purpose: 'Community learning',
    venue_requirements: 'Auditorium with a stage', accessibility_note: 'Step-free access', equipment_requirements: 'None required',
    layout_preference: 'Theatre', registration_setup: 'Free registration',
    coordinator_id: 'c-b', coordinator_name: 'Coord B', pendingReassignment: null, outstandingQuestions: [],
    ...overrides,
  } };
}

function decided(status: 'approved' | 'rejected', reason: string | null = null) {
  return { decision: { eventId: 'evt-1', eventCode: 'EVT-ANNUAL', status, statusChangedAt: '2026-09-10T02:00:00.000Z', decisionReason: reason } };
}

// A decide endpoint that records the decision, so the next read reflects it.
function liveApi(reply: (body: { decision: string; reason?: string }) => FakeReply) {
  let status = 'under_review';
  const calls = stubApi({
    [DECIDE]: (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { decision: string; reason?: string };
      const answer = reply(body);
      if ((answer.status ?? 200) === 200) status = body.decision === 'approve' ? 'approved' : 'rejected';
      return answer;
    },
    [READ]: () => ({ body: detail({ status }) }),
  }, { role: 'event_coordinator' });
  return calls;
}

function renderAt(path: string, strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
        <Route path="/coordinator/events/:eventCode/decide" element={<DecisionPanel />} />
        <Route path="/coordinator/events/:eventCode/clarify" element={<p>Clarification form</p>} />
      </Routes>
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

const choose = async (name: 'Approve…' | 'Reject…') => fireEvent.click(await screen.findByRole('button', { name }));
const confirmButton = (name: 'Approve request' | 'Reject request') => fireEvent.click(screen.getByRole('button', { name }));
const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST');
const pill = () => document.querySelector('.ui-page-heading .status-pill');

test('the event page offers "Decide on request" only while the request is Under Review', async () => {
  stubApi({ [READ]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL');
  const link = await screen.findByRole('link', { name: 'Decide on request' });
  expect(link).toHaveAttribute('href', '/coordinator/events/EVT-ANNUAL/decide');
  cleanup(); vi.unstubAllGlobals();

  stubApi({ [READ]: { body: detail({ status: 'approved' }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL');
  expect(await screen.findByRole('heading', { level: 1, name: 'Annual Tech Summit' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Decide on request' })).not.toBeInTheDocument();
});

test('the decide page shows what is being decided, with Request clarification, Reject and Approve in that order', async () => {
  stubApi({ [READ]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  expect(await screen.findByRole('heading', { level: 1, name: 'Decide: Annual Tech Summit' })).toBeInTheDocument();
  const facts = screen.getByRole('region', { name: "What you're deciding" });
  expect(facts).toHaveTextContent('Organiser A');
  expect(facts).toHaveTextContent('200');
  // Document order is the reading and Tab order (design.md sections 5.2 and 9).
  const actions = [...screen.getByRole('region', { name: 'Your decision' }).querySelectorAll('a, button')]
    .map(element => element.textContent);
  expect(actions).toEqual(['Request clarification', 'Reject…', 'Approve…']);
  expect(pill()).toHaveTextContent('Under review');
});

test('Request clarification on the decide page opens the question page', async () => {
  stubApi({ [READ]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  fireEvent.click(await screen.findByRole('link', { name: 'Request clarification' }));
  expect(await screen.findByText('Clarification form')).toBeInTheDocument();
});

test('approving shows the outcome, keeps the page, and leaves nothing more to decide', async () => {
  const calls = liveApi(() => ({ body: decided('approved') }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Approve…');
  confirmButton('Approve request');

  expect(await screen.findByText('Approved. Organiser A has been notified.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View request' })).toHaveAttribute('href', '/coordinator/events/EVT-ANNUAL');
  expect(posts(calls)[0].body).toEqual({ decision: 'approve' });
  await waitFor(() => expect(pill()).toHaveTextContent('Approved'));
  expect(screen.getByText("This request is approved, so there's nothing to decide.")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
});

test('the confirm button reads Approving… while the decision is being sent', async () => {
  const held = deferred<FakeReply>();
  stubApi({ [DECIDE]: () => held.promise, [READ]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Approve…');
  confirmButton('Approve request');
  expect(await screen.findByRole('button', { name: 'Approving…' })).toBeDisabled();
  await act(async () => { held.resolve({ body: decided('approved') }); });
  expect(await screen.findByText('Approved. Organiser A has been notified.')).toBeInTheDocument();
});

test('the decision still lands under StrictMode, which mounts the page twice in development', async () => {
  liveApi(() => ({ body: decided('rejected', 'Requested date unavailable across all venues') }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide', true);
  await choose('Reject…');
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Requested date unavailable across all venues' } });
  confirmButton('Reject request');
  expect(await screen.findByText('Rejected. Organiser A has been notified, with your reason.')).toBeInTheDocument();
  await waitFor(() => expect(pill()).toHaveTextContent('Rejected'));
});

test('opening a panel moves focus into it, and Cancel returns focus to the button that opened it', async () => {
  stubApi({ [READ]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Reject…');
  expect(screen.getByLabelText('Reason')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await screen.findByRole('button', { name: 'Reject…' })).toHaveFocus();

  await choose('Approve…');
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await screen.findByRole('button', { name: 'Approve…' })).toHaveFocus();
});

test('TC_E03S03_02 - a blocked approval shows the server sentence and lists the missing items, and the status stays Under review', async () => {
  const calls = liveApi(() => ({ status: 409, body: { error: sentences.incomplete, missingFields: ['Venue requirements'] } }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Approve…');
  confirmButton('Approve request');

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(`${sentences.incomplete} Missing: Venue requirements.`);
  expect(posts(calls)).toHaveLength(1);
  expect(pill()).toHaveTextContent('Under review');
  expect(screen.queryByText(/has been notified/)).not.toBeInTheDocument();
});

test('TC_E03S03_04 - an empty or blank reason is refused before anything is sent', async () => {
  const calls = liveApi(() => ({ body: decided('rejected', 'x') }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Reject…');
  confirmButton('Reject request');
  expect(screen.getByLabelText('Reason')).toHaveAccessibleDescription(sentences.reasonRequired);
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '    ' } });
  confirmButton('Reject request');
  expect(screen.getByLabelText('Reason')).toHaveAccessibleDescription(sentences.reasonRequired);
  expect(posts(calls)).toHaveLength(0);
  expect(pill()).toHaveTextContent('Under review');
});

test('TC_E03S03_06 - an unassigned Coordinator sees the refusal and no decision buttons', async () => {
  stubApi({ [READ]: { status: 403, body: { error: sentences.readNotAssigned } } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  const refusal = await screen.findByRole('alert');
  expect(refusal).toHaveTextContent('Access refused');
  expect(refusal).toHaveTextContent(sentences.readNotAssigned);
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reject…' })).not.toBeInTheDocument();
});

test('TC_E03S03_06 - a Coordinator reassigned away while the page was open gets the server refusal in the panel', async () => {
  liveApi(() => ({ status: 403, body: { error: sentences.notAssigned } }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Reject…');
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Requested date unavailable across all venues' } });
  confirmButton('Reject request');
  expect(await screen.findByRole('alert')).toHaveTextContent(sentences.notAssigned);
  expect(pill()).toHaveTextContent('Under review');
});

test('TC_E03S03_07 - a request that is not Under Review has nothing to decide', async () => {
  stubApi({ [READ]: { body: detail({ status: 'awaiting_clarification' }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  expect(await screen.findByText("This request is awaiting clarification, so there's nothing to decide.")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reject…' })).not.toBeInTheDocument();
});

test('TC_E03S03_07 - a stale tab gets the server sentence when the request has moved on', async () => {
  liveApi(() => ({ status: 409, body: { error: sentences.notUnderReview } }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Approve…');
  confirmButton('Approve request');
  expect(await screen.findByRole('alert')).toHaveTextContent(sentences.notUnderReview);
});

test('TC_E03S03_08 - an Organiser on the decide page is refused with no decision buttons', async () => {
  stubApi({ [READ]: { status: 403, body: { error: sentences.readNotCoordinator } } }, { role: 'event_organiser' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  const refusal = await screen.findByRole('alert');
  expect(refusal).toHaveTextContent('Access refused');
  expect(refusal).toHaveTextContent(sentences.readNotCoordinator);
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
});

test('TC_E03S03_09 - a rejected request cannot be decided again', async () => {
  stubApi({ [READ]: { body: detail({ status: 'rejected' }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  expect(await screen.findByText("This request is rejected, so there's nothing to decide.")).toBeInTheDocument();
  expect(pill()).toHaveTextContent('Rejected');
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
});

test('TC_E03S03_09 - a stale tab approving a request rejected meanwhile gets the server sentence', async () => {
  liveApi(() => ({ status: 409, body: { error: sentences.notUnderReview } }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Approve…');
  confirmButton('Approve request');
  expect(await screen.findByRole('alert')).toHaveTextContent(sentences.notUnderReview);
  expect(screen.queryByText(/has been notified/)).not.toBeInTheDocument();
});

test('TC_E03S03_10 - a 2001-character reason is refused with the limit, and exactly 2000 characters is sent in full', async () => {
  const calls = liveApi(body => (body.reason && body.reason.length > 2000
    ? { status: 400, body: { error: sentences.reasonTooLong } }
    : { body: decided('rejected', body.reason ?? null) }));
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Reject…');
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'a'.repeat(2001) } });
  confirmButton('Reject request');
  expect(await screen.findByRole('alert')).toHaveTextContent(sentences.reasonTooLong);
  expect(pill()).toHaveTextContent('Under review');

  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'b'.repeat(2000) } });
  confirmButton('Reject request');
  expect(await screen.findByText('Rejected. Organiser A has been notified, with your reason.')).toBeInTheDocument();
  expect(posts(calls)[1].body).toEqual({ decision: 'reject', reason: 'b'.repeat(2000) });
});

// The page runs no completeness check of its own: the server decides (D10),
// so an empty accessibility note never stops the Coordinator from asking.
test('TC_E03S03_12 - the page does not block an approval whose accessibility needs are only predefined features', async () => {
  const calls = stubApi({
    [DECIDE]: { body: decided('approved') },
    [READ]: { body: detail({ title: 'Accessible Design Workshop', accessibility_note: null }) },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/decide');
  await choose('Approve…');
  confirmButton('Approve request');
  expect(await screen.findByText('Approved. Organiser A has been notified.')).toBeInTheDocument();
  expect(posts(calls)).toEqual([expect.objectContaining({ body: { decision: 'approve' } })]);
});

test('a late answer for the previous request never replaces the current one', async () => {
  const first = deferred<FakeReply>();
  stubApi({
    'GET /api/events?assigned=1&id=EVT-A': () => first.promise,
    'GET /api/events?assigned=1&id=EVT-B': { body: detail({ id: 'evt-b', event_code: 'EVT-B', title: 'Winter Gala' }) },
  }, { role: 'event_coordinator' });
  function Jump() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/coordinator/events/EVT-B/decide')}>Go to B</button>;
  }
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-A/decide']}>
      <Jump />
      <Routes><Route path="/coordinator/events/:eventCode/decide" element={<DecisionPanel />} /></Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Go to B' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Decide: Winter Gala' })).toBeInTheDocument();
  await act(async () => { first.resolve({ body: detail({ title: 'Annual Tech Summit' }) }); });
  expect(screen.getByRole('heading', { level: 1, name: 'Decide: Winter Gala' })).toBeInTheDocument();
});

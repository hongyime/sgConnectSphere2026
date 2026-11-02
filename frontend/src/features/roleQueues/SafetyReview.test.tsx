// E08-S06 (SCRUM-158, SCRUM-248): the Safety Officer's review page and the
// "sent back" notice. Each test names the TC it covers; the server's own
// checks are proved in backend/tests/safetyReview*.test.ts.
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi, type FakeReply } from '../../testing/fakeApi';
import { SAFETY_FACTOR_LABELS, SAFETY_FACTORS, type SafetyReview as Review } from './roleQueueApi';
import { SafetyReview } from './SafetyReview';
import { SafetyReturnAlert } from './SafetyReturnAlert';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const READ = 'GET /api/events?safetyReview=1&id=EVT-2';
const DECIDE = 'POST /api/events?safetyDecision=1&id=event-2';

function review(code = 'EVT-2', title = 'Annual Gala'): { review: Review } {
  return { review: {
    event: { id: code === 'EVT-2' ? 'event-2' : 'event-3', event_code: code, title, status: 'safety_review', status_changed_at: '2026-12-01T01:00:00Z',
      starts_at: '2026-12-02T01:00:00Z', ends_at: '2026-12-02T09:00:00Z', expected_attendance: 300,
      coordinator_id: 'coord-1', coordinator_name: 'Coordinator A', organiser_name: 'Olivia Tan' },
    sessions: [
      { id: 's-1', title: 'Morning', starts_at: '2026-12-02T01:00:00Z', ends_at: '2026-12-02T04:00:00Z', expected_attendance: 300,
        layout: 'Theatre', accessibility_note: 'Two wheelchair users', accessibility: ['Step-free access'] },
      { id: 's-2', title: null, starts_at: '2026-12-02T05:00:00Z', ends_at: '2026-12-02T09:00:00Z', expected_attendance: 100,
        layout: null, accessibility_note: null, accessibility: [] },
    ],
    venues: [{ id: 'b-1', session_id: 's-1', name: 'Riverside Hall', capacity: 400, restrictions: ['East exit repairs'] }],
    equipment: [
      { id: 'q-1', session_id: 's-1', name: 'Stage rig', requested: 1, reserved: 1, placement: 'Stage left' },
      { id: 'q-2', session_id: null, name: 'Lectern', requested: 1, reserved: 0, placement: null },
    ],
    support: [{ id: 't-1', description: 'Sound desk', status: 'staffed' }],
  } };
}

function renderPage(path = '/safety/review/EVT-2') {
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/safety/review/:eventId" element={<SafetyReview />} />
          <Route path="/safety/queue" element={<p>The queue</p>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

const assessment = (factor: typeof SAFETY_FACTORS[number]) => screen.getByLabelText(SAFETY_FACTOR_LABELS[factor]) as HTMLSelectElement;
function answerAll(unsatisfactory: string[] = []) {
  for (const factor of SAFETY_FACTORS) {
    fireEvent.change(assessment(factor), { target: { value: unsatisfactory.includes(factor) ? 'no' : 'yes' } });
    fireEvent.change(screen.getByLabelText(`Comment on ${SAFETY_FACTOR_LABELS[factor].toLowerCase()}`), { target: { value: `${factor} checked` } });
  }
}

test('TC_E08S06_01: the review shows each Session with its venues, equipment and accessibility, and what has no Session', async () => {
  stubApi({ [READ]: { body: review() } }, { role: 'safety_officer' });
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Decide: Annual Gala' })).toBeInTheDocument();
  const morning = screen.getByRole('region', { name: 'Morning' });
  expect(within(morning).getByText('Riverside Hall: capacity 400; restrictions: East exit repairs')).toBeInTheDocument();
  expect(within(morning).getByText('1 × Stage rig, 1 reserved; placement: Stage left')).toBeInTheDocument();
  expect(within(morning).getByText('Step-free access; Two wheelchair users')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Session 2' })).getAllByText('None recorded').length).toBeGreaterThan(0);
  expect(within(screen.getByRole('region', { name: 'Not tied to a Session' })).getByText('1 × Lectern, 0 reserved')).toBeInTheDocument();
  expect(screen.getByText('Sound desk (staffed)')).toBeInTheDocument();
});

test('TC_E08S06_02: no factor starts answered, and deciding before every factor and comment is recorded sends nothing', async () => {
  const calls = stubApi({ [READ]: { body: review() } }, { role: 'safety_officer' });
  renderPage();
  await screen.findByRole('heading', { name: 'Decide: Annual Gala' });
  expect(SAFETY_FACTORS.map(factor => assessment(factor).value)).toEqual(SAFETY_FACTORS.map(() => ''));
  fireEvent.click(screen.getByRole('button', { name: 'Approve…' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Fix the highlighted factors, then decide again.');
  expect(screen.getAllByText('Choose satisfactory or not satisfactory.')).toHaveLength(7);
  expect(screen.getAllByText('Comment is required.')).toHaveLength(7);
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
});

test('TC_E08S06_02: approving with every factor satisfactory confirms the event after the confirm step', async () => {
  const calls = stubApi({ [READ]: { body: review() }, [DECIDE]: { body: { decision: { status: 'confirmed', decision: 'approve' } } } }, { role: 'safety_officer' });
  renderPage();
  await screen.findByRole('heading', { name: 'Decide: Annual Gala' });
  answerAll(['crowd_movement']);
  fireEvent.click(screen.getByRole('button', { name: 'Approve…' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Approval needs every factor to be satisfactory.');

  fireEvent.change(assessment('crowd_movement'), { target: { value: 'yes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Approve…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve safety check' }));
  expect(await screen.findByText('Approved. The event is Confirmed, and the Organiser and the Coordinator have been notified.')).toBeInTheDocument();
  const post = calls.find(call => call.method === 'POST')!;
  expect(post.body).toEqual({ decision: 'approve', factors: Object.fromEntries(SAFETY_FACTORS.map(factor => [factor, { satisfactory: true, comment: `${factor} checked` }])) });
  fireEvent.click(screen.getByRole('link', { name: 'Back to the safety review queue' }));
  expect(await screen.findByText('The queue')).toBeInTheDocument();
});

test('TC_E08S06_03: requesting changes needs a factor marked not satisfactory and a reason', async () => {
  const calls = stubApi({ [READ]: { body: review() }, [DECIDE]: { body: { decision: { status: 'planning', decision: 'request_changes' } } } }, { role: 'safety_officer' });
  renderPage();
  await screen.findByRole('heading', { name: 'Decide: Annual Gala' });
  answerAll();
  fireEvent.click(screen.getByRole('button', { name: 'Request changes…' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Mark the factors that need changes as not satisfactory.');

  fireEvent.change(assessment('equipment_placement'), { target: { value: 'no' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request changes…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
  expect(screen.getByText('Reason is required.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Move the rig' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
  expect(await screen.findByText('Changes requested. The event is back in Planning, and the Organiser and the Coordinator have been notified.')).toBeInTheDocument();
  const post = calls.find(call => call.method === 'POST')!.body as { decision: string; reason: string; factors: Record<string, { satisfactory: boolean }> };
  expect([post.decision, post.reason, post.factors.equipment_placement.satisfactory]).toEqual(['request_changes', 'Move the rig', false]);
});

test('TC_E08S06_04 / _05: rejecting shows a server refusal in the confirm step, and Cancel goes back to the choices', async () => {
  stubApi({ [READ]: { body: review() }, [DECIDE]: { status: 409, body: { error: 'Only an event in Safety Review can receive a safety decision.' } } }, { role: 'safety_officer' });
  renderPage();
  await screen.findByRole('heading', { name: 'Decide: Annual Gala' });
  answerAll();
  fireEvent.click(screen.getByRole('button', { name: 'Reject…' }));
  expect(screen.getByText(/it is not cancelled/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Unsafe overall' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject safety arrangement' }));
  expect(await screen.findByText('Only an event in Safety Review can receive a safety decision.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Reject…' })).toBeInTheDocument();
});

test('TC_E08S06_05: another role opening a review is shown the refusal, with a way back to the queue', async () => {
  stubApi({ [READ]: { status: 403, body: { error: 'Access denied. This action is for Safety Officers.' } } }, { role: 'event_coordinator' });
  renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('Access denied. This action is for Safety Officers.');
  expect(screen.getByRole('link', { name: 'Back to the safety review queue' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve…' })).toBeNull();
});

test('a late answer for the previous event never replaces the one now open', async () => {
  const first = deferred<FakeReply>();
  stubApi({ [READ]: () => first.promise, 'GET /api/events?safetyReview=1&id=EVT-3': { body: review('EVT-3', 'Charity Run') } }, { role: 'safety_officer' });
  function Next() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/safety/review/EVT-3')}>Next</button>;
  }
  render(
    <MemoryRouter initialEntries={['/safety/review/EVT-2']}>
      <Next />
      <Routes><Route path="/safety/review/:eventId" element={<SafetyReview />} /></Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByRole('heading', { name: 'Decide: Charity Run' })).toBeInTheDocument();
  await act(async () => { first.resolve({ body: review() }); });
  expect(screen.getByRole('heading', { name: 'Decide: Charity Run' })).toBeInTheDocument();
});

test('TC_E08S06_04: the sent-back notice names a rejection or a request for changes, with the reason', () => {
  const { rerender } = render(<SafetyReturnAlert value={{ decision: 'reject', reason: 'Unsafe overall', decidedAt: '2026-12-01T02:00:00Z' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Safety arrangement rejected');
  expect(screen.getByRole('alert')).toHaveTextContent('Reason: Unsafe overall.');
  rerender(<SafetyReturnAlert value={{ decision: 'request_changes', reason: null, decidedAt: '2026-12-01T02:00:00Z' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Safety check: changes requested');
  expect(screen.getByRole('alert')).toHaveTextContent('Reason: Not recorded.');
  rerender(<SafetyReturnAlert value={null} />);
  expect(screen.queryByRole('alert')).toBeNull();
});

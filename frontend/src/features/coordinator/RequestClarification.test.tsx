// E03-S02 (SCRUM-33) Coordinator side against a stubbed API shaped like the
// live endpoints: the question form (/coordinator/events/:eventCode/clarify)
// and what the event page shows. Each refusal test checks the exact sentence
// in docs/plans/scrum-33-implementation-status.md ("What the user sees").
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi, type FakeReply } from '../../testing/fakeApi';
import { RequestDetail } from './CoordinatorWorkspace';
import { RequestClarification } from './RequestClarification';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const asked = [
  { id: 'q-1', body: 'Please confirm the expected number of attendees', created_at: '2026-09-08T02:00:00.000Z', author_name: 'Coord B' },
  { id: 'q-2', body: 'Do you need microphones for the speakers?', created_at: '2026-09-08T02:00:01.000Z', author_name: 'Coord B' },
];

function detail(overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-1', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', status: 'under_review',
    status_changed_at: '2026-09-07T01:00:00.000Z', starts_at: '2026-10-10T01:00:00.000Z', ends_at: '2026-10-10T04:00:00.000Z',
    expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A',
    organiser_email: 'organiser_a@clienta.com', description: 'Summit', purpose: null, venue_requirements: null,
    accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'c-b', coordinator_name: 'Coord B', pendingReassignment: null, outstandingQuestions: [],
    ...overrides,
  } };
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
        <Route path="/coordinator/events/:eventCode/clarify" element={<RequestClarification />} />
      </Routes>
    </MemoryRouter>,
  );
}

const question = (number: number) => screen.findByLabelText(`Question ${number}`);
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send questions' }));
const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST');

test('TC_E03S02_01 - sending a question moves the request to Awaiting clarification and shows the question on the event page', async () => {
  let sent = false;
  const calls = stubApi({
    'POST /api/events?clarification=request&id=evt-1': () => { sent = true; return { status: 201, body: { clarification: {} } }; },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': () => ({ body: sent
      ? detail({ status: 'awaiting_clarification', outstandingQuestions: [asked[0]] })
      : detail() }),
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL');

  fireEvent.click(await screen.findByRole('link', { name: 'Request clarification' }));
  fireEvent.change(await question(1), { target: { value: '  Please confirm the expected number of attendees  ' } });
  send();

  expect(await screen.findByText('Questions sent. The request is now awaiting clarification.')).toBeInTheDocument();
  expect(posts(calls)[0].body).toEqual({ questions: ['Please confirm the expected number of attendees'] });
  expect(screen.getByText('Awaiting clarification')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Outstanding questions' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Request clarification' })).not.toBeInTheDocument();
});

test('TC_E03S02_12 - two questions are sent together after a third empty box is removed', async () => {
  const calls = stubApi({
    'POST /api/events?clarification=request&id=evt-1': { status: 201, body: { clarification: {} } },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: asked[0].body } });
  fireEvent.click(screen.getByRole('button', { name: 'Add another question' }));
  expect(await question(2)).toHaveFocus();
  fireEvent.change(await question(2), { target: { value: asked[1].body } });
  fireEvent.click(screen.getByRole('button', { name: 'Add another question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove question 3' }));
  expect(screen.queryByLabelText('Question 3')).not.toBeInTheDocument();
  send();

  await waitFor(() => expect(posts(calls)).toHaveLength(1));
  expect(posts(calls)[0].body).toEqual({ questions: [asked[0].body, asked[1].body] });
});

test('TC_E03S02_03 - the event page lists each outstanding question with who asked and the date raised', async () => {
  stubApi({
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail({ status: 'awaiting_clarification', outstandingQuestions: asked }) },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL');

  const items = (await screen.findByRole('heading', { name: 'Outstanding questions' })).closest('section')!.querySelectorAll('dd');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('Please confirm the expected number of attendees');
  expect(items[0]).toHaveTextContent('Asked by Coord B on 8 Sept 2026');
  expect(items[1]).toHaveTextContent('Do you need microphones for the speakers?');
});

test('TC_E03S02_07 - an empty question is caught before sending', async () => {
  const calls = stubApi({ 'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: '   ' } });
  send();

  expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one question.');
  expect(await question(1)).toHaveAccessibleDescription(/Add at least one question\./);
  expect(posts(calls)).toHaveLength(0);
});

test('TC_E03S02_07 - a blank box beside a real question asks to fill it in or remove it', async () => {
  const calls = stubApi({ 'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: asked[0].body } });
  fireEvent.click(screen.getByRole('button', { name: 'Add another question' }));
  send();

  expect(await question(2)).toHaveAccessibleDescription(/Enter the question, or remove this box\./);
  expect(posts(calls)).toHaveLength(0);
});

test('TC_E03S02_08 - a 2001-character question is caught before sending and 2000 characters are sent', async () => {
  const calls = stubApi({
    'POST /api/events?clarification=request&id=evt-1': { status: 201, body: { clarification: {} } },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: 'a'.repeat(2001) } });
  send();
  expect(await question(1)).toHaveAccessibleDescription(/Each question must be 2000 characters or fewer\./);
  expect(posts(calls)).toHaveLength(0);

  fireEvent.change(await question(1), { target: { value: 'a'.repeat(2000) } });
  send();
  await waitFor(() => expect(posts(calls)).toHaveLength(1));
  expect((posts(calls)[0].body as { questions: string[] }).questions[0]).toHaveLength(2000);
});

test('TC_E03S02_08 - the server refusal for an over-long question is shown word for word', async () => {
  stubApi({
    'POST /api/events?clarification=request&id=evt-1': { status: 400, body: { error: 'Each question must be 2000 characters or fewer.' } },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: 'Short enough here' } });
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent('Each question must be 2000 characters or fewer.');
});

test('TC_E03S02_05 - a Coordinator not assigned to the request sees the server refusal when sending', async () => {
  stubApi({
    'POST /api/events?clarification=request&id=evt-1': { status: 403, body: { error: 'Only the assigned Coordinator can request clarification on this request.' } },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: asked[0].body } });
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the assigned Coordinator can request clarification on this request.');
  expect(screen.getByRole('button', { name: 'Send questions' })).toBeEnabled();
});

test('TC_E03S02_05 - a Coordinator who cannot open the event gets no question form', async () => {
  const calls = stubApi({
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { status: 404, body: { error: 'not_found' } },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  expect(await screen.findByText(/Couldn.t load this event/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
});

test('TC_E03S02_06 - a request that is not Under Review shows why instead of the form', async () => {
  stubApi({
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail({ status: 'awaiting_clarification', outstandingQuestions: [asked[0]] }) },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  expect(await screen.findByText('Clarification can only be requested while the request is Under Review.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to event' })).toHaveAttribute('href', '/coordinator/events/EVT-ANNUAL');
});

test('TC_E03S02_06 - a page left open after the status changed shows the server refusal', async () => {
  stubApi({
    'POST /api/events?clarification=request&id=evt-1': { status: 409, body: { error: 'Clarification can only be requested while the request is Under Review.' } },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: asked[0].body } });
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent('Clarification can only be requested while the request is Under Review.');
});

test('the event page offers Request clarification only while the request is Under Review', async () => {
  stubApi({ 'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail({ status: 'approved' }) } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL');
  expect(await screen.findByRole('heading', { level: 1, name: 'Annual Tech Summit' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Request clarification' })).not.toBeInTheDocument();
});

test('the send button is busy while the questions are on their way', async () => {
  const reply = deferred<FakeReply>();
  stubApi({
    'POST /api/events?clarification=request&id=evt-1': () => reply.promise,
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-ANNUAL/clarify');

  fireEvent.change(await question(1), { target: { value: asked[0].body } });
  send();
  expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
  await act(async () => { reply.resolve({ status: 201, body: { clarification: {} } }); });
});

test('a late answer for the previous event never replaces the current one', async () => {
  const first = deferred<FakeReply>();
  stubApi({
    'GET /api/events?assigned=1&id=EVT-OLD': () => first.promise,
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-OLD/clarify', '/coordinator/events/EVT-ANNUAL/clarify']} initialIndex={0}>
      <Routes>
        <Route path="/coordinator/events/:eventCode/clarify" element={<><RequestClarification /><NavigateNext /></>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next event' }));
  expect(await screen.findByText(/Ask Organiser A what you need to know about Annual Tech Summit/)).toBeInTheDocument();
  await act(async () => { first.resolve({ body: detail({ id: 'evt-old', event_code: 'EVT-OLD', title: 'Old Event', status: 'approved' }) }); });
  expect(screen.queryByText(/Old Event/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Question 1')).toBeInTheDocument();
});

// Development runs in StrictMode, which mounts, unmounts and remounts once. A
// "still mounted?" ref that is never set back to true drops the reply and leaves
// the button on "Sending…" (found in the browser tests, 2026-10-02).
test('the reply is handled under StrictMode, as in development', async () => {
  stubApi({
    'POST /api/events?clarification=request&id=evt-1': { status: 201, body: { clarification: {} } },
    'GET /api/events?assigned=1&id=EVT-ANNUAL': { body: detail() },
  }, { role: 'event_coordinator' });
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/coordinator/events/EVT-ANNUAL/clarify']}>
        <Routes>
          <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
          <Route path="/coordinator/events/:eventCode/clarify" element={<RequestClarification />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
  fireEvent.change(await question(1), { target: { value: asked[0].body } });
  send();
  expect(await screen.findByText('Questions sent. The request is now awaiting clarification.')).toBeInTheDocument();
});

// Moves to the second history entry, as following a link to another event would.
function NavigateNext() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(1)}>Next event</button>;
}

// E03-S02 (SCRUM-33) Organiser side against a stubbed API shaped like the
// live endpoints: the request page's questions and "Respond now", and the
// answer screen (/organiser/requests/:eventCode/clarify). The organisation
// read (GET /api/events?id=) carries the questions; the own-requests read
// (GET /api/events?mine=1&id=) answers 404 for a colleague's request. Each
// refusal test checks the exact sentence in
// docs/plans/scrum-33-implementation-status.md ("What the user sees").
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { deferred, stubApi, type FakeHandler, type FakeReply } from '../../testing/fakeApi';
import { AnswerQuestions } from './AnswerQuestions';
import { SubmittedDetail } from './Organiser';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const asked = [
  { id: '11111111-1111-4111-8111-111111111111', body: 'Please confirm the expected number of attendees', created_at: '2026-09-08T02:00:00.000Z', author_name: 'Coord B' },
  { id: '22222222-2222-4222-8222-222222222222', body: 'Do you need microphones for the speakers?', created_at: '2026-09-08T02:00:01.000Z', author_name: 'Coord B' },
];

const own = {
  id: 'evt-1', title: 'Annual Tech Summit', purpose: 'Community learning', status: 'awaiting_clarification',
  startAt: '2026-10-10T01:00:00.000Z', endAt: '2026-10-10T04:00:00.000Z', expectedAttendance: 200,
};

function orgRead(overrides: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-1', event_code: 'EVT-ANNUAL', title: 'Annual Tech Summit', status: 'awaiting_clarification',
    status_changed_at: '2026-09-08T02:00:00.000Z', organiser_id: 'org-a', statusHistory: [], comments: [],
    outstandingQuestions: asked, ...overrides,
  } };
}

// The own-requests read first: its pattern is more specific than the organisation read's.
function api(options: { org?: Record<string, unknown>; owner?: boolean; post?: FakeHandler } = {}) {
  return stubApi({
    'GET /api/events?mine=1&id=evt-1': options.owner === false
      ? { status: 404, body: { error: 'not_found' } }
      : { body: { event: { ...own, status: options.org?.status ?? own.status } } },
    'GET /api/events?id=EVT-ANNUAL': { body: orgRead(options.org) },
    'POST /api/events?clarification=response&id=evt-1': options.post ?? { body: { clarification: {} } },
  });
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organiser/requests/:eventCode" element={<SubmittedDetail />} />
        <Route path="/organiser/requests/:eventCode/clarify" element={<AnswerQuestions />} />
      </Routes>
    </MemoryRouter>,
  );
}

const answer = (number: number) => screen.findByLabelText(new RegExp(`^${number}\\. `));
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send answers' }));
const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST');

test('TC_E03S02_03 - the request page lists each outstanding question with who asked and the date raised', async () => {
  api();
  renderAt('/organiser/requests/EVT-ANNUAL');

  const items = (await screen.findByRole('heading', { name: 'Outstanding questions' })).closest('section')!.querySelectorAll('dd');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('Please confirm the expected number of attendees');
  expect(items[0]).toHaveTextContent('Asked by Coord B on 8 Sept 2026');
  expect(items[1]).toHaveTextContent('Do you need microphones for the speakers?');
  expect(screen.getByText(/Your coordinator has requested clarification/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Respond now' })).toHaveAttribute('href', '/organiser/requests/EVT-ANNUAL/clarify');
});

test('TC_E03S02_02 - answering every question sends them and the request is back under review', async () => {
  let answered = false;
  const calls = stubApi({
    'GET /api/events?mine=1&id=evt-1': () => ({ body: { event: { ...own, status: answered ? 'under_review' : own.status } } }),
    'GET /api/events?id=EVT-ANNUAL': () => ({ body: answered ? orgRead({ status: 'under_review', outstandingQuestions: [] }) : orgRead() }),
    'POST /api/events?clarification=response&id=evt-1': () => { answered = true; return { body: { clarification: {} } }; },
  });
  renderAt('/organiser/requests/EVT-ANNUAL');

  fireEvent.click(await screen.findByRole('link', { name: 'Respond now' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Answer questions' })).toBeInTheDocument();
  fireEvent.change(await answer(1), { target: { value: ' Expected attendance is 200 ' } });
  fireEvent.change(await answer(2), { target: { value: 'Two handheld microphones' } });
  send();

  expect(await screen.findByText('Answers sent. The request is back under review.')).toBeInTheDocument();
  expect(posts(calls)[0].body).toEqual({ answers: [
    { questionId: asked[0].id, answer: 'Expected attendance is 200' },
    { questionId: asked[1].id, answer: 'Two handheld microphones' },
  ] });
  expect(await screen.findByText('Under review')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Outstanding questions' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Respond now' })).not.toBeInTheDocument();
});

test('TC_E03S02_09 - a missing answer is caught before sending', async () => {
  const calls = api();
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  fireEvent.change(await answer(1), { target: { value: 'Expected attendance is 200' } });
  send();

  expect(await screen.findByRole('alert')).toHaveTextContent('Answer every outstanding question before resubmitting.');
  expect(await answer(2)).toHaveAccessibleDescription(/Answer this question\./);
  expect(posts(calls)).toHaveLength(0);
});

test('TC_E03S02_09 - the server refusal for a partial answer is shown word for word', async () => {
  api({ post: { status: 400, body: { error: 'Answer every outstanding question before resubmitting.' } } });
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  fireEvent.change(await answer(1), { target: { value: 'One' } });
  fireEvent.change(await answer(2), { target: { value: 'Two' } });
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent('Answer every outstanding question before resubmitting.');
});

test('an over-long answer is caught before sending', async () => {
  const calls = api();
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  fireEvent.change(await answer(1), { target: { value: 'a'.repeat(2001) } });
  fireEvent.change(await answer(2), { target: { value: 'Two' } });
  send();
  expect(await answer(1)).toHaveAccessibleDescription(/Each answer must be 2000 characters or fewer\./);
  expect(posts(calls)).toHaveLength(0);
});

test('TC_E03S02_10 - another Organiser in the same organisation sees why they cannot answer instead of the form', async () => {
  const calls = api({ owner: false });
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  expect(await screen.findByText('Only the Organiser who submitted this request can answer its questions.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Send answers' })).not.toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
});

test('TC_E03S02_10 - the server refusal for a non-owner is shown word for word', async () => {
  api({ post: { status: 403, body: { error: 'Only the Organiser who submitted this request can answer its questions.' } } });
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  fireEvent.change(await answer(1), { target: { value: 'One' } });
  fireEvent.change(await answer(2), { target: { value: 'Two' } });
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the Organiser who submitted this request can answer its questions.');
});

test('TC_E03S02_11 - a request that is not awaiting clarification shows why instead of the form', async () => {
  api({ org: { status: 'under_review', outstandingQuestions: [] } });
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  expect(await screen.findByText('This request is not awaiting clarification.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Send answers' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to request' })).toHaveAttribute('href', '/organiser/requests/EVT-ANNUAL');
});

test('TC_E03S02_11 - a page left open after the questions were answered shows the server refusal', async () => {
  api({ post: { status: 409, body: { error: 'This request is not awaiting clarification.' } } });
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  fireEvent.change(await answer(1), { target: { value: 'One' } });
  fireEvent.change(await answer(2), { target: { value: 'Two' } });
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent('This request is not awaiting clarification.');
  expect(screen.getByRole('button', { name: 'Send answers' })).toBeEnabled();
});

test('a request that is not yours or does not exist shows not found', async () => {
  stubApi({ 'GET /api/events?id=EVT-NOPE': { status: 403, body: { error: 'Access denied.' } } });
  renderAt('/organiser/requests/EVT-NOPE/clarify');
  expect(await screen.findByRole('heading', { name: 'Request not found' })).toBeInTheDocument();
});

test('the send button is busy while the answers are on their way', async () => {
  const reply = deferred<FakeReply>();
  api({ post: () => reply.promise });
  renderAt('/organiser/requests/EVT-ANNUAL/clarify');

  fireEvent.change(await answer(1), { target: { value: 'One' } });
  fireEvent.change(await answer(2), { target: { value: 'Two' } });
  send();
  expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
  await act(async () => { reply.resolve({ status: 409, body: { error: 'This request is not awaiting clarification.' } }); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send answers' })).toBeEnabled());
});

test('a late answer for the previous request never replaces the current one', async () => {
  const first = deferred<FakeReply>();
  stubApi({
    'GET /api/events?id=EVT-OLD': () => first.promise,
    'GET /api/events?mine=1&id=evt-1': { body: { event: own } },
    'GET /api/events?id=EVT-ANNUAL': { body: orgRead() },
  });
  render(
    <MemoryRouter initialEntries={['/organiser/requests/EVT-OLD/clarify', '/organiser/requests/EVT-ANNUAL/clarify']} initialIndex={0}>
      <Routes>
        <Route path="/organiser/requests/:eventCode/clarify" element={<><AnswerQuestions /><NavigateNext /></>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next request' }));
  expect(await answer(1)).toBeInTheDocument();
  await act(async () => { first.resolve({ body: orgRead({ id: 'evt-old', event_code: 'EVT-OLD', title: 'Old Event', status: 'under_review', outstandingQuestions: [] }) }); });
  expect(screen.queryByText(/Old Event/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send answers' })).toBeInTheDocument();
});

// Development runs in StrictMode, which mounts, unmounts and remounts once. A
// "still mounted?" ref that is never set back to true drops the reply and leaves
// the button on "Sending…" (found in the browser tests, 2026-10-02).
test('the reply is handled under StrictMode, as in development', async () => {
  api();
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/organiser/requests/EVT-ANNUAL/clarify']}>
        <Routes>
          <Route path="/organiser/requests/:eventCode" element={<SubmittedDetail />} />
          <Route path="/organiser/requests/:eventCode/clarify" element={<AnswerQuestions />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
  fireEvent.change(await answer(1), { target: { value: 'One' } });
  fireEvent.change(await answer(2), { target: { value: 'Two' } });
  send();
  expect(await screen.findByText('Answers sent. The request is back under review.')).toBeInTheDocument();
});

// Moves to the second history entry, as following a link to another request would.
function NavigateNext() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(1)}>Next request</button>;
}

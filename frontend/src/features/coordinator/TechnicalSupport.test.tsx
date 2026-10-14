// E07-S06 (SCRUM-56, frontend SCRUM-146) against a stubbed API shaped like
// backend/src/modules/equipmentSupport/supportHandler.ts: the Technical
// support card on the Coordinator's event page and the request form at
// /coordinator/events/:eventCode/support. Sentences match supportRequests.ts.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { RequestDetail } from './CoordinatorWorkspace';
import { SupportRequestForm, notifiedSentence, validateSupport } from './TechnicalSupport';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const EVENT = 'GET /api/events?assigned=1&id=EVT-TECH';
const SUPPORT = 'GET /api/venues?task=support&event=EVT-TECH';
const POST = 'POST /api/venues?task=support';

function detail(status = 'planning') {
  return { event: {
    id: 'evt-1', event_code: 'EVT-TECH', title: 'Tech Conference 2026', status,
    status_changed_at: '2026-10-01T01:00:00.000Z', starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z',
    expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A',
    organiser_email: 'organiser_a@clienta.com', description: 'Annual conference', purpose: null, venue_requirements: null,
    accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'c-a', coordinator_name: 'Coordinator A', pendingReassignment: null, outstandingQuestions: [],
  } };
}

const request = {
  id: 'r-1', description: '1 AV technician for the full event', startsAt: '2026-11-12T01:00:00.000Z',
  endsAt: '2026-11-12T04:00:00.000Z', status: 'open', requestedAt: '2026-10-06T08:00:00.000Z',
};

function overview(overrides: Record<string, unknown> = {}) {
  return {
    event: { id: 'evt-1', eventCode: 'EVT-TECH', title: 'Tech Conference 2026', status: 'planning' },
    requests: [], noSupportRequired: false, canEdit: true, ...overrides,
  };
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
        <Route path="/coordinator/events/:eventCode/support" element={<SupportRequestForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

const card = async () => within((await screen.findByRole('heading', { name: 'Technical support' })).closest('section')!);
const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST');
const description = () => screen.findByLabelText('What support is needed');
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

test('TC_E07S06_01 - a request with a description and times is sent, Technical Support is notified, and it shows on the event', async () => {
  let sent = false;
  const calls = stubApi({
    [EVENT]: { body: detail() },
    [SUPPORT]: () => ({ body: overview(sent ? { requests: [request] } : {}) }),
    [POST]: () => { sent = true; return { status: 201, body: { request, notified: 2 } }; },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH');

  expect(await (await card()).findByText('No technical support has been requested for this event yet.')).toBeInTheDocument();
  fireEvent.click((await card()).getByRole('link', { name: 'Request technical support' }));

  // The form starts from the event's own times.
  const starts = await screen.findByLabelText('Support starts') as HTMLInputElement;
  const ends = screen.getByLabelText('Support ends') as HTMLInputElement;
  expect(new Date(starts.value).toISOString()).toBe('2026-11-12T01:00:00.000Z');
  expect(new Date(ends.value).toISOString()).toBe('2026-11-12T04:00:00.000Z');
  fireEvent.change(await description(), { target: { value: '  1 AV technician for the full event  ' } });
  send();

  expect(await screen.findByText('2 Technical Support Staff members have been notified.')).toBeInTheDocument();
  expect(screen.getByText('Technical support requested')).toBeInTheDocument();
  expect(posts(calls)[0].body).toEqual({
    action: 'request', event: 'EVT-TECH', description: '1 AV technician for the full event',
    startsAt: '2026-11-12T01:00:00.000Z', endsAt: '2026-11-12T04:00:00.000Z',
  });
  const list = await screen.findByRole('list', { name: 'Technical support requests' });
  expect(within(list).getByText('1 AV technician for the full event')).toBeInTheDocument();
  expect(within(list).getByText('Awaiting a technician')).toBeInTheDocument();
  // Once something is requested, "none needed" is no longer offered.
  expect(screen.queryByRole('button', { name: 'No technical support required' })).not.toBeInTheDocument();
});

test('TC_E07S06_02 - an approved event with no confirmed venue can still request support', async () => {
  const calls = stubApi({
    [EVENT]: { body: detail('approved') },
    [SUPPORT]: { body: overview({ event: { id: 'evt-1', eventCode: 'EVT-TECH', title: 'Tech Conference 2026', status: 'approved' } }) },
    [POST]: { status: 201, body: { request, notified: 1 } },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH/support');

  expect(await screen.findByText(/You don't need a confirmed venue first\./)).toBeInTheDocument();
  fireEvent.change(await description(), { target: { value: '1 sound technician' } });
  send();

  expect(await screen.findByText('1 Technical Support Staff member has been notified.')).toBeInTheDocument();
  expect(posts(calls)).toHaveLength(1);
  // No venue endpoint was consulted along the way.
  expect(calls.some(call => call.url.pathname === '/api/venues' && call.url.searchParams.get('task') !== 'support')).toBe(false);
});

test('TC_E07S06_03 - marking the event as needing no support records it, notifies nobody and creates no request', async () => {
  let declared = false;
  const calls = stubApi({
    [EVENT]: { body: detail() },
    [SUPPORT]: () => ({ body: overview({ noSupportRequired: declared }) }),
    [POST]: () => { declared = true; return { body: { noSupportRequired: true } }; },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH');

  fireEvent.click(await (await card()).findByRole('button', { name: 'No technical support required' }));

  expect(await screen.findByText('Marked as needing no technical support. Nobody has been notified.')).toBeInTheDocument();
  expect(await screen.findByText('This event needs no technical support. Nothing is waiting to be staffed.')).toBeInTheDocument();
  expect(posts(calls).map(call => call.body)).toEqual([{ action: 'none', event: 'EVT-TECH' }]);
  expect(screen.queryByRole('button', { name: 'No technical support required' })).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Technical support requests' })).not.toBeInTheDocument();
  // A request can still replace the declaration later.
  expect(screen.getByRole('link', { name: 'Request technical support' })).toBeInTheDocument();
});

test('a blank, too long or reversed request is caught before sending, with the server\'s sentences', async () => {
  const calls = stubApi({ [EVENT]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH/support');

  await description();
  send();
  expect(await screen.findByText('Describe the technical support the event needs.')).toBeInTheDocument();
  expect(screen.getByText('Check the highlighted fields and try again.')).toBeInTheDocument();
  expect(screen.getByLabelText('What support is needed')).toHaveAttribute('aria-invalid', 'true');

  // 2001 characters is one too many.
  fireEvent.change(await description(), { target: { value: 'a'.repeat(2001) } });
  send();
  expect(await screen.findByText('The description must be 2000 characters or fewer.')).toBeInTheDocument();

  fireEvent.change(await description(), { target: { value: '1 AV technician' } });
  fireEvent.change(screen.getByLabelText('Support ends'), { target: { value: (screen.getByLabelText('Support starts') as HTMLInputElement).value } });
  send();
  expect(await screen.findByText('Support must end after it starts.')).toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
});

test('validation boundaries: exactly 2000 characters is accepted, missing times are named', () => {
  const times = { startsAt: '2026-11-12T09:00', endsAt: '2026-11-12T12:00' };
  expect(validateSupport({ description: 'a'.repeat(2000), ...times })).toEqual({});
  expect(validateSupport({ description: '   ', ...times })).toEqual({ description: 'Describe the technical support the event needs.' });
  expect(validateSupport({ description: 'x', startsAt: '', endsAt: '' }))
    .toEqual({ startsAt: 'Enter when the support starts.', endsAt: 'Enter when the support ends.' });
  // An end one minute before the start is reversed; one minute after is fine.
  expect(validateSupport({ description: 'x', startsAt: '2026-11-12T09:00', endsAt: '2026-11-12T08:59' }).endsAt).toBe('Support must end after it starts.');
  expect(validateSupport({ description: 'x', startsAt: '2026-11-12T09:00', endsAt: '2026-11-12T09:01' })).toEqual({});
});

test('server field errors land on their fields, and a refusal is shown as sent', async () => {
  let reply: { status: number; body: unknown } = { status: 400, body: { error: 'validation_failed', errors: { description: ['Describe the technical support the event needs.'] } } };
  const calls = stubApi({ [EVENT]: { body: detail() }, [POST]: () => reply }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH/support');

  fireEvent.change(await description(), { target: { value: 'AV' } });
  send();
  expect(await screen.findByText('Describe the technical support the event needs.')).toBeInTheDocument();

  reply = { status: 409, body: { error: 'Technical support can only be arranged while an approved event is being planned.' } };
  send();
  expect(await screen.findByText('Technical support can only be arranged while an approved event is being planned.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send request' })).toBeEnabled();
  expect(posts(calls)).toHaveLength(2);
});

test('after confirmation the card is read-only, and the form page explains why instead of showing a form', async () => {
  stubApi({
    [EVENT]: { body: detail('confirmed') },
    [SUPPORT]: { body: overview({ canEdit: false, requests: [{ ...request, status: 'staffed' }] }) },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH');

  const section = await card();
  expect(await section.findByText('Technician assigned')).toBeInTheDocument();
  expect(section.getByText('Technical support can only be arranged while an approved event is being planned.')).toBeInTheDocument();
  expect(section.queryByRole('link', { name: 'Request technical support' })).not.toBeInTheDocument();
  expect(section.queryByRole('button', { name: 'No technical support required' })).not.toBeInTheDocument();

  cleanup();
  renderAt('/coordinator/events/EVT-TECH/support');
  expect(await screen.findByText('Technical support can only be arranged while an approved event is being planned.')).toBeInTheDocument();
  expect(screen.queryByLabelText('What support is needed')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to event' })).toHaveAttribute('href', '/coordinator/events/EVT-TECH');
});

test('a failed load can be retried, and a refused "none" shows the server\'s sentence', async () => {
  let failing = true;
  stubApi({
    [EVENT]: { body: detail() },
    [SUPPORT]: () => (failing ? { status: 500, body: {} } : { body: overview() }),
    [POST]: { status: 409, body: { error: 'This event already has a technical support request, so it cannot be marked as needing none.' } },
  }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH');

  expect(await (await card()).findByText('Technical support could not be loaded.')).toBeInTheDocument();
  failing = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.click(await screen.findByRole('button', { name: 'No technical support required' }));
  expect(await screen.findByText('This event already has a technical support request, so it cannot be marked as needing none.')).toBeInTheDocument();
});

test('an unexpected reply is shown as a failed load instead of breaking the event page', async () => {
  stubApi({ [EVENT]: { body: detail() }, [SUPPORT]: { body: { event: {} } } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH');
  expect(await (await card()).findByText('Technical support could not be loaded.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Request details' })).toBeInTheDocument();
});

test('the card is not shown before approval, so no support request is loaded', async () => {
  const calls = stubApi({ [EVENT]: { body: detail('under_review') } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH');
  expect(await screen.findByRole('heading', { name: 'Tech Conference 2026' })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Technical support' })).not.toBeInTheDocument());
  expect(calls.some(call => call.url.searchParams.get('task') === 'support')).toBe(false);
});

test('moving the start after the end is caught, and an event the Coordinator cannot open shows the refusal', async () => {
  const calls = stubApi({ [EVENT]: { body: detail() } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH/support');
  fireEvent.change(await description(), { target: { value: '1 AV technician' } });
  const ends = (screen.getByLabelText('Support ends') as HTMLInputElement).value;
  fireEvent.change(screen.getByLabelText('Support starts'), { target: { value: ends } });
  send();
  expect(await screen.findByText('Support must end after it starts.')).toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);

  cleanup();
  stubApi({ [EVENT]: { status: 403, body: { error: 'Access denied. This event is not assigned to you.' } } }, { role: 'event_coordinator' });
  renderAt('/coordinator/events/EVT-TECH/support');
  expect(await screen.findByText('Access denied. This event is not assigned to you.')).toBeInTheDocument();
  expect(screen.queryByLabelText('What support is needed')).not.toBeInTheDocument();
});

test('the notified sentence handles none, one and several', () => {
  expect(notifiedSentence(0)).toBe('No Technical Support Staff account is active yet, so nobody has been notified.');
  expect(notifiedSentence(1)).toBe('1 Technical Support Staff member has been notified.');
  expect(notifiedSentence(3)).toBe('3 Technical Support Staff members have been notified.');
});

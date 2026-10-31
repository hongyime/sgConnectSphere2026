import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi, deferred, type FakeReply } from '../../testing/fakeApi';
import { ChangeRequests } from './ChangeRequests';
import type { ChangeRequestView } from './changeRequestsApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const read = 'GET /api/events?changeRequests=1&id=EVT-A';
const write = 'POST /api/events?changeRequests=1&id=event-a';
const decide = 'POST /api/events?changeRequests=1&id=EVT-A&requestId=request-a';
function data(overrides: Partial<ChangeRequestView> = {}): ChangeRequestView {
  return { event: { id: 'event-a', eventCode: 'EVT-A', status: 'confirmed' }, permissions: { canSubmit: true, canDecide: true },
    current: { title: 'Original name', description: 'Original details', purpose: 'Learning', expectedAttendance: 40,
      startAt: '2027-03-01T01:00:00.000Z', endAt: '2027-03-01T04:00:00.000Z' },
    requests: [], ...overrides };
}
function pending(status: 'pending' | 'approved' | 'applied' | 'declined' | 'obsolete' = 'pending') {
  return { id: 'request-a', description: 'Please change the name', status, created_at: '2026-10-22T01:00:00Z',
    decision_reason: null, requested_changes: { fields: { title: 'Requested name' }, before: { title: 'Original name' } } };
}
function mount(coordinator = false, path = '/organiser/requests/EVT-A/change') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/organiser/requests/:eventCode/change" element={<ChangeRequests />} />
    <Route path="/coordinator/events/:eventCode/changes" element={<ChangeRequests coordinator={coordinator} />} />
    <Route path="/change-requests/new" element={<ChangeRequests />} />
  </Routes></MemoryRouter>);
}

test('TC_E10S01_01 / TC_E10S01_02: submit only selected fields and retain current details alongside Pending', async () => {
  let saved = false;
  const calls = stubApi({ [read]: () => ({ body: data({ requests: saved ? [pending()] : [] }) }),
    [write]: () => { saved = true; return { status: 201, body: { request: pending() } }; } });
  mount();
  await screen.findByRole('heading', { name: 'Request a change' });
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Please change the name' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change event name' }));
  expect(screen.getByLabelText('New event name')).toHaveValue('Original name');
  fireEvent.change(screen.getByLabelText('New event name'), { target: { value: 'Requested name' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  await screen.findByText('Change request sent for Coordinator review. Current Event details stay unchanged.');
  const table = await screen.findByRole('table');
  expect(within(table).getByText('Original name')).toBeInTheDocument();
  expect(within(table).getByText('Requested name')).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ description: 'Please change the name', changes: { title: 'Requested name' } });
  expect(screen.getByLabelText('Describe the change')).toHaveValue('');
});

test('TC_E10S01_01: validation and rejected save preserve the draft for correction', async () => {
  const calls = stubApi({ [read]: { body: data() }, [write]: { status: 409, body: { error: 'The Event changed. Refresh and retry.' } } });
  mount();
  const send = await screen.findByRole('button', { name: 'Send change request' });
  fireEvent.click(send);
  expect(screen.getByRole('alert')).toHaveTextContent('Describe the change and choose at least one field.');
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Update' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change purpose' }));
  fireEvent.change(screen.getByLabelText('New purpose'), { target: { value: '' } });
  fireEvent.click(send);
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a new value for purpose.');
  fireEvent.change(screen.getByLabelText('New purpose'), { target: { value: 'New purpose' } });
  fireEvent.click(send);
  await screen.findByText('The Event changed. Refresh and retry.');
  expect(screen.getByLabelText('New purpose')).toHaveValue('New purpose');
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
});

test('TC_E10S01_01: attendance and Singapore date inputs produce typed values', async () => {
  const calls = stubApi({ [read]: { body: data() }, [write]: { status: 201, body: { request: pending() } } });
  mount();
  await screen.findByRole('button', { name: 'Send change request' });
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Change attendance and start' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change expected attendance' }));
  fireEvent.change(screen.getByLabelText('New expected attendance'), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  expect(screen.getByRole('alert')).toHaveTextContent('positive whole number');
  fireEvent.change(screen.getByLabelText('New expected attendance'), { target: { value: '50' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change start date and time' }));
  expect(screen.getByLabelText('New start date and time')).toHaveValue('2027-03-01T09:00');
  fireEvent.change(screen.getByLabelText('New start date and time'), { target: { value: '2027-03-01T10:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  await screen.findByText('Change request sent for Coordinator review. Current Event details stay unchanged.');
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ description: 'Change attendance and start', changes: { expectedAttendance: 50, startAt: '2027-03-01T02:00:00.000Z' } });
});

test('TC_E10S01_01: deselecting a field removes it from submission', async () => {
  const calls = stubApi({ [read]: { body: data() } });
  mount();
  await screen.findByRole('button', { name: 'Send change request' });
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Update' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change purpose' }));
  fireEvent.change(screen.getByLabelText('New purpose'), { target: { value: 'Discard me' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change purpose' }));
  expect(screen.queryByLabelText('New purpose')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  expect(screen.getByRole('alert')).toHaveTextContent('choose at least one field');
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
});

test('TC_E10S01_04: Coordinator confirmation can be cancelled and a server stale refusal stays visible', async () => {
  const calls = stubApi({ [read]: { body: data({ requests: [pending()] }) }, [decide]: { status: 409, body: { error: 'The Event changed since submission.' } } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  expect(screen.queryByRole('button', { name: 'Send change request' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Approve…' })).toHaveFocus();
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Approve…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve change request' }));
  await screen.findByText('The Event changed since submission.');
  expect(screen.getByRole('button', { name: 'Approve change request' })).toBeEnabled();
});

test.each(['applied', 'approved', 'declined'] as const)('TC_E10S01_04 / TC_E10S01_05: %s decision displays the actual returned state', async status => {
  let saved = false;
  const calls = stubApi({ [read]: () => ({ body: data({ requests: [pending(saved ? status : 'pending')] }) }),
    [decide]: () => { saved = true; return { body: { request: pending(status) } }; } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: status === 'declined' ? 'Decline…' : 'Approve…' }));
  if (status === 'declined') fireEvent.change(screen.getByLabelText('Decision note (optional)'), { target: { value: ' Not feasible ' } });
  fireEvent.click(screen.getByRole('button', { name: status === 'declined' ? 'Decline change request' : 'Approve change request' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument());
  expect(screen.getByRole('status')).toHaveTextContent(status === 'applied' ? 'Change applied to the Event.' : status === 'approved' ? 'waiting for the arrangement check' : 'Event details are unchanged');
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ decision: status === 'declined' ? 'decline' : 'approve', reason: status === 'declined' ? 'Not feasible' : '' });
});

test('TC_E10S01_02: approved/obsolete history and terminal Event are read-only', async () => {
  const approved = { ...pending('approved'), decision_reason: 'Waiting for review', requested_changes: { fields: { title: null, startAt: '2027-03-01T01:00:00Z' } } };
  stubApi({ [read]: { body: data({ event: { id: 'event-a', eventCode: 'EVT-A', status: 'completed' }, requests: [approved, { ...pending('obsolete'), id: 'old', requested_changes: {} }] }) } });
  mount();
  await screen.findByText('This Event is completed. Change requests cannot be submitted or decided.');
  expect(screen.queryByRole('button', { name: 'Send change request' })).not.toBeInTheDocument();
  expect(screen.getByText('No structured field changes recorded.')).toBeInTheDocument();
  expect(screen.getByText('Decision reason: Waiting for review')).toBeInTheDocument();
  expect(screen.getAllByText('None recorded').length).toBeGreaterThan(0);
});

test('TC_E10S01_01: query-link entry works and missing Event gives an actionable error', async () => {
  stubApi({ [read]: { body: data() } });
  const first = mount(false, '/change-requests/new?event=EVT-A');
  await screen.findByRole('button', { name: 'Send change request' });
  first.unmount();
  mount(false, '/change-requests/new');
  await screen.findByText('Choose an Event before requesting a change.');
  expect(screen.getByRole('link', { name: 'Back to event' })).toHaveAttribute('href', '/home');
});

test('TC_E10S01_02: load error retries without showing private details', async () => {
  let fail = true;
  stubApi({ [read]: () => fail ? { status: 503, body: { error: 'Change requests are temporarily unavailable.' } } : { body: data() } });
  mount();
  await screen.findByText('Change requests are temporarily unavailable.');
  expect(screen.queryByRole('button', { name: 'Send change request' })).not.toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));
  await screen.findByRole('button', { name: 'Send change request' });
});

test('TC_E10S01_02: access refusal shows no form, comparison or decision controls', async () => {
  stubApi({ [read]: { status: 403, body: { error: 'Change request access denied.' } } });
  mount(true, '/coordinator/events/EVT-A/changes');
  await screen.findByText('Change request access denied.');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Send change request' })).not.toBeInTheDocument();
});

test('TC_E10S01_04: visiting the Coordinator URL does not grant decision controls to an Organiser', async () => {
  stubApi({ [read]: { body: data({ permissions: { canSubmit: true, canDecide: false }, requests: [pending()] }) } });
  mount(true, '/coordinator/events/EVT-A/changes');
  await screen.findByRole('table');
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Decline…' })).not.toBeInTheDocument();
});

test('TC_E10S01_01: pending submission is disabled and a late reply cannot affect a different Event', async () => {
  const reply = deferred<FakeReply>();
  stubApi({ [read]: { body: data() }, [write]: () => reply.promise,
    'GET /api/events?changeRequests=1&id=EVT-B': { body: data({ event: { id: 'event-b', eventCode: 'EVT-B', status: 'confirmed' } }) } });
  function Navigation() { const go = useNavigate(); return <><button onClick={() => go('/organiser/requests/EVT-B/change')}>Next Event</button><ChangeRequests /></>; }
  render(<MemoryRouter initialEntries={['/organiser/requests/EVT-A/change']}><Routes><Route path="/organiser/requests/:eventCode/change" element={<Navigation />} /></Routes></MemoryRouter>);
  await screen.findByRole('button', { name: 'Send change request' });
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Old Event change' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change event name' }));
  fireEvent.change(screen.getByLabelText('New event name'), { target: { value: 'Old name' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  fireEvent.submit(screen.getByRole('button', { name: 'Sending…' }).closest('form')!);
  fireEvent.click(screen.getByRole('button', { name: 'Next Event' }));
  await screen.findByText('EVT-B');
  await act(async () => reply.resolve({ status: 201, body: { request: pending() } }));
  expect(screen.queryByText('Change request sent for Coordinator review. Current Event details stay unchanged.')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Describe the change')).toHaveValue('');
});

test('TC_E10S01_04: a late decision and duplicate form events cannot affect another Event', async () => {
  const reply = deferred<FakeReply>();
  const calls = stubApi({ [read]: { body: data({ requests: [pending()] }) }, [decide]: () => reply.promise,
    'GET /api/events?changeRequests=1&id=EVT-B': { body: data({ event: { id: 'event-b', eventCode: 'EVT-B', status: 'confirmed' } }) } });
  function Navigation() { const go = useNavigate(); return <><button onClick={() => go('/coordinator/events/EVT-B/changes')}>Next Event</button><ChangeRequests coordinator /></>; }
  render(<MemoryRouter initialEntries={['/coordinator/events/EVT-A/changes']}><Routes><Route path="/coordinator/events/:eventCode/changes" element={<Navigation />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve change request' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Approve this change request?' }));
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Next Event' }));
  await screen.findByText('EVT-B');
  await act(async () => reply.resolve({ body: { request: pending('applied') } }));
  expect(screen.queryByText('Change applied to the Event.')).not.toBeInTheDocument();
});

test('TC_E10S01_01 / TC_E10S01_02: structured controls send IDs, false and null, while comparisons show labels', async () => {
  let fields: Record<string, unknown> | null = null;
  const current = { ...data().current, layoutId: 'layout-a', accessibilityFeatureIds: ['feature-a'],
    registrationEnabled: true, waitlistEnabled: false, registrationDates: { opensAt: '2027-02-01T01:00:00Z', closesAt: '2027-02-28T01:00:00Z' },
    withdrawalDeadline: '2027-02-28T01:00:00Z' };
  const references = { layouts: [{ id: 'layout-a', label: 'Seminar' }, { id: 'layout-b', label: 'Theatre' }],
    accessibility: [{ id: 'feature-a', label: 'Step-free' }, { id: 'feature-b', label: 'Hearing loop' }] };
  const calls = stubApi({ [read]: () => ({ body: data({ current, references, requests: fields ? [{ ...pending(), requested_changes: { fields } }] as ChangeRequestView['requests'] : [] }) }),
    [write]: (_url, init) => { fields = JSON.parse(String(init?.body)).changes; return { status: 201, body: { request: pending() } }; } });
  mount();
  await screen.findByRole('button', { name: 'Send change request' });
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Update arrangements' } });
  for (const name of ['room layout', 'accessibility features', 'registration', 'waiting list', 'registration window', 'withdrawal deadline']) {
    fireEvent.click(screen.getByRole('checkbox', { name: `Change ${name}` }));
  }
  fireEvent.change(screen.getByLabelText('New room layout'), { target: { value: 'layout-b' } });
  fireEvent.change(screen.getByLabelText('New accessibility features'), { target: { value: 'feature-b' } });
  fireEvent.change(screen.getByLabelText('New registration'), { target: { value: 'false' } });
  fireEvent.change(screen.getByLabelText('New waiting list'), { target: { value: 'true' } });
  fireEvent.change(screen.getByLabelText('Registration opens (Singapore time)'), { target: { value: '2027-02-02T09:00' } });
  fireEvent.change(screen.getByLabelText('Registration closes (Singapore time)'), { target: { value: '2027-02-27T18:00' } });
  fireEvent.change(screen.getByLabelText('New withdrawal deadline'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  const table = await screen.findByRole('table');
  expect(within(table).getByText('Seminar')).toBeInTheDocument();
  expect(within(table).getByText('Theatre')).toBeInTheDocument();
  expect(within(table).getByText('Hearing loop')).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ description: 'Update arrangements', changes: {
    layoutId: 'layout-b', accessibilityFeatureIds: ['feature-b'], registrationEnabled: false, waitlistEnabled: true,
    registrationDates: { opensAt: '2027-02-02T01:00:00.000Z', closesAt: '2027-02-27T10:00:00.000Z' }, withdrawalDeadline: null,
  } });
});

test('TC_E10S01_01: registration windows refuse reversed dates and allow explicit clearing', async () => {
  const calls = stubApi({ [read]: { body: data({ current: { ...data().current, registrationDates: { opensAt: null, closesAt: null } } }) },
    [write]: { status: 201, body: { request: pending() } } });
  mount();
  await screen.findByRole('button', { name: 'Send change request' });
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'Change window' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Change registration window' }));
  fireEvent.change(screen.getByLabelText('Registration opens (Singapore time)'), { target: { value: '2027-02-02T09:00' } });
  fireEvent.change(screen.getByLabelText('Registration closes (Singapore time)'), { target: { value: '2027-02-01T09:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  expect(screen.getByRole('alert')).toHaveTextContent('closing must be after opening');
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Registration opens (Singapore time)'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Registration closes (Singapore time)'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  await screen.findByText('Change request sent for Coordinator review. Current Event details stay unchanged.');
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ description: 'Change window', changes: { registrationDates: { opensAt: null, closesAt: null } } });
});


test.each([
  { fields: { title: 'New title' }, arrangement: false },
  { fields: { expectedAttendance: 50 }, arrangement: true },
  { fields: { title: 'New title', expectedAttendance: 50 }, arrangement: true },
])('TC_E10S01_04: approval confirmation describes all-or-nothing apply for $fields', async ({ fields, arrangement }) => {
  stubApi({ [read]: { body: data({ requests: [{ ...pending(), requested_changes: { fields, before: {} } }] }) },
    [decide]: { body: { request: { ...pending(), preview: { canApply: true, token: 'review-token', lateClose: false,
      impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [] } } } } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: /^Approve/ }));
  expect(await screen.findByText(arrangement
    ? 'Review the affected arrangements below. Confirming applies this entire request together.'
    : 'This request changes only name, description or purpose. The changes are applied when approved.')).toBeInTheDocument();
});

test('TC_E10S01_04: preview lists affected arrangements and capacity warnings before apply; cancel writes nothing', async () => {
  const request = { ...pending(), requested_changes: { fields: { expectedAttendance: 50 }, before: { expectedAttendance: 40 } } };
  const calls = stubApi({ [read]: { body: data({ requests: [request] }) }, [decide]: { body: { request: { ...request,
    preview: { canApply: true, token: 'current-preview', lateClose: false,
      impact: { affected: true, bookings: [{ id: 'b', venueName: 'Hall A', reasons: ['capacity'] }],
        reservations: [{ id: 'r', equipmentName: 'Projector', reasons: ['time'] }] },
      overSubscription: [{ scope: 'event', registered: 50, capacity: 45 }] } } } } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  await screen.findByText('Hall A: attendance above capacity');
  expect(screen.getByText('Projector: date or time changed')).toBeInTheDocument();
  expect(screen.getByText(/50 registered places exceed capacity 45/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(calls.filter(call => call.method === 'POST').map(call => call.body)).toEqual([{ decision: 'preview' }]);
});

test.each(['pending', 'approved'] as const)('TC_E10S01_04: %s request requires late-close consent before confirmation', async status => {
  const request = { ...pending(status), requested_changes: { fields: { expectedAttendance: 50 } } };
  let applied = false;
  const calls = stubApi({ [read]: () => ({ body: data({ requests: [{ ...request, status: applied ? 'applied' : status }] }) }),
    [decide]: (_url, init) => {
      if (JSON.parse(String(init?.body)).decision === 'preview') return { body: { request: { ...request,
        preview: { canApply: true, token: 'approved-preview', lateClose: true,
          impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [] } } } };
      applied = true; return { body: { request: { ...request, status: 'applied' } } };
    } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: status === 'approved' ? 'Review and apply…' : 'Approve…' }));
  const consent = await screen.findByRole('checkbox', { name: 'Confirm registration closing after the Event starts' });
  const confirm = screen.getByRole('button', { name: status === 'approved' ? 'Apply change request' : 'Approve change request' });
  expect(confirm).toBeDisabled();
  fireEvent.submit(confirm.closest('form')!);
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
  fireEvent.click(consent);
  expect(confirm).toBeEnabled();
  fireEvent.click(consent);
  expect(confirm).toBeDisabled();
  fireEvent.click(consent);
  fireEvent.click(confirm);
  await screen.findByText('Change applied to the Event.');
  expect(calls.filter(call => call.method === 'POST').at(-1)?.body).toEqual({ decision: status === 'approved' ? 'apply' : 'approve', reason: '', previewToken: 'approved-preview', confirmLateClose: true });
});

test('TC_E10S01_04: preview failure preserves request and allows retry without a decision', async () => {
  const request = { ...pending(), requested_changes: { fields: { expectedAttendance: 50 } } };
  const calls = stubApi({ [read]: { body: data({ requests: [request] }) },
    [decide]: { status: 409, body: { error: 'The Event changed since submission.' } } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  await screen.findByText('The Event changed since submission.');
  expect(screen.queryByRole('button', { name: 'Approve change request' })).not.toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST').map(call => call.body)).toEqual([{ decision: 'preview' }]);
});

test('TC_E10S01_04: unsupported mixed request explicitly waits as a whole', async () => {
  const request = { ...pending(), requested_changes: { fields: { title: 'Changed', layoutId: 'layout-a' } } };
  stubApi({ [read]: { body: data({ requests: [request] }) }, [decide]: { body: { request: { ...request,
    preview: { canApply: false, blockedFields: ['layoutId'] } } } } });
  mount(true, '/coordinator/events/EVT-A/changes');
  fireEvent.click(await screen.findByRole('button', { name: 'Approve…' }));
  await screen.findByText('Waiting fields: Room layout.');
  expect(screen.getByText(/entire request will remain Approved and unchanged/)).toBeInTheDocument();
});

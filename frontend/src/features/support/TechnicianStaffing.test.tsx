// E07-S07 (SCRUM-57, frontend SCRUM-150) against a stubbed API shaped like
// backend/src/modules/equipmentSupport/staffingHandler.ts: the staffing queue,
// the request page (assign, remove, clashes) and My schedule. Sentences match
// staffAssignments.ts.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { MySchedule, StaffingQueue, StaffingRequestPage, eventName } from './TechnicianStaffing';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const REQ = '11111111-1111-4111-8111-111111111111';
const QUEUE = 'GET /api/venues?task=staffing';
const DETAIL = `GET /api/venues?task=staffing&request=${REQ}`;
const SCHEDULE = 'GET /api/venues?task=staffing&schedule=mine';
const POST = 'POST /api/venues?task=staffing';

const conference = {
  id: REQ, eventId: 'evt-1', eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2026', eventStatus: 'planning',
  description: '1 AV technician', startsAt: '2026-11-12T01:00:00.000Z', endsAt: '2026-11-12T04:00:00.000Z',
  status: 'open', assignees: [] as Array<{ assignmentId: string; staffId: string; name: string }>,
};
const charityClash = { eventCode: 'EVT-CR', title: 'Charity Run', startsAt: '2026-11-12T02:00:00.000Z', endsAt: '2026-11-12T05:00:00.000Z' };
const techB = { staffId: 's-b', name: 'Tech B', assigned: false, conflicts: [charityClash] };
const techC = { staffId: 's-c', name: 'Tech C', assigned: false, conflicts: [] };

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/support/technicians" element={<StaffingQueue />} />
        <Route path="/support/technicians/:requestId" element={<StaffingRequestPage />} />
        <Route path="/support/schedule" element={<MySchedule />} />
      </Routes>
    </MemoryRouter>,
  );
}
const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST');
const colleagues = async () => within(await screen.findByRole('list', { name: 'Colleagues' }));

test('the queue shows requests needing a technician first, with filters for staffed and all', async () => {
  stubApi({ [QUEUE]: { body: { requests: [
    conference,
    { ...conference, id: 'r-2', eventCode: 'EVT-CR', eventTitle: 'Charity Run', status: 'staffed', assignees: [{ assignmentId: 'a-1', staffId: 's-b', name: 'Tech B' }] },
  ] } } }, { role: 'technical_support_staff' });
  renderAt('/support/technicians');

  const table = await screen.findByRole('table');
  expect(within(table).getByRole('link', { name: 'EVT-TC Tech Conference 2026' })).toHaveAttribute('href', `/support/technicians/${REQ}`);
  expect(within(table).getByText('None yet')).toBeInTheDocument();
  expect(within(table).queryByText('Charity Run')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Staffed/ }));
  expect(screen.getByRole('link', { name: 'EVT-CR Charity Run' })).toBeInTheDocument();
  expect(screen.getByText('Tech B')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /All/ }));
  expect(screen.getAllByRole('link', { name: /EVT-/ })).toHaveLength(2);
});

test('an empty queue and an empty filter each explain themselves; a failed load can be retried', async () => {
  let fail = true;
  stubApi({ [QUEUE]: () => (fail ? { status: 500, body: {} } : { body: { requests: [{ ...conference, status: 'staffed' }] } }) }, { role: 'technical_support_staff' });
  renderAt('/support/technicians');
  expect(await screen.findByText('Support requests could not be loaded.')).toBeInTheDocument();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByText('Nothing in “Needs a technician”')).toBeInTheDocument();
  cleanup();
  stubApi({ [QUEUE]: { body: { requests: [] } } }, { role: 'technical_support_staff' });
  renderAt('/support/technicians');
  expect(await screen.findByText('No technical support requested')).toBeInTheDocument();
});

test('TC_E07S07_01 - assigning a free colleague asks to confirm, then shows them on the request', async () => {
  let assigned = false;
  const calls = stubApi({
    [DETAIL]: () => ({ body: {
      request: assigned ? { ...conference, status: 'staffed', assignees: [{ assignmentId: 'a-9', staffId: 's-c', name: 'Tech C' }] } : conference,
      candidates: assigned ? [techB, { ...techC, assigned: true }] : [techB, techC], canAssign: true,
    } }),
    [POST]: () => { assigned = true; return { status: 201, body: { assignment: { id: 'a-9', staffId: 's-c', name: 'Tech C' } } }; },
  }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);

  expect(await screen.findByRole('heading', { name: 'Tech Conference 2026' })).toBeInTheDocument();
  expect(screen.getByText('Needs a technician')).toBeInTheDocument();
  expect((await colleagues()).getByText('Free for these times')).toBeInTheDocument();
  fireEvent.click((await colleagues()).getByRole('button', { name: 'Assign Tech C…' }));
  expect(screen.getByText('Assign Tech C?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }));

  expect(await screen.findByText("Tech C is assigned and has been notified. It's on their schedule.")).toBeInTheDocument();
  expect(posts(calls)[0].body).toEqual({ action: 'assign', request: REQ, staff: 's-c' });
  expect(within(await screen.findByRole('list', { name: 'Assigned technicians' })).getByText('Tech C')).toBeInTheDocument();
  expect(screen.getByText('Staffed')).toBeInTheDocument();
});

test('TC_E07S07_03 - a busy colleague is marked with the clashing event, and trying to assign them shows the refusal', async () => {
  const calls = stubApi({
    [DETAIL]: { body: { request: conference, candidates: [techB, techC], canAssign: true } },
    [POST]: { status: 409, body: { error: 'Tech B is already assigned to EVT-CR Charity Run at an overlapping time.', conflicts: [charityClash] } },
  }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);

  const list = await colleagues();
  expect(list.getByText(/^Busy: EVT-CR Charity Run, 12 Nov 2026/)).toBeInTheDocument();
  expect(list.getByText('Overlapping assignment')).toBeInTheDocument();
  fireEvent.click(list.getByRole('button', { name: 'Assign Tech B…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }));
  expect(await screen.findByText('Tech B is already assigned to EVT-CR Charity Run at an overlapping time.')).toBeInTheDocument();
  // The panel stays open so the user sees why; cancelling closes it.
  expect(screen.getByText('Assign Tech B?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Assign Tech B?')).not.toBeInTheDocument();
  expect(posts(calls)).toHaveLength(1);
});

test('TC_E07S07_04 - removing an assignment asks to confirm, frees the colleague and reopens the request', async () => {
  let removed = false;
  const calls = stubApi({
    [DETAIL]: () => ({ body: {
      request: removed ? conference : { ...conference, status: 'staffed', assignees: [{ assignmentId: 'a-9', staffId: 's-c', name: 'Tech C' }] },
      candidates: removed ? [techB, techC] : [techB, { ...techC, assigned: true }], canAssign: true,
    } }),
    [POST]: () => { removed = true; return { body: { removed: true, requestStatus: 'open' } }; },
  }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);

  fireEvent.click(await screen.findByRole('button', { name: 'Remove Tech C…' }));
  expect(screen.getByText('Tech C will be notified, and their time is freed for other events.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove assignment' }));
  expect(await screen.findByText('Tech C is no longer assigned and has been notified. Their time is free again.')).toBeInTheDocument();
  expect(posts(calls)[0].body).toEqual({ action: 'remove', assignment: 'a-9' });
  expect(await screen.findByText('Nobody is assigned yet.')).toBeInTheDocument();
  expect((await colleagues()).getByRole('button', { name: 'Assign Tech C…' })).toBeInTheDocument();
});

test('a removal the server refuses keeps the panel open with its sentence', async () => {
  stubApi({
    [DETAIL]: { body: { request: { ...conference, status: 'staffed', assignees: [{ assignmentId: 'a-9', staffId: 's-c', name: 'Tech C' }] }, candidates: [techB], canAssign: true } },
    [POST]: { status: 409, body: { error: 'That assignment has already been removed.' } },
  }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Remove Tech C…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove assignment' }));
  expect(await screen.findByText('That assignment has already been removed.')).toBeInTheDocument();
  expect(screen.getByText('Remove Tech C?')).toBeInTheDocument();
});

test('an event that can no longer be staffed explains why, and a request with everyone on it says so', async () => {
  stubApi({ [DETAIL]: { body: { request: { ...conference, eventStatus: 'completed' }, candidates: [techC], canAssign: false } } }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);
  expect(await screen.findByText('Technicians can only be assigned to approved, planning or confirmed events.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Assign/ })).not.toBeInTheDocument();
  cleanup();
  stubApi({ [DETAIL]: { body: { request: conference, candidates: [{ ...techC, assigned: true }], canAssign: true } } }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);
  expect(await screen.findByText('Every active colleague is already on this request.')).toBeInTheDocument();
});

test('a request that cannot be loaded shows the refusal with a way back', async () => {
  stubApi({ [DETAIL]: { status: 404, body: { error: 'That technical support request was not found.' } } }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);
  expect(await screen.findByText('That technical support request was not found.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Support request unavailable' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to all support requests' })).toHaveAttribute('href', '/support/technicians');
});

test('a malformed reply is a failed load, not a crash', async () => {
  stubApi({ [DETAIL]: { body: { request: {} } }, [QUEUE]: { body: {} }, [SCHEDULE]: { body: {} } }, { role: 'technical_support_staff' });
  renderAt(`/support/technicians/${REQ}`);
  expect(await screen.findByText('This support request could not be loaded.')).toBeInTheDocument();
  cleanup();
  renderAt('/support/technicians');
  expect(await screen.findByText('Support requests could not be loaded.')).toBeInTheDocument();
  cleanup();
  renderAt('/support/schedule');
  expect(await screen.findByText('Your schedule could not be loaded.')).toBeInTheDocument();
});

test('TC_E07S07_02 - My schedule lists upcoming and past assignments with links to their requests', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-01T00:00:00.000Z'));
  stubApi({ [SCHEDULE]: { body: { assignments: [
    { id: 'a-1', requestId: REQ, eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2026', eventStatus: 'planning', description: '1 AV technician', startsAt: conference.startsAt, endsAt: conference.endsAt },
    { id: 'a-0', requestId: 'r-0', eventCode: null, eventTitle: 'Autumn Fair', eventStatus: 'completed', description: 'Sound check', startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T03:00:00.000Z' },
  ] } } }, { role: 'technical_support_staff' });
  renderAt('/support/schedule');

  const upcoming = within(await screen.findByRole('list', { name: 'Upcoming assignments' }));
  expect(upcoming.getByRole('link', { name: 'EVT-TC Tech Conference 2026' })).toHaveAttribute('href', `/support/technicians/${REQ}`);
  expect(upcoming.getByText(/12 Nov 2026, 9:00 am – 12:00 pm · 1 AV technician/)).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Past assignments' })).getByRole('link', { name: 'Autumn Fair' })).toBeInTheDocument();
  vi.useRealTimers();
});

test('an empty schedule explains how assignments arrive; a schedule with only past work says nothing is upcoming', async () => {
  stubApi({ [SCHEDULE]: { body: { assignments: [] } } }, { role: 'technical_support_staff' });
  renderAt('/support/schedule');
  expect(await screen.findByText('Nothing on your schedule')).toBeInTheDocument();
  cleanup();
  stubApi({ [SCHEDULE]: { body: { assignments: [{ id: 'a-0', requestId: 'r-0', eventCode: null, eventTitle: 'Autumn Fair', eventStatus: 'completed', description: 'x', startsAt: '2020-01-01T01:00:00.000Z', endsAt: '2020-01-01T02:00:00.000Z' }] } } }, { role: 'technical_support_staff' });
  renderAt('/support/schedule');
  expect(await screen.findByText('No upcoming assignments.')).toBeInTheDocument();
  cleanup();
  stubApi({ [SCHEDULE]: { body: { assignments: [{ id: 'a-1', requestId: REQ, eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2026', eventStatus: 'planning', description: 'x', startsAt: '2099-01-01T01:00:00.000Z', endsAt: '2099-01-01T02:00:00.000Z' }] } } }, { role: 'technical_support_staff' });
  renderAt('/support/schedule');
  expect(await screen.findByRole('list', { name: 'Upcoming assignments' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Past' })).not.toBeInTheDocument();
});

test('event names avoid repeating a code the title already starts with', () => {
  expect(eventName({ eventCode: 'EVT-1', eventTitle: 'EVT-1 Gala' })).toBe('EVT-1 Gala');
  expect(eventName({ eventCode: 'EVT-1', title: 'Gala' })).toBe('EVT-1 Gala');
  expect(eventName({ eventCode: null, eventTitle: 'Gala' })).toBe('Gala');
  expect(eventName({ eventCode: null })).toBe('');
});

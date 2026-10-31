// E10-S02 follow-up (SCRUM-244, T-103) against a stubbed API shaped like
// backend/src/modules/equipmentSupport/supportReconfirmation.ts: the "Support
// to reconfirm" section on the staffing page, reconfirming, and a refusal.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { SupportToReconfirmList } from './SupportReconfirmation';
import { StaffingQueue } from './TechnicianStaffing';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const LIST = 'GET /api/venues?task=staffing&reconfirm=list';
const QUEUE = 'GET /api/venues?task=staffing';
const POST = 'POST /api/venues?task=staffing';
const REQ = '11111111-1111-4111-8111-111111111111';
// 5 Dec 06:00-12:00 Singapore, moving a week later.
const charity = {
  id: REQ, eventId: 'evt-1082', eventCode: 'EVT-1082', eventTitle: 'Charity Run', eventStatus: 'planning',
  description: 'Sound desk', startsAt: '2026-12-04T22:00:00.000Z', endsAt: '2026-12-05T04:00:00.000Z', status: 'staffed',
  assignees: [{ assignmentId: 'a-1', staffId: 's-a', name: 'Tech A' }],
  reconfirmFor: { startsAt: '2026-12-11T22:00:00.000Z', endsAt: '2026-12-12T04:00:00.000Z' },
};
const moved = { request: { id: REQ, startsAt: charity.reconfirmFor.startsAt, endsAt: charity.reconfirmFor.endsAt } };

function renderList(onReconfirmed?: () => void) {
  render(<MemoryRouter><SupportToReconfirmList onReconfirmed={onReconfirmed} /></MemoryRouter>);
}

test('TC_E10S02_12: a flagged request shows its time now and the time it moves to; reconfirming it reports Safety Review', async () => {
  let reconfirmed = false;
  const calls = stubApi({
    [LIST]: () => ({ body: { requests: reconfirmed ? [] : [charity] } }),
    [POST]: () => { reconfirmed = true; return { body: { ...moved, coordinatorNotified: true, enteredSafetyReview: true } }; },
  }, { role: 'technical_support_staff' });
  const onReconfirmed = vi.fn();
  renderList(onReconfirmed);
  const row = within(await screen.findByRole('table'));
  expect(row.getByText('EVT-1082 Charity Run')).toBeInTheDocument();
  expect(row.getByText('5 Dec 2026, 6:00 am – 12:00 pm')).toBeInTheDocument();
  expect(row.getByText('12 Dec 2026, 6:00 am – 12:00 pm')).toBeInTheDocument();
  expect(row.getByText('Tech A')).toBeInTheDocument();

  fireEvent.click(row.getByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' }));
  expect(screen.getByText(/Sound desk moves from 5 Dec 2026, 6:00 am – 12:00 pm to 12 Dec 2026, 6:00 am – 12:00 pm for EVT-1082 Charity Run\. Tech A's assignment moves with it\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reconfirm support' }));
  expect(await screen.findByText('Reconfirmed Sound desk for EVT-1082 Charity Run (12 Dec 2026, 6:00 am – 12:00 pm). The Coordinator was notified. All its arrangements are confirmed again, so the event is now in Safety Review.')).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ action: 'reconfirm', request: REQ });
  expect(await screen.findByText(/Nothing to reconfirm/)).toBeInTheDocument();
  expect(onReconfirmed).toHaveBeenCalledTimes(1);
});

test('TC_E10S02_13: a busy technician refusal stays in the panel and the request stays listed', async () => {
  stubApi({
    [LIST]: { body: { requests: [charity] } },
    [POST]: { status: 409, body: { error: 'Tech A is already assigned to EVT-2001 Year-end Gala at an overlapping time.' } },
  }, { role: 'technical_support_staff' });
  renderList();
  fireEvent.click(await screen.findByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reconfirm support' }));
  expect(await screen.findByText('Tech A is already assigned to EVT-2001 Year-end Gala at an overlapping time.')).toBeInTheDocument();
  expect(screen.getByRole('table')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText(/already assigned/)).not.toBeInTheDocument();
});

test('a request whose time stays, with no description and no Coordinator, says so', async () => {
  const same = { ...charity, description: '', reconfirmFor: { startsAt: charity.startsAt, endsAt: charity.endsAt } };
  stubApi({
    [LIST]: { body: { requests: [same] } },
    [POST]: { body: { request: { id: REQ, startsAt: same.startsAt, endsAt: same.endsAt }, coordinatorNotified: false, enteredSafetyReview: false } },
  }, { role: 'technical_support_staff' });
  renderList();
  expect(within(await screen.findByRole('table')).getByText('Same time')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' }));
  expect(screen.getByText(/^Technical support stays at 5 Dec 2026, 6:00 am – 12:00 pm for EVT-1082 Charity Run\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reconfirm support' }));
  expect(await screen.findByText('Reconfirmed technical support for EVT-1082 Charity Run (5 Dec 2026, 6:00 am – 12:00 pm). The event has no Coordinator to notify yet.')).toBeInTheDocument();
});

test('a failed load can be retried; a malformed reply is a failed load', async () => {
  let reply: { status?: number; body: unknown } = { status: 500, body: {} };
  stubApi({ [LIST]: () => reply }, { role: 'technical_support_staff' });
  renderList();
  expect(await screen.findByText('Support to reconfirm could not be loaded.')).toBeInTheDocument();
  reply = { body: { nothing: true } };
  fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByText('Support to reconfirm could not be loaded.')).toBeInTheDocument();
  reply = { body: { requests: [] } };
  fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByText(/Nothing to reconfirm/)).toBeInTheDocument();
});

test('the staffing page shows support to reconfirm above the queue and reloads the queue after a reconfirmation', async () => {
  let reconfirmed = false;
  const calls = stubApi({
    [LIST]: () => ({ body: { requests: reconfirmed ? [] : [charity] } }),
    [QUEUE]: { body: { requests: [] } },
    [POST]: () => { reconfirmed = true; return { body: { ...moved, coordinatorNotified: true, enteredSafetyReview: false } }; },
  }, { role: 'technical_support_staff' });
  render(<MemoryRouter><StaffingQueue /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Support to reconfirm' })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Reconfirm support for EVT-1082 Charity Run' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reconfirm support' }));
  expect(await screen.findByText(/The Coordinator was notified\.$/)).toBeInTheDocument();
  const queueLoads = () => calls.filter(call => call.method === 'GET' && call.url.search === '?task=staffing').length;
  await vi.waitFor(() => expect(queueLoads()).toBe(2));
});

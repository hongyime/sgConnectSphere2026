// E14-S02 (SCRUM-86) on the Coordinator event page: the assigned Coordinator
// reads the event Activity log (Scenario 1, T-75), which offers no edit or
// delete controls (Scenario 5) and shows only what the API returns, so no
// access-denial entries (TC_E14S02_08).
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { RequestDetail } from '../coordinator/CoordinatorWorkspace';
import { describeAction, describeChange, type ActivityEntry } from './ActivityLog';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const approved: ActivityEntry = {
  occurred_at: '2026-10-08T02:30:00.000Z', action: 'Status changed to approved', field_changed: 'status',
  old_value: 'under_review', new_value: 'approved', actor_name: 'Coordinator B',
};
const edited: ActivityEntry = {
  occurred_at: '2026-10-08T03:00:00.000Z', action: 'Record updated', field_changed: 'venueRequirements',
  old_value: null, new_value: 'Lecture theatre with step-free access', actor_name: 'Coordinator B',
};

function stub(activityLog?: ActivityEntry[]) {
  const event = {
    id: 'evt-2003', event_code: 'EVT-2003', title: 'EVT-2003 Client B Isolation Event', status: 'approved',
    status_changed_at: '2026-10-08T02:30:00.000Z', starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z',
    expected_attendance: 40, coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Organiser C',
    organiser_email: 'organiser_c@clientb.com', description: null, purpose: null, venue_requirements: null,
    accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'c-b', coordinator_name: 'Coordinator B', pendingReassignment: null,
    ...(activityLog ? { activityLog } : {}),
  };
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    let body: unknown = { event };
    if (url.pathname === '/api/notifications') body = { notifications: [] };
    else if (url.searchParams.get('task') === 'support') body = { event: {}, requests: [], noSupportRequired: false, canEdit: true };
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
}

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-2003']}>
      <Routes><Route path="/coordinator/events/:eventCode" element={<RequestDetail />} /></Routes>
    </MemoryRouter>,
  );
}

async function activityCard() {
  const heading = await screen.findByRole('heading', { name: 'Activity log' });
  return heading.closest('section') as HTMLElement;
}

test('TC_E14S02_01: the assigned Coordinator reads who changed the event, what changed and when', async () => {
  stub([approved, edited]);
  renderDetail();
  const card = await activityCard();
  const table = within(card).getByRole('table', { name: 'Changes to this event, oldest first' });
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('Status changed');
  expect(rows[0]).not.toHaveTextContent('under_review');
  // design.md section 7: statuses are StatusPills, with "to" for screen readers.
  const pills = rows[0]!.querySelectorAll('.status-pill');
  expect([...pills].map(pill => pill.textContent)).toEqual(['Under review', 'Approved']);
  expect(rows[0]!.querySelector('.visually-hidden')).toHaveTextContent('to');
  expect(rows[0]!.querySelector('[aria-hidden="true"]')).toHaveTextContent('→');
  expect(rows[0]).toHaveTextContent('Coordinator B');
  expect(rows[0]).toHaveTextContent('8 Oct 2026');
  expect(rows[1]).toHaveTextContent('Details edited');
  expect(rows[1]).not.toHaveTextContent('Record updated');
  expect(rows[1]).toHaveTextContent('Venue requirements: Lecture theatre with step-free access');
});

test('TC_E14S02_05: the Activity log offers no edit or delete controls', async () => {
  stub([approved]);
  renderDetail();
  const card = await activityCard();
  expect(within(card).queryByRole('button')).toBeNull();
  expect(within(card).queryByRole('link')).toBeNull();
});

test('TC_E14S02_08: the Activity log shows only the entries the API returns, with no access denials', async () => {
  stub([approved]);
  renderDetail();
  const card = await activityCard();
  expect(within(card).getAllByRole('row')).toHaveLength(2);
  expect(card).not.toHaveTextContent('Access Denied');
  expect(card).not.toHaveTextContent('Organiser A');
});

test('an event with no recorded activity says so', async () => {
  stub();
  renderDetail();
  const card = await activityCard();
  expect(within(card).queryByRole('table')).toBeNull();
  expect(card).toHaveTextContent('No activity recorded yet.');
});

test('a change is described in words for status changes, edits and entries without a field', () => {
  expect(describeChange({ ...approved, old_value: null })).toBe('Approved');
  expect(describeChange({ ...edited, new_value: null })).toBe('Venue requirements');
  expect(describeChange({ ...edited, field_changed: 'somethingNew' })).toBe('SomethingNew: Lecture theatre with step-free access');
  expect(describeChange({ ...approved, field_changed: null })).toBe('None recorded');
  expect(describeChange({ ...approved, new_value: null })).toBe('Under review → Not recorded');
  const reassigned = { ...approved, action: 'Coordinator reassigned', field_changed: 'coordinator_id', old_value: 'Coordinator B', new_value: 'Coordinator A' };
  expect(describeChange(reassigned)).toBe('Coordinator: Coordinator B → Coordinator A');
  expect(describeChange({ ...reassigned, old_value: null })).toBe('Coordinator: Coordinator A');
  expect(describeChange({ ...reassigned, old_value: 'Coordinator A' })).toBe('Coordinator: Coordinator A');
});

test('an entry whose actor account was removed still shows, without a name', async () => {
  stub([{ ...approved, actor_name: null }]);
  renderDetail();
  const card = await activityCard();
  expect(within(card).getAllByRole('row')[1]).toHaveTextContent('Not recorded');
});

test('stored actions are shown in plain words, and other actions as written', () => {
  expect(describeAction(approved)).toBe('Status changed');
  expect(describeAction(edited)).toBe('Details edited');
  expect(describeAction({ ...edited, action: 'Coordinator reassigned', field_changed: 'coordinator_id' })).toBe('Coordinator reassigned');
});

test('a status change with no previous status shows only the new status', async () => {
  stub([{ ...approved, action: 'Status changed to submitted', old_value: null, new_value: 'submitted' }]);
  renderDetail();
  const row = within(await activityCard()).getAllByRole('row')[1]!;
  expect([...row.querySelectorAll('.status-pill')].map(pill => pill.textContent)).toEqual(['Submitted']);
});

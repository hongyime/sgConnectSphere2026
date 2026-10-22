// E14-S03 (SCRUM-197): edited event and registration times in both existing
// Activity logs (the Organiser's /events page and the assigned Coordinator's
// event page) read in Singapore time instead of raw UTC. Only edited
// startAt, endAt and registrationDates values change; text, statuses and hold
// expiry display as before, and the stored values are never rewritten.
// Access rules and access-denial filtering stay in the API and are covered by
// backend/tests/eventVisibility.test.ts and TC_E14S02_08.
import { cleanup, render, screen, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { RequestDetail } from '../coordinator/CoordinatorWorkspace';
import { ClientEvents } from '../organiser/ClientEvents';
import { describeChange, formatEditedValue, type ActivityEntry } from './ActivityLog';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

// toLocaleString may put a narrow no-break space before "pm"; compare words.
const plain = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ');

function entry(field: string | null, newValue: string | null, oldValue: string | null = null): ActivityEntry {
  return {
    occurred_at: '2026-10-16T02:00:00.000Z', action: field === 'status' ? `Status changed to ${newValue}` : 'Record updated',
    field_changed: field, old_value: oldValue, new_value: newValue, actor_name: 'Coordinator B',
  };
}

function renderOrganiserLog(activityLog: ActivityEntry[]) {
  stubApi({ 'GET /api/events?id=EVT-PLAN': { body: { event: {
    id: 'evt-plan', event_code: 'EVT-PLAN', title: 'Planning event', description: 'Quarterly planning day', purpose: null,
    status: 'approved', status_changed_at: '2026-10-01T02:00:00.000Z', starts_at: '2026-12-01T01:00:00.000Z',
    ends_at: '2026-12-01T04:00:00.000Z', creator_name: 'Organiser A', statusHistory: [], comments: [],
    outstandingQuestions: [], canEdit: false, editableFields: [],
    activityLog: activityLog.map(item => ({ ...item, actor_email: null })),
  } } } });
  window.history.replaceState(null, '', '/events/EVT-PLAN');
  render(<BrowserRouter><Routes><Route path="/events/*" element={<ClientEvents />} /></Routes></BrowserRouter>);
}

async function organiserItems() {
  const heading = await screen.findByRole('heading', { name: 'Activity log' }, { timeout: 2000 });
  return within(heading.closest('section') as HTMLElement).getAllByRole('listitem').map(item => plain(item.textContent));
}

function renderCoordinatorLog(activityLog: ActivityEntry[]) {
  const calls = stubApi({
    'GET /api/events?id=EVT-2003': { body: { event: {
      id: 'evt-2003', event_code: 'EVT-2003', title: 'EVT-2003 Client B Isolation Event', status: 'approved',
      status_changed_at: '2026-10-08T02:30:00.000Z', starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z',
      expected_attendance: 40, coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Organiser C',
      organiser_email: 'organiser_c@clientb.com', description: null, purpose: null, venue_requirements: null,
      accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
      coordinator_id: 'c-b', coordinator_name: 'Coordinator B', pendingReassignment: null, activityLog,
    } } },
    'GET /api/events?id=EVT-2003&task=support': { body: { event: {}, requests: [], noSupportRequired: false, canEdit: true } },
  }, { role: 'event_coordinator' });
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-2003']}>
      <Routes><Route path="/coordinator/events/:eventCode" element={<RequestDetail />} /></Routes>
    </MemoryRouter>,
  );
  return calls;
}

async function coordinatorRows() {
  const heading = await screen.findByRole('heading', { name: 'Activity log' }, { timeout: 2000 });
  const table = within(heading.closest('section') as HTMLElement).getByRole('table', { name: 'Changes to this event, oldest first' });
  return within(table).getAllByRole('row').slice(1).map(row => plain(row.textContent));
}

test('TC_E14S03_01: the Organiser reads an edited start time in Singapore time, not raw UTC', async () => {
  renderOrganiserLog([entry('startAt', '2026-10-15T09:30:00Z')]);
  const [item] = await organiserItems();
  expect(item).toContain('(15 Oct 2026, 5:30 pm)');
  expect(item).not.toContain('2026-10-15T09:30:00Z');
});

test('TC_E14S03_02: the assigned Coordinator reads before and after times in Singapore time', async () => {
  renderCoordinatorLog([entry('startAt', '2026-10-15T09:30:00Z', '2026-10-15T08:30:00Z')]);
  const [row] = await coordinatorRows();
  expect(row).toContain('Start: 15 Oct 2026, 4:30 pm → 15 Oct 2026, 5:30 pm');
  expect(row).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  // Who and when are unchanged: the actor, and occurred_at in the When column.
  expect(row).toContain('Coordinator B');
  expect(row).toContain('16 Oct 2026, 10:00 am');
});

test('TC_E14S03_03: both views move the calendar date across Singapore midnight, registration dates included', async () => {
  const fixtures = [
    entry('endAt', '2026-10-15T15:59:00Z'),
    entry('startAt', '2026-10-15T16:00:00Z'),
    entry('registrationDates', '2026-10-15T15:59:00Z to 2026-10-15T18:30:00Z'),
  ];
  renderOrganiserLog(fixtures);
  expect(await organiserItems()).toEqual([
    expect.stringContaining('(15 Oct 2026, 11:59 pm)'),
    expect.stringContaining('(16 Oct 2026, 12:00 am)'),
    expect.stringContaining('(15 Oct 2026, 11:59 pm to 16 Oct 2026, 2:30 am)'),
  ]);
  cleanup();
  renderCoordinatorLog(fixtures);
  expect(await coordinatorRows()).toEqual([
    expect.stringContaining('End: 15 Oct 2026, 11:59 pm'),
    expect.stringContaining('Start: 16 Oct 2026, 12:00 am'),
    expect.stringContaining('Registration dates: 15 Oct 2026, 11:59 pm to 16 Oct 2026, 2:30 am'),
  ]);
});

test('TC_E14S03_04: invalid and missing values keep the formatter\'s "Not recorded" and the existing omissions', async () => {
  expect(formatEditedValue('startAt', 'not-a-date')).toBe('Not recorded');
  expect(formatEditedValue('startAt', '')).toBe('Not recorded');
  expect(plain(formatEditedValue('registrationDates', '2026-10-15T15:59:00Z to not-a-date'))).toBe('15 Oct 2026, 11:59 pm to Not recorded');
  expect(formatEditedValue('registrationDates', 'not-a-date')).toBe('Not recorded');
  // Absent values: the Coordinator view shows the label only, as before.
  expect(describeChange(entry('startAt', null))).toBe('Start');
  expect(describeChange(entry('startAt', ''))).toBe('Start');
  expect(describeChange(entry('startAt', 'not-a-date'))).toBe('Start: Not recorded');

  renderOrganiserLog([entry('startAt', null), entry('startAt', 'not-a-date')]);
  const [missing, invalid] = await organiserItems();
  expect(missing).not.toContain('(');
  expect(invalid).toContain('(Not recorded)');
  expect(invalid).not.toContain('not-a-date');
});

test('TC_E14S03_05: title text, status changes and hold expiry display as before', async () => {
  const fixtures = [
    entry('title', '2026-10-15T09:30:00Z'),
    entry('status', 'approved', 'under_review'),
    entry('venue_booking', '2026-10-15T09:30:00Z'),
    entry('venue_booking', 'b5f2c0de-0000-4000-8000-000000000001'),
  ];
  expect(describeChange(fixtures[0]!)).toBe('Event name: 2026-10-15T09:30:00Z');
  expect(describeChange(fixtures[1]!)).toBe('Under review → Approved');
  expect(plain(describeChange(fixtures[2]!))).toBe('Hold expires 15 Oct 2026, 5:30 pm');
  expect(describeChange(fixtures[3]!)).toBe('Venue booking');

  renderCoordinatorLog(fixtures);
  const rows = await coordinatorRows();
  expect(rows[0]).toContain('Event name: 2026-10-15T09:30:00Z');
  expect(rows[1]).toContain('Status changed');
  const statusRow = screen.getByRole('table', { name: 'Changes to this event, oldest first' }).querySelectorAll('tbody tr')[1]!;
  expect([...statusRow.querySelectorAll('.status-pill')].map(pill => pill.textContent)).toEqual(['Under review', 'Approved']);
  expect(rows[2]).toContain('Hold expires 15 Oct 2026, 5:30 pm');
  expect(rows[3]).toContain('Venue booking');
  expect(rows[3]).not.toContain('b5f2c0de');
  cleanup();

  renderOrganiserLog(fixtures.slice(0, 1));
  expect((await organiserItems())[0]).toContain('(2026-10-15T09:30:00Z)');
});

test('TC_E14S03_06: formatting changes only what is shown; the entries from the API are read, never rewritten', async () => {
  const stored = entry('startAt', '2026-10-15T09:30:00Z', '2026-10-15T08:30:00Z');
  const snapshot = structuredClone(stored);
  describeChange(stored);
  formatEditedValue(stored.field_changed, stored.new_value!);
  expect(stored).toEqual(snapshot);

  const calls = renderCoordinatorLog([stored]);
  await coordinatorRows();
  expect(stored).toEqual(snapshot);
  expect(calls.filter(call => call.method !== 'GET')).toHaveLength(0);
});

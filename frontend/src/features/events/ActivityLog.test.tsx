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
// E06-S04 Scenario 5 (TC_E06S04_05/_06): a Venue Staff decision on one of the event's bookings.
const bookingApproved: ActivityEntry = {
  occurred_at: '2026-10-09T01:00:00.000Z', action: 'Booking Approved', field_changed: 'status',
  old_value: 'pending', new_value: 'confirmed', actor_name: 'Venue Staff A', entity_type: 'venue_booking', venue_name: 'Orchid Hall',
};
const primaryVenueChanged: ActivityEntry = {
  ...approved, action: 'Record updated', field_changed: 'primary_venue', old_value: 'Orchid Hall', new_value: 'Jasmine Hall',
  entity_type: 'venue_booking', venue_name: 'Jasmine Hall',
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

test('primary venue activity names the designation and preserves venue names', () => {
  expect(describeAction(primaryVenueChanged)).toBe('Primary venue changed');
  expect(describeChange(primaryVenueChanged)).toBe('Primary venue: Orchid Hall → Jasmine Hall');
  expect(describeChange({ ...primaryVenueChanged, old_value: null })).toBe('Primary venue: Jasmine Hall');
  expect(describeChange({ ...primaryVenueChanged, new_value: null })).toBe('Primary venue');
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

test('TC_E06S04_05/_06: a booking decision is shown as a booking change, not an event status change', async () => {
  const bookingId = '3f2a9c4e-0000-4000-8000-000000000001';
  stub([{ ...bookingApproved, booking_id: bookingId }, { ...bookingApproved, action: 'Booking Rejected', new_value: 'rejected', venue_name: 'Lotus Room' }]);
  renderDetail();
  const rows = within(await activityCard()).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Booking approved');
  expect(rows[0]).toHaveTextContent('Orchid Hall: Pending → Confirmed');
  expect(rows[0]).toHaveTextContent('Venue Staff A');
  expect(rows[0]).toHaveTextContent(`Booking reference: ${bookingId}`);
  expect(rows[0]).not.toHaveTextContent('Status changed');
  expect(rows[0]!.querySelectorAll('.status-pill')).toHaveLength(0);
  expect(rows[1]).toHaveTextContent('Booking rejected');
  expect(rows[1]).toHaveTextContent('Lotus Room: Pending → Rejected');
});

test('a booking decision missing its venue or earlier status is still described', () => {
  expect(describeChange({ ...bookingApproved, venue_name: null })).toBe('Venue: Pending → Confirmed');
  expect(describeChange({ ...bookingApproved, old_value: null })).toBe('Orchid Hall: Confirmed');
  expect(describeChange({ ...bookingApproved, old_value: null, new_value: null })).toBe('Orchid Hall: Not recorded');
  expect(describeAction({ ...bookingApproved, action: 'Booking Released' })).toBe('Booking released');
});

// E06-S05 (SCRUM-144): hold entries show the expiry as a date and never the booking id.
test('booking entries show hold expiry or a generic booking label without internal IDs', () => {
  const hold = { occurred_at: '2026-10-13T02:00:00.000Z', action: 'Tentative hold placed on Cedar Auditorium', field_changed: 'venue_booking', old_value: null, new_value: '2026-10-15T02:00:00.000Z', actor_name: 'Coordinator A' };
  expect(describeChange(hold)).toBe('Hold expires 15 Oct 2026, 10:00 am');
  expect(describeChange({ ...hold, action: 'Tentative hold on Cedar Auditorium extended', old_value: '2026-10-15T02:00:00.000Z', new_value: '2026-10-16T02:00:00.000Z' }))
    .toBe('Hold expiry: 15 Oct 2026, 10:00 am → 16 Oct 2026, 10:00 am');
  expect(describeChange({ ...hold, action: 'Tentative hold on Cedar Auditorium released', new_value: '3f2a9c4e-0000-4000-8000-000000000001' })).toBe('Venue booking');
  expect(describeChange({ ...hold, new_value: null })).toBe('Venue booking');
  const request = { ...hold, action: 'Venue booking requested for Cedar Auditorium', new_value: 'internal-booking-id' };
  expect(describeAction(request)).toBe('Venue booking requested for Cedar Auditorium');
  expect(describeChange(request)).toBe('Venue booking');
});

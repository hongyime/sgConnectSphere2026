// E05-S04 maintenance blocks screen against a stubbed fetch shaped like the
// backend's GET /api/venues?id=&blocks=1 list and the POST /api/venues
// action: 'block' / 'edit_block' / 'lift_block' responses. The server
// decides the business rules (overlap, lengthening, auth); these tests check
// the screen shows the server's refusals faithfully, reads the notified
// event count from the success body, and reloads after each change.
//
// TC_E05S04_01..04 map to the four scenarios from the backlog; the TC_id
// appears in each test's title so the traceability matrix picks it up.
// E05-S06 (SCRUM-152) replaced the create form with a timed one (start, an
// optional end, a reason category and a note), and the save now succeeds over
// a confirmed booking, so TC_E05S04_02 is superseded by TC_E05S06_02 (T-67).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { VenueBlockout } from './VenueBlockout';
import { stubApi, type FakeHandler } from '../../testing/fakeApi';

afterEach(cleanup);

const venues = [
  { id: 'v-1', name: 'Riverside Hall', location: 'Level 1', max_capacity: 200, opens_at: '08:00', closes_at: '22:00',
    facilities: [], accessibility_features: [], supported_layouts: [] },
  { id: 'v-2', name: 'Lotus Room', location: 'Level 2', max_capacity: 40, opens_at: '08:00', closes_at: '22:00',
    facilities: [], accessibility_features: [], supported_layouts: [] },
];

const existingBlock = {
  id: 'blk-1', venueId: 'v-1', from: '2027-01-05', to: '2027-01-10',
  reasonCategory: 'maintenance', reason: 'Annual fire safety inspection',
  startsAt: '2027-01-04T16:00:00.000Z', endsAt: '2027-01-10T16:00:00.000Z',
};

function renderPage(handlers: Record<string, FakeHandler> = {}) {
  const calls = stubApi(handlers, { role: 'venue_staff' });
  render(
    <MemoryRouter initialEntries={['/venue/blockout']}>
      <Routes>
        <Route path="/venue/blockout" element={<VenueBlockout />} />
      </Routes>
    </MemoryRouter>,
  );
  return calls;
}

type Unavailability = { startDate?: string; startTime?: string; endDate?: string; endTime?: string; category?: string; note?: string };

function fillUnavailability(fields: Unavailability) {
  const labels: [keyof Unavailability, string][] = [
    ['startDate', 'Start date'], ['startTime', 'Start time'], ['endDate', 'End date (optional)'],
    ['endTime', 'End time (optional)'], ['category', 'Reason category'], ['note', 'Note'],
  ];
  for (const [key, label] of labels) {
    if (fields[key] !== undefined) fireEvent.change(screen.getByLabelText(label), { target: { value: fields[key] } });
  }
  fireEvent.click(screen.getByRole('button', { name: /Save unavailability/ }));
}

const posted = (calls: { method: string; body: unknown }[]) => calls.filter(call => call.method === 'POST').map(call => call.body);

test('TC_E05S04_01 - lists current and upcoming blocks for the picked venue, then creates a new one (Scenario 1)', async () => {
  const createCalls: unknown[] = [];
  const createdBlock = {
    id: 'blk-2', venueId: 'v-1', from: '2027-02-01', to: '2027-02-03', reasonCategory: 'maintenance', reason: 'Scheduled maintenance',
    startsAt: '2027-01-31T16:00:00.000Z', endsAt: '2027-02-03T16:00:00.000Z',
  };
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => ({ body: { blocks: createCalls.length ? [existingBlock, createdBlock] : [existingBlock] } }),
    'POST /api/venues': async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      createCalls.push(body);
      return { status: 201, body: { block: createdBlock, affectedEvents: [], notifiedEventCount: 0 } };
    },
  });

  expect(await screen.findByRole('heading', { level: 1, name: 'Maintenance blocks' })).toBeInTheDocument();
  // Existing block appears in the list once the first venue loads.
  expect(await screen.findByText('Annual fire safety inspection')).toBeInTheDocument();
  const row = screen.getByText('Annual fire safety inspection').closest('tr') as HTMLElement;
  // Dates show the design.md way, not as the stored YYYY-MM-DD.
  expect(within(row).getByText('5 Jan 2027, 12:00 am')).toBeInTheDocument();
  expect(within(row).getByText('11 Jan 2027, 12:00 am')).toBeInTheDocument();
  expect(within(row).getByText('Maintenance')).toBeInTheDocument();

  fillUnavailability({
    startDate: '2027-02-01', startTime: '00:00', endDate: '2027-02-04', endTime: '00:00', category: 'maintenance', note: 'Scheduled maintenance',
  });

  // Success flash appears and the request shape matches the backend contract.
  expect(await screen.findByText(/Unavailability saved\./)).toBeInTheDocument();
  expect(createCalls).toEqual([{
    action: 'block', id: 'v-1', starts_at: '2027-02-01T00:00:00+08:00', ends_at: '2027-02-04T00:00:00+08:00',
    reason_category: 'maintenance', reason: 'Scheduled maintenance',
  }]);
  // The success flash and reload effect are separate React updates. Wait for
  // the actual GET and server-returned row, rather than assuming the flash
  // means the effect has already run (CI exposed this scheduling race).
  await waitFor(() => {
    const blockListGets = calls.filter(call => call.method === 'GET' && call.url.searchParams.get('blocks') === '1');
    expect(blockListGets.length).toBeGreaterThanOrEqual(2);
  });
  expect(await screen.findByRole('cell', { name: 'Scheduled maintenance' })).toBeInTheDocument();
});

test('TC_E05S04_02 superseded by TC_E05S06_02: saving over a confirmed booking succeeds instead of being refused (T-67)', async () => {
  const charityRun = { eventId: 'e-9', eventCode: 'EVT-9', title: 'Charity Run', returnedToPlanning: true, coordinatorNotified: true };
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { ...existingBlock, id: 'blk-x', reason: 'Flooring replacement' }, affectedEvents: [charityRun], notifiedEventCount: 1,
    } },
  });

  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({
    startDate: '2027-01-14', startTime: '00:00', endDate: '2027-01-17', endTime: '00:00', category: 'renovation', note: 'Flooring replacement',
  });

  expect(await screen.findByText(/This event has a booking in this period, now marked Conflicting\. Nothing was cancelled\./)).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Affected events' })).toHaveTextContent('Charity Run (EVT-9)');
  expect(screen.queryByText(/Resolve the conflict first/)).not.toBeInTheDocument();
});

test('TC_E05S04_03 - the success alert shows which affected events had their Coordinator notified (Scenario 3)', async () => {
  const event = (id: string, coordinatorNotified: boolean) => ({ eventId: id, eventCode: null, title: `Event ${id}`, returnedToPlanning: false, coordinatorNotified });
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { ...existingBlock, id: 'blk-x', reason: 'Renovation' },
      // An event with no Coordinator assigned is listed but nobody is told.
      affectedEvents: [event('e-1', true), event('e-2', true), event('e-3', false)],
    } },
  });

  await screen.findByRole('heading', { level: 1 });
  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({
    startDate: '2027-01-20', startTime: '00:00', endDate: '2027-01-26', endTime: '00:00', category: 'renovation', note: 'Renovation',
  });

  expect(await screen.findByText(/These 3 events have bookings in this period/)).toBeInTheDocument();
  const items = within(screen.getByRole('list', { name: 'Affected events' })).getAllByRole('listitem');
  expect(items.map(item => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
    'Event e-1 Coordinator notified', 'Event e-2 Coordinator notified', 'Event e-3 No Coordinator assigned',
  ]);
});

test('TC_E05S06_02 - a save over a Pending request and a Confirmed booking lists both events and marks only the Confirmed one Returned to Planning (Scenarios 2-4)', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { ...existingBlock, id: 'blk-x', reasonCategory: 'safety_concern', reason: 'Ceiling inspection' },
      affectedEvents: [
        { eventId: 'e-1', eventCode: 'EV-101', title: 'Alumni Dinner', returnedToPlanning: false, coordinatorNotified: true },
        { eventId: 'e-2', eventCode: 'EV-102', title: 'Tech Conference 2026', returnedToPlanning: true, coordinatorNotified: true },
      ],
    } },
  });

  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({ startDate: '2027-01-15', startTime: '00:00', endDate: '2027-01-16', endTime: '00:00', category: 'safety_concern', note: 'Ceiling inspection' });

  expect(await screen.findByText(/These 2 events have bookings in this period, now marked Conflicting\. Nothing was cancelled\./)).toBeInTheDocument();
  const [dinner, conference] = within(screen.getByRole('list', { name: 'Affected events' })).getAllByRole('listitem');
  expect(dinner).toHaveTextContent('Alumni Dinner (EV-101)');
  expect(within(dinner!).queryByText('Returned to Planning')).not.toBeInTheDocument();
  expect(conference).toHaveTextContent('Tech Conference 2026 (EV-102)');
  expect(within(conference!).getByText('Returned to Planning')).toBeInTheDocument();
  expect(within(conference!).getByText('Coordinator notified')).toBeInTheDocument();
});

test('TC_E05S06_08 - an event holding the venue with an unexpired tentative hold is listed the same way (Scenario 2, C-111)', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { ...existingBlock, id: 'blk-x', reason: 'Lighting rig repair' },
      affectedEvents: [{ eventId: 'e-3', eventCode: null, title: 'Spring Gala', returnedToPlanning: false, coordinatorNotified: true }],
    } },
  });

  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({ startDate: '2027-01-22', startTime: '00:00', endDate: '2027-01-23', endTime: '00:00', category: 'maintenance', note: 'Lighting rig repair' });

  expect(await screen.findByText(/This event has a booking in this period/)).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Affected events' })).toHaveTextContent('Spring Gala Coordinator notified');
});

test('TC_E05S06_01 - marking a venue unavailable with a reason category and note over a free period sends the timed period (Scenario 1)', async () => {
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { ...existingBlock, id: 'blk-x', reasonCategory: 'equipment_failure', reason: 'Projector rig fault' }, affectedEvents: [],
    } },
  });

  await screen.findByText(/No current or upcoming blocks/);
  const category = screen.getByLabelText('Reason category');
  expect([...category.querySelectorAll('option')].map(option => option.textContent))
    .toEqual(['Choose a reason', 'Maintenance', 'Equipment failure', 'Renovation', 'Safety concern', 'Other']);
  fillUnavailability({
    startDate: '2027-01-20', startTime: '08:00', endDate: '2027-01-20', endTime: '18:00', category: 'equipment_failure', note: '  Projector rig fault  ',
  });

  expect(await screen.findByText('Unavailability saved.')).toBeInTheDocument();
  expect(posted(calls)).toEqual([{
    action: 'block', id: 'v-1', starts_at: '2027-01-20T08:00:00+08:00', ends_at: '2027-01-20T18:00:00+08:00',
    reason_category: 'equipment_failure', reason: 'Projector rig fault',
  }]);
  // The form clears for the next entry.
  expect(screen.getByLabelText('Start date')).toHaveValue('');
  expect(screen.getByLabelText('Reason category')).toHaveValue('');
  expect(screen.getByLabelText('Note')).toHaveValue('');
});

test('TC_E05S06_04 - leaving the end empty saves an open-ended unavailability, until lifted (Scenario 5, T-80)', async () => {
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { ...existingBlock, id: 'blk-x', from: '2027-01-20', to: null, endsAt: null, reasonCategory: 'renovation' }, affectedEvents: [],
    } },
  });

  await screen.findByText(/No current or upcoming blocks/);
  expect(screen.getByLabelText('End date (optional)')).toHaveAccessibleDescription(/until you lift it/);
  fillUnavailability({ startDate: '2027-01-20', startTime: '08:00', category: 'renovation', note: 'Roof works' });

  expect(await screen.findByText('Unavailability saved.')).toBeInTheDocument();
  expect(posted(calls)).toEqual([{
    action: 'block', id: 'v-1', starts_at: '2027-01-20T08:00:00+08:00', ends_at: null, reason_category: 'renovation', reason: 'Roof works',
  }]);
});

test('the end needs both a date and a time, and must be after the start, before any POST is sent', async () => {
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
  });
  await screen.findByText(/No current or upcoming blocks/);

  fillUnavailability({ startDate: '2027-01-20', startTime: '08:00', endDate: '2027-01-20', category: 'other', note: 'Water leak' });
  expect(screen.getByLabelText('End time (optional)')).toHaveAccessibleDescription(/Enter an end time/);

  fillUnavailability({ endDate: '', endTime: '18:00' });
  expect(screen.getByLabelText('End date (optional)')).toHaveAccessibleDescription(/Enter an end date/);

  fillUnavailability({ endDate: '2027-01-20', endTime: '08:00' });
  expect(screen.getByLabelText('End date (optional)')).toHaveAccessibleDescription(/The end must be after the start/);
  expect(posted(calls)).toEqual([]);
});

test('server field errors show next to their fields, and other failures show the server message', async () => {
  let reply = { status: 400, body: { error: 'validation_failed', errors: {
    starts_at: ['Start must be a date and time.'], ends_at: ['End is too far away.'],
    reason_category: ['Choose a listed category.'], reason: ['Note is too long.'],
  } } };
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': () => reply,
  });
  await screen.findByText(/No current or upcoming blocks/);

  fillUnavailability({ startDate: '2027-01-20', startTime: '08:00', category: 'other', note: 'Water leak' });
  expect(await screen.findByText('Start must be a date and time.')).toBeInTheDocument();
  expect(screen.getByLabelText('End date (optional)')).toHaveAccessibleDescription(/End is too far away/);
  expect(screen.getByLabelText('Reason category')).toHaveAccessibleDescription(/Choose a listed category/);
  expect(screen.getByLabelText('Note')).toHaveAccessibleDescription(/Note is too long/);

  reply = { status: 500, body: { error: 'The venue could not be updated.' } } as typeof reply;
  fillUnavailability({});
  expect(await screen.findByText('The venue could not be updated.')).toBeInTheDocument();
});

test('an overlap with another unavailability is refused and names that unavailability', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 409, body: {
      error: 'block_overlap', message: 'This period overlaps an existing block on this venue.',
      overlappingBlocks: [{ ...existingBlock, to: null, endsAt: null }],
    } },
  });
  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({ startDate: '2027-01-06', startTime: '08:00', category: 'other', note: 'Water leak' });

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('This period overlaps an existing block on this venue.');
  expect(alert).toHaveTextContent('until lifted: Annual fire safety inspection');
});

test('TC_E05S04_04 - editing to shorten an unavailability restores the bookings it no longer covers (Scenario 6)', async () => {
  const requests: unknown[] = [];
  let listResponse = { blocks: [existingBlock] };
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => ({ body: listResponse }),
    'POST /api/venues': async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      requests.push(body);
      const shortened = { ...existingBlock, to: '2027-01-07', endsAt: '2027-01-07T16:00:00.000Z' };
      listResponse = { blocks: [shortened] };
      return { status: 200, body: { block: shortened, affectedEvents: [], restoredEvents: [
        { eventId: 'e-1', eventCode: 'EV-1', title: 'Alumni Dinner', coordinatorNotified: true },
      ] } };
    },
  });

  // The edit form opens with the current period, category and note.
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  const form = screen.getByRole('heading', { name: /^Edit the / }).closest('section') as HTMLElement;
  expect(within(form).getByLabelText('Start date')).toHaveValue('2027-01-05');
  expect(within(form).getByLabelText('Start time')).toHaveValue('00:00');
  expect(within(form).getByLabelText('End date (optional)')).toHaveValue('2027-01-11');
  expect(within(form).getByLabelText('Reason category')).toHaveValue('maintenance');
  expect(within(form).getByLabelText('Note')).toHaveValue('Annual fire safety inspection');
  // Only one form is shown while editing.
  expect(screen.queryByRole('button', { name: /Save unavailability/ })).not.toBeInTheDocument();

  fireEvent.change(within(form).getByLabelText('End date (optional)'), { target: { value: '2027-01-08' } });
  fireEvent.click(within(form).getByRole('button', { name: /Save changes/ }));

  expect(await screen.findByText('Unavailability changed. 1 booking has its earlier status back.')).toBeInTheDocument();
  const restored = screen.getByRole('list', { name: 'Restored events' });
  expect(restored).toHaveTextContent('Alumni Dinner (EV-1)');
  expect(restored).toHaveTextContent('Booking restored');
  expect(requests).toEqual([{
    action: 'edit_block', id: 'v-1', block_id: 'blk-1', starts_at: '2027-01-05T00:00:00+08:00', ends_at: '2027-01-08T00:00:00+08:00',
    reason_category: 'maintenance', reason: 'Annual fire safety inspection',
  }]);
  // The create form comes back once the edit is saved.
  expect(screen.getByRole('button', { name: /Save unavailability/ })).toBeInTheDocument();
});

test('TC_E05S06_05 - extending flags a newly covered event and shortening again restores it (Scenarios 5 and 6)', async () => {
  const gala = { eventId: 'e-2', eventCode: 'EV-2', title: 'Spring Gala' };
  let reply: unknown = { block: existingBlock, affectedEvents: [{ ...gala, returnedToPlanning: true, coordinatorNotified: true }], restoredEvents: [] };
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [existingBlock] } },
    'POST /api/venues': () => ({ body: reply }),
  });

  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  fireEvent.change(screen.getByLabelText('End time (optional)'), { target: { value: '00:01' } });
  fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
  expect(await screen.findByText('Unavailability changed. 1 event is newly marked Conflicting.')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Affected events' })).toHaveTextContent('Spring Gala (EV-2) Returned to Planning Coordinator notified');

  reply = { block: existingBlock, affectedEvents: [], restoredEvents: [
    { ...gala, coordinatorNotified: true }, { eventId: 'e-3', eventCode: null, title: 'Book Fair', coordinatorNotified: false },
  ] };
  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
  expect(await screen.findByText('Unavailability changed. 2 bookings have their earlier status back.')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Restored events' })).toHaveTextContent('Book Fair Booking restored No Coordinator assigned');
  expect(posted(calls).map(body => (body as Record<string, unknown>).ends_at)).toEqual(['2027-01-11T00:01:00+08:00', '2027-01-11T00:00:00+08:00']);
});

test('removing the end of an unavailability makes it open-ended, and Cancel closes the edit form (Scenario 5)', async () => {
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [existingBlock] } },
    'POST /api/venues': { body: { block: { ...existingBlock, to: null, endsAt: null }, affectedEvents: [], restoredEvents: [] } },
  });
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;

  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('button', { name: /Save changes/ })).not.toBeInTheDocument();

  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  fireEvent.change(screen.getByLabelText('End date (optional)'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('End time (optional)'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
  expect(await screen.findByText('Unavailability changed.')).toBeInTheDocument();
  expect((posted(calls)[0] as Record<string, unknown>).ends_at).toBeNull();
});

test('an edit that would overlap another unavailability is refused and names it', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [existingBlock] } },
    'POST /api/venues': { status: 409, body: {
      error: 'block_overlap', message: 'This period overlaps an existing block on this venue.',
      overlappingBlocks: [{ ...existingBlock, id: 'blk-9', reason: 'Roof repair' }],
    } },
  });
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('5 Jan 2027, 12:00 am – 11 Jan 2027, 12:00 am: Roof repair');
});

test('lifting goes through ConfirmPanel, lists the restored bookings and reloads the list (Scenario 6)', async () => {
  const requests: unknown[] = [];
  let blocks = [existingBlock];
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => ({ body: { blocks } }),
    'POST /api/venues': async (_url, init) => {
      requests.push(init?.body ? JSON.parse(String(init.body)) : null);
      blocks = [];
      return { status: 200, body: { block: existingBlock, lifted: true, restoredEvents: [
        { eventId: 'e-1', eventCode: null, title: 'Alumni Dinner', coordinatorNotified: true },
      ], notifiedEventCount: 1 } };
    },
  });

  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Lift/ }));
  expect(screen.getByText(/Maintenance: Annual fire safety inspection\. Bookings it made Conflicting get their earlier status back/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Lift unavailability' }));
  expect(await screen.findByText('Unavailability lifted. It stays in the history. 1 booking has its earlier status back.')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Restored events' })).toHaveTextContent('Alumni Dinner Booking restored Coordinator notified');
  expect(requests).toEqual([{ action: 'lift_block', id: 'v-1', block_id: 'blk-1' }]);
  await waitFor(() => expect(screen.getByText(/No current or upcoming blocks/)).toBeInTheDocument());
});

test('an open-ended unavailability lists as until lifted, edits with an empty end, and lifts with nothing to restore (T-80)', async () => {
  const openBlock = { ...existingBlock, to: null, endsAt: null, reasonCategory: 'renovation' };
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [openBlock] } },
    'POST /api/venues': { body: { block: openBlock, lifted: true } },
  });

  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  expect(within(row).getByText('Until lifted')).toBeInTheDocument();
  expect(within(row).getByText('Renovation')).toBeInTheDocument();
  fireEvent.click(within(row).getByRole('button', { name: /Edit/ }));
  expect(screen.getByRole('heading', { name: 'Edit the 5 Jan 2027, 12:00 am until lifted unavailability' })).toBeInTheDocument();
  expect(screen.getByLabelText('End date (optional)')).toHaveValue('');
  expect(screen.getByLabelText('End time (optional)')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  fireEvent.click(within(row).getByRole('button', { name: /Lift/ }));
  expect(screen.getByText(/until lifted unavailability\?/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(within(row).getByRole('button', { name: /Lift/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Lift unavailability' }));
  expect(await screen.findByText('Unavailability lifted. It stays in the history.')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Restored events' })).not.toBeInTheDocument();
});

test('a failed lift shows the server message and closes the confirmation', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [existingBlock] } },
    'POST /api/venues': { status: 404, body: { error: 'Block not found on this venue.' } },
  });
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Lift/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Lift unavailability' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Block not found on this venue.');
  expect(screen.queryByRole('button', { name: 'Lift unavailability' })).not.toBeInTheDocument();
});

test('TC_E05S06_07 - the history shows the create, the edit and the lift with who, when, and the period and note before and after (Scenario 7)', async () => {
  const created = { startsAt: '2027-01-15T00:00:00.000Z', endsAt: '2027-01-15T10:00:00.000Z', reasonCategory: 'maintenance', reason: 'Floor resurfacing' };
  const edited = { ...created, endsAt: '2027-01-15T12:00:00.000Z', reason: 'Floor resurfacing, second coat' };
  const liftedBlock = { ...existingBlock, ...edited, from: '2027-01-15', to: '2027-01-15', liftedAt: '2027-01-14T06:00:00.000Z', liftedBy: 'Venue Staff One' };
  const historyCalls: string[] = [];
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1&history=blk-1': url => {
      historyCalls.push(url.search);
      return { body: { history: [
        { action: 'created', changedAt: '2027-01-14T01:00:00.000Z', actor: 'Venue Staff One', previous: null, next: created },
        { action: 'edited', changedAt: '2027-01-14T02:00:00.000Z', actor: 'Venue Staff One', previous: created, next: edited },
        { action: 'lifted', changedAt: '2027-01-14T06:00:00.000Z', actor: null, previous: edited, next: null },
      ] } };
    },
    'GET /api/venues?id=v-1&blocks=1': url => ({ body: { blocks: url.searchParams.get('lifted') === '1' ? [liftedBlock] : [] } }),
  });

  // Lifted unavailability is kept: it appears once "Show lifted" is ticked.
  await screen.findByText(/No current or upcoming blocks/);
  fireEvent.click(screen.getByLabelText('Show lifted'));
  const row = (await screen.findByText('Floor resurfacing, second coat')).closest('tr') as HTMLElement;
  expect(within(row).getByText('Lifted')).toBeInTheDocument();
  expect(within(row).getByText('by Venue Staff One, 14 Jan 2027, 2:00 pm')).toBeInTheDocument();
  // History is read-only: no Edit or Lift on a lifted row.
  expect(within(row).queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
  expect(within(row).queryByRole('button', { name: /Lift/ })).not.toBeInTheDocument();

  fireEvent.click(within(row).getByRole('button', { name: /History/ }));
  const table = await screen.findByRole('table', { name: 'Changes to this unavailability, oldest first' });
  const rows = within(table).getAllByRole('row').slice(1).map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent));
  expect(rows).toEqual([
    ['14 Jan 2027, 9:00 am', 'Venue Staff One', 'Created', '–', '15 Jan 2027, 8:00 am – 6:00 pm · Maintenance · Floor resurfacing'],
    ['14 Jan 2027, 10:00 am', 'Venue Staff One', 'Edited',
      '15 Jan 2027, 8:00 am – 6:00 pm · Maintenance · Floor resurfacing', '15 Jan 2027, 8:00 am – 8:00 pm · Maintenance · Floor resurfacing, second coat'],
    ['14 Jan 2027, 2:00 pm', 'Former staff member', 'Lifted', '15 Jan 2027, 8:00 am – 8:00 pm · Maintenance · Floor resurfacing, second coat', '–'],
  ]);
  expect(historyCalls).toEqual(['?id=v-1&blocks=1&history=blk-1']);

  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('table', { name: 'Changes to this unavailability, oldest first' })).not.toBeInTheDocument();
});

test('a lifted row with no recorded lifter, a block with no history yet, and an open-ended entry with no category read clearly', async () => {
  const liftedBlock = { ...existingBlock, endsAt: null, to: null, liftedAt: '2027-01-14T06:00:00.000Z', liftedBy: null };
  let history: unknown[] = [];
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1&history=blk-1': () => ({ body: { history } }),
    'GET /api/venues?id=v-1&blocks=1': url => ({ body: { blocks: url.searchParams.get('lifted') === '1' ? [liftedBlock] : [existingBlock] } }),
  });

  const current = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(current).getByRole('button', { name: /History/ }));
  expect(await screen.findByText('No changes recorded')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  fireEvent.click(screen.getByLabelText('Show lifted'));
  expect(await screen.findByText(/by a former staff member/)).toBeInTheDocument();
  history = [{ action: 'created', changedAt: '2027-01-14T01:00:00.000Z', actor: 'Venue Staff One', previous: null,
    next: { startsAt: '2027-01-15T00:00:00.000Z', endsAt: null, reasonCategory: null, reason: '' } }];
  const row = screen.getByText(/by a former staff member/).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /History/ }));
  expect(await screen.findByRole('cell', { name: '15 Jan 2027, 8:00 am until lifted · No category' })).toBeInTheDocument();
});

test('a history that fails to load offers Try again', async () => {
  let fail = true;
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1&history=blk-1': () => (fail
      ? { status: 503, body: { error: 'The history of this unavailability could not be loaded.' } }
      : { body: { history: [] } }),
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [existingBlock] } },
  });
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /History/ }));
  const retry = await screen.findByRole('button', { name: /Try again/ });
  fail = false;
  fireEvent.click(retry);
  expect(await screen.findByText('No changes recorded')).toBeInTheDocument();
});

test('loading state renders while blocks are in flight', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => new Promise(() => { /* never resolve */ }) as unknown as { body: unknown },
  });
  // Loading status in the "Current and upcoming blocks" card.
  expect(await screen.findByText(/Loading blocks/)).toBeInTheDocument();
});

test('client validation refuses an empty form before any POST is sent', async () => {
  const posts: unknown[] = [];
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': async (_url, init) => {
      posts.push(init?.body ? JSON.parse(String(init.body)) : null);
      return { status: 201, body: { block: existingBlock, notifiedEventCount: 0 } };
    },
  });
  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({});
  expect(screen.getByLabelText('Start date')).toHaveAccessibleDescription(/Start date is required/);
  expect(screen.getByLabelText('Start time')).toHaveAccessibleDescription(/Start time is required/);
  expect(screen.getByLabelText('Reason category')).toHaveAccessibleDescription(/Choose a reason category/);
  // Scenario 1: the note is required on the form (the story lists it with the category; only the end is optional).
  expect(screen.getByLabelText('Note')).toHaveAccessibleDescription(/note describing the unavailability is required/i);
  expect(posts).toEqual([]);
});

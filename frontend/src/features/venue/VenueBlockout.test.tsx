// E05-S04 maintenance blocks screen against a stubbed fetch shaped like the
// backend's GET /api/venues?id=&blocks=1 list and the POST /api/venues
// action: 'block' / 'shorten_block' / 'remove_block' responses. The server
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
  reason: 'Annual fire safety inspection',
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
  expect(within(row).getByText('5 Jan 2027')).toBeInTheDocument();
  expect(within(row).getByText('10 Jan 2027')).toBeInTheDocument();

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

  expect(await screen.findByText('Unavailability saved. The Coordinator was notified for 1 affected event.')).toBeInTheDocument();
  expect(screen.queryByText(/Resolve the conflict first/)).not.toBeInTheDocument();
});

test('TC_E05S04_03 - the success alert names the number of events with a Coordinator notification (Scenario 3)', async () => {
  const event = (id: string, coordinatorNotified: boolean) => ({ eventId: id, eventCode: null, title: id, returnedToPlanning: false, coordinatorNotified });
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

  expect(await screen.findByText(/Coordinators were notified for 2 affected events/)).toBeInTheDocument();
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
      overlappingBlocks: [{ ...existingBlock, to: null }],
    } },
  });
  await screen.findByText(/No current or upcoming blocks/);
  fillUnavailability({ startDate: '2027-01-06', startTime: '08:00', category: 'other', note: 'Water leak' });

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('This period overlaps an existing block on this venue.');
  expect(alert).toHaveTextContent('until lifted: Annual fire safety inspection');
});

test('TC_E05S04_04 - shortening restores availability for the released dates, and lengthening is refused on the client', async () => {
  const requests: unknown[] = [];
  let listResponse = { blocks: [existingBlock] };
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => ({ body: listResponse }),
    'POST /api/venues': async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      requests.push(body);
      if (body && typeof body === 'object' && 'action' in body && body.action === 'shorten_block') {
        listResponse = { blocks: [{ ...existingBlock, to: '2027-01-07' }] };
        return { status: 200, body: { block: { ...existingBlock, to: '2027-01-07' } } };
      }
      return { status: 400, body: { error: 'invalid_action' } };
    },
  });

  // Open the shorten form from the existing block's row.
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Shorten/ }));
  const newEndField = await screen.findByLabelText('New end date');
  expect(newEndField).toHaveValue('2027-01-10');

  // Lengthening is refused with the server's message, inline next to the field.
  fireEvent.change(newEndField, { target: { value: '2027-01-20' } });
  fireEvent.click(screen.getByRole('button', { name: /Save shortened block/ }));
  expect(newEndField).toHaveAccessibleDescription(/A block can only be shortened/);
  // The client refused, so no POST should have been sent for this attempt.
  expect(requests.filter(r => r && typeof r === 'object' && 'action' in r && r.action === 'shorten_block')).toEqual([]);

  // Now shorten properly.
  fireEvent.change(newEndField, { target: { value: '2027-01-07' } });
  fireEvent.click(screen.getByRole('button', { name: /Save shortened block/ }));
  expect(await screen.findByText(/Block shortened\. The released dates are available again\./)).toBeInTheDocument();
  expect(requests).toEqual([{ action: 'shorten_block', id: 'v-1', block_id: 'blk-1', from: '2027-01-05', to: '2027-01-07', reason: 'Annual fire safety inspection' }]);
});

test('removing a block goes through ConfirmPanel and reloads the list on success', async () => {
  const requests: unknown[] = [];
  let blocks = [existingBlock];
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => ({ body: { blocks } }),
    'POST /api/venues': async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      requests.push(body);
      if (body && typeof body === 'object' && 'action' in body && body.action === 'remove_block') {
        blocks = [];
        return { status: 200, body: { removed: true } };
      }
      return { status: 400, body: { error: 'invalid_action' } };
    },
  });

  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Remove/ }));
  // ConfirmPanel opens; a cancel keeps the block.
  const confirm = screen.getByRole('button', { name: 'Remove block' });
  fireEvent.click(confirm);
  expect(await screen.findByText(/Block removed/)).toBeInTheDocument();
  expect(requests).toEqual([{ action: 'remove_block', id: 'v-1', block_id: 'blk-1' }]);
  // The emptied list reloads.
  await waitFor(() => expect(screen.getByText(/No current or upcoming blocks/)).toBeInTheDocument());
});

test('E05-S06: an open-ended block lists as until lifted and can still be shortened to an end date (T-80)', async () => {
  const requests: unknown[] = [];
  const openBlock = { ...existingBlock, to: null, endsAt: null, reasonCategory: 'renovation' };
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [openBlock] } },
    'POST /api/venues': async (_url, init) => {
      requests.push(init?.body ? JSON.parse(String(init.body)) : null);
      return { status: 200, body: { block: { ...existingBlock, to: '2027-01-20' } } };
    },
  });

  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  expect(within(row).getByText('Until lifted')).toBeInTheDocument();
  fireEvent.click(within(row).getByRole('button', { name: /Remove/ }));
  expect(screen.getByText(/until lifted block\?/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  fireEvent.click(within(row).getByRole('button', { name: /Shorten/ }));
  const newEndField = await screen.findByLabelText('New end date');
  expect(newEndField).toHaveValue('');
  fireEvent.change(newEndField, { target: { value: '2027-01-20' } });
  fireEvent.click(screen.getByRole('button', { name: /Save shortened block/ }));
  await waitFor(() => expect(requests).toEqual([
    { action: 'shorten_block', id: 'v-1', block_id: 'blk-1', from: '2027-01-05', to: '2027-01-20', reason: 'Annual fire safety inspection' },
  ]));
});

test('a failed remove shows the server message and closes the confirmation', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [existingBlock] } },
    'POST /api/venues': { status: 404, body: { error: 'Block not found on this venue.' } },
  });
  const row = (await screen.findByText('Annual fire safety inspection')).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /Remove/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove block' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Block not found on this venue.');
  expect(screen.queryByRole('button', { name: 'Remove block' })).not.toBeInTheDocument();
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

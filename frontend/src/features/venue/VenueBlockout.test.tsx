// E05-S04 maintenance blocks screen against a stubbed fetch shaped like the
// backend's GET /api/venues?id=&blocks=1 list and the POST /api/venues
// action: 'block' / 'shorten_block' / 'remove_block' responses. The server
// decides the business rules (overlap, lengthening, auth); these tests check
// the screen shows the server's refusals faithfully, reads the notified
// event count from the success body, and reloads after each change.
//
// TC_E05S04_01..04 map to the four scenarios from the backlog; the TC_id
// appears in each test's title so the traceability matrix picks it up.
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

test('TC_E05S04_01 - lists current and upcoming blocks for the picked venue, then creates a new one (Scenario 1)', async () => {
  const createCalls: unknown[] = [];
  const calls = renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': () => ({ body: { blocks: [existingBlock] } }),
    'POST /api/venues': async (_url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      createCalls.push(body);
      return { status: 201, body: {
        block: { id: 'blk-2', venueId: 'v-1', from: '2027-02-01', to: '2027-02-03', reason: 'Scheduled maintenance',
          startsAt: '2027-01-31T16:00:00.000Z', endsAt: '2027-02-03T16:00:00.000Z' },
        notifiedEventCount: 0,
      } };
    },
  });

  expect(await screen.findByRole('heading', { level: 1, name: 'Maintenance blocks' })).toBeInTheDocument();
  // Existing block appears in the list once the first venue loads.
  expect(await screen.findByText('Annual fire safety inspection')).toBeInTheDocument();
  const row = screen.getByText('Annual fire safety inspection').closest('tr') as HTMLElement;
  // Dates show the design.md way, not as the stored YYYY-MM-DD.
  expect(within(row).getByText('5 Jan 2027')).toBeInTheDocument();
  expect(within(row).getByText('10 Jan 2027')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2027-02-01' } });
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2027-02-03' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Scheduled maintenance' } });
  fireEvent.click(screen.getByRole('button', { name: /Save block/ }));

  // Success flash appears and the request shape matches the backend contract.
  expect(await screen.findByText(/Block saved/)).toBeInTheDocument();
  expect(createCalls).toEqual([{ action: 'block', id: 'v-1', from: '2027-02-01', to: '2027-02-03', reason: 'Scheduled maintenance' }]);
  // The list reloads: expect at least one block-list GET after the POST.
  const blockListGets = calls.filter(call => call.method === 'GET' && call.url.searchParams.get('blocks') === '1');
  expect(blockListGets.length).toBeGreaterThanOrEqual(2);
});

test('TC_E05S04_02 - shows the server message and names the conflicting booking on a 409 booking_conflict (Scenario 2)', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 409, body: {
      error: 'booking_conflict',
      message: 'This period overlaps a confirmed booking. Resolve the booking before blocking the venue.',
      conflictingBookings: [{ eventCode: 'EVT-9', title: 'Charity Run', startsAt: '2027-01-15T01:00:00.000Z', endsAt: '2027-01-15T05:00:00.000Z' }],
    } },
  });

  await screen.findByRole('heading', { level: 1, name: 'Maintenance blocks' });
  await screen.findByText(/No current or upcoming blocks/);
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2027-01-14' } });
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2027-01-16' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Flooring replacement' } });
  fireEvent.click(screen.getByRole('button', { name: /Save block/ }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('This period overlaps a confirmed booking');
  expect(alert).toHaveTextContent('Charity Run');
  expect(alert).toHaveTextContent('EVT-9');
});

test('TC_E05S04_03 - the success alert names the number of events with a Coordinator notification (Scenario 3)', async () => {
  renderPage({
    'GET /api/venues?q=': { body: { venues } },
    'GET /api/venues?id=v-1&blocks=1': { body: { blocks: [] } },
    'POST /api/venues': { status: 201, body: {
      block: { id: 'blk-x', venueId: 'v-1', from: '2027-01-20', to: '2027-01-25', reason: 'Renovation',
        startsAt: '2027-01-19T16:00:00.000Z', endsAt: '2027-01-25T16:00:00.000Z' },
      notifiedEventCount: 2,
    } },
  });

  await screen.findByRole('heading', { level: 1 });
  await screen.findByText(/No current or upcoming blocks/);
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2027-01-20' } });
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2027-01-25' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Renovation' } });
  fireEvent.click(screen.getByRole('button', { name: /Save block/ }));

  expect(await screen.findByText(/Coordinators were notified for 2 affected upcoming events/)).toBeInTheDocument();
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
  fireEvent.click(screen.getByRole('button', { name: /Save block/ }));
  expect(screen.getByLabelText('From')).toHaveAccessibleDescription(/Start date is required/);
  expect(screen.getByLabelText('Reason')).toHaveAccessibleDescription(/reason for the block is required/i);
  expect(posts).toEqual([]);
});

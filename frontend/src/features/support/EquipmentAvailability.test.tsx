import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EquipmentAvailability } from './EquipmentAvailability';
import { stubApi, deferred } from '../../testing/fakeApi';
const item = {
  id: 'eq1',
  name: 'Microphone',
  totalStock: 10,
  location: 'Grand Ballroom',
  operationalStatus: 'available',
  reservedQuantity: 3,
  unavailableQuantity: 2,
  freeQuantity: 5,
  operationallyUnavailable: false,
};
const period = { start: '2026-11-15T01:00:00Z', end: '2026-11-15T04:00:00Z' };
const endpoint = 'GET /api/equipment?mode=availability';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function show() {
  render(
    <MemoryRouter>
      <EquipmentAvailability />
    </MemoryRouter>,
  );
}
function check(start = '2026-11-15T09:00', end = '2026-11-15T12:00') {
  fireEvent.change(screen.getByLabelText('Start'), {
    target: { value: start },
  });
  fireEvent.change(screen.getByLabelText('End'), { target: { value: end } });
  fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
}
test('TC_E07S03_01 renders reservation and damaged-stock deductions for a selected period', async () => {
  const calls = stubApi(
    { [endpoint]: { body: { period, equipment: [item] } } },
    { role: 'technical_support_staff' },
  );
  show();
  check();
  expect(await screen.findByRole('table')).toHaveTextContent('Microphone');
  expect(screen.getByRole('table')).toHaveTextContent('5');
  const call = calls.find(
    (call) => call.url.searchParams.get('mode') === 'availability',
  );
  expect(call?.url.searchParams.get('start')).toMatch(/Z$/);
  expect(
    screen.queryByRole('button', { name: /Reserve/ }),
  ).not.toBeInTheDocument();
});
test('TC_E07S03_02 shows equipment at another location without transport restrictions', async () => {
  stubApi(
    {
      [endpoint]: {
        body: {
          period,
          equipment: [
            {
              ...item,
              freeQuantity: 10,
              reservedQuantity: 0,
              unavailableQuantity: 0,
            },
          ],
        },
      },
    },
    { role: 'technical_support_staff' },
  );
  show();
  check();
  expect(await screen.findByText('Grand Ballroom')).toBeInTheDocument();
  expect(screen.getByText(/no transport allowance/i)).toBeInTheDocument();
});
test('TC_E07S03_03 new period replaces prior results and late responses cannot overwrite it', async () => {
  const first = deferred<{ body: unknown }>();
  let count = 0;
  stubApi(
    {
      [endpoint]: () =>
        ++count === 1
          ? first.promise
          : {
              body: {
                period,
                equipment: [
                  { ...item, name: 'Afternoon microphone', freeQuantity: 10 },
                ],
              },
            },
    },
    { role: 'technical_support_staff' },
  );
  show();
  check();
  check('2026-11-15T14:00', '2026-11-15T17:00');
  await screen.findByText('Afternoon microphone');
  first.resolve({ body: { period, equipment: [item] } });
  await Promise.resolve();
  expect(screen.queryByText('Microphone')).not.toBeInTheDocument();
});
test('invalid time range is associated with End and does not call availability', () => {
  const calls = stubApi({}, { role: 'technical_support_staff' });
  show();
  check('2026-11-15T12:00', '2026-11-15T09:00');
  expect(screen.getByLabelText('End')).toHaveAttribute('aria-invalid', 'true');
  expect(
    calls.some((call) => call.url.searchParams.get('mode') === 'availability'),
  ).toBe(false);
});
test('availability offers retry after service failure and shows the empty state', async () => {
  let failed = true;
  stubApi(
    {
      [endpoint]: () =>
        failed
          ? {
              status: 503,
              body: { error: 'Service unavailable. Please try again.' },
            }
          : { body: { period, equipment: [] } },
    },
    { role: 'technical_support_staff' },
  );
  show();
  check();
  await screen.findByText('Service unavailable. Please try again.');
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No active equipment')).toBeInTheDocument();
});

test('checking the same period again refreshes its quantities', async () => {
  let calls = 0;
  stubApi(
    {
      [endpoint]: () => ({
        body: {
          period,
          equipment: [{ ...item, freeQuantity: ++calls === 1 ? 5 : 4 }],
        },
      }),
    },
    { role: 'technical_support_staff' },
  );
  show();
  check();
  await screen.findByRole('table');
  fireEvent.click(screen.getByRole('button', { name: 'Check availability' }));
  await screen.findByText('4');
  expect(calls).toBe(2);
});

test('maintenance item displays zero free and a missing location is explicitly labelled', async () => {
  stubApi(
    {
      [endpoint]: {
        body: {
          period,
          equipment: [
            {
              ...item,
              operationalStatus: 'maintenance',
              operationallyUnavailable: true,
              location: null,
              freeQuantity: 0,
            },
          ],
        },
      },
    },
    { role: 'technical_support_staff' },
  );
  show();
  check();
  const table = await screen.findByRole('table');
  expect(table).toHaveTextContent('Under maintenance');
  expect(table).toHaveTextContent('Not specified');
  const cells = screen.getAllByRole('cell');
  expect(cells[4]).toHaveTextContent('0');
});

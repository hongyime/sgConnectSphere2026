// E07-S05 (SCRUM-55) screen tests: marking equipment unavailable and returning
// it to service from the equipment page, against a fake API shaped like the
// real one. Dates are in 2030 so "the end date must be today or later" never
// makes these tests expire.
import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EquipmentDetail } from './EquipmentCatalogue';
import { MarkUnavailablePage, formatDays, inServiceFor, today, validate } from './EquipmentUnavailability';
import { stubApi } from '../../testing/fakeApi';
import type { UnavailablePeriod } from './unavailabilityApi';

const camera = {
  id: 'eq1',
  name: 'HD Camera',
  category: 'Video',
  description: 'Broadcast camera',
  total_quantity: 4,
  home_location: 'Store room',
  operational_status: 'available',
  is_active: true,
  reservations: [] as unknown[],
  unavailability: [] as UnavailablePeriod[],
};
const period: UnavailablePeriod = {
  id: 'p1',
  equipmentId: 'eq1',
  quantity: 4,
  reason: 'Sensor repair',
  from: '2030-12-01',
  to: '2030-12-05',
  startsAt: '2030-11-30T16:00:00.000Z',
  endsAt: '2030-12-05T16:00:00.000Z',
};
const reservation = {
  id: 'res1',
  eventId: 'event-a',
  eventCode: 'EVT-A',
  title: 'EVT-A Tech Conference 2026',
  quantity: 2,
  startsAt: '2030-12-03T01:00:00.000Z',
  endsAt: '2030-12-03T09:00:00.000Z',
  status: 'reserved',
  requiresReconfirmation: false,
};
const item = (extra: Record<string, unknown> = {}) => ({ body: { equipment: { ...camera, ...extra } } });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function show(path: string, strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/support/catalogue/:equipmentId" element={<EquipmentDetail />} />
        <Route path="/support/catalogue/:equipmentId/unavailable" element={<MarkUnavailablePage />} />
      </Routes>
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

async function fill(values: { from?: string; to?: string; quantity?: string; reason?: string }) {
  if (values.from !== undefined) fireEvent.change(await screen.findByLabelText('From'), { target: { value: values.from } });
  if (values.to !== undefined) fireEvent.change(screen.getByLabelText('To'), { target: { value: values.to } });
  if (values.quantity !== undefined) fireEvent.change(screen.getByLabelText('Units to take out'), { target: { value: values.quantity } });
  if (values.reason !== undefined) fireEvent.change(screen.getByLabelText('Reason'), { target: { value: values.reason } });
}

test('TC_E07S05_01 - Technical Support marks an item unavailable for a period with a reason and sees the period listed', async () => {
  let saved = false;
  const calls = stubApi(
    {
      'GET /api/equipment?id=eq1': () => item({ unavailability: saved ? [period] : [] }),
      'POST /api/equipment': () => {
        saved = true;
        return { status: 201, body: { unavailability: period, affectedReservations: [], notified: 0 } };
      },
    },
    { role: 'technical_support_staff' },
  );
  // StrictMode mounts the form twice in development; the reply must still land.
  show('/support/catalogue/eq1', true);
  expect(await screen.findByText('No unavailable periods')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('link', { name: 'Mark unavailable' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Mark equipment unavailable' })).toBeInTheDocument();
  expect((await screen.findByText('In service for these dates')).nextSibling).toHaveTextContent('Choose the dates');
  expect(screen.getByLabelText('Units to take out')).toHaveValue(4);
  await fill({ from: '2030-12-01', to: '2030-12-05', reason: '  Sensor repair ' });
  expect(screen.getByText('In service for these dates').nextSibling).toHaveTextContent('4');
  expect(
    screen.getByText('From 1 to 4. Reservations that no longer fit are flagged for review, and their Coordinators are notified.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  const done = await screen.findByText(/HD Camera × 4 out of service for 1 Dec 2030 – 5 Dec 2030 \(Sensor repair\)\./);
  expect(done.closest('[role="status"]')).toHaveTextContent('Marked unavailable');
  expect(done).toHaveTextContent('No reservations were affected.');
  expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
    action: 'markUnavailable',
    id: 'eq1',
    from: '2030-12-01',
    to: '2030-12-05',
    quantity: 4,
    reason: 'Sensor repair',
  });
  const table = within(await screen.findByRole('table', { name: 'Unavailable periods' }));
  expect(table.getByText('1 Dec 2030 – 5 Dec 2030')).toBeInTheDocument();
  expect(table.getByText('4 of 4')).toBeInTheDocument();
  expect(table.getByText('Sensor repair')).toBeInTheDocument();
});

test('TC_E07S05_02 - marking a reserved item unavailable lists the flagged event and says its Coordinator was notified', async () => {
  let saved = false;
  stubApi(
    {
      'GET /api/equipment?id=eq1': () =>
        item({
          reservations: [{ ...reservation, requiresReconfirmation: saved }],
          unavailability: saved ? [{ ...period, quantity: 3 }] : [],
        }),
      'POST /api/equipment': () => {
        saved = true;
        return {
          status: 201,
          body: {
            unavailability: { ...period, quantity: 3 },
            affectedReservations: [{ id: 'res1', eventId: 'event-a', eventCode: 'EVT-A', title: 'EVT-A Tech Conference 2026', quantity: 2 }],
            notified: 1,
          },
        };
      },
    },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1/unavailable');
  await fill({ from: '2030-12-01', to: '2030-12-05', quantity: '3', reason: 'Sensor repair' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  const warning = (await screen.findByText('These reservations no longer fit and are flagged for review:')).closest('[role="alert"]')!;
  expect(warning).toHaveTextContent('Reservations need review');
  expect(within(warning as HTMLElement).getByText('EVT-A Tech Conference 2026: 2 reserved')).toBeInTheDocument();
  expect(within(warning as HTMLElement).getByText('Its Coordinator has been notified.')).toBeInTheDocument();
  // E07-S01's reservation history shows the flag after the reload.
  expect(await within(await screen.findByRole('table', { name: 'Reservation history' })).findByText('Needs review')).toBeInTheDocument();
});

test('TC_E07S05_03 - returning an item to service removes the period after confirming', async () => {
  let returned = false;
  const calls = stubApi(
    {
      'GET /api/equipment?id=eq1': () => item({ unavailability: returned ? [] : [period] }),
      'POST /api/equipment': () => {
        returned = true;
        return { body: { returned: true, equipment: { id: 'eq1', name: 'HD Camera' }, unavailability: period } };
      },
    },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1', true);
  fireEvent.click(await screen.findByRole('button', { name: 'Return to service…' }));
  expect(screen.getByRole('heading', { name: 'Return HD Camera to service?' })).toBeInTheDocument();
  expect(
    screen.getByText(
      'The 4 units out for 1 Dec 2030 – 5 Dec 2030 (Sensor repair) count as available again. Reservations already flagged for review stay flagged until they are changed or released.',
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Return to service' }));
  const done = await screen.findByText('HD Camera × 4 is back in service for 1 Dec 2030 – 5 Dec 2030.');
  expect(done.closest('[role="status"]')).toHaveTextContent('Returned to service');
  expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ action: 'returnToService', unavailabilityId: 'p1' });
  expect(await screen.findByText('No unavailable periods')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Return HD Camera to service?' })).not.toBeInTheDocument();
});

test('E07-S05 D51 the form checks dates, units and reason before sending anything', async () => {
  const calls = stubApi(
    { 'GET /api/equipment?id=eq1': () => item({ unavailability: [{ ...period, quantity: 1 }] }) },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1/unavailable');
  await screen.findByLabelText('From');
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findByText('Fix the highlighted fields, then save again.')).toBeInTheDocument();
  expect(screen.getByLabelText('From')).toHaveAccessibleDescription('Start date must be a real date.');
  expect(screen.getByLabelText('To')).toHaveAccessibleDescription('End date must be a real date.');
  expect(screen.getByLabelText('Reason')).toHaveAccessibleDescription(/Enter a reason\./);
  await fill({ from: '2030-12-05', to: '2030-12-01', reason: 'x' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findByText('End date must be on or after the start date.')).toBeInTheDocument();
  // 1 of 4 is already out on these days, so 3 are in service.
  await fill({ from: '2030-12-01', to: '2030-12-02', quantity: '4' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findByText('Only 3 units are in service for these dates.')).toBeInTheDocument();
  await fill({ quantity: '0' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findByText('Enter a whole number greater than 0.')).toBeInTheDocument();
  expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0);
});

test('E07-S05 D51 the units default to those in service for the chosen dates until the user types a number', async () => {
  stubApi(
    { 'GET /api/equipment?id=eq1': () => item({ unavailability: [{ ...period, quantity: 1 }] }) },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1/unavailable');
  await fill({ from: '2030-12-04', to: '2030-12-08' });
  expect(screen.getByLabelText('Units to take out')).toHaveValue(3);
  expect(screen.getByText('In service for these dates').nextSibling).toHaveTextContent('3');
  await fill({ from: '2030-12-06' });
  expect(screen.getByLabelText('Units to take out')).toHaveValue(4);
  await fill({ quantity: '2' });
  await fill({ from: '2030-12-01' });
  expect(screen.getByLabelText('Units to take out')).toHaveValue(2);
});

test('E07-S05 a server refusal is shown word for word, next to its field', async () => {
  let reply: { status: number; body: unknown } = {
    status: 409,
    body: {
      error: 'not_enough_in_service',
      message: 'Only 2 units are in service for these dates.',
      errors: { quantity: ['Only 2 units are in service for these dates.'] },
      inService: 2,
    },
  };
  stubApi(
    { 'GET /api/equipment?id=eq1': () => item(), 'POST /api/equipment': () => reply },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1/unavailable');
  await fill({ from: '2030-12-01', to: '2030-12-05', quantity: '3', reason: 'Sensor repair' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findAllByText('Only 2 units are in service for these dates.')).toHaveLength(2);
  expect(screen.getByLabelText('Units to take out')).toHaveAttribute('aria-invalid', 'true');
  reply = { status: 400, body: { error: 'validation_failed', errors: { to: ['The end date must be today or later.'] } } };
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findByText('Fix the highlighted fields, then save again.')).toBeInTheDocument();
  expect(screen.getByText('The end date must be today or later.')).toBeInTheDocument();
});

test('E07-S05 Coordinators see the periods without actions and are refused the form; retired items have no actions', async () => {
  stubApi({ 'GET /api/equipment?id=eq1': () => item({ unavailability: [period] }) }, { role: 'event_coordinator' });
  show('/support/catalogue/eq1');
  expect(await screen.findByText('View only')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Mark unavailable' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Return to service…' })).not.toBeInTheDocument();
  cleanup();
  show('/support/catalogue/eq1/unavailable');
  expect(
    await screen.findByText('Access denied. Only Technical Support Staff can maintain equipment; Coordinators can view it.'),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
  cleanup();
  vi.unstubAllGlobals();
  stubApi({ 'GET /api/equipment?id=eq1': () => item({ is_active: false, unavailability: [period] }) }, { role: 'technical_support_staff' });
  show('/support/catalogue/eq1/unavailable');
  expect(await screen.findByText("This equipment has been retired, so its availability can't be changed.")).toBeInTheDocument();
  cleanup();
  show('/support/catalogue/eq1');
  expect(await screen.findByText('View only')).toBeInTheDocument();
});

test('E07-S05 a refused return is shown in the panel, and Cancel closes it', async () => {
  stubApi(
    {
      'GET /api/equipment?id=eq1': () => item({ unavailability: [period] }),
      'POST /api/equipment': () => ({ status: 409, body: { error: 'This period has already ended.' } }),
    },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1');
  fireEvent.click(await screen.findByRole('button', { name: 'Return to service…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Return to service' }));
  expect(await screen.findByText('This period has already ended.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('heading', { name: 'Return HD Camera to service?' })).not.toBeInTheDocument();
});

test('E07-S05 the saved message says which Coordinators were told when some events have none', async () => {
  stubApi(
    {
      'GET /api/equipment?id=eq1': () => item(),
      'POST /api/equipment': () => ({
        status: 201,
        body: {
          unavailability: period,
          affectedReservations: [
            { id: 'r1', eventId: 'e1', eventCode: 'EVT-A', title: 'Conference', quantity: 2 },
            { id: 'r2', eventId: 'e2', eventCode: null, title: 'Charity Run', quantity: 1 },
          ],
          notified: 1,
        },
      }),
    },
    { role: 'technical_support_staff' },
  );
  show('/support/catalogue/eq1/unavailable');
  await fill({ from: '2030-12-01', to: '2030-12-05', reason: 'Sensor repair' });
  fireEvent.click(screen.getByRole('button', { name: 'Mark unavailable' }));
  expect(await screen.findByText('1 of 2 Coordinators notified. The others have no active assigned Coordinator.')).toBeInTheDocument();
  expect(screen.getByText('EVT-A Conference: 2 reserved')).toBeInTheDocument();
  expect(screen.getByText('Charity Run: 1 reserved')).toBeInTheDocument();
});

test('E07-S05 the helpers count the peak of overlapping periods and write dates the way the screens do', () => {
  const periods = [
    { ...period, id: 'a', quantity: 1, from: '2030-12-01', to: '2030-12-05' },
    { ...period, id: 'b', quantity: 2, from: '2030-12-04', to: '2030-12-08' },
    { ...period, id: 'c', quantity: 1, from: '2030-12-10', to: '2030-12-10' },
  ];
  expect(inServiceFor(4, periods, '2030-12-01', '2030-12-03')).toBe(3);
  expect(inServiceFor(4, periods, '2030-12-01', '2030-12-08')).toBe(1);
  expect(inServiceFor(4, periods, '2030-12-06', '2030-12-09')).toBe(2);
  expect(inServiceFor(4, periods, '2030-12-09', '2030-12-09')).toBe(4);
  expect(inServiceFor(2, [{ ...period, quantity: 5 }], '2030-12-01', '2030-12-01')).toBe(0);
  expect(formatDays('2030-12-01', '2030-12-01')).toBe('1 Dec 2030');
  expect(formatDays('2030-09-30', '2030-10-01')).toBe('30 Sept 2030 – 1 Oct 2030');
  // Late on 12 Oct in Singapore is still the 12th there.
  const late = new Date('2026-10-12T15:30:00Z');
  expect(today(late)).toBe('2026-10-12');
  const values = { from: '2026-10-01', to: '2026-10-12', quantity: '1', reason: 'Repair' };
  expect(validate(values, 4, late)).toEqual({});
  expect(validate({ ...values, to: '2026-10-11' }, 4, late)).toEqual({ to: 'The end date must be today or later.' });
  expect(validate({ ...values, reason: 'x'.repeat(256) }, 4, late)).toEqual({ reason: 'Reason must be at most 255 characters.' });
  expect(validate({ ...values, quantity: '2' }, 1, late)).toEqual({ quantity: 'Only 1 unit is in service for these dates.' });
  expect(validate({ ...values, quantity: '1' }, 0, late)).toEqual({ quantity: 'No units are in service for these dates.' });
});

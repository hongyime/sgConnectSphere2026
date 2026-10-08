// E07-S04 (SCRUM-54) screen tests: reserving, changing and releasing on the
// event equipment page, against a fake API shaped like the real one.
import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { EquipmentRequests } from './EquipmentRequests';
import { EquipmentReservationFormPage, freeSentence } from './EquipmentReservations';
import { deferred, stubApi, type FakeReply } from '../../testing/fakeApi';

const event = {
  id: 'event-a',
  eventCode: 'EVT-A',
  title: 'Conference',
  status: 'planning',
  startsAt: '2026-10-15T01:00:00.000Z',
  endsAt: '2026-10-15T09:00:00.000Z',
};
const line = {
  id: 'req1',
  equipmentId: 'eq1',
  name: 'Wireless Microphone',
  quantity: 2,
  notes: '',
  totalStock: 10,
  operationalStatus: 'available',
  isActive: true,
  reserved: false,
  reservation: null as null | { id: string; status: 'reserved' | 'partial' | 'released'; quantityReserved: number; requiresReconfirmation: boolean },
  freeQuantity: 5 as number | null,
};
const endpoint = '/api/equipment?mode=requests&event=EVT-A';
const detail = (lines: (typeof line)[], extra: Record<string, unknown> = {}) => ({
  body: { event, requests: lines, equipment: [], canEdit: false, canReserve: true, canRelease: true, ...extra },
});
const outcome = (status: 'reserved' | 'partial' | 'released', reserved: number, requested: number, extra: Record<string, unknown> = {}) => ({
  changed: true,
  notified: 1,
  event: { eventCode: 'EVT-A', title: 'Conference', startsAt: event.startsAt, endsAt: event.endsAt },
  reservation: { id: 'res1', requestId: 'req1', name: line.name, status, quantityReserved: reserved, quantityRequested: requested, outstanding: Math.max(0, requested - reserved) },
  ...extra,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function show(path: string, strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/support/events/:eventCode/equipment" element={<EquipmentRequests />} />
        <Route path="/coordinator/events/:eventCode/equipment" element={<EquipmentRequests />} />
        <Route path="/support/events/:eventCode/equipment/:requestId/reserve" element={<><EquipmentReservationFormPage /><Link to="/support/events/EVT-B/equipment/reqB/reserve">Other event</Link></>} />
      </Routes>
    </MemoryRouter>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

test('TC_E07S04_01 - Technical Support reserves the requested quantity and sees the event, date, time, item and quantity', async () => {
  let reserved = false;
  const calls = stubApi({
    [`GET ${endpoint}`]: () => detail([reserved ? { ...line, reserved: true, reservation: { id: 'res1', status: 'reserved', quantityReserved: 2, requiresReconfirmation: false } } : line]),
    [`POST ${endpoint}`]: () => { reserved = true; return { status: 201, body: outcome('reserved', 2, 2) }; },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment');
  expect(await screen.findByText(/Reserve each request from the units free for this event's dates, 15 Oct 2026, 9:00 am – 5:00 pm/)).toBeInTheDocument();
  expect(screen.getByText('Not reserved')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('link', { name: 'Reserve Wireless Microphone' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Reserve equipment' })).toBeInTheDocument();
  expect(screen.getByText('Free for these dates').nextSibling).toHaveTextContent('5');
  expect(screen.getByText('Event dates').nextSibling).toHaveTextContent('15 Oct 2026, 9:00 am – 5:00 pm');
  const quantity = screen.getByLabelText('Quantity to reserve');
  expect(quantity).toHaveValue(2);
  expect(screen.getByText('From 1 to 2. Reserving fewer than the 2 requested records a partial reservation.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reserve equipment' }));
  const saved = await screen.findByText('Wireless Microphone × 2 reserved for EVT-A Conference, 15 Oct 2026, 9:00 am – 5:00 pm.');
  expect(saved.closest('[role="status"]')).toHaveTextContent('Reserved');
  expect(screen.getByText('The Coordinator has been notified.')).toBeInTheDocument();
  expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ action: 'reserve', requestId: 'req1', quantity: 2 });
  expect(await screen.findByText('Reserved', { selector: '.status-pill' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Change Wireless Microphone reservation' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Release Wireless Microphone…' })).toBeInTheDocument();
});

test('TC_E07S04_02 - a partial reservation shows Partial and the outstanding quantity', async () => {
  let reserved = false;
  const partialLine = { ...line, quantity: 3, freeQuantity: 2 };
  stubApi({
    [`GET ${endpoint}`]: () => detail([reserved ? { ...partialLine, reserved: true, reservation: { id: 'res1', status: 'partial', quantityReserved: 2, requiresReconfirmation: false } } : partialLine]),
    [`POST ${endpoint}`]: () => { reserved = true; return { status: 201, body: outcome('partial', 2, 3) }; },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment/req1/reserve');
  const quantity = await screen.findByLabelText('Quantity to reserve');
  expect(quantity).toHaveValue(2);
  fireEvent.click(screen.getByRole('button', { name: 'Reserve equipment' }));
  expect(await screen.findByText('Wireless Microphone × 2 of 3 reserved for EVT-A Conference, 15 Oct 2026, 9:00 am – 5:00 pm. 1 still outstanding.')).toBeInTheDocument();
  expect(screen.getByText('Partly reserved')).toBeInTheDocument();
  expect(await screen.findByText('Partial: 2 of 3 reserved')).toBeInTheDocument();
});

test('TC_E07S04_02 - quantities above the free or requested number are refused with the API sentence', async () => {
  const calls = stubApi({
    [`GET ${endpoint}`]: detail([{ ...line, quantity: 5, freeQuantity: 4 }]),
    [`POST ${endpoint}`]: {
      status: 409,
      body: { error: 'not_enough_free', message: freeSentence(3), errors: { quantity: [freeSentence(3)] }, freeQuantity: 3 },
    },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment/req1/reserve');
  const quantity = await screen.findByLabelText('Quantity to reserve');
  const submit = screen.getByRole('button', { name: 'Reserve equipment' });
  for (const [value, message] of [
    ['5', "Only 4 are free for this event's dates."],
    ['6', 'You can reserve at most the 5 requested.'],
    ['0', 'Enter a whole number greater than 0.'],
    ['1.5', 'Enter a whole number greater than 0.'],
  ]) {
    fireEvent.change(quantity, { target: { value } });
    fireEvent.click(submit);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Fix the highlighted fields, then save again.');
  }
  expect(calls.some((call) => call.method === 'POST')).toBe(false);
  // The server has the final say: another reservation took a unit meanwhile.
  fireEvent.change(quantity, { target: { value: '4' } });
  fireEvent.click(submit);
  await waitFor(() => expect(screen.getAllByText("Only 3 are free for this event's dates.")).toHaveLength(2));
  expect(quantity).toHaveAttribute('aria-invalid', 'true');
});

test('TC_E07S04_04 - releasing asks for confirmation, then shows the units returned to the pool', async () => {
  let released = false;
  let refuse = true;
  const calls = stubApi({
    [`GET ${endpoint}`]: () => detail([{ ...line, reserved: true, reservation: { id: 'res1', status: released ? 'released' : 'reserved', quantityReserved: 2, requiresReconfirmation: false } }]),
    [`POST ${endpoint}`]: (): FakeReply => {
      if (refuse) { refuse = false; return { status: 409, body: { error: "This event is confirmed, so its equipment reservations can't be changed here." } }; }
      released = true;
      return { body: outcome('released', 2, 2, { notified: 0 }) };
    },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment');
  fireEvent.click(await screen.findByRole('button', { name: 'Release Wireless Microphone…' }));
  const panel = screen.getByRole('form', { name: 'Release Wireless Microphone?' });
  expect(panel).toHaveTextContent("The 2 reserved units go back to the available pool for this event's dates. The request stays on the event and can be reserved again.");
  fireEvent.click(within(panel).getByRole('button', { name: 'Release reservation' }));
  expect(await within(panel).findByRole('alert')).toHaveTextContent("This event is confirmed, so its equipment reservations can't be changed here.");
  fireEvent.click(within(panel).getByRole('button', { name: 'Release reservation' }));
  expect(await screen.findByText('Wireless Microphone × 2 returned to the available pool for EVT-A Conference, 15 Oct 2026, 9:00 am – 5:00 pm.')).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Release Wireless Microphone?' })).not.toBeInTheDocument();
  expect(calls.filter((call) => call.method === 'POST').at(-1)?.body).toEqual({ action: 'releaseReservation', reservationId: 'res1' });
  expect(await screen.findByText('Released', { selector: '.status-pill' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Reserve Wireless Microphone' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Release Wireless Microphone…' })).not.toBeInTheDocument();
});

test('E07-S04 - changing a reservation starts at the reserved quantity, shows Needs review and saves the new quantity', async () => {
  let changed = false;
  const calls = stubApi({
    [`GET ${endpoint}`]: () => detail([{ ...line, quantity: 3, freeQuantity: 3, reserved: true, reservation: { id: 'res1', status: changed ? 'reserved' : 'partial', quantityReserved: changed ? 3 : 2, requiresReconfirmation: !changed } }]),
    [`POST ${endpoint}`]: () => { changed = true; return { body: outcome('reserved', 3, 3) }; },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment');
  expect(await screen.findByText('Needs review')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Change Wireless Microphone reservation' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Change reservation' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent("This item's stock or status changed after it was reserved.");
  expect(screen.getByText('Reserved now').nextSibling).toHaveTextContent('2 (partial)');
  expect(screen.getByLabelText('Quantity to reserve')).toHaveValue(2);
  fireEvent.change(screen.getByLabelText('Quantity to reserve'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reservation' }));
  expect(await screen.findByText('Reservation changed')).toBeInTheDocument();
  expect(calls.find((call) => call.method === 'POST')?.body).toEqual({ action: 'changeReservation', reservationId: 'res1', quantity: 3 });
  await waitFor(() => expect(screen.queryByText('Needs review')).not.toBeInTheDocument());
});

test('E07-S04 - saving an unchanged reservation says there is nothing to save', async () => {
  stubApi({
    [`GET ${endpoint}`]: detail([{ ...line, reserved: true, reservation: { id: 'res1', status: 'reserved', quantityReserved: 2, requiresReconfirmation: false } }]),
    [`POST ${endpoint}`]: { body: { ...outcome('reserved', 2, 2), changed: false, notified: 0 } },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment/req1/reserve');
  fireEvent.click(await screen.findByRole('button', { name: 'Save reservation' }));
  expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
});

test('E07-S04 - the Coordinator sees each line state and no reservation actions', async () => {
  stubApi({
    'GET /api/equipment?mode=requests&event=EVT-A': detail([
      { ...line, id: 'r1', name: 'Cables', freeQuantity: null },
      { ...line, id: 'r2', name: 'Lectern', reserved: true, freeQuantity: null, reservation: { id: 'x2', status: 'reserved', quantityReserved: 2, requiresReconfirmation: false } },
      { ...line, id: 'r3', name: 'Projector', quantity: 3, reserved: true, freeQuantity: null, reservation: { id: 'x3', status: 'partial', quantityReserved: 1, requiresReconfirmation: true } },
      { ...line, id: 'r4', name: 'Speaker', reserved: true, freeQuantity: null, reservation: { id: 'x4', status: 'released', quantityReserved: 2, requiresReconfirmation: true } },
    ], { canEdit: true, canReserve: false, canRelease: false }),
  }, { role: 'event_coordinator' });
  show('/coordinator/events/EVT-A/equipment');
  const rows = await screen.findAllByRole('row');
  const text = (name: string) => rows.find((row) => row.textContent?.includes(name))?.textContent ?? '';
  expect(text('Cables')).toContain('Not reserved');
  expect(text('Lectern')).toContain('Reserved');
  expect(text('Projector')).toContain('Partial: 1 of 3 reserved');
  expect(text('Projector')).toContain('Needs review');
  expect(text('Speaker')).toContain('Released');
  expect(text('Speaker')).not.toContain('Needs review');
  expect(screen.queryByRole('link', { name: /^Reserve / })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Release / })).not.toBeInTheDocument();
});

test('E07-S04 - confirmed events offer no reservation actions and cancelled events offer release only', async () => {
  stubApi({
    [`GET ${endpoint}`]: detail([line], { event: { ...event, status: 'confirmed' }, canReserve: false, canRelease: false }),
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment');
  expect(await screen.findByText("This event is confirmed, so its equipment reservations can't be changed here.")).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Reserve Wireless Microphone' })).not.toBeInTheDocument();
  cleanup();
  vi.unstubAllGlobals();
  stubApi({
    [`GET ${endpoint}`]: detail([
      { ...line, reserved: true, reservation: { id: 'res1', status: 'reserved', quantityReserved: 2, requiresReconfirmation: false } },
      { ...line, id: 'req2', name: 'Lectern' },
    ], { event: { ...event, status: 'cancelled' }, canReserve: false, canRelease: true }),
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment');
  expect(await screen.findByText('This event is cancelled. Release its reservations to return the units to the available pool.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Release Wireless Microphone…' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Reserve|Change/ })).not.toBeInTheDocument();
  expect(screen.getByText('Nothing to release')).toBeInTheDocument();
});

test('E07-S04 - the reserve form explains why a line cannot be reserved', async () => {
  for (const [body, path, message] of [
    [detail([line], { event: { ...event, status: 'confirmed' }, canReserve: false, canRelease: false }), 'req1', "This event is confirmed, so its equipment reservations can't be changed here."],
    [detail([line], { event: { ...event, status: 'submitted' }, canReserve: false, canRelease: false }), 'req1', 'Equipment can only be reserved while the event is approved or planning.'],
    [detail([{ ...line, isActive: false, freeQuantity: null }]), 'req1', "This equipment has been retired, so it can't be reserved."],
    [detail([line]), 'missing', 'Equipment request not found for this event.'],
  ] as const) {
    stubApi({ [`GET ${endpoint}`]: body }, { role: 'technical_support_staff' });
    show(`/support/events/EVT-A/equipment/${path}/reserve`);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByLabelText('Quantity to reserve')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to event equipment' })).toHaveAttribute('href', '/support/events/EVT-A/equipment');
    cleanup();
    vi.unstubAllGlobals();
  }
});

test('E07-S04 - with nothing free the form warns before the round trip', async () => {
  const calls = stubApi({ [`GET ${endpoint}`]: detail([{ ...line, freeQuantity: 0 }]) }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment/req1/reserve');
  expect(await screen.findByText("None are free for this event's dates.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reserve equipment' }));
  expect(await screen.findAllByText("None are free for this event's dates.")).toHaveLength(2);
  expect(calls.some((call) => call.method === 'POST')).toBe(false);
});

test('E07-S04 - the reserve form works inside StrictMode and keeps the reply', async () => {
  stubApi({
    [`GET ${endpoint}`]: detail([line]),
    [`POST ${endpoint}`]: { status: 201, body: { ...outcome('reserved', 2, 2), notified: 0 } },
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment/req1/reserve', true);
  fireEvent.click(await screen.findByRole('button', { name: 'Reserve equipment' }));
  expect(await screen.findByText('No Coordinator was notified: this event has no active assigned Coordinator.')).toBeInTheDocument();
});

test('E07-S04 - a late answer for the previous event never replaces the current reserve form', async () => {
  const first = deferred<FakeReply>();
  stubApi({
    [`GET ${endpoint}`]: () => first.promise,
    'GET /api/equipment?mode=requests&event=EVT-B': detail([{ ...line, id: 'reqB', name: 'Lectern' }], { event: { ...event, id: 'event-b', eventCode: 'EVT-B', title: 'Gala' } }),
  }, { role: 'technical_support_staff' });
  show('/support/events/EVT-A/equipment/req1/reserve');
  fireEvent.click(await screen.findByRole('link', { name: 'Other event' }));
  expect(await screen.findByRole('heading', { level: 2, name: 'Lectern' })).toBeInTheDocument();
  first.resolve(detail([line]));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(screen.getByRole('heading', { level: 2, name: 'Lectern' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { level: 2, name: 'Wireless Microphone' })).not.toBeInTheDocument();
});

import { afterEach, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import {
  EquipmentRequestEvents,
  EquipmentRequests,
  EquipmentRequestFormPage,
} from './EquipmentRequests';
import * as requestApi from './equipmentRequestApi';
import { stubApi, deferred } from '../../testing/fakeApi';
const event = {
  id: 'event-a',
  eventCode: 'EVT-A',
  title: 'Conference',
  status: 'planning',
};
const equipment = [
  {
    id: 'eq1',
    name: 'Microphone',
    category: 'Audio',
    total_quantity: 10,
    operational_status: 'available',
  },
];
const row = {
  id: 'req1',
  equipmentId: 'eq1',
  name: 'Microphone',
  quantity: 2,
  notes: 'Handheld',
  totalStock: 10,
  operationalStatus: 'available',
  isActive: true,
  reserved: false,
};
const endpoint = '/api/equipment?mode=requests&event=EVT-A';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function show(path = '/coordinator/events/EVT-A/equipment') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/equipment"
          element={<EquipmentRequests />}
        />
        <Route
          path="/coordinator/events/:eventCode/equipment/new"
          element={<EquipmentRequestFormPage />}
        />
        <Route
          path="/coordinator/events/:eventCode/equipment/:requestId/edit"
          element={<EquipmentRequestFormPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
test('request form saves event-scoped quantity and displays total-stock warning without losing requirement', async () => {
  let saved = false;
  const calls = stubApi(
    {
      [`GET ${endpoint}`]: () => ({
        body: {
          event,
          equipment,
          requests: saved ? [{ ...row, quantity: 15 }] : [],
          canEdit: true,
        },
      }),
      [`POST ${endpoint}`]: () => {
        saved = true;
        return {
          status: 201,
          body: {
            requestId: 'req1',
            changed: true,
            notified: 1,
            warning: { name: 'Microphone', requested: 15, totalStock: 10 },
          },
        };
      },
    },
    { role: 'event_coordinator' },
  );
  show();
  fireEvent.click(
    await screen.findByRole('link', { name: 'Add equipment request' }),
  );
  fireEvent.change(await screen.findByLabelText('Equipment item'), {
    target: { value: 'eq1' },
  });
  fireEvent.change(screen.getByLabelText('Quantity requested'), {
    target: { value: '15' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save equipment request' }),
  );
  expect(
    await screen.findByText(/15 units requested, but total stock is 10/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Technical Support Staff notified/),
  ).toBeInTheDocument();
  expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
    equipmentId: 'eq1',
    quantity: 15,
    action: 'saveRequest',
  });
});
test('request removal requires confirmation and reports failure while retaining the row', async () => {
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: { event, equipment, requests: [row], canEdit: true },
      },
      [`POST ${endpoint}`]: {
        status: 409,
        body: {
          error:
            'This request has been reserved and cannot be amended or removed here.',
        },
      },
    },
    { role: 'event_coordinator' },
  );
  show();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Remove Microphone…' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
  expect(
    await screen.findByText(
      'This request has been reserved and cannot be amended or removed here.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Edit Microphone' }),
  ).toBeInTheDocument();
});
test('reserved and read-only requests expose no editing form', async () => {
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: {
          event,
          equipment,
          requests: [{ ...row, reserved: true }],
          canEdit: true,
        },
      },
    },
    { role: 'event_coordinator' },
  );
  show('/coordinator/events/EVT-A/equipment/req1/edit');
  expect(
    await screen.findByText(
      'This request has been reserved and cannot be amended or removed here.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Save equipment request' }),
  ).not.toBeInTheDocument();
});
test('Technical Support has read-only event requirements', async () => {
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: { event, equipment, requests: [row], canEdit: false },
      },
    },
    { role: 'technical_support_staff' },
  );
  show();
  await screen.findByText('Microphone');
  expect(
    screen.queryByRole('link', { name: 'Add equipment request' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Remove Microphone…' }),
  ).not.toBeInTheDocument();
});
test('request form associates server quantity errors and retains entered values', async () => {
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: { event, equipment, requests: [], canEdit: true },
      },
      [`POST ${endpoint}`]: {
        status: 400,
        body: {
          error: 'validation_failed',
          errors: { quantity: ['Enter a whole number.'] },
        },
      },
    },
    { role: 'event_coordinator' },
  );
  show('/coordinator/events/EVT-A/equipment/new');
  fireEvent.change(await screen.findByLabelText('Equipment item'), {
    target: { value: 'eq1' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save equipment request' }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText('Quantity requested')).toHaveAttribute(
      'aria-invalid',
      'true',
    ),
  );
  expect(screen.getByLabelText('Equipment item')).toHaveValue('eq1');
});
test('late event response cannot overwrite the next equipment request form', async () => {
  const pending = deferred<{ body: unknown }>();
  stubApi(
    {
      [`GET ${endpoint}`]: () => pending.promise,
      'GET /api/equipment?mode=requests&event=EVT-B': {
        body: {
          event: { ...event, eventCode: 'EVT-B', title: 'Charity Run' },
          equipment,
          requests: [],
          canEdit: true,
        },
      },
    },
    { role: 'event_coordinator' },
  );
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-A/equipment/new']}>
      <Link to="/coordinator/events/EVT-B/equipment/new">Next event</Link>
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/equipment/new"
          element={<EquipmentRequestFormPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('link', { name: 'Next event' }));
  await screen.findByText('Charity Run');
  pending.resolve({ body: { event, equipment, requests: [], canEdit: true } });
  await waitFor(() =>
    expect(screen.queryByText('Conference')).not.toBeInTheDocument(),
  );
});

test('equipment request load failure offers retry and then the empty state', async () => {
  let fail = true;
  stubApi(
    {
      [`GET ${endpoint}`]: () =>
        fail
          ? {
              status: 503,
              body: { error: 'Service unavailable. Please try again.' },
            }
          : { body: { event, equipment, requests: [], canEdit: true } },
    },
    { role: 'event_coordinator' },
  );
  show();
  await screen.findByText('Service unavailable. Please try again.');
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('No equipment requested yet'),
  ).toBeInTheDocument();
});

test('unexpected removal error releases the confirm button and allows retry', async () => {
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: { event, equipment, requests: [row], canEdit: true },
      },
    },
    { role: 'event_coordinator' },
  );
  const remove = vi
    .spyOn(requestApi, 'removeRequest')
    .mockRejectedValueOnce(new Error('Unexpected failure'))
    .mockResolvedValueOnce({ ok: true, data: { removed: true, notified: 1 } });
  show();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Remove Microphone…' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
  await screen.findByText(
    'The equipment request could not be removed. Please try again.',
  );
  expect(screen.getByRole('button', { name: 'Confirm removal' })).toBeEnabled();
  expect(
    screen.getByRole('link', { name: 'Edit Microphone' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
  await screen.findByText('Equipment request removed.');
  expect(remove).toHaveBeenCalledTimes(2);
});

test.each(['event_coordinator', 'technical_support_staff'])(
  'event selector lists requirements with role-specific links for %s',
  async (role) => {
    stubApi(
      {
        'GET /api/equipment?mode=requests': {
          body: {
            events: [
              { ...event, requestCount: 2 },
              {
                ...event,
                id: 'event-b',
                eventCode: null,
                title: 'No code event',
              },
            ],
          },
        },
      },
      { role },
    );
    render(
      <MemoryRouter>
        <EquipmentRequestEvents />
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'EVT-A' });
    const prefix =
      role === 'technical_support_staff' ? '/support' : '/coordinator';
    await waitFor(() =>
      expect(link).toHaveAttribute('href', `${prefix}/events/EVT-A/equipment`),
    );
    expect(screen.getByRole('link', { name: 'No code event' })).toHaveAttribute(
      'href',
      `${prefix}/events/event-b/equipment`,
    );
    expect(screen.getByRole('table')).toHaveTextContent('2');
  },
);

test.each(['event_coordinator', 'technical_support_staff'])(
  'empty event selector explains next steps for %s',
  async (role) => {
    stubApi(
      { 'GET /api/equipment?mode=requests': { body: { events: [] } } },
      { role },
    );
    render(
      <MemoryRouter>
        <EquipmentRequestEvents />
      </MemoryRouter>,
    );
    await screen.findByText('No events to show');
    await screen.findByText(
      role === 'technical_support_staff'
        ? 'Events with equipment requests will appear here.'
        : 'Your approved events will appear here when they are ready for planning.',
    );
  },
);

test('event selector retries failed loading', async () => {
  let failed = true;
  stubApi(
    {
      'GET /api/equipment?mode=requests': () =>
        failed
          ? {
              status: 503,
              body: { error: 'Service unavailable. Please try again.' },
            }
          : { body: { events: [event] } },
    },
    { role: 'event_coordinator' },
  );
  render(
    <MemoryRouter>
      <EquipmentRequestEvents />
    </MemoryRouter>,
  );
  await screen.findByText('Service unavailable. Please try again.');
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: 'EVT-A' });
});

test.each([false, true])(
  'missing request and unauthorized edit are refused (canEdit=%s)',
  async (canEdit) => {
    stubApi(
      {
        [`GET ${endpoint}`]: {
          body: { event, equipment, requests: [], canEdit },
        },
      },
      { role: 'event_coordinator' },
    );
    show('/coordinator/events/EVT-A/equipment/req1/edit');
    await screen.findByText(
      canEdit
        ? 'Equipment request not found for this event.'
        : 'Only the assigned Coordinator can change requests while this event is approved or planning.',
    );
    expect(
      screen.queryByRole('button', { name: 'Save equipment request' }),
    ).not.toBeInTheDocument();
  },
);

test('retired item remains visible in edit form and empty catalogue prevents saving', async () => {
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: {
          event,
          equipment: [],
          requests: [{ ...row, isActive: false }],
          canEdit: true,
        },
      },
    },
    { role: 'event_coordinator' },
  );
  show('/coordinator/events/EVT-A/equipment/req1/edit');
  await screen.findByRole('option', { name: 'Microphone (retired)' });
  expect(
    screen.getByRole('button', { name: 'Save equipment request' }),
  ).toBeDisabled();
  expect(
    screen.getByText(/No active equipment is available/),
  ).toBeInTheDocument();
});

test.each([false, true])(
  'maintenance and reserved rows preserve visible history without mutation controls (active=%s)',
  async (isActive) => {
    stubApi(
      {
        [`GET ${endpoint}`]: {
          body: {
            event,
            equipment,
            requests: [
              {
                ...row,
                operationalStatus: 'maintenance',
                reserved: true,
                isActive,
                notes: '',
              },
            ],
            canEdit: true,
          },
        },
      },
      { role: 'event_coordinator' },
    );
    show();
    await screen.findByText('Reserved requests are protected');
    expect(
      screen.queryByRole('link', { name: 'Edit Microphone' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove Microphone…' }),
    ).not.toBeInTheDocument();
  },
);

test('canceling removal preserves the requirement without a mutation', async () => {
  const calls = stubApi(
    {
      [`GET ${endpoint}`]: {
        body: { event, equipment, requests: [row], canEdit: true },
      },
    },
    { role: 'event_coordinator' },
  );
  show();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Remove Microphone…' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(
    screen.queryByRole('button', { name: 'Confirm removal' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Edit Microphone' }),
  ).toBeInTheDocument();
  expect(calls.some((call) => call.method === 'POST')).toBe(false);
});

test.each([true, false])(
  'edit acknowledgement distinguishes save from no-op (changed=%s)',
  async (changed) => {
    const calls = stubApi(
      {
        [`GET ${endpoint}`]: {
          body: {
            event,
            equipment: [{ ...equipment[0], operational_status: 'maintenance' }],
            requests: [row],
            canEdit: true,
          },
        },
        [`POST ${endpoint}`]: {
          body: { requestId: row.id, changed, notified: 0, warning: null },
        },
      },
      { role: 'event_coordinator' },
    );
    show('/coordinator/events/EVT-A/equipment/req1/edit');
    const notes = await screen.findByLabelText('Technical notes');
    expect(
      screen.getByText(/This item is under maintenance/),
    ).toBeInTheDocument();
    fireEvent.change(notes, { target: { value: 'Updated note' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save equipment request' }),
    );
    await screen.findByText(
      changed ? 'Equipment request saved.' : 'No changes to save.',
    );
    if (changed)
      expect(
        screen.getByText(/No active Technical Support Staff accounts/),
      ).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
      id: row.id,
      notes: 'Updated note',
    });
  },
);

test('form load failure retries and save failure without field errors retains input', async () => {
  let fail = true;
  stubApi(
    {
      [`GET ${endpoint}`]: () =>
        fail
          ? {
              status: 503,
              body: { error: 'Service unavailable. Please try again.' },
            }
          : { body: { event, equipment, requests: [], canEdit: true } },
      [`POST ${endpoint}`]: {
        status: 503,
        body: { error: 'The request could not be saved.' },
      },
    },
    { role: 'event_coordinator' },
  );
  show('/coordinator/events/EVT-A/equipment/new');
  await screen.findByText('Service unavailable. Please try again.');
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.change(await screen.findByLabelText('Equipment item'), {
    target: { value: 'eq1' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save equipment request' }),
  );
  await screen.findByText('The request could not be saved.');
  expect(screen.getByLabelText('Equipment item')).toHaveValue('eq1');
  expect(
    screen.getByRole('button', { name: 'Save equipment request' }),
  ).toBeEnabled();
});

test('a save completing after leaving the form does not navigate back', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof requestApi.saveRequest>>>();
  stubApi(
    {
      [`GET ${endpoint}`]: {
        body: { event, equipment, requests: [], canEdit: true },
      },
    },
    { role: 'event_coordinator' },
  );
  vi.spyOn(requestApi, 'saveRequest').mockReturnValue(pending.promise);
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-A/equipment/new']}>
      <Link to="/other">Leave form</Link>
      <Routes>
        <Route
          path="/coordinator/events/:eventCode/equipment/new"
          element={<EquipmentRequestFormPage />}
        />
        <Route path="/other" element={<h1>Other page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText('Equipment item'), {
    target: { value: 'eq1' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save equipment request' }),
  );
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('link', { name: 'Leave form' }));
  pending.resolve({
    ok: true,
    data: { requestId: row.id, changed: true, notified: 1, warning: null },
  });
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Other page' }),
    ).toBeInTheDocument(),
  );
});

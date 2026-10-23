import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueInventory } from './Venue';
import { VenueForm, validateBufferMinutes } from './VenueForm';
import { MAX_BUFFER_MINUTES, type Venue } from './venueApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function baseVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1', name: 'Riverside Hall', location: 'Central', max_capacity: 120,
    opens_at: '08:00', closes_at: '22:00', facilities: ['Projector'],
    accessibility_features: ['Wheelchair access'],
    supported_layouts: [{ label: 'Theatre', capacity: 120 }],
    setup_time_minutes: 0, turnaround_time_minutes: 0,
    ...overrides,
  };
}

function installVenueApi(initial = baseVenue()) {
  let storedVenue = initial;
  const requests: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init?.method ?? 'GET';
    let body: Record<string, unknown> | undefined;
    if (typeof init?.body === 'string') body = JSON.parse(init.body) as Record<string, unknown>;
    requests.push({ method, url: `${url.pathname}${url.search}`, body });

    if (method === 'POST') {
      storedVenue = { ...storedVenue, ...body } as Venue;
      return new Response(JSON.stringify({ venue: storedVenue, bufferConflicts: [] }), { status: 200 });
    }
    if (url.searchParams.has('id')) {
      return new Response(JSON.stringify({ venue: storedVenue }), { status: 200 });
    }
    return new Response(JSON.stringify({ venues: [storedVenue] }), { status: 200 });
  }));
  return { requests };
}

function renderEditVenue() {
  return render(
    <MemoryRouter initialEntries={['/venue/inventory/venue-1/edit']}>
      <Routes>
        <Route path="/venue/inventory/:venueId/edit" element={<VenueForm mode="edit" />} />
        <Route path="/venue/inventory" element={<VenueInventory />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('TC_E05S05_01: staff save buffer values and see them on the venue inventory detail', async () => {
  const { requests } = installVenueApi();
  renderEditVenue();

  const setup = await screen.findByLabelText('Setup time');
  const turnaround = screen.getByLabelText('Turnaround time');
  expect(setup).toHaveValue(0);
  expect(turnaround).toHaveValue(0);
  expect(setup).toHaveAttribute('min', '0');
  expect(setup).toHaveAttribute('max', String(MAX_BUFFER_MINUTES));
  expect(setup).toHaveAttribute('step', '1');

  fireEvent.change(setup, { target: { value: '30' } });
  fireEvent.change(turnaround, { target: { value: '45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  await screen.findByRole('heading', { name: 'Venue inventory' });
  expect(await screen.findByText('30 minutes')).toBeInTheDocument();
  expect(screen.getByText('45 minutes')).toBeInTheDocument();
  const save = requests.find((request) => request.method === 'POST')?.body;
  expect(save).toMatchObject({
    action: 'update', id: 'venue-1', setup_time_minutes: 30, turnaround_time_minutes: 45,
  });
});

test('TC_E05S05_01: new buffer controls default to zero and inventory displays legacy zero values', async () => {
  const { requests } = installVenueApi(baseVenue());
  render(
    <MemoryRouter initialEntries={['/venue/inventory/new']}>
      <Routes>
        <Route path="/venue/inventory/new" element={<VenueForm mode="create" />} />
        <Route path="/venue/inventory" element={<VenueInventory />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText('Setup time')).toHaveValue(0);
  expect(screen.getByLabelText('Turnaround time')).toHaveValue(0);
  expect(validateBufferMinutes('0', 'Setup time')).toBeUndefined();
  expect(validateBufferMinutes(String(MAX_BUFFER_MINUTES), 'Setup time')).toBeUndefined();
  expect(validateBufferMinutes('', 'Setup time')).toContain('whole minutes');
  expect(validateBufferMinutes('-1', 'Setup time')).toContain('whole minutes');
  expect(validateBufferMinutes('1.5', 'Setup time')).toContain('whole minutes');
  expect(validateBufferMinutes(String(MAX_BUFFER_MINUTES + 1), 'Setup time')).toContain('whole minutes');
  expect(validateBufferMinutes('9007199254740992', 'Setup time')).toContain('whole minutes');

  fireEvent.click(screen.getByRole('link', { name: 'Cancel' }));
  await screen.findByRole('heading', { name: 'Venue inventory' });
  expect(screen.getAllByText('0 minutes')).toHaveLength(2);
  expect(requests.some((request) => request.url === '/api/venues?q=')).toBe(true);
});

test('TC_E05S05_01: Venue Staff create a venue with both buffers and see the saved values in inventory', async () => {
  const { requests } = installVenueApi();
  render(
    <MemoryRouter initialEntries={['/venue/inventory/new']}>
      <Routes>
        <Route path="/venue/inventory/new" element={<VenueForm mode="create" />} />
        <Route path="/venue/inventory" element={<VenueInventory />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByLabelText('Setup time');
  fireEvent.change(screen.getByLabelText('Venue name'), { target: { value: 'New Training Hall' } });
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'North wing' } });
  fireEvent.change(screen.getByLabelText('Max capacity'), { target: { value: '80' } });
  fireEvent.change(screen.getByLabelText('Opens at'), { target: { value: '08:00' } });
  fireEvent.change(screen.getByLabelText('Closes at'), { target: { value: '22:00' } });

  fireEvent.change(screen.getByLabelText('Facilities'), { target: { value: 'Projector' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]!);
  fireEvent.change(screen.getByLabelText('Accessibility features'), { target: { value: 'Wheelchair access' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[1]!);
  fireEvent.change(screen.getByLabelText('Layout name'), { target: { value: 'Theatre' } });
  fireEvent.change(screen.getByLabelText('Layout capacity'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add layout' }));
  fireEvent.change(screen.getByLabelText('Setup time'), { target: { value: '15' } });
  fireEvent.change(screen.getByLabelText('Turnaround time'), { target: { value: '25' } });

  fireEvent.click(screen.getByRole('button', { name: 'Add venue' }));
  await screen.findByRole('heading', { name: 'Venue inventory' });
  expect(await screen.findByText('15 minutes')).toBeInTheDocument();
  expect(screen.getByText('25 minutes')).toBeInTheDocument();
  expect(requests.find((request) => request.method === 'POST')?.body).toMatchObject({
    action: 'create', setup_time_minutes: 15, turnaround_time_minutes: 25,
  });
});

test.each([
  ['Setup time', '-1'],
  ['Turnaround time', '1.5'],
  ['Setup time', String(MAX_BUFFER_MINUTES + 1)],
  ['Turnaround time', ''],
])('invalid %s buffer value %s is explained and not submitted', async (label, value) => {
  const { requests } = installVenueApi();
  renderEditVenue();

  const input = await screen.findByLabelText(label);
  fireEvent.change(input, { target: { value } });
  expect(screen.getByText(`${label} must be whole minutes between 0 and ${MAX_BUFFER_MINUTES}.`)).toBeInTheDocument();
  expect(input).toHaveAttribute('aria-invalid', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(requests.some((request) => request.method === 'POST')).toBe(false));
});

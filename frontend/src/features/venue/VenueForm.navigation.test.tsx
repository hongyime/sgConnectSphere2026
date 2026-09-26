// Late-response guard for the venue edit form (/venue/inventory/:venueId/edit).
// MemoryRouter keeps VenueForm mounted between venue URLs, so venue A's slow
// load must never land on venue B's form, and B's URL must not show A's data.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueForm } from './VenueForm';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function venue(id: string, name: string) {
  return { id, name, location: `${name} location`, max_capacity: 100, opens_at: '08:00', closes_at: '22:00',
    facilities: [], accessibility_features: [], supported_layouts: [] };
}

type Reply = { status: number; body: unknown };

function renderWithDeferredVenueA() {
  let releaseA!: (reply: Reply) => void;
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const id = new URL(input, 'http://localhost').searchParams.get('id') ?? '';
    requested.push(id);
    const reply: Reply = id === 'a'
      ? await new Promise<Reply>(resolve => { releaseA = resolve; })
      : { status: 200, body: { venue: venue('b', 'Venue B') } };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  render(
    <MemoryRouter initialEntries={['/venue/inventory/a/edit']}>
      <Link to="/venue/inventory/b/edit">Edit venue B</Link>
      <Routes><Route path="/venue/inventory/:venueId/edit" element={<VenueForm mode="edit" />} /></Routes>
    </MemoryRouter>,
  );
  return { requested, releaseA: (reply: Reply) => releaseA(reply) };
}

test.each([
  ['success', { status: 200, body: { venue: venue('a', 'Venue A') } }],
  ['error', { status: 503, body: { error: 'unavailable' } }],
])('a late %s for venue A does not replace venue B', async (_kind, lateReply) => {
  const { requested, releaseA } = renderWithDeferredVenueA();
  await waitFor(() => expect(requested).toContain('a'));

  fireEvent.click(screen.getByText('Edit venue B'));
  expect(await screen.findByLabelText('Venue name')).toHaveValue('Venue B');

  await act(async () => { releaseA(lateReply); });
  expect(screen.getByLabelText('Venue name')).toHaveValue('Venue B');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('venue A\'s values are not shown under venue B\'s URL while B loads', async () => {
  let releaseB!: () => void;
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const id = new URL(input, 'http://localhost').searchParams.get('id');
    if (id === 'b') await new Promise<void>(resolve => { releaseB = resolve; });
    const body = { venue: id === 'a' ? venue('a', 'Venue A') : venue('b', 'Venue B') };
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
  render(
    <MemoryRouter initialEntries={['/venue/inventory/a/edit']}>
      <Link to="/venue/inventory/b/edit">Edit venue B</Link>
      <Routes><Route path="/venue/inventory/:venueId/edit" element={<VenueForm mode="edit" />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByLabelText('Venue name')).toHaveValue('Venue A');

  fireEvent.click(screen.getByText('Edit venue B'));
  // Saving now would write venue A's values to venue B.
  expect(screen.queryByDisplayValue('Venue A')).not.toBeInTheDocument();

  await act(async () => { releaseB(); });
  expect(await screen.findByLabelText('Venue name')).toHaveValue('Venue B');
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { OrganiserDrafts } from './OrganiserDrafts';

afterEach(() => vi.unstubAllGlobals());

test('E02-S05 lists an own previous event and copies it into a draft', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'POST') {
      return new Response(JSON.stringify({ event: { id: 'draft-copy-1' }, sessions: [], warnings: [] }), { status: 201 });
    }
    if (url.includes('status=draft')) {
      return new Response(JSON.stringify({ events: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ events: [{ id: 'event-old', title: 'Past conference', status: 'completed', startAt: '2026-10-01T01:00:00.000Z' }] }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);

  render(<MemoryRouter><OrganiserDrafts /></MemoryRouter>);

  expect(await screen.findByText('Past conference')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));

  await screen.findByRole('link', { name: 'Continue editing' });
  expect(fetchMock.mock.calls.some(([input, init]) => String(input).includes('copy=1&id=event-old') && init?.method === 'POST')).toBe(true);
});

// E05-S03 / SCRUM-42 calendar navigation regressions, using inline fetch
// fixtures. MemoryRouter keeps the same component mounted between URLs,
// exposing stale venue selection that initial-page-load tests cannot catch.
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { test, expect, vi, afterEach } from 'vitest';
import { VenueCalendar } from './VenueCalendar';
import { CoordinatorHome } from '../coordinator/Coordinator';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('changing the calendar route loads the new venue', async () => {
  const ids: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    const id = url.searchParams.get('id');
    const body = url.searchParams.get('calendar') === '1'
      ? (ids.push(id!), { venue: { id, name: id, is_active: true }, entries: [] })
      : { venues: [{ id: 'v-1', name: 'One' }, { id: 'v-2', name: 'Two' }] };
    return { ok: true, status: 200, json: async () => body };
  }));
  render(<MemoryRouter initialEntries={['/coordinator/venues/v-1/calendar']}>
    <Link to='/coordinator/venues/v-2/calendar'>Open venue two</Link>
    <Routes><Route path='/coordinator/venues/:venueId/calendar' element={<VenueCalendar audience='coordinator' />} /></Routes>
  </MemoryRouter>);
  await waitFor(() => expect(ids).toContain('v-1'));
  fireEvent.click(screen.getByText('Open venue two'));
  await waitFor(() => expect(ids).toContain('v-2'));
  expect(await screen.findByRole('list', { name: /Availability for v-2/ })).toBeInTheDocument();
});

test('coordinators can reach the calendar from their dashboard', () => {
  render(<MemoryRouter><CoordinatorHome /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Venue availability calendar' })).toHaveAttribute('href', '/coordinator/calendar');
});

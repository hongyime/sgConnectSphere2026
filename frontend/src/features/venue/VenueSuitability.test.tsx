// Traceability: SCRUM-46 / E06-S02 AC1-3 and AC5 (T-77).
// Evidence: feature/SCRUM-46-venue-suitability; see docs/testing/venue-suitability.md.
// AC4 real booking integration remains pending E06-S03/S04.
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueSuitability } from './VenueSuitability';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const result = (suitable = false) => ({ event: { id: 'e', title: 'Recorded Event', start: '2026-11-10T00:00:00Z', end: '2026-11-10T15:00:00Z', accessibility_note: suitable ? null : 'Manual review note' }, assessment: {
  id: 'v', name: 'Central Hall', location: 'Central', suitable, available: true, advisory: true,
  mismatches: suitable ? [] : ['Event is outside operating hours.', 'Missing facility: WiFi'],
  comparisons: [{ criterion: 'Facilities', required: 'WiFi', provided: 'None' }, { criterion: 'Operating hours (Singapore time)', required: '', provided: '08:00 - 22:00' }],
} });
function renderPage(path = '/events/e/venues/v') {
  render(<MemoryRouter initialEntries={[path]}><Link to="/events/other/venues/new">Other venue</Link><Routes>
    <Route path="/events/:eventCode/venues/:venueId" element={<VenueSuitability />} />
    <Route path="/fallback" element={<VenueSuitability />} />
  </Routes></MemoryRouter>);
}
test('shows every failing criterion, comparisons and advisory guidance', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => result() });
  vi.stubGlobal('fetch', fetcher);
  renderPage();
  expect(await screen.findByText('Unsuitable')).toBeInTheDocument();
  expect(screen.getByText('Event is outside operating hours.')).toBeInTheDocument();
  expect(screen.getByText('Missing facility: WiFi')).toBeInTheDocument();
  expect(screen.getByText(/An unsuitable venue may still be requested/)).toBeInTheDocument();
  expect(screen.getByText('Manual review note')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to venue search' })).toHaveAttribute('href', '/coordinator/events/e/venues');
  expect(String(fetcher.mock.calls[0][0])).toContain('mode=assessment&event_id=e&venue_id=v');
});
test('suitable result has no failure section or empty notes alert', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => result(true) }));
  renderPage();
  expect(await screen.findByText('Suitable')).toBeInTheDocument();
  expect(screen.queryByText('Unmet requirements')).not.toBeInTheDocument();
  expect(screen.queryByText('Accessibility notes for manual review')).not.toBeInTheDocument();
});
test('shows server error and retry recovers', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'Service unavailable.' }) })
    .mockResolvedValue({ ok: true, status: 200, json: async () => result(true) }));
  renderPage('/fallback');
  expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable.');
  fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
  expect(await screen.findByText('Suitable')).toBeInTheDocument();
});
test('route change discards a late result for the previous venue', async () => {
  let resolve!: (reply: unknown) => void;
  vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; }))
    .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...result(true), assessment: { ...result(true).assessment, name: 'New Hall' } }) }));
  renderPage();
  expect(screen.getByText('Checking venue suitability...')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Other venue'));
  expect(await screen.findByRole('heading', { name: 'New Hall' })).toBeInTheDocument();
  await act(async () => resolve({ ok: true, status: 200, json: async () => result() }));
  expect(screen.queryByRole('heading', { name: 'Central Hall' })).not.toBeInTheDocument();
});

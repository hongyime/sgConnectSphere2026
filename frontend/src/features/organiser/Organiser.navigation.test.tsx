// SCRUM-105 organiser detail navigation. Inline deferred fetch fixtures
// control response order, proving old successes and failures cannot replace
// the detail for the current route. No backend or shared fixture is used.
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { test, expect, vi, afterEach } from 'vitest';
import { SubmittedDetail } from './Organiser';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
// Hold A until B has rendered, then release A as a success, denial or error.
// A real network cannot reliably reproduce this ordering in a browser test.
test.each([200, 403, 503])('late detail response (%i) does not overwrite the current request', async status => {
  let finishA!: (value: unknown) => void;
  let aStarted = false;
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    const id = url.searchParams.get('id');
    if (id === 'a' && !url.searchParams.has('mine')) {
      aStarted = true;
      return new Promise(resolve => { finishA = resolve; });
    }
    return { status: 200, json: async () => ({ event: { id, title: id === 'a' ? 'Request A' : 'Request B', status: 'submitted', statusHistory: [], comments: [] } }) };
  }));
  render(<MemoryRouter initialEntries={['/organiser/requests/a']}>
    <Link to='/organiser/requests/b'>Open B</Link>
    <Routes><Route path='/organiser/requests/:eventCode' element={<SubmittedDetail />} /></Routes>
  </MemoryRouter>);
  await waitFor(() => expect(aStarted).toBe(true));
  fireEvent.click(screen.getByText('Open B'));
  await screen.findByRole('heading', { name: 'Request B' });
  await act(async () => { finishA({ status, json: async () => ({ event: { id: 'a', statusHistory: [], comments: [] } }) }); });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Request B');
});

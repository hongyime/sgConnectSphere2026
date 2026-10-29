import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { OrganiserSessions } from './OrganiserSessions';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const sessions = [
  { id: 'session-a', title: 'Opening', startAt: '2027-03-12T01:00:00Z', endAt: '2027-03-12T03:00:00Z', expectedAttendance: 40 },
  { id: 'session-b', title: 'Workshop', startAt: '2027-03-13T05:00:00Z', endAt: '2027-03-13T08:00:00Z', expectedAttendance: 120 },
];

test('organiser confirms deletion and sees the linked booking release result', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ releasedBookings: 1 }) });
  vi.stubGlobal('fetch', fetcher);
  const onDeleted = vi.fn();
  render(<OrganiserSessions eventId="event-id" status="confirmed" sessions={sessions} onDeleted={onDeleted} />);
  expect(screen.getByText('120 expected attendees')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Opening' }));
  expect(screen.getByRole('group', { name: 'Confirm delete Opening' })).toHaveTextContent('Venue Staff notified');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('Opening deleted. 1 venue booking released.'));
  const [url, init] = fetcher.mock.calls[0]!;
  const params = new URL(String(url), 'http://localhost').searchParams;
  expect(params.get('id')).toBe('event-id');
  expect(params.get('session_id')).toBe('session-a');
  expect(init).toMatchObject({ method: 'DELETE', credentials: 'same-origin' });
});

test('deletion refusals preserve the Session and expose the server reason', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'This Session has attendee history that must be preserved.' }) }));
  render(<OrganiserSessions eventId="event-id" status="planning" sessions={sessions} onDeleted={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Opening' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('attendee history');
  expect(screen.getByRole('heading', { name: 'Opening' })).toBeInTheDocument();
});

test('a single Session remains in place without a delete action', () => {
  render(<OrganiserSessions eventId="event-id" status="confirmed" sessions={sessions.slice(0, 1)} onDeleted={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Opening' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
});

test('keeping a Session closes its delete confirmation without calling the API', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  render(<OrganiserSessions eventId="event-id" status="confirmed" sessions={sessions} onDeleted={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Opening' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep Session' }));
  expect(screen.queryByRole('group', { name: 'Confirm delete Opening' })).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});

test('a missing title and multiple released bookings use readable success text', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ releasedBookings: 2 }) }));
  render(<OrganiserSessions eventId="event-id" status="confirmed" sessions={[
    ...sessions.slice(0, 1), { ...sessions[1]!, title: undefined },
  ]} onDeleted={message => { expect(message).toBe('Session deleted. 2 venue bookings released.'); }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Session 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await waitFor(() => expect(screen.queryByRole('group', { name: 'Confirm delete Session 2' })).not.toBeInTheDocument());
});

test('invalid response JSON and non-Error failures show a safe fallback', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('bad json'); } })
    .mockRejectedValueOnce('offline');
  vi.stubGlobal('fetch', fetcher);
  render(<OrganiserSessions eventId="event-id" status="confirmed" sessions={sessions} onDeleted={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Opening' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The Session could not be deleted.');
  fireEvent.click(screen.getByRole('button', { name: 'Keep Session' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Opening' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The Session could not be deleted.');
});

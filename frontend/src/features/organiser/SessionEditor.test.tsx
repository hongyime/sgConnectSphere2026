import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SessionEditor } from './SessionEditor';

const sessions = [{
  id: 'session-1',
  title: 'Day 1',
  startAt: '2027-03-12T01:00:00.000Z',
  endAt: '2027-03-12T03:00:00.000Z',
  expectedAttendance: 40,
}];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('E04-S02: the editor lists the Sessions of the draft', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sessions }), { status: 200 })));
  render(<SessionEditor eventId="event-1" />);

  expect(await screen.findByDisplayValue('Day 1')).toBeTruthy();
  const attendance = screen.getByLabelText('Expected attendance') as HTMLInputElement;
  expect(attendance.value).toBe('40');
});

test('E04-S02: adding a Session posts to the sessions endpoint', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify({ session: sessions[0] }), { status: 201 });
    return new Response(JSON.stringify({ sessions }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Add session'));

  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(true);
  });
  const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
  expect(String(post[0])).toBe('/api/events?sessions=1&id=event-1');
});

test('E04-S02: removing a Session deletes that Session only', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') return new Response(JSON.stringify({ deleted: true }), { status: 200 });
    return new Response(JSON.stringify({ sessions }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Remove session'));

  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')).toBe(true);
  });
  const removal = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')!;
  expect(String(removal[0])).toBe('/api/events?sessions=1&id=event-1&sessionId=session-1');
});

test('E04-S02: a planning edit previews its impact before saving', async () => {
  const fetchMock = vi.fn(async (requestUrl: string, init?: RequestInit) => {
    if (init?.method === 'PATCH' && String(requestUrl).includes('preview=1')) {
      return new Response(JSON.stringify({
        preview: { impact: { affected: true, bookings: [{}], reservations: [] }, overSubscription: [], revision: 'rev-1' },
      }), { status: 200 });
    }
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ session: sessions[0] }), { status: 200 });
    return new Response(JSON.stringify({ sessions, eventStatus: 'planning' }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));

  expect(await screen.findByText(/flags 1 booking/)).toBeTruthy();
  const previewCall = fetchMock.mock.calls.find(([requestUrl]) => String(requestUrl).includes('preview=1'))!;
  expect(String(previewCall[0])).toContain('sessions=1&id=event-1&sessionId=session-1');

  fireEvent.click(screen.getByText('Save anyway'));
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([requestUrl, init]) =>
      (init as RequestInit | undefined)?.method === 'PATCH'
      && String(requestUrl).includes('reviewed=rev-1'))).toBe(true);
  });
});

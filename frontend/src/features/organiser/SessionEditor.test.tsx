import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SessionEditor } from './SessionEditor';

const sessions = [{
  id: 'session-1',
  title: 'Day 1',
  startAt: '2027-03-12T01:00:00.000Z',
  endAt: '2027-03-12T03:00:00.000Z',
  expectedAttendance: 40,
}];

const twoSessions = [
  { ...sessions[0], accessibilityFeatureIds: ['step-free'], facilityIds: [], venueRequirements: 'Hall A', equipmentRequirements: 'Projector' },
  {
    id: 'session-2', title: 'Day 2', startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z',
    expectedAttendance: 120, layoutId: 'theatre', accessibilityFeatureIds: [], facilityIds: ['mics'],
  },
];
const options = {
  layouts: [{ id: 'theatre', label: 'Theatre' }],
  accessibility: [{ id: 'step-free', label: 'Step-free access' }],
  facilities: [{ id: 'mics', label: 'Microphones' }],
};

function bodyOf(call: unknown[]) {
  return JSON.parse(String((call[1] as RequestInit).body));
}

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
    return new Response(JSON.stringify({ sessions: twoSessions }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);

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

test('TC_E04S02_02: with two Sessions each keeps its own requirements', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ session: twoSessions[1] }), { status: 200 });
    return new Response(JSON.stringify({ sessions: twoSessions, options }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  const day2 = await screen.findByRole('listitem', { name: 'Day 2' });
  const day1 = screen.getByRole('listitem', { name: 'Day 1' });
  expect((within(day1).getByLabelText('Step-free access') as HTMLInputElement).checked).toBe(true);
  expect((within(day2).getByLabelText('Step-free access') as HTMLInputElement).checked).toBe(false);
  expect((within(day2).getByLabelText('Room layout') as HTMLSelectElement).value).toBe('theatre');
  expect((within(day1).getByLabelText(/Equipment requirements/) as HTMLTextAreaElement).value).toBe('Projector');

  fireEvent.click(within(day2).getByLabelText('Step-free access'));
  fireEvent.change(within(day2).getByLabelText(/Equipment requirements/), { target: { value: 'Two microphones' } });
  fireEvent.click(within(day2).getByText('Save session'));

  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')).toBe(true));
  const save = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')!;
  expect(String(save[0])).toBe('/api/events?sessions=1&id=event-1&sessionId=session-2');
  expect(bodyOf(save)).toMatchObject({
    expectedAttendance: 120, layoutId: 'theatre', equipmentRequirements: 'Two microphones',
    accessibilityFeatureIds: ['step-free'], facilityIds: ['mics'],
  });
  expect(await screen.findByText('Session saved.')).toBeTruthy();
});

test('TC_E04S02_01: a single Session follows the event requirements and saving keeps them', async () => {
  const sole = [{ ...sessions[0], venueRequirements: 'Hall A', layoutId: 'theatre', layoutPreference: 'Rows', accessibilityNote: 'Ramp at entrance' }];
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ session: sole[0] }), { status: 200 });
    return new Response(JSON.stringify({ sessions: sole, options }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  expect(screen.getByText(/uses the event’s own requirements/)).toBeTruthy();
  expect(screen.queryByLabelText('Room layout')).toBeNull();
  expect((screen.getByText('Remove session').closest('button') as HTMLButtonElement).disabled).toBe(true);

  fireEvent.click(screen.getByText('Save session'));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')).toBe(true));
  const body = bodyOf(fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')!);
  // The stored requirements go back unchanged instead of being cleared.
  expect(body).toMatchObject({ venueRequirements: 'Hall A', layoutId: 'theatre', layoutPreference: 'Rows', accessibilityNote: 'Ramp at entrance' });
  expect(body).not.toHaveProperty('accessibilityFeatureIds');
  expect(body).not.toHaveProperty('facilityIds');
});

test('E04-S02: a new Session starts with the first Session requirements', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify({ session: twoSessions[1] }), { status: 201 });
    return new Response(JSON.stringify({ sessions: [twoSessions[0]], options }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Add session'));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(true));
  const body = bodyOf(fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!);
  expect(body).toMatchObject({
    title: 'New Session', expectedAttendance: 40, venueRequirements: 'Hall A',
    accessibilityFeatureIds: ['step-free'], facilityIds: [],
    startAt: '2027-03-13T01:00:00.000Z', endAt: '2027-03-13T02:00:00.000Z',
  });
  expect(await screen.findByText('Session added.')).toBeTruthy();
});

test('TC_E04S02_05: in planning, removing a Session is confirmed and reports what was released', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      return new Response(JSON.stringify({ deleted: true, releasedBookings: 1, releasedReservations: 0, notifiedStaff: 1 }), { status: 200 });
    }
    return new Response(JSON.stringify({ sessions: twoSessions, eventStatus: 'planning', options }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  const day1 = await screen.findByRole('listitem', { name: 'Day 1' });
  expect(screen.queryByText('Add session')).toBeNull();
  fireEvent.click(within(day1).getByText('Remove session'));
  expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')).toBe(false);
  expect(screen.getByText('Remove Day 1?')).toBeTruthy();

  fireEvent.click(within(day1).getAllByRole('button', { name: 'Remove session' }).at(-1)!);
  expect(await screen.findByText('Session removed. 1 venue booking released. The venue’s staff have been notified.')).toBeTruthy();
  const removal = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')!;
  expect(String(removal[0])).toBe('/api/events?sessions=1&id=event-1&sessionId=session-1');
});

test('E04-S02: cancelling the removal keeps the Session and sends nothing', async () => {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ sessions: twoSessions, eventStatus: 'planning', options }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  const day1 = await screen.findByRole('listitem', { name: 'Day 1' });
  fireEvent.click(within(day1).getByText('Remove session'));
  fireEvent.click(within(day1).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Remove Day 1?')).toBeNull();
  expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')).toBe(false);
});

test('E04-S02: a refused save shows the reason and a failed load can be retried', async () => {
  let loads = 0;
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ error: 'A selected facility no longer exists.' }), { status: 400 });
    loads += 1;
    if (loads === 1) return new Response('{}', { status: 500 });
    return new Response(JSON.stringify({ sessions: twoSessions, options }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  expect(await screen.findByText('Sessions could not be loaded.')).toBeTruthy();
  fireEvent.click(screen.getByText('Try again'));
  const day2 = await screen.findByRole('listitem', { name: 'Day 2' });
  fireEvent.click(within(day2).getByText('Save session'));
  expect(await screen.findByText('A selected facility no longer exists.')).toBeTruthy();
});

test('E04-S02: a late answer for an earlier event never replaces the current one', async () => {
  let releaseFirst: (response: Response) => void = () => undefined;
  const fetchMock = vi.fn((requestUrl: string) => {
    if (String(requestUrl).includes('id=event-1')) return new Promise<Response>(resolve => { releaseFirst = resolve; });
    return Promise.resolve(new Response(JSON.stringify({ sessions: [{ ...sessions[0], id: 'other', title: 'Other event day' }] }), { status: 200 }));
  });
  vi.stubGlobal('fetch', fetchMock);
  const { rerender } = render(<SessionEditor eventId="event-1" />);
  rerender(<SessionEditor eventId="event-2" />);

  expect(await screen.findByDisplayValue('Other event day')).toBeTruthy();
  releaseFirst(new Response(JSON.stringify({ sessions }), { status: 200 }));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.queryByDisplayValue('Day 1')).toBeNull();
  expect(screen.getByDisplayValue('Other event day')).toBeTruthy();
});

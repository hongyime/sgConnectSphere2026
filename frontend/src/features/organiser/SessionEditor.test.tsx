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
        preview: { impact: { affected: true, bookings: [{ id: 'booking-1', venueName: 'Hall A', reasons: ['time'] }], reservations: [] }, overSubscription: [], revision: 'rev-1' },
      }), { status: 200 });
    }
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ session: sessions[0] }), { status: 200 });
    return new Response(JSON.stringify({ sessions, eventStatus: 'planning' }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));

  expect(await screen.findByText('Hall A')).toBeTruthy();
  const previewCall = fetchMock.mock.calls.find(([requestUrl]) => String(requestUrl).includes('preview=1'))!;
  expect(String(previewCall[0])).toContain('sessions=1&id=event-1&sessionId=session-1');

  fireEvent.click(screen.getByText('Save and ask staff to reconfirm'));
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([requestUrl, init]) =>
      (init as RequestInit | undefined)?.method === 'PATCH'
      && String(requestUrl).includes('reviewed=rev-1'))).toBe(true);
  });
});

const supportCheck = {
  impact: { affected: true, bookings: [], reservations: [], supports: [{
    id: 'support-1', description: 'Sound desk', startsAt: '2027-03-13T04:00:00.000Z', endsAt: '2027-03-13T06:00:00.000Z',
    reasons: ['time'], shiftMs: 3600_000,
  }] },
  overSubscription: [],
  revision: 'rev-2',
};

// A planning screen whose preview and save replies the test chooses.
function planningFetch(preview: unknown, save: () => Response) {
  const fetchMock = vi.fn(async (requestUrl: string, init?: RequestInit) => {
    if (init?.method === 'PATCH' && String(requestUrl).includes('preview=1')) {
      return new Response(JSON.stringify({ preview }), { status: 200 });
    }
    if (init?.method === 'PATCH') return save();
    return new Response(JSON.stringify({ sessions, eventStatus: 'planning' }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const saved = () => fetchMock.mock.calls.filter(([requestUrl, init]) =>
    (init as RequestInit | undefined)?.method === 'PATCH' && !String(requestUrl).includes('preview=1'));
  return saved;
}
const savedSession = () => new Response(JSON.stringify({ session: sessions[0] }), { status: 200 });

test('TC_E10S02_14: a planning Session edit lists the Technical Support it flags, with its new time, before saving', async () => {
  const saved = planningFetch(supportCheck, savedSession);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));

  expect(await screen.findByText('Technical Support to reconfirm')).toBeTruthy();
  expect(document.activeElement).toBe(document.querySelector('.event-edit-review'));
  expect(screen.getByText('Sound desk')).toBeTruthy();
  expect(screen.getByText(/→/)).toBeTruthy();
  expect(screen.queryByText('Venue bookings to reconfirm')).toBeNull();
  expect(screen.queryByText('Equipment to reconfirm')).toBeNull();
  expect(saved()).toHaveLength(0);

  fireEvent.click(screen.getByText('Save and ask staff to reconfirm'));
  await waitFor(() => expect(saved()).toHaveLength(1));
  expect(String(saved()[0]![0])).toContain('reviewed=rev-2');
  expect(await screen.findByText('Session saved.')).toBeTruthy();
});

test('TC_E10S02_16: a planning Session edit that leaves fewer places than registrations warns first, even with nothing flagged', async () => {
  const saved = planningFetch({
    impact: { affected: false, bookings: [], reservations: [], supports: [] },
    overSubscription: [
      { scope: 'session', sessionId: 'session-1', registered: 30, capacity: 20 },
      { scope: 'event', sessionId: null, registered: 30, capacity: 20 },
    ],
    revision: 'rev-3',
  }, savedSession);
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));

  expect(await screen.findByText('More people are registered than there are places')).toBeTruthy();
  expect(screen.getByText(/A Session: 30 registered for 20 places/)).toBeTruthy();
  expect(screen.getByText(/The whole event: 30 registered for 20 places/)).toBeTruthy();
  expect(screen.getByText(/No one will be removed or moved to the waiting list/)).toBeTruthy();
  expect(saved()).toHaveLength(0);

  fireEvent.click(screen.getByText('Save changes'));
  await waitFor(() => expect(saved()).toHaveLength(1));
  expect(String(saved()[0]![0])).toContain('reviewed=rev-3');
});

test('E10-S02: a Session save refused because its check went stale shows the fresh list, and saves against it', async () => {
  const fresh = { ...supportCheck, impact: { ...supportCheck.impact, bookings: [{
    id: 'booking-1', sessionId: 'session-1', venueId: 'venue-1', venueName: 'Hall B', reasons: ['time'], governingHeadcount: null, capacity: 100,
  }] }, revision: 'rev-fresh' };
  let refused = false;
  const saved = planningFetch(supportCheck, () => {
    if (refused) return savedSession();
    refused = true;
    return new Response(JSON.stringify({
      error: 'arrangements_changed',
      message: 'What this change affects has changed since you checked. Review the updated list before saving.',
      ...fresh,
    }), { status: 409 });
  });
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));
  fireEvent.click(await screen.findByText('Save and ask staff to reconfirm'));

  expect(await screen.findByText('What this change affects has changed since you checked. Review the updated list before saving.')).toBeTruthy();
  expect(screen.getByText('Hall B')).toBeTruthy();
  expect(screen.queryByText(/Check the dates and expected attendance/)).toBeNull();

  fireEvent.click(screen.getByText('Save and ask staff to reconfirm'));
  await waitFor(() => expect(saved()).toHaveLength(2));
  expect(String(saved()[1]![0])).toContain('reviewed=rev-fresh');
  expect(await screen.findByText('Session saved.')).toBeTruthy();
});

test('E10-S02: a stale check is reviewed even when the first check needed no review', async () => {
  const saved = planningFetch({
    impact: { affected: false, bookings: [], reservations: [], supports: [] }, overSubscription: [], revision: 'rev-4',
  }, () => new Response(JSON.stringify({ error: 'arrangements_changed', message: 'Changed.', ...supportCheck }), { status: 409 }));
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));

  expect(await screen.findByText('Technical Support to reconfirm')).toBeTruthy();
  expect(saved()).toHaveLength(1);
});

test('E10-S02: any other refusal closes the review and says why', async () => {
  planningFetch(supportCheck, () => new Response(JSON.stringify({ error: 'The end must be after the start.' }), { status: 400 }));
  render(<SessionEditor eventId="event-1" />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getByText('Save session'));
  fireEvent.click(await screen.findByText('Save and ask staff to reconfirm'));

  expect(await screen.findByText('The end must be after the start.')).toBeTruthy();
  expect(screen.queryByText('Technical Support to reconfirm')).toBeNull();
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
  expect(screen.getByText(/no extra setup needed/)).toBeTruthy();
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

test('TC_E04S02_05: removing the Session with the primary venue says the Coordinator must choose another', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      return new Response(JSON.stringify({ deleted: true, releasedBookings: 1, releasedReservations: 0, notifiedStaff: 1, primaryNeeded: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ sessions: twoSessions, eventStatus: 'planning', options }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<SessionEditor eventId="event-1" />);

  const day1 = await screen.findByRole('listitem', { name: 'Day 1' });
  fireEvent.click(within(day1).getByText('Remove session'));
  fireEvent.click(within(day1).getAllByRole('button', { name: 'Remove session' }).at(-1)!);
  expect(await screen.findByText(/That was the event’s primary venue, so your Coordinator needs to choose another\./)).toBeTruthy();
});

// Regression coverage for PR #56 numeric validation and authenticated submission,
// updated post-ADR-015 to reflect the cookie-session refactor. The component no
// longer takes a getAccessToken callback; fetch calls send the session cookie
// automatically via credentials: 'same-origin' and the test double for `fetch`
// captures the request without needing to assert an Authorization header.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { OrganiserRequestFlow } from './OrganiserRequestFlow';

// E02-S03: every non-prototype render fetches the predefined accessibility
// checklist on mount. Default to an empty list here so tests that don't
// care about it never hit a real network call; tests that do care override
// global fetch themselves and must route this URL too.
function accessibilityFeaturesResponse(features: Array<{ id: string; code: string; label: string }> = []) {
  return new Response(JSON.stringify({ features }), { status: 200 });
}

// Narrower than the DOM's own RequestInit (whose headers/body are optional
// unions) - every fetch call this component makes always passes all three,
// so typing the mock's second parameter this way avoids fighting
// unnecessary undefined-narrowing on every assertion below.
type FetchInit = { method?: string; credentials: string; headers: Record<string, string>; body: string };

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T00:00:00Z').getTime());
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => accessibilityFeaturesResponse()));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function completeForm() {
  render(<OrganiserRequestFlow />);
  for (const label of ['Equipment requirements', 'Layout preference', 'Registration setup']) {
    fireEvent.click(screen.getByLabelText(`${label}: none required`));
  }
}

for (const value of ['0', '-1', '1.5']) {
  test(`attendance ${value} blocks submission and identifies the field`, () => {
    completeForm();
    fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value } });
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
    expect(screen.getByRole('list', { name: 'Missing mandatory fields' })).toHaveTextContent('Expected attendance');
  });
}

test('sends all request fields with same-origin credentials and confirms API success', async () => {
  const fetchMock = vi.fn(async (url: string, _init: FetchInit) => (
    url.includes('accessibilityFeatures') ? accessibilityFeaturesResponse() : new Response('{}', { status: 201 })
  ));
  vi.stubGlobal('fetch', fetchMock);
  completeForm();
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByText('Persisted through API and submitted to coordinator queue')).toBeVisible();
  const eventsCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/events');
  expect(eventsCalls).toHaveLength(1);
  const [url, init] = eventsCalls[0];
  expect(url).toBe('/api/events');
  // Post-ADR-015: no Authorization header. Cookie is sent automatically
  // for a same-origin fetch; the explicit credentials value documents intent.
  expect(init.credentials).toBe('same-origin');
  expect(init.headers.authorization).toBeUndefined();
  expect(JSON.parse(init.body)).toEqual({
    title: 'Annual Sustainability Forum',
    description: 'A forum bringing together sustainability leads across the client organisation.',
    purpose: 'Share the annual sustainability roadmap and gather feedback.',
    status: 'submitted',
    startAt: new Date('2027-01-15T09:00').toISOString(),
    endAt: new Date('2027-01-15T12:00').toISOString(),
    expectedAttendance: 180,
    venueRequirements: 'Seminar room with theatre seating',
    accessibilityNote: 'Wheelchair access and front-row reserved seats',
    accessibilityFeatureIds: [],
    equipmentRequirements: 'none_required', layoutPreference: 'none_required', registrationSetup: 'none_required',
  });
});

test('a network failure reports an error and allows retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
  completeForm();
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The request could not be submitted.');
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeEnabled();
  expect(screen.queryByText('Submitted', { exact: true })).not.toBeInTheDocument();
});

test('API validation errors show all returned fields without claiming success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    error: 'missing_mandatory_fields', missingFields: ['Venue requirements', 'Layout preference'],
  }), { status: 400 })));
  completeForm();
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Venue requirements');
  expect(screen.getByRole('alert')).toHaveTextContent('Layout preference');
  expect(screen.queryByText('Submitted', { exact: true })).not.toBeInTheDocument();
});

for (const [field, label] of [
  ['startAt', 'Preferred start date and time'],
  ['endAt', 'Preferred end date and time'],
] as const) {
  test(`an out-of-horizon ${field} response identifies the date and Singapore-local limit`, async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (
      url.includes('accessibilityFeatures')
        ? accessibilityFeaturesResponse()
        : new Response(JSON.stringify({
          error: 'event_date_outside_horizon', field, maximumDate: '2028-10-13',
        }), { status: 400 })
    )));
    completeForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      `${label} must be on or before 2028-10-13 (Singapore time).`,
    );
  });
}

test('an invalid out-of-horizon API field falls back to the generic error', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (
    url.includes('accessibilityFeatures')
      ? accessibilityFeaturesResponse()
      : new Response(JSON.stringify({
        error: 'event_date_outside_horizon', field: 'sessionAt', maximumDate: '2028-10-13',
      }), { status: 400 })
  )));
  completeForm();
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('The request could not be submitted.');
});

// --- SCRUM-27: save/reopen/edit a draft ---

test('Save draft is enabled with optional fields incomplete, and saves as a draft', async () => {
  const fetchMock = vi.fn(async (url: string, _init: FetchInit) => (
    url.includes('accessibilityFeatures')
      ? accessibilityFeaturesResponse()
      : new Response(JSON.stringify({ event: { id: 'draft-1' } }), { status: 201 })
  ));
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow />);

  // Layout preference and registration setup are blank by default with
  // neither "none required" checked, so Submit is blocked - but Option B
  // only requires title/dates/attendance for a draft, so Save draft is not.
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByText('Draft saved.')).toBeVisible();
  const eventsCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/events');
  expect(eventsCalls).toHaveLength(1);
  const [url, init] = eventsCalls[0];
  expect(url).toBe('/api/events');
  expect(init.method).toBe('POST');
  expect(init.credentials).toBe('same-origin');
  const body = JSON.parse(init.body);
  expect(body.status).toBe('draft');
  expect(body.title).toBe('Annual Sustainability Forum');
});

test('Save draft is disabled without a title, attendance, or dates', () => {
  render(<OrganiserRequestFlow />);
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
});

test('editing an existing draft PATCHes it instead of creating a new one', async () => {
  const fetchMock = vi.fn(async (url: string, _init: FetchInit) => (
    url.includes('accessibilityFeatures')
      ? accessibilityFeaturesResponse()
      : new Response(JSON.stringify({ event: { id: 'draft-1' } }), { status: 200 })
  ));
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow draftId="draft-1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByText('Draft saved.')).toBeVisible();
  const [url, init] = fetchMock.mock.calls.find(([callUrl]) => callUrl === '/api/events?id=draft-1')!;
  expect(url).toBe('/api/events?id=draft-1');
  expect(init.method).toBe('PATCH');
});

test('initialValues pre-fill the form for reopening a draft', () => {
  render(
    <OrganiserRequestFlow
      draftId="draft-1"
      initialValues={{ eventName: 'Reopened Draft', venueRequirements: '' }}
    />,
  );
  expect(screen.getByLabelText('Event name')).toHaveValue('Reopened Draft');
});

test('clearing the dates disables Save draft too, not just Submit', () => {
  render(<OrganiserRequestFlow />);
  fireEvent.change(screen.getByLabelText('Preferred start date and time'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
});

test('prototype mode simulates submission without hitting the API', async () => {
  // The /prototype route uses this to demo the flow with no session cookie.
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow prototype />);
  for (const label of ['Equipment requirements', 'Layout preference', 'Registration setup']) {
    fireEvent.click(screen.getByLabelText(`${label}: none required`));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  // Prototype path advances to "Submitted to coordinator queue" (no API text).
  expect(await screen.findByText('Submitted to coordinator queue')).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

// --- E02-S03: live-fetched predefined accessibility checklist ---

test('the predefined accessibility checklist renders options fetched from the API, not a hardcoded list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(accessibilityFeaturesResponse([
    { id: 'f-1', code: 'wheelchair_access', label: 'Wheelchair access' },
    { id: 'f-2', code: 'hearing_loop', label: 'Hearing loop' },
  ])));
  render(<OrganiserRequestFlow />);
  expect(await screen.findByLabelText('Wheelchair access')).not.toBeChecked();
  expect(screen.getByLabelText('Hearing loop')).not.toBeChecked();
});

test('selecting a predefined accessibility feature alone satisfies the mandatory field, and submits ids separately from the free-text note', async () => {
  const fetchMock = vi.fn(async (url: string, _init: FetchInit) => (
    url.includes('accessibilityFeatures')
      ? accessibilityFeaturesResponse([{ id: 'f-1', code: 'wheelchair_access', label: 'Wheelchair access' }])
      : new Response('{}', { status: 201 })
  ));
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow />);
  for (const label of ['Equipment requirements', 'Layout preference', 'Registration setup']) {
    fireEvent.click(screen.getByLabelText(`${label}: none required`));
  }

  // Clearing the free-text field alone would block submission - proving the
  // predefined checkbox satisfies "Accessibility needs" on its own (E02-S03).
  fireEvent.change(screen.getByLabelText('Accessibility needs'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();

  fireEvent.click(await screen.findByLabelText('Wheelchair access'));
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByText('Persisted through API and submitted to coordinator queue')).toBeVisible();
  const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/events')!;
  const body = JSON.parse(init.body);
  expect(body.accessibilityNote).toBe('');
  expect(body.accessibilityFeatureIds).toEqual(['f-1']);
});

// T-108: deleting down to one Session gives the Event that Session's details, so the
// open draft form must not send the old ones back.
const draftSessions = [
  { id: 'session-a', title: 'Day 1', startAt: '2027-03-12T01:00:00.000Z', endAt: '2027-03-12T03:00:00.000Z', expectedAttendance: 40 },
  { id: 'session-b', title: 'Day 2', startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 120 },
];
const draftValues = {
  eventName: 'Draft event', purpose: 'Typed but not saved', startDate: '2027-03-12T09:00', endDate: '2027-03-12T10:00',
  expectedAttendance: '40', venueRequirements: 'Old hall',
};

function draftFetch(remaining: typeof draftSessions, eventReply: () => Response) {
  let current = draftSessions;
  const fetchMock = vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('accessibilityFeatures') || url.includes('accessibility')) return accessibilityFeaturesResponse();
    if (url.includes('sessions=1') && init?.method === 'DELETE') {
      current = remaining;
      return new Response(JSON.stringify({ deleted: true, releasedBookings: 0, releasedReservations: 0 }), { status: 200 });
    }
    if (url.includes('sessions=1')) return new Response(JSON.stringify({ sessions: current, eventStatus: 'draft' }), { status: 200 });
    if (url.includes('mine=1')) return eventReply();
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const savedDraft = (fetchMock: ReturnType<typeof draftFetch>) => {
  const call = fetchMock.mock.calls.find(([url, init]) => init?.method === 'PATCH' && !url.includes('sessions=1'));
  return call ? JSON.parse(call[1]!.body) : null;
};

test('T-108: Save draft after deleting down to one Session sends the Event\'s new details, not the old ones', async () => {
  const fetchMock = draftFetch([draftSessions[1]!], () => new Response(JSON.stringify({ event: {
    startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 120, venueRequirements: 'New hall',
  } }), { status: 200 }));
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={draftValues} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  await waitFor(() => expect(screen.getAllByLabelText('Expected attendance')[0]).toHaveValue(120));

  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText('Draft saved.');
  const body = savedDraft(fetchMock);
  expect(body.expectedAttendance).toBe(120);
  expect(body.venueRequirements).toBe('New hall');
  expect(new Date(body.startAt).toISOString()).toBe('2027-03-13T05:00:00.000Z');
  expect(body.purpose).toBe('Typed but not saved');
});

test('T-108: with two Sessions still left the form keeps what the Organiser typed', async () => {
  const third = { ...draftSessions[1]!, id: 'session-c', title: 'Day 3' };
  const eventReply = vi.fn(() => new Response('{}', { status: 200 }));
  let current = [...draftSessions, third];
  const fetchMock = vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('sessions=1') && init?.method === 'DELETE') {
      current = current.slice(1);
      return new Response(JSON.stringify({ deleted: true }), { status: 200 });
    }
    if (url.includes('sessions=1')) return new Response(JSON.stringify({ sessions: current, eventStatus: 'draft' }), { status: 200 });
    if (url.includes('mine=1')) return eventReply();
    return accessibilityFeaturesResponse();
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={draftValues} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  await waitFor(() => expect(screen.queryByDisplayValue('Day 1')).toBeNull());
  expect(eventReply).not.toHaveBeenCalled();
  expect(screen.getAllByLabelText('Expected attendance')[0]).toHaveValue(40);
});

test('T-108: if the new details cannot be read, saving is blocked instead of overwriting the Session', async () => {
  const fetchMock = draftFetch([draftSessions[1]!], () => new Response('{}', { status: 500 }));
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={draftValues} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  expect(await screen.findByText('The event details could not be refreshed. Reload this page before saving.')).toBeVisible();

  const save = screen.getByRole('button', { name: 'Save draft' });
  expect(save).toBeDisabled();
  fireEvent.click(save);
  expect(savedDraft(fetchMock)).toBeNull();
});

// Everything Submit needs, so a disabled Submit below can only come from the delete.
const readyDraft = {
  ...draftValues, description: 'A description', accessibilityNeeds: 'Ramp', equipmentRequirements: 'None',
  layoutPreference: 'Theatre', registrationSetup: 'Open',
};
const newDetails = () => new Response(JSON.stringify({ event: {
  startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 120, venueRequirements: 'New hall', accessibilityNote: 'Ramp',
  equipmentRequirements: 'None', layoutPreference: 'Theatre',
} }), { status: 200 });
const deferred = () => {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
};
const saveButton = () => screen.getByRole('button', { name: 'Save draft' });
const submitButton = () => screen.getByRole('button', { name: 'Submit request' });
const sessionReplies = (sessions: typeof draftSessions) => new Response(JSON.stringify({ sessions, eventStatus: 'draft' }), { status: 200 });

test('T-108: Save draft and Submit stay blocked from the start of the delete until the new details load, on a slow connection', async () => {
  const removal = deferred();
  const details = deferred();
  let current = draftSessions;
  const fetchMock = vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('sessions=1') && init?.method === 'DELETE') {
      const reply = await removal.promise;
      current = [draftSessions[1]!];
      return reply;
    }
    if (url.includes('sessions=1')) return sessionReplies(current);
    if (url.includes('mine=1')) return details.promise;
    if (url.includes('accessibility')) return accessibilityFeaturesResponse();
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={readyDraft} />);

  await screen.findByDisplayValue('Day 1');
  expect(saveButton()).toBeEnabled();
  expect(submitButton()).toBeEnabled();

  // The delete has been sent and has no reply yet.
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  expect(saveButton()).toBeDisabled();
  expect(submitButton()).toBeDisabled();
  expect(screen.getByText('Updating the event details. Saving is paused until this finishes.')).toBeVisible();

  // The delete has finished and the Event's new details have not arrived.
  removal.resolve(new Response(JSON.stringify({ deleted: true, releasedBookings: 0, releasedReservations: 0 }), { status: 200 }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('mine=1'))).toBe(true));
  await waitFor(() => expect(screen.queryByDisplayValue('Day 1')).toBeNull());
  expect(saveButton()).toBeDisabled();
  expect(submitButton()).toBeDisabled();
  expect(savedDraft(fetchMock)).toBeNull();

  details.resolve(newDetails());
  await waitFor(() => expect(saveButton()).toBeEnabled());
  expect(submitButton()).toBeEnabled();
  expect(screen.queryByText('Updating the event details. Saving is paused until this finishes.')).toBeNull();

  fireEvent.click(saveButton());
  await screen.findByText('Draft saved.');
  expect(savedDraft(fetchMock).expectedAttendance).toBe(120);
  expect(savedDraft(fetchMock).venueRequirements).toBe('New hall');
});

test('T-108: a slow refresh that then fails leaves Save draft and Submit blocked', async () => {
  const details = deferred();
  const fetchMock = vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('sessions=1') && init?.method === 'DELETE') {
      return new Response(JSON.stringify({ deleted: true }), { status: 200 });
    }
    if (url.includes('sessions=1')) return sessionReplies(fetchMock.mock.calls.some(([, sent]) => sent?.method === 'DELETE') ? [draftSessions[1]!] : draftSessions);
    if (url.includes('mine=1')) return details.promise;
    return accessibilityFeaturesResponse();
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={readyDraft} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  await waitFor(() => expect(screen.queryByDisplayValue('Day 1')).toBeNull());
  expect(saveButton()).toBeDisabled();

  details.resolve(new Response('{}', { status: 500 }));
  await screen.findByText('The event details could not be refreshed. Reload this page before saving.');
  expect(saveButton()).toBeDisabled();
  expect(submitButton()).toBeDisabled();
  expect(savedDraft(fetchMock)).toBeNull();
});

test('T-108: a refused delete that left both Sessions unblocks saving and keeps what was typed', async () => {
  const eventReply = vi.fn(() => newDetails());
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('sessions=1') && init?.method === 'DELETE') return new Response(JSON.stringify({ error: 'Not allowed.' }), { status: 400 });
    if (url.includes('sessions=1')) return sessionReplies(draftSessions);
    if (url.includes('mine=1')) return eventReply();
    return accessibilityFeaturesResponse();
  }));
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={readyDraft} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  expect(saveButton()).toBeDisabled();
  await waitFor(() => expect(saveButton()).toBeEnabled());
  expect(submitButton()).toBeEnabled();
  expect(eventReply).not.toHaveBeenCalled();
  expect(screen.getAllByLabelText('Expected attendance')[0]).toHaveValue(40);
});

test('T-108: a delete whose reply was lost but which went through still refreshes the form', async () => {
  let current = draftSessions;
  const fetchMock = vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('sessions=1') && init?.method === 'DELETE') {
      current = [draftSessions[1]!];
      throw new TypeError('connection lost');
    }
    if (url.includes('sessions=1')) return sessionReplies(current);
    if (url.includes('mine=1')) return newDetails();
    if (url.includes('accessibility')) return accessibilityFeaturesResponse();
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={readyDraft} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  await waitFor(() => expect(screen.getAllByLabelText('Expected attendance')[0]).toHaveValue(120));
  await waitFor(() => expect(saveButton()).toBeEnabled());
  fireEvent.click(saveButton());
  await screen.findByText('Draft saved.');
  expect(savedDraft(fetchMock).venueRequirements).toBe('New hall');
});

test('T-108: if nothing can be read after a failed delete, Save draft and Submit stay blocked', async () => {
  let sessionReads = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: FetchInit) => {
    if (url.includes('sessions=1') && init?.method === 'DELETE') throw new TypeError('connection lost');
    if (url.includes('sessions=1')) {
      sessionReads += 1;
      if (sessionReads > 1) throw new TypeError('connection lost');
      return sessionReplies(draftSessions);
    }
    if (url.includes('mine=1')) throw new TypeError('connection lost');
    return accessibilityFeaturesResponse();
  }));
  render(<OrganiserRequestFlow draftId="draft-1" initialValues={readyDraft} />);

  await screen.findByDisplayValue('Day 1');
  fireEvent.click(screen.getAllByText('Remove session')[0]!);
  await screen.findByText('The event details could not be refreshed. Reload this page before saving.');
  expect(saveButton()).toBeDisabled();
  expect(submitButton()).toBeDisabled();
});

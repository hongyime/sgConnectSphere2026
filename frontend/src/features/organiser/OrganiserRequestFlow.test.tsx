// Regression coverage for PR #56 numeric validation and authenticated submission,
// updated post-ADR-015 to reflect the cookie-session refactor. The component no
// longer takes a getAccessToken callback; fetch calls send the session cookie
// automatically via credentials: 'same-origin' and the test double for `fetch`
// captures the request without needing to assert an Authorization header.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

// Regression coverage for PR #56: numeric validation and authenticated submission
// must be tested independently of the prototype's local success simulation.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { OrganiserRequestFlow } from './OrganiserRequestFlow';

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T00:00:00Z').getTime());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function completeForm(getAccessToken = async () => 'test-token') {
  render(<OrganiserRequestFlow getAccessToken={getAccessToken} />);
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

test('sends all request fields and confirms API success', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  completeForm();
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByText('Persisted through API and submitted to coordinator queue')).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/events');
  expect(init.headers.authorization).toBe('Bearer test-token');
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
    equipmentRequirements: 'none_required', layoutPreference: 'none_required', registrationSetup: 'none_required',
  });
});

test('a failed session lookup reports an error and allows retry', async () => {
  completeForm(async () => { throw new Error('session unavailable'); });
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your session could not be checked');
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
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ event: { id: 'draft-1' } }), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow getAccessToken={async () => 'test-token'} />);

  // Layout preference and registration setup are blank by default with
  // neither "none required" checked, so Submit is blocked - but Option B
  // only requires title/dates/attendance for a draft, so Save draft is not.
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByText('Draft saved.')).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/events');
  expect(init.method).toBe('POST');
  const body = JSON.parse(init.body);
  expect(body.status).toBe('draft');
  expect(body.title).toBe('Annual Sustainability Forum');
});

test('Save draft is disabled without a title, attendance, or dates', () => {
  render(<OrganiserRequestFlow getAccessToken={async () => 'test-token'} />);
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
});

test('editing an existing draft PATCHes it instead of creating a new one', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ event: { id: 'draft-1' } }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<OrganiserRequestFlow getAccessToken={async () => 'test-token'} draftId="draft-1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByText('Draft saved.')).toBeVisible();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/events?id=draft-1');
  expect(init.method).toBe('PATCH');
});

test('initialValues pre-fill the form for reopening a draft', () => {
  render(
    <OrganiserRequestFlow
      getAccessToken={async () => 'test-token'}
      draftId="draft-1"
      initialValues={{ eventName: 'Reopened Draft', venueRequirements: '' }}
    />,
  );
  expect(screen.getByLabelText('Event name')).toHaveValue('Reopened Draft');
});

test('clearing the dates disables Save draft too, not just Submit', () => {
  render(<OrganiserRequestFlow getAccessToken={async () => 'test-token'} />);
  fireEvent.change(screen.getByLabelText('Preferred start date and time'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
});

// E06-S05 (SCRUM-49, frontend SCRUM-143) against a stubbed API shaped like
// backend/src/modules/venueBooking/holdsHandler.ts: the Venue holds card on
// the Coordinator's event page and the hold form reached from venue search.
// Sentences match holds.ts.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { toLocalInput } from '../events/EventEditForm';
import { expiryProblem, HOLD_MESSAGES } from '../venue/holdsApi';
import { RequestDetail } from './CoordinatorWorkspace';
import { HoldVenueForm, validateHold } from './VenueHolds';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const EVENT = 'GET /api/events?assigned=1&id=EVT-TECH';
const HOLDS = 'GET /api/venues?task=holds&event=EVT-TECH';
const VENUE = 'GET /api/venues?id=v-1';
const POST = 'POST /api/venues';
const STARTS = '2027-03-10T01:00:00.000Z';
const ENDS = '2027-03-10T09:00:00.000Z';
const HOUR = 60 * 60 * 1000;

function detail(status = 'planning') {
  return { event: {
    id: 'evt-1', event_code: 'EVT-TECH', title: 'Tech Conference 2027', status,
    status_changed_at: '2026-10-01T01:00:00.000Z', starts_at: STARTS, ends_at: ENDS,
    expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A',
    organiser_email: 'organiser_a@clienta.com', description: 'Annual conference', purpose: null, venue_requirements: null,
    accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'c-a', coordinator_name: 'Coordinator A', pendingReassignment: null, outstandingQuestions: [],
  } };
}

const live = {
  id: 'h-1', venueId: 'v-1', venueName: 'Riverside Hall', eventId: 'evt-1', eventCode: 'EVT-TECH', eventTitle: 'Tech Conference 2027',
  startsAt: STARTS, endsAt: ENDS, status: 'tentative', expiresAt: '2026-10-15T02:00:00.000Z',
};
const expired = { ...live, id: 'h-2', venueName: 'Studio', status: 'expired', expiresAt: '2026-10-11T02:00:00.000Z' };

function holds(overrides: Record<string, unknown> = {}) {
  return { event: { id: 'evt-1', eventCode: 'EVT-TECH', title: 'Tech Conference 2027', status: 'planning', startsAt: STARTS, endsAt: ENDS },
    holds: [live, expired], canHold: true, ...overrides };
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/coordinator/events/:eventCode" element={<RequestDetail />} />
        <Route path="/coordinator/events/:eventCode/venues" element={<p>Venue search page</p>} />
        <Route path="/coordinator/events/:eventCode/venues/:venueId/hold" element={<HoldVenueForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

const card = async () => within((await screen.findByRole('heading', { name: 'Venue holds' })).closest('section')!);
const posts = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'POST');

test('the card lists live and expired holds with their expiry, and links to venue search', async () => {
  stubApi({ [EVENT]: { body: detail() }, [HOLDS]: { body: holds() } });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  const rows = await section.findAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(within(rows[0]!).getByText('Riverside Hall')).toBeInTheDocument();
  expect(within(rows[0]!).getByText(/^Tentative · expires 15 Oct 2026, 10:00/)).toBeInTheDocument();
  expect(within(rows[0]!).getByRole('button', { name: 'Submit booking request' })).toBeInTheDocument();
  expect(within(rows[1]!).getByText(/^Expired 11 Oct 2026/)).toBeInTheDocument();
  expect(within(rows[1]!).queryByRole('button')).not.toBeInTheDocument();
  expect(within(rows[1]!).getByText(/no longer holds the venue/)).toBeInTheDocument();
  expect(section.getByRole('link', { name: 'Find a venue to hold' })).toHaveAttribute('href', '/coordinator/events/EVT-TECH/venues');
});

test('with no holds the card explains the 48-hour hold; an event that cannot hold says so and has no link', async () => {
  stubApi({ [EVENT]: { body: detail('confirmed') }, [HOLDS]: { body: holds({ holds: [], canHold: false }) } });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  expect(await section.findByText(/No venue is held for this event. A hold keeps a venue for 48 hours/)).toBeInTheDocument();
  expect(section.getByText(HOLD_MESSAGES.notHoldable)).toBeInTheDocument();
  expect(section.queryByRole('link', { name: 'Find a venue to hold' })).not.toBeInTheDocument();
});

test('a failed or malformed load shows an error with a retry, and the rest of the page still renders', async () => {
  let attempt = 0;
  stubApi({ [EVENT]: { body: detail() }, [HOLDS]: () => (++attempt === 1 ? { body: { nothing: true } } : { body: holds({ holds: [] }) }) });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  expect(await section.findByText('Venue holds could not be loaded.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tech Conference 2027' })).toBeInTheDocument();
  fireEvent.click(section.getByRole('button', { name: 'Try again' }));
  expect(await section.findByText(/No venue is held for this event/)).toBeInTheDocument();
});

test('TC_E06S05_04: submitting the booking request converts the hold and reloads the list', async () => {
  let converted = false;
  const calls = stubApi({
    [EVENT]: { body: detail() },
    [HOLDS]: () => ({ body: holds({ holds: converted ? [expired] : [live, expired] }) }),
    [POST]: () => { converted = true; return { body: { booking: { id: 'h-1', status: 'pending' } } }; },
  });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  fireEvent.click(await section.findByRole('button', { name: 'Submit booking request' }));
  expect(await section.findByText('Booking request submitted for Riverside Hall. The hold no longer expires.')).toBeInTheDocument();
  expect(posts(calls).map(call => call.body)).toEqual([{ action: 'convert_hold', booking_id: 'h-1' }]);
  await waitFor(() => expect(section.getAllByRole('listitem')).toHaveLength(1));
});

test('Scenario 4: release asks first; Keep cancels, Release hold releases', async () => {
  const calls = stubApi({ [EVENT]: { body: detail() }, [HOLDS]: { body: holds() }, [POST]: { body: { released: true } } });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  fireEvent.click(await section.findByRole('button', { name: 'Release' }));
  expect(section.getByText('Release this hold?')).toBeInTheDocument();
  fireEvent.click(section.getByRole('button', { name: 'Keep' }));
  expect(section.queryByText('Release this hold?')).not.toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
  fireEvent.click(section.getByRole('button', { name: 'Release' }));
  fireEvent.click(section.getByRole('button', { name: 'Release hold' }));
  expect(await section.findByText('Hold on Riverside Hall released. The period is free again.')).toBeInTheDocument();
  expect(posts(calls).map(call => call.body)).toEqual([{ action: 'release', booking_id: 'h-1' }]);
});

test('a refused action shows the server sentence and leaves the list as it was', async () => {
  const message = "This hold has expired, so it can't be changed. Place a new hold if the venue is still needed.";
  stubApi({ [EVENT]: { body: detail() }, [HOLDS]: { body: holds() }, [POST]: { status: 409, body: { error: message } } });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  fireEvent.click(await section.findByRole('button', { name: 'Submit booking request' }));
  expect(await section.findByText(message)).toBeInTheDocument();
  expect(section.getAllByRole('listitem')).toHaveLength(2);
});

test('TC_E06S05_03: the hold form starts from the event period with the 48-hour default, places the hold and returns to the event', async () => {
  let placed = false;
  const calls = stubApi({
    [EVENT]: { body: detail() },
    [VENUE]: { body: { venue: { id: 'v-1', name: 'Riverside Hall' } } },
    [HOLDS]: () => ({ body: holds({ holds: placed ? [live] : [] }) }),
    [POST]: () => { placed = true; return { status: 201, body: { hold: { id: 'h-1', venueName: 'Riverside Hall', status: 'tentative', expiresAt: '2026-10-15T02:00:00.000Z' } } }; },
  });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  expect(await screen.findByRole('heading', { name: 'Hold a venue tentatively' })).toBeInTheDocument();
  expect(screen.getByLabelText('Hold starts')).toHaveValue(toLocalInput(STARTS));
  expect(screen.getByLabelText('Hold ends')).toHaveValue(toLocalInput(ENDS));
  expect(screen.getByLabelText('Hold expires after')).toHaveValue('default');
  expect(screen.queryByLabelText('Hold expires')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hold venue' }));
  expect(await screen.findByText(/Riverside Hall is held tentatively until 15 Oct 2026, 10:00/)).toBeInTheDocument();
  expect(posts(calls).map(call => call.body)).toEqual([{ action: 'hold', event_id: 'EVT-TECH', venue_id: 'v-1', starts_at: STARTS, ends_at: ENDS }]);
});

test('a chosen expiry is checked against 1 hour to 14 days and sent when valid', async () => {
  const calls = stubApi({
    [EVENT]: { body: detail() }, [VENUE]: { body: { venue: { id: 'v-1', name: 'Riverside Hall' } } },
    [POST]: { status: 201, body: { hold: { id: 'h-1', venueName: 'Riverside Hall', status: 'tentative', expiresAt: '2026-10-20T02:00:00.000Z' } } },
    [HOLDS]: { body: holds() },
  });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  fireEvent.change(await screen.findByLabelText('Hold expires after'), { target: { value: 'custom' } });
  const expiry = screen.getByLabelText('Hold expires');
  fireEvent.change(expiry, { target: { value: toLocalInput(new Date(Date.now() + 0.5 * HOUR).toISOString()) } });
  fireEvent.click(screen.getByRole('button', { name: 'Hold venue' }));
  expect(await screen.findByText(HOLD_MESSAGES.tooShort)).toBeInTheDocument();
  expect(screen.getByText('Check the highlighted fields and try again.')).toBeInTheDocument();
  const valid = toLocalInput(new Date(Date.now() + 72 * HOUR).toISOString());
  fireEvent.change(expiry, { target: { value: valid } });
  fireEvent.click(screen.getByRole('button', { name: 'Hold venue' }));
  await waitFor(() => expect(posts(calls)).toHaveLength(1));
  expect(posts(calls)[0]!.body).toMatchObject({ expires_at: new Date(valid).toISOString() });
});

test('TC_E06S05_01: a clash is refused with the server sentence giving the unavailable window', async () => {
  const clash = 'This venue is unavailable from 10 Mar 2027, 9:00 am to 10 Mar 2027, 5:00 pm, including setup and turnaround.';
  stubApi({ [EVENT]: { body: detail() }, [VENUE]: { body: { venue: { id: 'v-1', name: 'Riverside Hall' } } }, [POST]: { status: 409, body: { error: clash } } });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  fireEvent.click(await screen.findByRole('button', { name: 'Hold venue' }));
  const alert = await screen.findByText(clash);
  expect(alert.closest('[role="alert"], .alert, div')).toBeTruthy();
  expect(screen.getByText("This venue can't be held")).toBeInTheDocument();
});

test('a changed period outside the event is caught before sending', async () => {
  const calls = stubApi({ [EVENT]: { body: detail() }, [VENUE]: { body: { venue: { id: 'v-1', name: 'Riverside Hall' } } } });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  fireEvent.change(await screen.findByLabelText('Hold starts'), { target: { value: toLocalInput('2027-03-10T02:00:00.000Z') } });
  fireEvent.change(screen.getByLabelText('Hold ends'), { target: { value: toLocalInput('2027-03-10T10:00:00.000Z') } });
  fireEvent.click(screen.getByRole('button', { name: 'Hold venue' }));
  expect(await screen.findByText(/^The hold must fall within the event/)).toBeInTheDocument();
  expect(posts(calls)).toHaveLength(0);
});

test('a refused release shows the server sentence', async () => {
  stubApi({ [EVENT]: { body: detail() }, [HOLDS]: { body: holds() }, [POST]: { status: 409, body: { error: 'That tentative hold was not found.' } } });
  renderAt('/coordinator/events/EVT-TECH');
  const section = await card();
  fireEvent.click(await section.findByRole('button', { name: 'Release' }));
  fireEvent.click(section.getByRole('button', { name: 'Release hold' }));
  expect(await section.findByText('That tentative hold was not found.')).toBeInTheDocument();
});

test('server field errors land next to their fields', async () => {
  stubApi({
    [EVENT]: { body: detail() }, [VENUE]: { body: { venue: { id: 'v-1', name: 'Riverside Hall' } } },
    [POST]: { status: 400, body: { error: 'validation_failed', errors: { ends_at: ['The hold must end after it starts.'], starts_at: ['Enter when the hold starts.'], expires_at: ['A hold must last at least 1 hour from now.'] } } },
  });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  fireEvent.click(await screen.findByRole('button', { name: 'Hold venue' }));
  expect(await screen.findByText('The hold must end after it starts.')).toBeInTheDocument();
  expect(screen.getByText('Enter when the hold starts.')).toBeInTheDocument();
  expect(screen.queryByText("This venue can't be held")).not.toBeInTheDocument();
});

test('an event that can no longer hold venues shows why, and a failed load offers a retry', async () => {
  stubApi({ [EVENT]: { body: detail('confirmed') }, [VENUE]: { body: { venue: { id: 'v-1', name: 'Riverside Hall' } } } });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  expect(await screen.findByText(HOLD_MESSAGES.notHoldable)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to event' })).toHaveAttribute('href', '/coordinator/events/EVT-TECH');
  cleanup(); vi.unstubAllGlobals();
  stubApi({ [EVENT]: { body: detail() }, [VENUE]: { status: 404, body: { error: 'Venue not found.' } } });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  expect(await screen.findByText('Venue not found.')).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();
  stubApi({ [EVENT]: { status: 403, body: { error: 'Access denied. This event is not assigned to you.' } } });
  renderAt('/coordinator/events/EVT-TECH/venues/v-1/hold');
  expect(await screen.findByText(/Access denied|this hold/)).toBeInTheDocument();
});

test('validateHold and expiryProblem enforce the period, the event window and the expiry limits', () => {
  const event = { startsAt: STARTS, endsAt: ENDS };
  const now = new Date('2026-10-13T00:00:00.000Z');
  const base = { startsAt: toLocalInput(STARTS), endsAt: toLocalInput(ENDS), customExpiry: false, expiresAt: '' };
  expect(validateHold(base, event, now)).toEqual({});
  expect(validateHold({ ...base, startsAt: '', endsAt: '' }, event, now)).toEqual({ startsAt: HOLD_MESSAGES.startsAt, endsAt: HOLD_MESSAGES.endsAt });
  expect(validateHold({ ...base, endsAt: base.startsAt }, event, now)).toEqual({ endsAt: HOLD_MESSAGES.endBeforeStart });
  expect(validateHold({ ...base, endsAt: toLocalInput('2027-03-10T10:00:00.000Z') }, event, now).endsAt).toMatch(/^The hold must fall within the event/);
  expect(validateHold({ ...base, customExpiry: true }, event, now)).toEqual({ expiresAt: HOLD_MESSAGES.expiresAt });
  expect(expiryProblem(new Date(now.getTime() + 15 * 24 * HOUR), now)).toBe(HOLD_MESSAGES.tooLong);
  expect(expiryProblem(new Date(now.getTime() + 2 * HOUR), now)).toBeNull();
  expect(expiryProblem(null)).toBe(HOLD_MESSAGES.expiresAt);
});

// E06-S05 (SCRUM-49, frontend SCRUM-143) Scenario 8 against a stubbed API
// shaped like holdsHandler.ts: Venue Staff list live holds and move an expiry
// later. Sentences match holds.ts.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { toLocalInput } from '../events/EventEditForm';
import { HOLD_MESSAGES } from './holdsApi';
import { TentativeHolds, validateExtension } from './TentativeHolds';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const LIST = 'GET /api/venues?task=holds';
const POST = 'POST /api/venues';
const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

const soon = {
  id: 'h-1', venueId: 'v-1', venueName: 'Riverside Hall', eventId: 'evt-1', eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2027',
  startsAt: '2027-03-10T01:00:00.000Z', endsAt: '2027-03-10T09:00:00.000Z', status: 'tentative', expiresAt: inHours(24),
};
const later = { ...soon, id: 'h-2', venueName: 'Studio', eventCode: null, eventTitle: 'Open Day', expiresAt: inHours(40) };

function renderPage() {
  render(<MemoryRouter><TentativeHolds /></MemoryRouter>);
}
const cardFor = async (venue: string) => within((await screen.findByRole('heading', { name: venue })).closest('section')!);

test('TC_E06S05_07: live holds are listed soonest expiry first with their event and period', async () => {
  stubApi({ [LIST]: { body: { holds: [soon, later] } } }, { role: 'venue_staff' });
  renderPage();
  const section = await screen.findByRole('region', { name: 'Live tentative holds' });
  expect(within(section).getAllByRole('heading').map(heading => heading.textContent)).toEqual(['Riverside Hall', 'Studio']);
  const first = await cardFor('Riverside Hall');
  expect(first.getByText('EVT-TC Tech Conference 2027')).toBeInTheDocument();
  expect(first.getByText(/^Expires /)).toBeInTheDocument();
  expect((await cardFor('Studio')).getByText('Open Day')).toBeInTheDocument();
});

test('with nothing held the page says so; a failed load offers a retry', async () => {
  let attempt = 0;
  stubApi({ [LIST]: () => (++attempt === 1 ? { status: 503, body: { error: 'Venue holds could not be loaded.' } } : { body: { holds: [] } }) }, { role: 'venue_staff' });
  renderPage();
  expect(await screen.findByText('Venue holds could not be loaded.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
  expect(await screen.findByText('No venues are held')).toBeInTheDocument();
});

test('Scenario 8: a later expiry is saved, confirmed and the list reloads', async () => {
  const newExpiry = toLocalInput(inHours(72));
  let saved = false;
  const calls = stubApi({
    [LIST]: () => ({ body: { holds: [saved ? { ...soon, expiresAt: new Date(newExpiry).toISOString() } : soon] } }),
    [POST]: () => { saved = true; return { body: { hold: { id: 'h-1', expiresAt: new Date(newExpiry).toISOString() } } }; },
  }, { role: 'venue_staff' });
  renderPage();
  const card = await cardFor('Riverside Hall');
  fireEvent.click(card.getByRole('button', { name: 'Change expiry' }));
  const input = card.getByLabelText('New expiry');
  expect(input).toHaveValue(toLocalInput(soon.expiresAt));
  fireEvent.change(input, { target: { value: newExpiry } });
  fireEvent.click(card.getByRole('button', { name: 'Save new expiry' }));
  expect(await screen.findByText(/The hold on Riverside Hall now expires .* recorded in the event's activity log/)).toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST').map(call => call.body)).toEqual([
    { action: 'extend_hold', booking_id: 'h-1', expires_at: new Date(newExpiry).toISOString() },
  ]);
  await waitFor(() => expect(calls.filter(call => call.method === 'GET' && call.url.searchParams.get('task') === 'holds')).toHaveLength(2));
});

test('an earlier or too-distant expiry is refused before sending; Cancel closes the form', async () => {
  const calls = stubApi({ [LIST]: { body: { holds: [soon] } } }, { role: 'venue_staff' });
  renderPage();
  const card = await cardFor('Riverside Hall');
  fireEvent.click(card.getByRole('button', { name: 'Change expiry' }));
  fireEvent.change(card.getByLabelText('New expiry'), { target: { value: toLocalInput(inHours(12)) } });
  fireEvent.click(card.getByRole('button', { name: 'Save new expiry' }));
  expect(await card.findByText(HOLD_MESSAGES.notLater)).toBeInTheDocument();
  fireEvent.change(card.getByLabelText('New expiry'), { target: { value: toLocalInput(inHours(15 * 24)) } });
  fireEvent.click(card.getByRole('button', { name: 'Save new expiry' }));
  expect(await card.findByText(HOLD_MESSAGES.tooLong)).toBeInTheDocument();
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
  fireEvent.click(card.getByRole('button', { name: 'Cancel' }));
  expect(card.queryByLabelText('New expiry')).not.toBeInTheDocument();
  expect(card.getByRole('button', { name: 'Change expiry' })).toBeInTheDocument();
});

test('a server refusal or field error is shown on the hold', async () => {
  const expiredMessage = "This hold has expired, so it can't be changed. Place a new hold if the venue is still needed.";
  let reply: { status: number; body: unknown } = { status: 409, body: { error: expiredMessage } };
  stubApi({ [LIST]: { body: { holds: [soon] } }, [POST]: () => reply }, { role: 'venue_staff' });
  renderPage();
  const card = await cardFor('Riverside Hall');
  fireEvent.click(card.getByRole('button', { name: 'Change expiry' }));
  fireEvent.change(card.getByLabelText('New expiry'), { target: { value: toLocalInput(inHours(72)) } });
  fireEvent.click(card.getByRole('button', { name: 'Save new expiry' }));
  expect(await card.findByText(expiredMessage)).toBeInTheDocument();
  reply = { status: 400, body: { error: 'validation_failed', errors: { expires_at: [HOLD_MESSAGES.notLater] } } };
  fireEvent.click(card.getByRole('button', { name: 'Save new expiry' }));
  expect(await card.findByText(HOLD_MESSAGES.notLater)).toBeInTheDocument();
});

test('validateExtension checks a missing value, the 1-hour floor and the current expiry', () => {
  const now = new Date('2026-10-13T00:00:00.000Z');
  expect(validateExtension('', null, now)).toBe(HOLD_MESSAGES.expiresAt);
  expect(validateExtension(toLocalInput('2026-10-13T00:30:00.000Z'), null, now)).toBe(HOLD_MESSAGES.tooShort);
  expect(validateExtension(toLocalInput('2026-10-14T00:00:00.000Z'), null, now)).toBeNull();
  expect(validateExtension(toLocalInput('2026-10-14T00:00:00.000Z'), '2026-10-15T00:00:00.000Z', now)).toBe(HOLD_MESSAGES.notLater);
});

// E09-S03 (SCRUM-214) Registration period page against a stubbed fetch: the
// read is api/events.ts ?registrations=1 and the save is PATCH ?edit=1.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { RegistrationPeriodPage, periodPatch } from './RegistrationPeriod';
import type { EventRegistrations } from './registrationsApi';
import { toLocalInput } from '../events/EventEditForm';
import { stubApi, type FakeHandler } from '../../testing/fakeApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const OPENS = '2026-10-01T01:00:00.000Z';
const CLOSES = '2026-11-10T09:00:00.000Z';

function view(event: Partial<EventRegistrations['event']> = {}): EventRegistrations {
  return {
    event: { id: 'e-1', eventCode: 'EVT-2001', name: 'Community Meetup', status: 'confirmed', waitlistEnabled: false,
      startsAt: '2026-11-15T01:00:00.000Z', endsAt: '2026-11-15T09:00:00.000Z', registrationEnabled: true,
      opensAt: OPENS, closesAt: CLOSES, withdrawalDeadline: null, ...event },
    capacity: { capacity: 100, registered: 0 }, sessions: [], pending: [],
  };
}

const GET = 'GET /api/events?registrations=1&id=EVT-2001';
const PATCH = 'PATCH /api/events?edit=1&id=EVT-2001';

function renderPage(handlers: Record<string, FakeHandler>) {
  const calls = stubApi(handlers, { role: 'event_organiser' });
  render(
    <MemoryRouter initialEntries={['/organiser/requests/EVT-2001/registration-period']}>
      <Link to="/elsewhere">Leave</Link>
      <Routes>
        <Route path="/organiser/requests/:eventCode/registration-period" element={<RegistrationPeriodPage />} />
        <Route path="/elsewhere" element={<h1>Elsewhere</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return calls;
}

const patches = (calls: ReturnType<typeof stubApi>) => calls.filter(call => call.method === 'PATCH').map(call => call.body);
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

test('periodPatch sends only what changed, both window ends together, and names bad dates', () => {
  const initial = { opensAt: '2026-10-01T09:00', closesAt: '2026-11-10T17:00', withdrawalDeadline: '2026-11-12T17:00', waitlistEnabled: false };
  expect(periodPatch(initial, initial)).toEqual({ patch: {}, errors: {} });
  expect(periodPatch(initial, { ...initial, closesAt: '2026-11-11T17:00' }).patch).toEqual({
    registrationDates: { opensAt: new Date('2026-10-01T09:00').toISOString(), closesAt: new Date('2026-11-11T17:00').toISOString() },
  });
  expect(periodPatch(initial, { ...initial, withdrawalDeadline: '', waitlistEnabled: true }).patch).toEqual({ withdrawalDeadline: null, waitlistEnabled: true });
  expect(periodPatch(initial, { ...initial, withdrawalDeadline: '2026-11-13T17:00' }).patch)
    .toEqual({ withdrawalDeadline: new Date('2026-11-13T17:00').toISOString() });
  expect(periodPatch(initial, { ...initial, opensAt: '', closesAt: '' }).errors)
    .toEqual({ opensAt: 'Enter when registration opens.', closesAt: 'Enter when registration closes.' });
  expect(periodPatch(initial, { ...initial, closesAt: '2026-10-01T09:00' })).toEqual({ patch: {}, errors: { closesAt: 'Registration must close after it opens.' } });
});

test('TC_E09S03_01, _02, _06 - the current period loads, and changes are saved and shown as current', async () => {
  const calls = renderPage({ [GET]: { body: view() }, [PATCH]: { body: { updated: true, fields: ['registrationDates', 'withdrawalDeadline', 'waitlistEnabled'] } } });
  expect(await screen.findByRole('heading', { name: 'Registration period' })).toBeInTheDocument();
  expect(input('Registration opens').value).toBe(toLocalInput(OPENS));
  expect(input('Registration closes').value).toBe(toLocalInput(CLOSES));
  expect(input('Withdrawal deadline (optional)').value).toBe('');
  expect(screen.getByText(/One window for the whole event/)).toBeInTheDocument();
  expect(screen.getByText(/no withdrawal|open from/)).toBeInTheDocument();
  fireEvent.change(input('Registration closes'), { target: { value: '2026-11-12T17:00' } });
  fireEvent.change(input('Withdrawal deadline (optional)'), { target: { value: '2026-11-13T17:00' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Offer a waiting list/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  expect(await screen.findByText('Registration period saved.')).toBeInTheDocument();
  expect(patches(calls)).toEqual([{
    registrationDates: { opensAt: new Date(toLocalInput(OPENS)).toISOString(), closesAt: new Date('2026-11-12T17:00').toISOString() },
    withdrawalDeadline: new Date('2026-11-13T17:00').toISOString(), waitlistEnabled: true,
  }]);
  expect(screen.getByText(/withdrawals until/)).toBeInTheDocument();
  // Saved values are now the baseline.
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  expect(await screen.findByText('Nothing has changed yet.')).toBeInTheDocument();
  expect(patches(calls)).toHaveLength(1);
});

test('TC_E09S03_05 - a closing date after the event starts is only saved after "Save anyway"', async () => {
  const warning = 'Registration would close after the event starts on 15 Nov 2026, 9:00 am. Confirm to save it anyway.';
  const calls = renderPage({ [GET]: { body: view() }, [PATCH]: (_url, init) => JSON.parse(String(init?.body)).confirmLateClose
    ? { body: { updated: true, fields: ['registrationDates'] } } : { status: 428, body: { error: warning } } });
  await screen.findByRole('heading', { name: 'Registration period' });
  fireEvent.change(input('Registration closes'), { target: { value: '2026-11-20T17:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  expect(await screen.findByText('Confirm the closing date')).toBeInTheDocument();
  expect(screen.getByText(new RegExp(`${warning} Attendees could still register`))).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save registration period' })).toBeDisabled();
  // Changing a date withdraws the warning; saving again brings it back.
  fireEvent.change(input('Registration closes'), { target: { value: '2026-11-21T17:00' } });
  expect(screen.queryByText('Confirm the closing date')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Save anyway' }));
  expect(await screen.findByText('Registration period saved.')).toBeInTheDocument();
  expect(patches(calls).map(body => (body as { confirmLateClose?: boolean }).confirmLateClose)).toEqual([undefined, undefined, true]);
  expect(screen.queryByText('Confirm the closing date')).not.toBeInTheDocument();
});

test('bad dates are caught before sending, and server refusals are shown', async () => {
  const calls = renderPage({ [GET]: { body: view() }, [PATCH]: { status: 409, body: { error: 'Cancelled events are read-only.' } } });
  await screen.findByRole('heading', { name: 'Registration period' });
  fireEvent.change(input('Registration opens'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  expect(screen.getByText('Enter when registration opens.')).toBeInTheDocument();
  expect(screen.getByText('Fix the highlighted dates, then save again.')).toBeInTheDocument();
  expect(patches(calls)).toEqual([]);
  fireEvent.change(input('Registration opens'), { target: { value: '2026-10-02T09:00' } });
  expect(screen.queryByText('Enter when registration opens.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  expect(await screen.findByText('Cancelled events are read-only.')).toBeInTheDocument();
});

test('an event not taking registrations points to a change request; a cancelled one is read-only', async () => {
  renderPage({ [GET]: { body: view({ registrationEnabled: false, opensAt: null, closesAt: null, withdrawalDeadline: '2026-11-12T09:00:00.000Z' }) } });
  expect(await screen.findByText("This event isn't taking registrations")).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Change requests' })).toHaveAttribute('href', '/organiser/requests/EVT-2001/change');
  expect(screen.getByText(/no registration window set; withdrawals until/)).toBeInTheDocument();
  cleanup();
  renderPage({ [GET]: { body: view({ status: 'cancelled', eventCode: null }) } });
  expect(await screen.findByText('This event is cancelled, so its registration period can\'t change.')).toBeInTheDocument();
  expect(input('Registration opens')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save registration period' })).toBeDisabled();
});

test('a load failure is explained, and leaving mid-save drops the late reply', async () => {
  renderPage({ [GET]: { status: 404, body: { error: 'Event not found.' } } });
  expect(await screen.findByRole('heading', { name: 'Registration period unavailable' })).toBeInTheDocument();
  cleanup();
  let release!: () => void;
  const calls = renderPage({ [GET]: { body: view() }, [PATCH]: () => new Promise(resolve => {
    release = () => resolve({ body: { updated: true, fields: ['waitlistEnabled'] } });
  }) });
  await screen.findByRole('heading', { name: 'Registration period' });
  fireEvent.click(screen.getByRole('checkbox', { name: /Offer a waiting list/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  await waitFor(() => expect(patches(calls)).toHaveLength(1));
  fireEvent.click(screen.getByText('Leave'));
  await act(async () => { release(); });
  expect(screen.getByRole('heading', { name: 'Elsewhere' })).toBeInTheDocument();
});

test('saving only the waiting list keeps the stored window as current', async () => {
  const calls = renderPage({ [GET]: { body: view({ withdrawalDeadline: '2026-11-12T09:00:00.000Z' }) }, [PATCH]: { body: { updated: true, fields: ['waitlistEnabled'] } } });
  await screen.findByRole('heading', { name: 'Registration period' });
  fireEvent.click(screen.getByRole('checkbox', { name: /Offer a waiting list/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save registration period' }));
  expect(await screen.findByText('Registration period saved.')).toBeInTheDocument();
  expect(patches(calls)).toEqual([{ waitlistEnabled: true }]);
  expect(screen.getByText(/open from .*; withdrawals until/)).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Offer a waiting list/ })).toBeChecked();
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { EventEditForm, toLocalInput } from './EventEditForm';
import { ChangeRequests } from './ChangeRequests';

const values = { title: 'Community Meetup', description: null, purpose: null, starts_at: '2027-03-01T01:00:00.000Z', ends_at: '2027-03-01T04:00:00.000Z', expected_attendance: 40, venue_requirements: 'Hall', accessibility_note: null, equipment_requirements: null, layout_preference: null };
const view = { event: { id: 'event-a', eventCode: 'EVT-A', status: 'confirmed' }, permissions: { canSubmit: true, canDecide: false }, current: { expectedAttendance: 40, startAt: values.starts_at, endAt: values.ends_at }, requests: [] };
const patch = 'PATCH /api/events?edit=1&id=event-a';
const read = 'GET /api/events?changeRequests=1&id=event-a';
const write = 'POST /api/events?changeRequests=1&id=event-a';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Location() { const location = useLocation(); return <output aria-label="Current URL">{location.pathname}{location.search}</output>; }
function mount(organiser = true) {
  return render(<MemoryRouter initialEntries={['/edit']}><Location /><Routes>
    <Route path="/edit" element={<EventEditForm eventId="event-a" values={values} editable={new Set(['expectedAttendance', 'startAt'])} offerChangeRequest={organiser} onSaved={() => { throw new Error('A refused edit must not save'); }} onCancel={() => {}} />} />
    <Route path="/change-requests/new" element={<ChangeRequests />} />
  </Routes></MemoryRouter>);
}

test('TC_E10S01_03: refused save offers an explicit link, preserves attempted attendance, and only submits on confirmation', async () => {
  const calls = stubApi({ [patch]: { status: 409, body: { error: 'Direct editing of expectedAttendance is not allowed after approval. Raise a change request.', changeRequestUrl: '/change-requests/new?event=event-a' } }, [read]: { body: view }, [write]: { status: 201, body: { request: { id: 'request-a' } } } });
  mount();
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '75' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  const link = await screen.findByRole('link', { name: 'Request a change' });
  expect(screen.getByRole('alert').parentElement).toHaveFocus();
  expect(screen.getByLabelText('Expected attendance')).toHaveValue(75);
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
  fireEvent.click(link);
  expect(await screen.findByRole('checkbox', { name: 'Change expected attendance' })).toBeChecked();
  expect(screen.getByLabelText('New expected attendance')).toHaveValue(75);
  expect(screen.getByText('Current: 40')).toBeInTheDocument();
  expect(screen.getByLabelText('Current URL')).toHaveTextContent('/change-requests/new?event=event-a&fields=expectedAttendance');
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Describe the change'), { target: { value: 'More guests are expected' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
  await screen.findByText('Change request sent for Coordinator review. Current Event details stay unchanged.');
  expect(calls.find(call => call.method === 'POST')?.body).toEqual({ description: 'More guests are expected', changes: { expectedAttendance: 75 } });
  expect(screen.getByRole('checkbox', { name: 'Change expected attendance' })).not.toBeChecked();
});
test('TC_E10S01_03: an attempted date is transferred as the proposed Singapore-time input', async () => {
  const calls = stubApi({ [patch]: { status: 409, body: { error: 'Restricted after approval.', changeRequestUrl: '/change-requests/new?event=event-a' } }, [read]: { body: view } });
  mount();
  // A fixed local 09:30 is after the 04:00 end on UTC CI. Choose a real
  // instant inside the Event range, then render the edit form's local input.
  const attemptedIso = '2027-03-01T01:30:00.000Z';
  const attempted = toLocalInput(attemptedIso);
  fireEvent.change(screen.getByLabelText('Starts'), { target: { value: attempted } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Request a change' }));
  expect(calls.find(call => call.method === 'PATCH')?.body).toEqual({ startAt: attemptedIso });
  expect(await screen.findByLabelText('New start date and time')).toHaveValue('2027-03-01T09:30');
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0);
});
test('Editing a refused draft clears its stale recovery link', async () => {
  stubApi({ [patch]: { status: 409, body: { error: 'Restricted.', changeRequestUrl: '/change-requests/new?event=event-a' } } });
  mount();
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '75' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByRole('link', { name: 'Request a change' });
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '80' } });
  expect(screen.queryByRole('link', { name: 'Request a change' })).not.toBeInTheDocument();
});
test('The Coordinator edit form never offers the Organiser-only recovery', async () => {
  stubApi({ [patch]: { status: 409, body: { error: 'An unrelated conflict.', changeRequestUrl: '/change-requests/new?event=event-a' } } });
  mount(false);
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '75' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('An unrelated conflict.');
  expect(screen.queryByRole('link', { name: 'Request a change' })).not.toBeInTheDocument();
});
test('TC_E10S01_03: a locked-field query link selects its current value, unknown fields are ignored', async () => {
  stubApi({ [read]: { body: view } });
  render(<MemoryRouter initialEntries={['/change-requests/new?event=event-a&fields=expectedAttendance,unknown']}><ChangeRequests /></MemoryRouter>);
  expect(await screen.findByLabelText('New expected attendance')).toHaveValue(40);
  expect(screen.getByRole('checkbox', { name: 'Change expected attendance' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Change event name' })).not.toBeChecked();
});
test.each([false, true])('Prefill never grants submit permission: terminal=%s', async terminal => {
  stubApi({ [read]: { body: { ...view, event: { ...view.event, status: terminal ? 'completed' : 'confirmed' }, permissions: { canSubmit: false, canDecide: false } } } });
  render(<MemoryRouter initialEntries={['/change-requests/new?event=event-a&fields=expectedAttendance']}><ChangeRequests /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Recorded change requests' });
  expect(screen.queryByRole('button', { name: 'Send change request' })).not.toBeInTheDocument();
});

// E03-S07 (SCRUM-37) on the Coordinator event page: the assigned Coordinator
// edits an approved event (Scenario 2); edits are unavailable before approval;
// a server refusal (Scenario 5, e.g. after a reassignment) is shown as-is.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { RequestDetail } from './CoordinatorWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1004', event_code: 'EVT-1004', title: 'Annual Tech Summit', status: 'approved', status_changed_at: '2026-09-20T01:00:00.000Z',
    starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z', expected_attendance: 200,
    coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com',
    description: 'A summit.', purpose: null, venue_requirements: 'Lecture theatre', accessibility_note: null,
    equipment_requirements: null, layout_preference: null, registration_setup: null, coordinator_id: 'c-1',
    coordinator_name: 'Coord A', pendingReassignment: null, ...overrides,
  };
}

type Reply = { status: number; body: unknown };
// patchReplies answers successive saves in order, then patchReply takes over.
function stub(options: { event?: Record<string, unknown>; patchReply?: Reply; patchReplies?: Reply[]; previewReply?: Reply } = {}) {
  let current = detail(options.event);
  const patches: { url: URL; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    let reply: { status: number; body: unknown };
    if (url.pathname === '/api/auth/session') reply = { status: 401, body: {} };
    else if (url.pathname === '/api/notifications') reply = { status: 200, body: { notifications: [] } };
    // The Technical support card (E07-S06) on approved events.
    else if (url.searchParams.get('task') === 'support') reply = { status: 200, body: { event: {}, requests: [], noSupportRequired: false, canEdit: true } };
    // The Venue holds card (E06-S05) on approved and planning events.
    else if (url.searchParams.get('task') === 'holds') reply = { status: 200, body: { event: {}, holds: [], canHold: true } };
    else if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      patches.push({ url, body });
      // E10-S02: the Coordinator's Save first asks for a preview (&preview=1).
      if (url.searchParams.get('preview') === '1') reply = options.previewReply ?? { status: 200, body: { impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [] } };
      else reply = options.patchReplies?.shift() ?? options.patchReply ?? { status: 200, body: { updated: true, eventId: 'evt-1004', fields: Object.keys(body) } };
      if (reply.status === 200 && !url.searchParams.get('preview') && typeof body.venueRequirements === 'string') current = { ...current, venue_requirements: body.venueRequirements };
    } else reply = { status: 200, body: { event: current } };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return patches;
}

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/coordinator/events/EVT-1004']}>
      <Routes><Route path="/coordinator/events/:eventCode" element={<RequestDetail />} /></Routes>
    </MemoryRouter>,
  );
}

test('the assigned Coordinator edits an approved event and only the changed field is sent', async () => {
  const patches = stub();
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  const form = screen.getByRole('form', { name: 'Edit event details' });
  expect(within(form).getByLabelText('Expected attendance')).toHaveValue(200);
  expect(within(form).getByRole('button', { name: 'Save changes' })).toBeDisabled();

  fireEvent.change(within(form).getByLabelText('Venue requirements'), { target: { value: 'Lecture theatre with step-free access' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByText("Saved your changes to the venue requirements. They're recorded in the event's activity log.")).toBeInTheDocument();
  expect(await screen.findByText('Lecture theatre with step-free access')).toBeInTheDocument();
  // TC_E10S02_02 shape: nothing affected, so no review step; preview then save, same body.
  expect(patches.map(patch => patch.url.search)).toEqual(['?edit=1&id=evt-1004&preview=1', '?edit=1&id=evt-1004']);
  expect(patches.map(patch => patch.body)).toEqual([{ venueRequirements: 'Lecture theatre with step-free access' }, { venueRequirements: 'Lecture theatre with step-free access' }]);
  expect(screen.queryByRole('form', { name: 'Check what this change affects' })).not.toBeInTheDocument();
});

test('before approval the Coordinator sees the details read-only with an explanation', async () => {
  stub({ event: { status: 'under_review' } });
  renderDetail();
  expect(await screen.findByText('You can edit these details once the event is approved. Until then, the Organiser keeps them up to date.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
});

test('a refused edit keeps the form open and shows the server reason', async () => {
  stub({ patchReply: { status: 403, body: { error: 'Only the assigned Coordinator may edit an approved event.' } } });
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Tech Summit 2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the assigned Coordinator may edit an approved event.');
  expect(screen.getByRole('form', { name: 'Edit event details' })).toBeInTheDocument();
});

test('invalid values are flagged next to the field and nothing is sent', async () => {
  const patches = stub();
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Venue requirements'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Fix the highlighted fields, then save again.');
  expect(screen.getByLabelText('Expected attendance')).toHaveAccessibleDescription('Enter a whole number greater than 0.');
  expect(screen.getByLabelText('Venue requirements')).toHaveAccessibleDescription("Venue requirements can't be left empty.");
  expect(patches).toHaveLength(0);
});

test('cancelling closes the form without saving', async () => {
  const patches = stub();
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Something else' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('form', { name: 'Edit event details' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Annual Tech Summit' })).toBeInTheDocument();
  expect(patches).toHaveLength(0);
});

// E10-S02 (SCRUM-237): what a change affects is shown before it is saved.
const hall = { id: 'booking-a', sessionId: 'session-a', venueId: 'hall', venueName: 'Riverside Hall', reasons: ['time'], governingHeadcount: 200, capacity: 200 };
const projector = { id: 'reservation-a', sessionId: 'session-a', equipmentId: 'projector', equipmentName: 'Projector', reasons: ['time'] };
const dateImpact = { impact: { affected: true, bookings: [hall], reservations: [projector] }, overSubscription: [] };

async function editStart(value = '2026-11-20T09:00') {
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  // Move the whole event so it still ends after it starts.
  fireEvent.change(screen.getByLabelText('Starts'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-11-20T12:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
}

test('TC_E10S02_03: a date change shows the affected booking and equipment, and saves only after confirming', async () => {
  const patches = stub({ previewReply: { status: 200, body: dateImpact }, patchReply: { status: 200, body: { updated: true, fields: ['startAt'], ...dateImpact } } });
  await editStart();
  const review = await screen.findByRole('form', { name: 'Check what this change affects' });
  // Focus moves in an effect after the review renders, so wait for it (it was flaky, 2 in 12 runs).
  await waitFor(() => expect(review.parentElement).toHaveFocus());
  expect(within(review).getByRole('heading', { name: 'Venue bookings to reconfirm' })).toBeInTheDocument();
  expect(within(review).getByText('Riverside Hall').closest('li')).toHaveTextContent('Riverside Hall: date or time changed');
  expect(within(review).getByText('Projector').closest('li')).toHaveTextContent('Projector: date or time changed');
  expect(review).toHaveTextContent('Saving flags these for reconfirmation and notifies the Venue Staff and Technical Support Staff.');
  expect(patches).toHaveLength(1);
  expect(patches[0].url.searchParams.get('preview')).toBe('1');

  fireEvent.click(within(review).getByRole('button', { name: 'Save and ask staff to reconfirm' }));
  expect(await screen.findByText(/2 arrangements were flagged for reconfirmation and the Venue Staff and Technical Support Staff were notified\./)).toBeInTheDocument();
  expect(patches).toHaveLength(2);
  expect(patches[1].url.searchParams.get('preview')).toBeNull();
  expect(patches[1].body).toEqual(patches[0].body);
});

test('TC_E10S02_06 (T-103): a change flagging only staffed support counts it and names Technical Support Staff', async () => {
  const sound = { id: 'support-a', description: 'Sound desk', startsAt: '2026-11-15T00:00:00.000Z', endsAt: '2026-11-15T04:00:00.000Z', reasons: ['time'], shiftMs: 5 * 86400000 };
  const supportOnly = { impact: { affected: true, bookings: [], reservations: [], supports: [sound] }, overSubscription: [] };
  stub({ previewReply: { status: 200, body: supportOnly }, patchReply: { status: 200, body: { updated: true, fields: ['startAt'], ...supportOnly } } });
  await editStart();
  const review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(within(review).getByRole('heading', { name: 'Technical Support to reconfirm' })).toBeInTheDocument();
  fireEvent.click(within(review).getByRole('button', { name: 'Save and ask staff to reconfirm' }));
  expect(await screen.findByText(/1 arrangement was flagged for reconfirmation and the Technical Support Staff were notified\./)).toBeInTheDocument();
});

test('TC_E10S02_01: attendance above capacity names the headcount and places; one flag tells the Venue Staff', async () => {
  const capacity = { impact: { affected: true, bookings: [{ ...hall, reasons: ['capacity'], governingHeadcount: 250 }], reservations: [] }, overSubscription: [] };
  stub({ previewReply: { status: 200, body: capacity }, patchReply: { status: 200, body: { updated: true, fields: ['expectedAttendance'], ...capacity } } });
  renderDetail();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
  fireEvent.change(screen.getByLabelText('Expected attendance'), { target: { value: '250' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  const review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(within(review).getByText('Riverside Hall').closest('li')).toHaveTextContent('Riverside Hall: 250 people for 200 places');
  expect(within(review).queryByRole('heading', { name: 'Equipment to reconfirm' })).not.toBeInTheDocument();
  expect(review).toHaveTextContent('notifies the Venue Staff.');
  fireEvent.click(within(review).getByRole('button', { name: 'Save and ask staff to reconfirm' }));
  expect(await screen.findByText(/1 arrangement was flagged for reconfirmation and the Venue Staff were notified\./)).toBeInTheDocument();
});

test('TC_E10S02_04: over-subscription warns, removes nobody, and the plain Save still applies the change', async () => {
  const over = { impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [
    { scope: 'session', sessionId: 'session-a', registered: 100, capacity: 80 },
    { scope: 'event', sessionId: null, registered: 100, capacity: 80 },
  ] };
  stub({ previewReply: { status: 200, body: over }, patchReply: { status: 200, body: { updated: true, fields: ['startAt'], ...over } } });
  await editStart();
  const review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(within(review).getByRole('alert')).toHaveTextContent('A Session: 100 registered for 80 places. The whole event: 100 registered for 80 places. No one will be removed or moved to the waiting list.');
  expect(review).not.toHaveTextContent('Saving flags these');
  fireEvent.click(within(review).getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText(/no one was removed or moved to the waiting list\./)).toBeInTheDocument();
  expect(screen.queryByText(/flagged for reconfirmation/)).not.toBeInTheDocument();
});

test('cancelling the review returns to the form with the edit kept and saves nothing', async () => {
  const patches = stub({ previewReply: { status: 200, body: dateImpact } });
  await editStart();
  const review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(review).toHaveTextContent('Cancel goes back to your edits without saving.');
  fireEvent.click(within(review).getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Edit event details' })).toHaveFocus());
  expect(screen.getByLabelText('Starts')).toHaveValue('2026-11-20T09:00');
  expect(patches).toHaveLength(1);
});

test('a refused preview is shown in the form, with no review step and nothing saved', async () => {
  const patches = stub({ previewReply: { status: 403, body: { error: 'Only the assigned Coordinator may edit an approved event.' } } });
  await editStart();
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the assigned Coordinator may edit an approved event.');
  expect(screen.queryByRole('form', { name: 'Check what this change affects' })).not.toBeInTheDocument();
  expect(patches).toHaveLength(1);
});

test('a save refused after the review goes back to the form and shows why', async () => {
  stub({ previewReply: { status: 200, body: dateImpact }, patchReply: { status: 409, body: { error: 'The event changed while you were reviewing. Check it and save again.' } } });
  await editStart();
  fireEvent.click(within(await screen.findByRole('form', { name: 'Check what this change affects' })).getByRole('button', { name: 'Save and ask staff to reconfirm' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The event changed while you were reviewing. Check it and save again.');
  expect(screen.getByRole('form', { name: 'Edit event details' })).toBeInTheDocument();
});

// #380 review: the save is bound to the list the Coordinator saw.
const hallB = { ...hall, id: 'booking-b', venueId: 'hall-b', venueName: 'Garden Hall' };
const stale = (bookings: typeof hall[], revision: string): Reply => ({ status: 409, body: {
  error: 'arrangements_changed', message: 'What this change affects has changed since you checked. Review the updated list before saving.',
  impact: { affected: true, bookings, reservations: [] }, overSubscription: [], revision } });

test('confirming the review sends the revision of the list that was shown', async () => {
  const patches = stub({ previewReply: { status: 200, body: { ...dateImpact, revision: 'rev-shown' } }, patchReply: { status: 200, body: { updated: true, fields: ['startAt'], ...dateImpact } } });
  await editStart();
  fireEvent.click(within(await screen.findByRole('form', { name: 'Check what this change affects' })).getByRole('button', { name: 'Save and ask staff to reconfirm' }));
  expect(await screen.findByText(/2 arrangements were flagged for reconfirmation/)).toBeInTheDocument();
  expect(patches[1].url.searchParams.get('reviewed')).toBe('rev-shown');
});

test('a save refused because the arrangements changed shows the fresh list, saves nothing, and confirming it sends the new revision', async () => {
  const preview = { impact: { affected: true, bookings: [hall], reservations: [] }, overSubscription: [], revision: 'rev-hall-a' };
  const saved = { impact: { affected: true, bookings: [hall, hallB], reservations: [] }, overSubscription: [], revision: 'rev-both' };
  const patches = stub({ previewReply: { status: 200, body: preview },
    patchReplies: [stale([hall, hallB], 'rev-both'), { status: 200, body: { updated: true, fields: ['startAt'], ...saved } }] });
  await editStart();
  let review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(within(review).queryByText('Garden Hall')).not.toBeInTheDocument();
  fireEvent.click(within(review).getByRole('button', { name: 'Save and ask staff to reconfirm' }));

  review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(await within(review).findByText('Garden Hall')).toBeInTheDocument();
  expect(within(review).getByText('Riverside Hall')).toBeInTheDocument();
  expect(within(review).getByRole('alert')).toHaveTextContent('What this change affects has changed since you checked. Review the updated list before saving.');
  await waitFor(() => expect(review.parentElement).toHaveFocus());
  expect(screen.queryByText(/flagged for reconfirmation and/)).not.toBeInTheDocument();
  expect(patches[1].url.searchParams.get('reviewed')).toBe('rev-hall-a');

  fireEvent.click(within(review).getByRole('button', { name: 'Save and ask staff to reconfirm' }));
  expect(await screen.findByText(/2 arrangements were flagged for reconfirmation and the Venue Staff were notified\./)).toBeInTheDocument();
  expect(patches).toHaveLength(3);
  expect(patches[2].url.searchParams.get('reviewed')).toBe('rev-both');
  expect(patches[2].body).toEqual(patches[0].body);
});

test('a save with nothing to review is still bound: if something became affected, the review appears instead', async () => {
  const patches = stub({ previewReply: { status: 200, body: { impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [], revision: 'rev-nothing' } },
    patchReplies: [stale([hallB], 'rev-hall-b')] });
  await editStart();
  const review = await screen.findByRole('form', { name: 'Check what this change affects' });
  expect(within(review).getByText('Garden Hall')).toBeInTheDocument();
  expect(within(review).getByRole('alert')).toHaveTextContent('has changed since you checked');
  expect(patches.map(patch => patch.url.searchParams.get('reviewed'))).toEqual([null, 'rev-nothing']);
  expect(screen.queryByText(/Saved your changes/)).not.toBeInTheDocument();
});

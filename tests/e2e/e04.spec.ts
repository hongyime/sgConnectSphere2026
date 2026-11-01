// E04-S02 "Create a multi-session event" (SCRUM-39; screens SCRUM-239).
// An in-memory stand-in for the Session, venue-search and booking endpoints,
// shaped like backend/src/modules/eventSessions and venueBooking. The real rules
// (per-Session needs, booking per Session, release on delete) are proven against
// PostgreSQL in backend/tests/eventSessionsRoutes.integration.test.ts.
import { test, expect, type Page, type Route } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

type Session = {
  id: string; title?: string; startAt: string; endAt: string; expectedAttendance: number; layoutId?: string;
  venueRequirements?: string; equipmentRequirements?: string; accessibilityFeatureIds: string[]; facilityIds: string[];
};
type Booking = { id: string; session_id: string; status: string; starts_at: string; ends_at: string };

const options = {
  layouts: [{ id: 'theatre', label: 'Theatre' }, { id: 'classroom', label: 'Classroom' }],
  accessibility: [{ id: 'step-free', label: 'Step-free access' }],
  facilities: [{ id: 'projector', label: 'Projector' }, { id: 'mics', label: 'Microphones' }],
};
const event = { id: 'evt-forum', code: 'EVT-FORUM', title: 'Two-day Sustainability Forum' };
const hall = { id: 'hall', name: 'Main Hall', location: 'Level 1', max_capacity: 150, effective_capacity: 150, available: true,
  layouts: [{ id: 'theatre', label: 'Theatre', capacity: 150 }], facilities: [{ id: 'mics', label: 'Microphones' }], accessibility: [] };

async function fakeSessionsBackend(page: Page, start: { status: 'draft' | 'planning'; sessions: Session[]; bookings?: Booking[] }) {
  const state = { ...start, bookings: start.bookings ?? [], audit: [] as string[], nextId: 1 };
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });

  await page.route('**/api/events?*', route => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    if (params.get('sessions') === '1') {
      const sessionId = params.get('sessionId');
      if (request.method() === 'GET') return json(route, 200, { sessions: state.sessions, eventStatus: state.status, options });
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as Omit<Session, 'id'>;
        const session = { ...body, id: `s-new-${state.nextId++}` };
        state.sessions.push(session);
        return json(route, 201, { session });
      }
      const index = state.sessions.findIndex(session => session.id === sessionId);
      if (index < 0) return json(route, 404, { error: 'Session not found.' });
      if (request.method() === 'PATCH') {
        if (params.get('preview') === '1') {
          return json(route, 200, { preview: { impact: { affected: false, bookings: [], reservations: [], supports: [] }, overSubscription: [], revision: 'r1' } });
        }
        state.sessions[index] = { ...state.sessions[index]!, ...(request.postDataJSON() as Partial<Session>) };
        return json(route, 200, { session: state.sessions[index] });
      }
      if (request.method() === 'DELETE') {
        if (state.sessions.length < 2) return json(route, 409, { error: 'An Event must keep at least one Session.' });
        const [removed] = state.sessions.splice(index, 1);
        const released = state.bookings.filter(booking => booking.session_id === removed!.id && booking.status === 'confirmed');
        for (const booking of released) booking.status = 'released';
        state.audit.push(`Session Deleted: ${removed!.title}`);
        return json(route, 200, { deleted: true, releasedBookings: released.length, releasedReservations: 0, notifiedStaff: released.length ? 1 : 0 });
      }
    }
    if (request.method() === 'GET' && params.get('mine') === '1') {
      return json(route, 200, { event: {
        id: event.id, title: event.title, purpose: 'Share campus sustainability work', description: 'Talks and a panel',
        startAt: state.sessions[0]!.startAt, endAt: state.sessions.at(-1)!.endAt, expectedAttendance: 120, status: state.status,
      } });
    }
    if (request.method() === 'GET') {
      return json(route, 200, { event: {
        id: event.id, event_code: event.code, title: event.title, status: state.status, status_changed_at: '2027-02-01T01:00:00.000Z',
        starts_at: state.sessions[0]!.startAt, ends_at: state.sessions.at(-1)!.endAt, expected_attendance: 120,
        purpose: 'Share campus sustainability work', organiser_id: 'test-event_organiser', creator_name: 'Organiser A',
        coordinator_id: 'c-1', coordinator_name: 'Coord B', statusHistory: [], comments: [], outstandingQuestions: [],
      } });
    }
    return json(route, 404, { error: 'Not handled by the test backend.' });
  });

  await page.route('**/api/venues?*', route => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    if (params.get('accessibilityFeatures') === '1') return json(route, 200, { features: options.accessibility });
    const session = state.sessions.find(item => item.id === params.get('session_id'));
    const defaults = session
      ? { title: event.title, start: session.startAt, end: session.endAt, attendance: session.expectedAttendance, layout: session.layoutId ?? '',
        accessibility: session.accessibilityFeatureIds, facilities: session.facilityIds, session_id: session.id, session_title: session.title ?? null }
      : { title: event.title, start: state.sessions[0]!.startAt, end: state.sessions.at(-1)!.endAt, attendance: 120 };
    if (params.get('mode') === 'booking_requests') {
      return json(route, 200, { event: { id: event.id, event_code: event.code, title: event.title, status: state.status },
        bookings: state.bookings.map(booking => ({ ...booking, venue_id: hall.id, venue_name: hall.name, location: hall.location,
          created_at: '2027-02-01T01:00:00.000Z', decision_reason: null,
          session_title: state.sessions.find(item => item.id === booking.session_id)?.title ?? 'Deleted Session' })) });
    }
    if (params.get('mode') === 'assessment') {
      const needsStepFree = session?.accessibilityFeatureIds.includes('step-free') ?? false;
      return json(route, 200, {
        event: { id: event.id, title: event.title, status: state.status, start: defaults.start, end: defaults.end },
        session: session ? { id: session.id, title: session.title ?? null } : null,
        assessment: { ...hall, suitable: !needsStepFree, advisory: true, mismatches: needsStepFree ? ['Missing accessibility feature: Step-free access'] : [],
          comparisons: [{ criterion: 'Expected attendance', required: String(defaults.attendance), provided: String(hall.max_capacity) }] },
      });
    }
    if (params.get('search') === '1') {
      const needsStepFree = (params.get('accessibility') ?? '').includes('step-free');
      const tooMany = Number(params.get('attendance')) > hall.max_capacity;
      const mismatches = [...(needsStepFree ? ['Missing accessibility feature: Step-free access'] : []), ...(tooMany ? ['Capacity 150 is below the required places.'] : [])];
      return json(route, 200, { venues: [{ ...hall, suitable: mismatches.length === 0, mismatches }] });
    }
    return json(route, 200, { options, defaults, sessions: state.sessions.map(item => ({
      id: item.id, title: item.title ?? null, start: item.startAt, end: item.endAt, attendance: item.expectedAttendance })) });
  });

  await page.route('**/api/venues', route => {
    const body = route.request().postDataJSON() as { session_id?: string; starts_at: string; ends_at: string };
    if (state.sessions.length > 1 && !body.session_id) return json(route, 409, { error: 'Select a Session for this booking request.' });
    const id = `b-${state.nextId++}`;
    state.bookings.push({ id, session_id: body.session_id!, status: 'pending', starts_at: body.starts_at, ends_at: body.ends_at });
    return json(route, 201, { booking: { id }, suitability: { suitable: true, mismatches: [] } });
  });
  return state;
}

const morning: Session = {
  id: 's-morning', title: 'Morning talks', startAt: '2027-03-12T01:00:00.000Z', endAt: '2027-03-12T03:00:00.000Z',
  expectedAttendance: 40, venueRequirements: 'Small hall', equipmentRequirements: 'Projector',
  accessibilityFeatureIds: ['step-free'], facilityIds: ['projector'],
};
const panel: Session = {
  id: 's-panel', title: 'Afternoon panel', startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z',
  expectedAttendance: 120, layoutId: 'theatre', venueRequirements: 'Stage', equipmentRequirements: 'Two microphones',
  accessibilityFeatureIds: [], facilityIds: ['mics'],
};

async function screenshot(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true });
}

test('TC_E04S02_01: a draft with one Session needs no extra setup', async ({ page }) => {
  await signInAs(page, 'event_organiser');
  const state = await fakeSessionsBackend(page, { status: 'draft', sessions: [{ ...morning, title: 'Opening', accessibilityFeatureIds: [], facilityIds: [] }] });
  await page.goto(`/organiser/drafts/${event.id}`);

  const editor = page.getByRole('region', { name: 'Event Sessions' });
  await expect(editor.getByLabel('Session title')).toHaveValue('Opening');
  await expect(editor.getByText(/uses the event’s own requirements/)).toBeVisible();
  await expect(editor.getByLabel('Room layout')).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Remove session' })).toBeDisabled();
  await editor.getByRole('button', { name: 'Save session' }).click();
  await expect(editor.getByText('Session saved.')).toBeVisible();
  expect(state.sessions).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, 'e04s02-single-session');
});

test('TC_E04S02_02: two Sessions keep their own dates, attendance and requirements', async ({ page }) => {
  await signInAs(page, 'event_organiser');
  const state = await fakeSessionsBackend(page, { status: 'draft', sessions: [{ ...morning }] });
  await page.goto(`/organiser/drafts/${event.id}`);

  const editor = page.getByRole('region', { name: 'Event Sessions' });
  await editor.getByRole('button', { name: 'Add session' }).click();
  await expect(editor.getByText('Session added.')).toBeVisible();
  await expect(editor.getByRole('listitem', { name: 'New Session' })).toBeVisible();
  // The row is named after its title, which changes as it is typed.
  const added = editor.getByRole('listitem').nth(1);
  await added.getByLabel('Session title').fill('Afternoon panel');
  await added.getByLabel('Expected attendance').fill('120');
  await added.getByLabel('Starts').fill('2027-03-13T13:00');
  await added.getByLabel('Ends').fill('2027-03-13T16:00');
  await added.getByLabel(/Venue requirements/).fill('Stage');
  await added.getByLabel(/Equipment requirements/).fill('Two microphones');
  await added.getByLabel('Room layout').selectOption('theatre');
  await added.getByLabel('Step-free access').uncheck();
  await added.getByLabel('Projector').uncheck();
  await added.getByLabel('Microphones').check();
  await added.getByRole('button', { name: 'Save session' }).click();
  await expect(editor.getByText('Session saved.')).toBeVisible();

  await page.reload();
  const first = page.getByRole('listitem', { name: 'Morning talks' });
  const second = page.getByRole('listitem', { name: 'Afternoon panel' });
  await expect(first.getByLabel('Expected attendance')).toHaveValue('40');
  await expect(first.getByLabel('Step-free access')).toBeChecked();
  await expect(first.getByLabel(/Equipment requirements/)).toHaveValue('Projector');
  await expect(second.getByLabel('Expected attendance')).toHaveValue('120');
  await expect(second.getByLabel('Step-free access')).not.toBeChecked();
  await expect(second.getByLabel('Room layout')).toHaveValue('theatre');
  await expect(second.getByLabel(/Equipment requirements/)).toHaveValue('Two microphones');
  expect(state.sessions.map(session => session.expectedAttendance)).toEqual([40, 120]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, 'e04s02-two-sessions');
});

test('TC_E04S02_03 TC_E04S02_04: each Session is checked and booked on its own', async ({ page }) => {
  await signInAs(page, 'event_coordinator');
  const state = await fakeSessionsBackend(page, { status: 'planning', sessions: [{ ...morning }, { ...panel }] });
  await page.goto(`/coordinator/events/${event.code}/venues`);

  const picker = page.getByLabel('Session', { exact: true });
  await picker.selectOption('s-morning');
  await expect(page.getByLabel('Expected attendance (required)')).toHaveValue('40');
  await expect(page.getByLabel('Step-free access')).toBeChecked();
  await page.getByRole('button', { name: 'Search venues', exact: true }).click();
  await expect(page.getByText('Missing accessibility feature: Step-free access')).toBeVisible();
  await screenshot(page, 'e04s02-search-morning');

  await picker.selectOption('s-panel');
  await expect(page.getByLabel('Expected attendance (required)')).toHaveValue('120');
  await expect(page.getByLabel('Step-free access')).not.toBeChecked();
  await page.getByRole('button', { name: 'Search venues', exact: true }).click();
  await expect(page.getByText('Suitable', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Hold this venue' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Check this Session’s requirements' }).click();
  await expect(page.getByRole('heading', { name: 'Venue suitability' })).toBeVisible();
  await expect(page.getByText('Afternoon panel', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Submit booking request' }).click();
  await expect(page.getByText('Booking request submitted')).toBeVisible();

  await page.goto(`/coordinator/events/${event.code}/venues?session_id=s-morning`);
  await page.getByRole('button', { name: 'Search venues', exact: true }).click();
  await page.getByRole('link', { name: 'Check this Session’s requirements' }).click();
  await page.getByRole('button', { name: 'Submit booking request' }).click();
  await expect(page.getByText('Booking request submitted')).toBeVisible();

  expect(state.bookings.map(booking => [booking.session_id, booking.starts_at])).toEqual([
    ['s-panel', panel.startAt], ['s-morning', morning.startAt],
  ]);
  await page.goto(`/coordinator/events/${event.code}/venue-bookings`);
  await expect(page.getByText('Morning talks')).toBeVisible();
  await expect(page.getByText('Afternoon panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, 'e04s02-bookings-per-session');
});

test('TC_E04S02_05: removing a Session in planning releases its booking after confirmation', async ({ page }) => {
  await signInAs(page, 'event_organiser');
  const state = await fakeSessionsBackend(page, {
    status: 'planning', sessions: [{ ...morning }, { ...panel }],
    bookings: [
      { id: 'b-a', session_id: 's-morning', status: 'confirmed', starts_at: morning.startAt, ends_at: morning.endAt },
      { id: 'b-b', session_id: 's-panel', status: 'confirmed', starts_at: panel.startAt, ends_at: panel.endAt },
    ],
  });
  await page.goto(`/organiser/requests/${event.code}`);

  const editor = page.getByRole('region', { name: 'Event Sessions' });
  await expect(editor.getByRole('button', { name: 'Add session' })).toHaveCount(0);
  const first = editor.getByRole('listitem', { name: 'Morning talks' });
  await first.getByRole('button', { name: 'Remove session' }).click();
  await expect(first.getByText('Remove Morning talks?')).toBeVisible();
  await screenshot(page, 'e04s02-remove-confirm');
  await first.getByRole('button', { name: 'Remove session' }).last().click();

  await expect(editor.getByText('Session removed. 1 venue booking released. The venue’s staff have been notified.')).toBeVisible();
  await expect(editor.getByRole('listitem')).toHaveCount(1);
  expect(state.bookings.map(booking => [booking.id, booking.status])).toEqual([['b-a', 'released'], ['b-b', 'confirmed']]);
  expect(state.audit).toEqual(['Session Deleted: Morning talks']);
});

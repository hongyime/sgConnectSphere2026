// E08-S03 (SCRUM-60) browser acceptance cases, replacing the test.fixme
// cases for TC_E08S03_03 to _05 in e08.spec.ts and adding _08, _09 and _10.
// A stateful fake of the readiness endpoints stands in for the server, with
// the same rules and sentences as backend/src/modules/eventReadiness/. The
// rules themselves, the status change, notices and audit entries are proved
// against a real database in backend/tests/eventReadiness.integration.test.ts.
import { test, expect, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

const BLOCKED = "This event can't be submitted for its safety check until every outstanding item is resolved.";
// 25 Oct 2026, 6:00 pm – 10:00 pm Singapore time.
const START = '2026-10-25T10:00:00.000Z';
const END = '2026-10-25T14:00:00.000Z';

type State = {
  status: string;
  booking: 'pending' | 'confirmed';
  reserved: number;
  supportStaffed: boolean;
  noLines?: boolean;
};

function snapshot(state: State) {
  const blockers: { kind: string; message: string }[] = [];
  if (state.booking !== 'confirmed') {
    blockers.push({ kind: 'no-confirmed-venue', message: 'No venue booking is Confirmed yet.' });
    blockers.push({ kind: 'venue-booking-outstanding', message: 'Orchid Hall — Pending' });
  }
  const equipment = state.noLines ? [] : [{ id: 'r1', name: 'Projector-HD', requested: 3, reserved: state.reserved,
    state: state.reserved >= 3 ? 'ready' : 'outstanding' }];
  if (!state.noLines && state.reserved < 3) {
    blockers.push({ kind: 'equipment-shortfall', message: `Projector-HD — ${state.reserved} of 3 reserved; ${3 - state.reserved} outstanding` });
  }
  const support = state.noLines ? [] : [{ id: 's1', description: 'Sound desk operator', startsAt: START, endsAt: END,
    status: state.supportStaffed ? 'staffed' : 'open', state: state.supportStaffed ? 'ready' : 'outstanding' }];
  if (!state.noLines && !state.supportStaffed) {
    blockers.push({ kind: 'support-unassigned', message: 'Technical support — no staff assigned yet: Sound desk operator' });
  }
  return {
    eventId: 'evt-3003', eventCode: 'EVT-3003', title: 'Planning Phase Gala', status: state.status, startsAt: START, endsAt: END,
    equipmentNoneRequired: Boolean(state.noLines), supportNoneRequired: false,
    venueBookings: [{ id: 'b1', venueName: 'Orchid Hall', status: state.booking, purpose: 'Gala dinner', startsAt: START, endsAt: END,
      state: state.booking === 'confirmed' ? 'ready' : 'outstanding' }],
    equipment, support, blockers, canSubmit: state.status === 'planning' && blockers.length === 0,
  };
}

async function coordinatorSetup(page: Page, initial: State) {
  const state = { ...initial };
  const submissions: number[] = [];
  await signInAs(page, 'event_coordinator', { email: 'coord_a@connectsphere.com' });
  await page.route('**/api/events?**', async route => {
    const params = new URL(route.request().url()).searchParams;
    if (route.request().method() === 'GET' && params.get('readiness') === '1') {
      return route.fulfill({ json: { readiness: snapshot(state) } });
    }
    if (route.request().method() === 'POST' && params.get('safetyReview') === '1') {
      const current = snapshot(state);
      submissions.push(current.blockers.length);
      if (current.blockers.length) return route.fulfill({ status: 409, json: { error: BLOCKED, readiness: current } });
      state.status = 'safety_review';
      return route.fulfill({ json: { submission: { eventId: 'evt-3003', eventCode: 'EVT-3003', status: 'safety_review', statusChangedAt: START } } });
    }
    return route.fallback();
  });
  return { state, submissions };
}

const submit = async (page: Page) => {
  await page.getByRole('button', { name: 'Submit for safety check…' }).click();
  await page.getByRole('button', { name: 'Submit for safety check', exact: true }).click();
};
const pill = (page: Page) => page.locator('.ui-page-heading .status-pill');

test('TC_E08S03_09 - submission is blocked while a venue booking is Pending, and the booking is listed by venue', async ({ page }) => {
  const { submissions } = await coordinatorSetup(page, { status: 'planning', booking: 'pending', reserved: 3, supportStaffed: true });
  await page.goto('/coordinator/events/EVT-3003/readiness');
  await expect(page.getByRole('heading', { level: 1, name: 'Readiness: Planning Phase Gala' })).toBeVisible();
  await submit(page);
  await expect(page.getByText(BLOCKED)).toBeVisible();
  const outstanding = page.getByRole('alert').filter({ hasText: 'Resolve these before submitting' });
  await expect(outstanding).toContainText('No venue booking is Confirmed yet.');
  await expect(outstanding).toContainText('Orchid Hall — Pending');
  await expect(pill(page)).toHaveText('Planning');
  expect(submissions).toEqual([2]);
});

test('TC_E08S03_03 - a partial equipment reservation blocks submission and shows the outstanding quantity', async ({ page }) => {
  await coordinatorSetup(page, { status: 'planning', booking: 'confirmed', reserved: 2, supportStaffed: true });
  await page.goto('/coordinator/events/EVT-3003/readiness');
  await submit(page);
  await expect(page.getByText(BLOCKED)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Resolve these before submitting' }))
    .toContainText('Projector-HD — 2 of 3 reserved; 1 outstanding');
  await expect(pill(page)).toHaveText('Planning');
});

test('TC_E08S03_04 - requested technical support with no staff assigned blocks submission', async ({ page }) => {
  await coordinatorSetup(page, { status: 'planning', booking: 'confirmed', reserved: 3, supportStaffed: false });
  await page.goto('/coordinator/events/EVT-3003/readiness');
  await submit(page);
  await expect(page.getByText(BLOCKED)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Resolve these before submitting' }))
    .toContainText('Technical support — no staff assigned yet: Sound desk operator');
  await expect(page.getByRole('table', { name: 'Technical support requested for this event' })).toContainText('No staff assigned');
});

test('TC_E08S03_08 - submitting a fully arranged event moves it to Safety Review, not Confirmed', async ({ page }) => {
  await coordinatorSetup(page, { status: 'planning', booking: 'confirmed', reserved: 3, supportStaffed: true });
  await page.goto('/coordinator/events/EVT-3003/readiness');
  await expect(page.getByText('Every arrangement is ready. Submit the event for its Operational Safety Check.')).toBeVisible();
  await submit(page);
  await expect(page.getByText('Submitted. The event is now in Safety Review; the Organiser and the Safety Officer have been notified.')).toBeVisible();
  await expect(pill(page)).toHaveText('Safety Review');
  await expect(page.getByRole('button', { name: 'Submit for safety check…' })).toHaveCount(0);
});

test('TC_E08S03_10 - equipment recorded as none required does not block submission', async ({ page }) => {
  await coordinatorSetup(page, { status: 'planning', booking: 'confirmed', reserved: 0, supportStaffed: true, noLines: true });
  await page.goto('/coordinator/events/EVT-3003/readiness');
  await expect(page.getByText('None required. Nothing to reserve.')).toBeVisible();
  await submit(page);
  await expect(pill(page)).toHaveText('Safety Review');
});

test('SCRUM-60 - the old confirm link opens the readiness page, which offers no direct confirmation', async ({ page }) => {
  await coordinatorSetup(page, { status: 'safety_review', booking: 'confirmed', reserved: 3, supportStaffed: true });
  await page.goto('/coordinator/events/EVT-3003/confirm');
  await expect(page).toHaveURL(/\/coordinator\/events\/EVT-3003\/readiness$/);
  await expect(page.getByText('This event is in Safety Review. It is confirmed only once the Safety Officer approves it.')).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm/i })).toHaveCount(0);
});

test('TC_E08S03_05 - once confirmed, the Organiser sees every confirmed venue with its purpose and period, and the arrangements', async ({ page }) => {
  await signInAs(page, 'event_organiser', { email: 'organiser_a@clienta.com' });
  await page.route('**/api/events?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('mine') === '1') {
      return route.fulfill({ json: { event: { id: 'evt-3003', title: 'Planning Phase Gala', purpose: 'Fundraising', status: 'confirmed',
        startAt: START, endAt: END, expectedAttendance: 200, equipmentRequirements: 'none_required' } } });
    }
    return route.fulfill({ json: { event: {
      id: 'evt-3003', event_code: 'EVT-3003', title: 'Planning Phase Gala', status: 'confirmed', status_changed_at: START,
      statusHistory: [], comments: [], outstandingQuestions: [], decision: null,
      arrangements: {
        venues: [{ venueName: 'Orchid Hall', purpose: 'Gala dinner', startsAt: START, endsAt: END }],
        equipment: [{ name: 'Projector-HD', quantity: 3 }],
        support: [{ description: 'Sound desk operator', startsAt: START, endsAt: END }],
        equipmentNoneRequired: false,
      },
    } } });
  });
  await page.goto('/organiser/requests/EVT-3003');
  const card = page.getByRole('region', { name: 'Confirmed arrangements' });
  await expect(card.getByRole('table', { name: 'Confirmed venues' })).toContainText('Orchid Hall');
  await expect(card).toContainText('Gala dinner');
  await expect(card).toContainText('25 Oct 2026, 6:00 pm – 10:00 pm');
  await expect(card).toContainText('Projector-HD × 3');
  await expect(card).toContainText('Sound desk operator (25 Oct 2026, 6:00 pm – 10:00 pm)');
  await expect(page.getByRole('region', { name: 'Summary', exact: true })).toContainText('None required');
});

// E06-S05 (SCRUM-49, frontend SCRUM-143) acceptance cases in the browser,
// against a stateful fake of /api/events and the /api/venues hold endpoints,
// shaped like backend/src/modules/venueBooking/holdsHandler.ts. The rules
// themselves (overlap, expiry, races) are covered against PostgreSQL in
// backend/tests/venueHolds.integration.test.ts.
import { test, expect, type Page, type Route } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

const STARTS = '2027-03-10T01:00:00.000Z';
const ENDS = '2027-03-10T09:00:00.000Z';
const CLASH = 'This venue already has a tentative hold for EVT-CR Charity Run from 10 Mar 2027, 9:00 am to 10 Mar 2027, 5:00 pm.';

type Hold = {
  id: string; venueId: string; venueName: string; eventId: string; eventCode: string; eventTitle: string;
  startsAt: string; endsAt: string; status: 'tentative' | 'expired'; expiresAt: string | null;
};

function eventDetail() {
  return { event: {
    id: 'id-EVT-TC', event_code: 'EVT-TC', title: 'Tech Conference 2027', status: 'planning', status_changed_at: '2026-10-01T01:00:00.000Z',
    starts_at: STARTS, ends_at: ENDS, expected_attendance: 200, coordinator_assigned_at: '2026-09-07T01:00:00.000Z',
    organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com', description: 'Synthetic event', purpose: null,
    venue_requirements: null, accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'test-event_coordinator', coordinator_name: 'Coordinator A', pendingReassignment: null, outstandingQuestions: [],
  } };
}

const venues = [
  { id: 'v-hall', name: 'Riverside Hall', location: 'Level 1', max_capacity: 300, effective_capacity: 300, available: true, suitable: true, mismatches: [], layouts: [], facilities: [], accessibility: [] },
  { id: 'v-busy', name: 'Orchid Hall', location: 'Level 2', max_capacity: 300, effective_capacity: 300, available: false, suitable: false, mismatches: ['Unavailable during the requested period.'], layouts: [], facilities: [], accessibility: [] },
];

// One fake for both roles: holds live in `state` so actions show up on reload.
async function world(page: Page, role: 'event_coordinator' | 'venue_staff', options: { clash?: boolean } = {}) {
  const state: { holds: Hold[]; posts: Record<string, unknown>[] } = { holds: [], posts: [] };
  const inHours = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
  if (role === 'venue_staff') {
    state.holds.push(
      { id: 'h-soon', venueId: 'v-hall', venueName: 'Riverside Hall', eventId: 'id-EVT-TC', eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2027', startsAt: STARTS, endsAt: ENDS, status: 'tentative', expiresAt: inHours(20) },
      { id: 'h-late', venueId: 'v-studio', venueName: 'Studio', eventId: 'id-EVT-CR', eventCode: 'EVT-CR', eventTitle: 'Charity Run', startsAt: STARTS, endsAt: ENDS, status: 'tentative', expiresAt: inHours(40) },
    );
  }
  await signInAs(page, role);
  await page.route('**/api/events**', route => route.fulfill({ json: eventDetail() }));
  await page.route('**/api/venues**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, string>;
      state.posts.push(body);
      const hold = state.holds.find(item => item.id === body.booking_id);
      if (body.action === 'hold') {
        if (options.clash) return route.fulfill({ status: 409, json: { error: CLASH } });
        const created: Hold = { id: `h-${state.holds.length + 1}`, venueId: body.venue_id!, venueName: 'Riverside Hall', eventId: 'id-EVT-TC', eventCode: 'EVT-TC',
          eventTitle: 'Tech Conference 2027', startsAt: body.starts_at!, endsAt: body.ends_at!, status: 'tentative', expiresAt: inHours(48) };
        state.holds.push(created);
        return route.fulfill({ status: 201, json: { hold: { id: created.id, venueName: created.venueName, status: 'tentative', expiresAt: created.expiresAt } } });
      }
      if (body.action === 'convert_hold' || body.action === 'release') {
        state.holds = state.holds.filter(item => item !== hold);
        return route.fulfill({ json: body.action === 'release' ? { released: true } : { booking: { id: body.booking_id, status: 'pending' } } });
      }
      hold!.expiresAt = body.expires_at!;
      return route.fulfill({ json: { hold: { id: hold!.id, expiresAt: hold!.expiresAt } } });
    }
    if (url.searchParams.get('task') === 'holds') {
      if (url.searchParams.has('event')) {
        return route.fulfill({ json: { event: { id: 'id-EVT-TC', eventCode: 'EVT-TC', title: 'Tech Conference 2027', status: 'planning', startsAt: STARTS, endsAt: ENDS },
          holds: state.holds, canHold: true } });
      }
      return route.fulfill({ json: { holds: [...state.holds].sort((a, b) => a.expiresAt!.localeCompare(b.expiresAt!)) } });
    }
    if (url.searchParams.get('task') === 'support') {
      return route.fulfill({ json: { event: {}, requests: [], noSupportRequired: false, canEdit: true } });
    }
    if (url.searchParams.get('id') === 'v-hall') return route.fulfill({ json: { venue: { id: 'v-hall', name: 'Riverside Hall' } } });
    if (url.searchParams.has('search')) return route.fulfill({ json: { venues } });
    return route.fulfill({ json: { options: { layouts: [], accessibility: [], facilities: [] },
      defaults: { title: 'Tech Conference 2027', start: STARTS, end: ENDS, attendance: 200 } } });
  });
  return state;
}

// The card a heading belongs to (its nearest enclosing section).
const cardOf = (page: Page, name: string) => page.getByRole('heading', { name }).locator('xpath=ancestor::section[1]');
const holdsCard = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Venue holds' }) });

test('TC_E06S05_03 from the event, a free venue is held for the event period with the 48-hour default', async ({ page }) => {
  const state = await world(page, 'event_coordinator');
  await page.goto('/coordinator/events/EVT-TC');
  await expect(holdsCard(page).getByText(/No venue is held for this event/)).toBeVisible();
  await holdsCard(page).getByRole('link', { name: 'Find a venue to hold' }).click();
  await page.getByRole('button', { name: 'Search venues' }).click();
  // Only the available venue offers a hold.
  const busy = cardOf(page, 'Orchid Hall');
  await expect(busy.getByRole('link', { name: 'Hold this venue' })).toHaveCount(0);
  await cardOf(page, 'Riverside Hall').getByRole('link', { name: 'Hold this venue' }).click();
  await expect(page.getByRole('heading', { name: 'Hold a venue tentatively' })).toBeVisible();
  await expect(page.getByLabel('Hold expires after')).toHaveValue('default');
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(page.getByText(/Riverside Hall is held tentatively until/)).toBeVisible();
  await expect(holdsCard(page).getByText(/^Tentative · expires /)).toBeVisible();
  expect(state.posts).toEqual([{ action: 'hold', event_id: 'EVT-TC', venue_id: 'v-hall', starts_at: STARTS, ends_at: ENDS }]);
});

test('TC_E06S05_01 a hold that clashes is refused, naming the hold in the way', async ({ page }) => {
  await world(page, 'event_coordinator', { clash: true });
  await page.goto('/coordinator/events/EVT-TC/venues/v-hall/hold');
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(page.getByText("This venue can't be held")).toBeVisible();
  await expect(page.getByText(CLASH)).toBeVisible();
  await expect(page).toHaveURL(/\/venues\/v-hall\/hold$/);
});

test('TC_E06S05_04 and Scenario 4: a hold is submitted as a booking request, and another is released after confirming', async ({ page }) => {
  const state = await world(page, 'event_coordinator');
  await page.goto('/coordinator/events/EVT-TC/venues/v-hall/hold');
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(holdsCard(page).getByRole('button', { name: 'Submit booking request' })).toBeVisible();
  await holdsCard(page).getByRole('button', { name: 'Submit booking request' }).click();
  await expect(holdsCard(page).getByText('Booking request submitted for Riverside Hall. The hold no longer expires.')).toBeVisible();

  await page.goto('/coordinator/events/EVT-TC/venues/v-hall/hold');
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await holdsCard(page).getByRole('button', { name: 'Release' }).click();
  await holdsCard(page).getByRole('button', { name: 'Release hold' }).click();
  await expect(holdsCard(page).getByText('Hold on Riverside Hall released. The period is free again.')).toBeVisible();
  await expect(holdsCard(page).getByText(/No venue is held for this event/)).toBeVisible();
  expect(state.posts.map(post => post.action)).toEqual(['hold', 'convert_hold', 'hold', 'release']);
});

test('TC_E06S05_07 Venue Staff see live holds soonest first and move an expiry later', async ({ page }) => {
  const state = await world(page, 'venue_staff');
  await page.goto('/venue/inventory');
  await page.getByRole('link', { name: 'Tentative holds' }).first().click();
  await expect(page.getByRole('heading', { name: 'Tentative holds', level: 1 })).toBeVisible();
  const list = page.getByRole('region', { name: 'Live tentative holds' });
  await expect(list.getByRole('heading', { level: 2 })).toHaveText(['Riverside Hall', 'Studio']);
  const first = cardOf(page, 'Riverside Hall');
  await first.getByRole('button', { name: 'Change expiry' }).click();
  const later = new Date(Date.now() + 72 * 3600_000);
  const pad = (value: number) => String(value).padStart(2, '0');
  const local = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`;
  await first.getByLabel('New expiry').fill(local);
  await first.getByRole('button', { name: 'Save new expiry' }).click();
  await expect(page.getByText(/The hold on Riverside Hall now expires .* recorded in the event's activity log/)).toBeVisible();
  expect(state.posts).toEqual([{ action: 'extend_hold', booking_id: 'h-soon', expires_at: new Date(local).toISOString() }]);
});

test('the hold list and form fit the screen without sideways scrolling', async ({ page }) => {
  await world(page, 'event_coordinator');
  await page.goto('/coordinator/events/EVT-TC/venues/v-hall/hold');
  await page.getByRole('button', { name: 'Hold venue' }).click();
  await expect(holdsCard(page).getByRole('button', { name: 'Submit booking request' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

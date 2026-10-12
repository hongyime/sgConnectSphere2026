// E07-S06 (SCRUM-56) and E07-S07 (SCRUM-57) acceptance cases in the browser,
// against a stateful fake of /api/events and /api/venues?task=support|staffing
// shaped like the real handlers. The same journeys run against real sessions,
// the real API and PostgreSQL in tests/auth-e2e/technicalSupport.spec.ts.
import { test, expect, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

// ---------- E07-S06: the Coordinator requests support or declares none ----------

function eventDetail(code: string, title: string, status: string) {
  return { event: {
    id: `id-${code}`, event_code: code, title, status, status_changed_at: '2026-10-01T01:00:00.000Z',
    starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z', expected_attendance: 200,
    coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com',
    description: 'Synthetic event', purpose: null, venue_requirements: null, accessibility_note: null,
    equipment_requirements: null, layout_preference: null, registration_setup: null,
    coordinator_id: 'test-event_coordinator', coordinator_name: 'Coordinator A', pendingReassignment: null, outstandingQuestions: [],
  } };
}

async function coordinatorWorld(page: Page) {
  const events: Record<string, { title: string; status: string }> = {
    'EVT-TC': { title: 'Tech Conference 2026', status: 'planning' },
    'EVT-AP': { title: 'Approved Gala', status: 'approved' },
  };
  const support: Record<string, { requests: unknown[]; none: boolean }> = { 'EVT-TC': { requests: [], none: false }, 'EVT-AP': { requests: [], none: false } };
  const posts: Record<string, unknown>[] = [];
  await signInAs(page, 'event_coordinator');
  await page.route('**/api/events**', route => {
    const code = new URL(route.request().url()).searchParams.get('id') ?? '';
    const event = events[code];
    return event ? route.fulfill({ json: eventDetail(code, event.title, event.status) }) : route.fulfill({ status: 404, json: { error: 'Not found.' } });
  });
  await page.route(/\/api\/venues\?task=support/, route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, string>;
      posts.push(body);
      const state = support[body.event]!;
      if (body.action === 'none') { state.none = true; return route.fulfill({ json: { noSupportRequired: true } }); }
      state.none = false;
      state.requests.push({ id: `r-${state.requests.length + 1}`, description: body.description, startsAt: body.startsAt, endsAt: body.endsAt, status: 'open', requestedAt: '2026-10-08T00:00:00.000Z' });
      return route.fulfill({ status: 201, json: { request: state.requests.at(-1), notified: 2 } });
    }
    const code = new URL(request.url()).searchParams.get('event')!;
    const event = events[code]!;
    return route.fulfill({ json: {
      event: { id: `id-${code}`, eventCode: code, title: event.title, status: event.status },
      requests: support[code]!.requests, noSupportRequired: support[code]!.none, canEdit: ['approved', 'planning'].includes(event.status),
    } });
  });
  return { posts };
}

const supportCard = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Technical support' }) });

test('TC_E07S06_01 a request with a description and times is recorded and Technical Support Staff are notified', async ({ page }) => {
  const { posts } = await coordinatorWorld(page);
  await page.goto('/coordinator/events/EVT-TC');
  await supportCard(page).getByRole('link', { name: 'Request technical support' }).click();
  await page.getByLabel('What support is needed').fill('1 AV technician for the full event');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('2 Technical Support Staff members have been notified.')).toBeVisible();
  await expect(supportCard(page).getByText('1 AV technician for the full event')).toBeVisible();
  await expect(supportCard(page).getByText('Awaiting a technician')).toBeVisible();
  expect(posts[0]).toMatchObject({ action: 'request', event: 'EVT-TC', description: '1 AV technician for the full event', startsAt: '2026-11-12T01:00:00.000Z', endsAt: '2026-11-12T04:00:00.000Z' });
});

test('TC_E07S06_02 a request is accepted on an approved event before any venue is confirmed', async ({ page }) => {
  const { posts } = await coordinatorWorld(page);
  await page.goto('/coordinator/events/EVT-AP/support');
  await expect(page.getByText(/You don't need a confirmed venue first\./)).toBeVisible();
  await page.getByLabel('What support is needed').fill('1 sound technician');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Technical support requested')).toBeVisible();
  expect(posts).toHaveLength(1);
});

test('TC_E07S06_03 marking no technical support needed records it, notifies nobody and leaves nothing to staff', async ({ page }) => {
  const { posts } = await coordinatorWorld(page);
  await page.goto('/coordinator/events/EVT-TC');
  await supportCard(page).getByRole('button', { name: 'No technical support required' }).click();
  await expect(page.getByText('Marked as needing no technical support. Nobody has been notified.')).toBeVisible();
  await expect(supportCard(page).getByText('This event needs no technical support. Nothing is waiting to be staffed.')).toBeVisible();
  await expect(supportCard(page).getByRole('button', { name: 'No technical support required' })).toHaveCount(0);
  expect(posts).toEqual([{ action: 'none', event: 'EVT-TC' }]);
});

test('E07-S06 the request form refuses a blank, too-long or reversed request before sending', async ({ page }) => {
  const { posts } = await coordinatorWorld(page);
  await page.goto('/coordinator/events/EVT-TC/support');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Describe the technical support the event needs.')).toBeVisible();
  await page.getByLabel('What support is needed').fill('a'.repeat(2001));
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('The description must be 2000 characters or fewer.')).toBeVisible();
  await page.getByLabel('What support is needed').fill('1 AV technician');
  await page.getByLabel('Support ends').fill(await page.getByLabel('Support starts').inputValue());
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Support must end after it starts.')).toBeVisible();
  expect(posts).toHaveLength(0);
});

// ---------- E07-S07: Technical Support Staff assign and remove colleagues ----------

type Assignment = { id: string; requestId: string; staffId: string };
const STAFF = [{ id: 's-a', name: 'Tech A' }, { id: 's-b', name: 'Tech B' }, { id: 's-c', name: 'Tech C' }];
const REQUESTS = {
  conference: { id: '11111111-1111-4111-8111-111111111111', eventId: 'e-tc', eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2026', eventStatus: 'planning', description: '1 AV technician', startsAt: '2026-11-12T01:00:00.000Z', endsAt: '2026-11-12T04:00:00.000Z' },
  charity: { id: '22222222-2222-4222-8222-222222222222', eventId: 'e-cr', eventCode: 'EVT-CR', eventTitle: 'Charity Run', eventStatus: 'approved', description: '1 sound technician', startsAt: '2026-11-12T02:00:00.000Z', endsAt: '2026-11-12T05:00:00.000Z' },
};
const overlaps = (a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

// Tech B already works the Charity Run (10:00-13:00 SGT), which overlaps the conference (09:00-12:00 SGT).
async function staffingWorld(page: Page, me = 's-a') {
  const assignments: Assignment[] = [{ id: 'a-b-cr', requestId: REQUESTS.charity.id, staffId: 's-b' }];
  const notices: { userId: string; title: string; message: string }[] = [];
  let next = 1;
  const requests = Object.values(REQUESTS);
  const view = (request: typeof REQUESTS.conference) => {
    const on = assignments.filter(item => item.requestId === request.id);
    return { ...request, status: on.length ? 'staffed' : 'open', assignees: on.map(item => ({ assignmentId: item.id, staffId: item.staffId, name: STAFF.find(s => s.id === item.staffId)!.name })) };
  };
  const clashes = (staffId: string, request: typeof REQUESTS.conference) => assignments
    .filter(item => item.staffId === staffId && item.requestId !== request.id)
    .map(item => requests.find(r => r.id === item.requestId)!)
    .filter(other => overlaps(other, request))
    .map(other => ({ eventCode: other.eventCode, title: other.eventTitle, startsAt: other.startsAt, endsAt: other.endsAt }));
  await signInAs(page, 'technical_support_staff', { notifications: [] });
  await page.unroute('**/api/notifications');
  await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: notices
    .filter(n => n.userId === me)
    .map((n, index) => ({ id: `n-${index}`, title: n.title, message: n.message, created_at: '2026-10-08T00:00:00.000Z', read_at: null, event_id: null })) } }));
  await page.route(/\/api\/venues\?task=staffing/, route => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, string>;
      if (body.action === 'remove') {
        const index = assignments.findIndex(item => item.id === body.assignment);
        const [gone] = assignments.splice(index, 1);
        const on = requests.find(r => r.id === gone!.requestId)!;
        notices.push({ userId: gone!.staffId, title: 'Technical support assignment removed', message: `You're no longer assigned to ${on.eventCode} ${on.eventTitle}. That time is free again.` });
        return route.fulfill({ json: { removed: true, requestStatus: assignments.some(item => item.requestId === on.id) ? 'staffed' : 'open' } });
      }
      const on = requests.find(r => r.id === body.request)!;
      const who = STAFF.find(s => s.id === body.staff)!;
      const clash = clashes(who.id, on)[0];
      if (clash) return route.fulfill({ status: 409, json: { error: `${who.name} is already assigned to ${clash.eventCode} ${clash.title} at an overlapping time.`, conflicts: [clash] } });
      const id = `a-${next++}`;
      assignments.push({ id, requestId: on.id, staffId: who.id });
      notices.push({ userId: who.id, title: 'Technical support assignment', message: `You're assigned to ${on.eventCode} ${on.eventTitle}: ${on.description}` });
      return route.fulfill({ status: 201, json: { assignment: { id, staffId: who.id, name: who.name } } });
    }
    if (params.get('schedule') === 'mine') {
      return route.fulfill({ json: { assignments: assignments.filter(item => item.staffId === me).map(item => {
        const on = requests.find(r => r.id === item.requestId)!;
        return { id: item.id, requestId: on.id, eventCode: on.eventCode, eventTitle: on.eventTitle, eventStatus: on.eventStatus, description: on.description, startsAt: on.startsAt, endsAt: on.endsAt };
      }) } });
    }
    const id = params.get('request');
    if (id) {
      const on = requests.find(r => r.id === id)!;
      const assigned = new Set(assignments.filter(item => item.requestId === id).map(item => item.staffId));
      return route.fulfill({ json: { request: view(on), canAssign: true,
        candidates: STAFF.map(person => ({ staffId: person.id, name: person.name, assigned: assigned.has(person.id), conflicts: assigned.has(person.id) ? [] : clashes(person.id, on) })) } });
    }
    return route.fulfill({ json: { requests: requests.map(view) } });
  });
  return { assignments, notices };
}

const colleagues = (page: Page) => page.getByRole('list', { name: 'Colleagues' });
const assign = async (page: Page, name: string) => {
  await colleagues(page).getByRole('button', { name: `Assign ${name}…` }).click();
  await page.getByRole('button', { name: 'Assign technician' }).click();
};

test('TC_E07S07_01 a colleague with no clash is assigned after confirming, and the request is staffed', async ({ page }) => {
  const { assignments } = await staffingWorld(page);
  await page.goto('/support/technicians');
  await page.getByRole('link', { name: 'EVT-TC Tech Conference 2026' }).click();
  await expect(colleagues(page).getByText('Free for these times').first()).toBeVisible();
  await assign(page, 'Tech C');
  await expect(page.getByText("Tech C is assigned and has been notified. It's on their schedule.")).toBeVisible();
  await expect(page.getByRole('list', { name: 'Assigned technicians' }).getByText('Tech C', { exact: true })).toBeVisible();
  await expect(page.getByText('Staffed', { exact: true })).toBeVisible();
  expect(assignments.some(item => item.staffId === 's-c' && item.requestId === REQUESTS.conference.id)).toBe(true);
});

test('TC_E07S07_02 the assignment shows on the assigned technician\'s schedule', async ({ page }) => {
  const world = await staffingWorld(page, 's-c');
  world.assignments.push({ id: 'a-c-tc', requestId: REQUESTS.conference.id, staffId: 's-c' });
  await page.goto('/support/technicians');
  await page.getByRole('link', { name: 'My schedule' }).click();
  const upcoming = page.getByRole('list', { name: 'Upcoming assignments' });
  await expect(upcoming.getByRole('link', { name: 'EVT-TC Tech Conference 2026' })).toBeVisible();
  await expect(upcoming.getByText(/12 Nov 2026, 9:00 am – 12:00 pm · 1 AV technician/)).toBeVisible();
});

test('TC_E07S07_03 a colleague with an overlapping assignment is shown busy and refused, naming the clashing event', async ({ page }) => {
  const { assignments } = await staffingWorld(page);
  await page.goto(`/support/technicians/${REQUESTS.conference.id}`);
  await expect(colleagues(page).getByText(/^Busy: EVT-CR Charity Run, 12 Nov 2026/)).toBeVisible();
  await assign(page, 'Tech B');
  await expect(page.getByText('Tech B is already assigned to EVT-CR Charity Run at an overlapping time.')).toBeVisible();
  expect(assignments.filter(item => item.requestId === REQUESTS.conference.id)).toHaveLength(0);
});

test('TC_E07S07_04 removing an assignment after confirming frees the colleague and reopens the request', async ({ page }) => {
  const world = await staffingWorld(page);
  world.assignments.push({ id: 'a-c-tc', requestId: REQUESTS.conference.id, staffId: 's-c' });
  await page.goto(`/support/technicians/${REQUESTS.conference.id}`);
  await page.getByRole('button', { name: 'Remove Tech C…' }).click();
  await page.getByRole('button', { name: 'Remove assignment' }).click();
  await expect(page.getByText('Tech C is no longer assigned and has been notified. Their time is free again.')).toBeVisible();
  await expect(page.getByText('Nobody is assigned yet.')).toBeVisible();
  await expect(page.getByText('Needs a technician').first()).toBeVisible();
  await expect(colleagues(page).getByRole('button', { name: 'Assign Tech C…' })).toBeVisible();
});

test('TC_E07S07_05 a replacement goes through the same clash check', async ({ page }) => {
  const world = await staffingWorld(page);
  world.assignments.push({ id: 'a-c-tc', requestId: REQUESTS.conference.id, staffId: 's-c' });
  await page.goto(`/support/technicians/${REQUESTS.conference.id}`);
  await page.getByRole('button', { name: 'Remove Tech C…' }).click();
  await page.getByRole('button', { name: 'Remove assignment' }).click();
  await expect(page.getByText('Nobody is assigned yet.')).toBeVisible();
  await assign(page, 'Tech B');
  await expect(page.getByText('Tech B is already assigned to EVT-CR Charity Run at an overlapping time.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await assign(page, 'Tech A');
  await expect(page.getByText("Tech A is assigned and has been notified. It's on their schedule.")).toBeVisible();
});

test('TC_E07S07_06 the colleague is notified when assigned and again when removed', async ({ page }) => {
  const { notices } = await staffingWorld(page);
  await page.goto(`/support/technicians/${REQUESTS.conference.id}`);
  await assign(page, 'Tech C');
  await expect(page.getByText(/Tech C is assigned and has been notified/)).toBeVisible();
  await page.getByRole('button', { name: 'Remove Tech C…' }).click();
  await page.getByRole('button', { name: 'Remove assignment' }).click();
  await expect(page.getByText(/Tech C is no longer assigned and has been notified/)).toBeVisible();
  expect(notices.filter(n => n.userId === 's-c').map(n => n.title)).toEqual(['Technical support assignment', 'Technical support assignment removed']);
});

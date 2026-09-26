// Playwright tests for /organiser/* routes (SCRUM-105 frontend coverage).
// Dashboard, request list and request detail read the organiser's own
// requests from the live API (GET /api/events?mine=1 and GET /api/events?id=),
// mocked here with page.route like tests/e2e/e02.spec.ts. The clarification
// response screen is still backed by frontend/src/features/organiser/mocks.ts
// because its backend (E03-S02) has not been built.
//
// These tests carry no TC_ IDs: they check the screens against mocked API
// replies, not the stories' acceptance criteria end to end. TC_E02S02_* are
// covered by tests/e2e/e02.spec.ts, and TC_E03S02_* stay open until E03-S02
// ships.
import { test, expect, type Page } from '@playwright/test';

const ownRequests = [
  { id: 'id-draft', title: 'Design Studio Recital', purpose: 'Student showcase', status: 'draft',
    startAt: '2026-12-01T01:00:00.000Z', endAt: '2026-12-01T04:00:00.000Z', expectedAttendance: 60 },
  { id: 'id-review', title: 'Annual Sustainability Forum', purpose: 'Green campus seminar', status: 'awaiting_clarification',
    startAt: '2026-10-08T01:00:00.000Z', endAt: '2026-10-08T09:00:00.000Z', expectedAttendance: 220 },
  { id: 'id-approved', title: 'Faculty Career Mixer', purpose: 'Networking', status: 'approved',
    startAt: '2026-09-30T10:00:00.000Z', endAt: '2026-09-30T14:00:00.000Z', expectedAttendance: 180 },
];

async function mockEventsApi(page: Page) {
  await page.route('**/api/events?*', async (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id');
    if (url.searchParams.get('mine') === '1') {
      const own = id ? ownRequests.find(request => request.id === id) : undefined;
      if (!id) await route.fulfill({ json: { events: ownRequests } });
      else if (own) await route.fulfill({ json: { event: own } });
      else await route.fulfill({ status: 404, json: { error: 'not_found' } });
      return;
    }
    if (id === 'id-review' || id === 'EVT-2001') {
      await route.fulfill({ json: { event: {
        id: 'id-review', event_code: 'EVT-2001', title: 'Annual Sustainability Forum', status: 'awaiting_clarification',
        status_changed_at: '2026-09-16T01:40:00.000Z', creator_name: 'Olivia Organiser',
        statusHistory: [
          { occurred_at: '2026-09-11T06:12:00.000Z', old_value: 'draft', new_value: 'submitted' },
          { occurred_at: '2026-09-16T01:40:00.000Z', old_value: 'under_review', new_value: 'awaiting_clarification' },
        ],
        comments: [],
      } } });
      return;
    }
    await route.fulfill({ status: 403, json: { error: 'Access denied.' } });
  });
}

test('organiser dashboard shows request status counts from the API', async ({ page }) => {
  await mockEventsApi(page);
  await page.goto('/organiser');
  await expect(page.getByRole('heading', { name: 'My events' })).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Request status counts' });
  await expect(metrics.getByText('Drafts', { exact: true })).toBeVisible();
  await expect(metrics.getByText('Need clarification')).toBeVisible();
  await expect(metrics.locator('article').filter({ hasText: 'Need clarification' }).locator('strong')).toHaveText('1');
  await expect(page.getByRole('region', { name: 'Next actions' }).getByText('Faculty Career Mixer')).toBeVisible();
});

test('request list filters between drafts and awaiting review', async ({ page }) => {
  await mockEventsApi(page);
  await page.goto('/organiser/requests');
  await expect(page.getByRole('heading', { name: 'Requests' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All (3)' })).toBeVisible();

  const drafts = page.getByRole('button', { name: 'Drafts' });
  await drafts.click();
  await expect(drafts).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Design Studio Recital' })).toHaveAttribute('href', '/organiser/drafts/id-draft');
  await expect(page.getByRole('link', { name: 'Faculty Career Mixer' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Awaiting review' }).click();
  await expect(page.getByRole('link', { name: 'Annual Sustainability Forum' })).toBeVisible();
});

test('request list opens the live request detail with its status history', async ({ page }) => {
  await mockEventsApi(page);
  await page.goto('/organiser/requests');
  await page.getByRole('link', { name: 'Annual Sustainability Forum' }).click();

  await expect(page).toHaveURL(/\/organiser\/requests\/id-review$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Annual Sustainability Forum' })).toBeVisible();
  await expect(page.getByText('EVT-2001')).toBeVisible();
  await expect(page.getByText(/Your coordinator has requested clarification/)).toBeVisible();
  await expect(page.getByText('Under review → Clarification requested')).toBeVisible();
  await expect(page.getByText('Green campus seminar')).toBeVisible();
});

test('request detail shows not found for a request that is not yours', async ({ page }) => {
  await mockEventsApi(page);
  await page.goto('/organiser/requests/EVT-O01');
  await expect(page.getByRole('heading', { name: 'Request not found' })).toBeVisible();
});

test('clarification response (mock) requires every answer before submit', async ({ page }) => {
  await page.goto('/organiser/requests/EVT-O01/clarify');
  const submit = page.getByRole('button', { name: 'Resubmit for review' });
  await submit.click();
  // Empty responses do not record success.
  await expect(page.getByRole('status')).toBeEmpty();
  await page.getByLabel(/1\./).fill('Split is 60% faculty, 40% external.');
  await page.getByLabel(/2\./).fill('Afternoon panel needs vegetarian only.');
  await submit.click();
  await expect(page.getByRole('status')).toContainText('Responses recorded');
});

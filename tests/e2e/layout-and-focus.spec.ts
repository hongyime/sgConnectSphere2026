// App-wide layout and focus regressions from the UX audit (no Jira ticket).
// The API is stubbed; these check presentation only.
import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

const venue = { id: 'V-01', name: 'Grand Ballroom', location: 'Level 1', max_capacity: 300, opens_at: '08:00',
  closes_at: '22:00', facilities: [], accessibility_features: [], supported_layouts: [] };

async function stubApi(page: Page) {
  await page.route('**/api/**', route => {
    const id = new URL(route.request().url()).searchParams.get('id');
    return route.fulfill({ json: id === 'V-01' ? { venue } : { events: [], venues: [], features: [] } });
  });
}

function luminance(rgb: number[]) {
  const [r, g, b] = rgb.map(value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const channels = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 4).map(Number);

test('keyboard focus outline is visible against the page (WCAG 3:1)', async ({ page }) => {
  await stubApi(page);
  await page.goto('/venue/inventory/new');
  await page.getByLabel('Venue name').focus();
  await page.keyboard.press('Tab');
  const { outline, width, pageBackground } = await page.evaluate(() => {
    const focused = document.activeElement as HTMLElement;
    const style = getComputedStyle(focused);
    return { outline: style.outlineColor, width: parseFloat(style.outlineWidth), pageBackground: getComputedStyle(document.body).backgroundColor };
  });
  const [r, g, b, alpha = 1] = channels(outline);
  expect(alpha, `outline ${outline} must be opaque`).toBe(1);
  expect(width).toBeGreaterThanOrEqual(2);
  expect(contrast([r, g, b], channels(pageBackground).slice(0, 3))).toBeGreaterThanOrEqual(3);
  expect(contrast([r, g, b], [255, 255, 255])).toBeGreaterThanOrEqual(3);
});

const singleFormPages = [
  '/attendee/register/EVT-A01', '/attendee/withdraw/EVT-A01', '/attendee/feedback/EVT-A01',
  '/venue/inventory/new', '/venue/inventory/V-01/edit', '/admin/users/U-01/role',
];

// The decide page (E03-S03) is live and shows cards, not a form, until a
// decision is chosen; it keeps the same narrow, centred column.
test('decision page /coordinator/events/EVT-C01/decide is one centred column', async ({ page }) => {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/events' && url.searchParams.get('assigned') === '1') {
      return route.fulfill({ json: { event: {
        id: 'evt-c01', event_code: 'EVT-C01', title: 'Charity Run', status: 'under_review', status_changed_at: '2026-09-07T01:00:00.000Z',
        starts_at: '2026-10-10T01:00:00.000Z', ends_at: '2026-10-10T04:00:00.000Z', expected_attendance: 200,
        coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: 'Organiser A', organiser_email: 'organiser_a@clienta.com',
        coordinator_id: 'c-a', coordinator_name: 'Coord A', pendingReassignment: null, outstandingQuestions: [],
      } } });
    }
    return route.fulfill({ json: { events: [], notifications: [] } });
  });
  await page.goto('/coordinator/events/EVT-C01/decide');
  const card = page.locator('main .card').first();
  await expect(card).toBeVisible();
  const { viewport, cardBox, headingLeft } = await page.evaluate(() => {
    const box = document.querySelector('main .card')!.getBoundingClientRect();
    return {
      viewport: document.documentElement.clientWidth,
      cardBox: { left: box.left, right: box.right },
      headingLeft: document.querySelector('main h1')!.getBoundingClientRect().left,
    };
  });
  expect(Math.abs(cardBox.left - (viewport - cardBox.right))).toBeLessThanOrEqual(2);
  expect(Math.abs(headingLeft - cardBox.left)).toBeLessThanOrEqual(2);
});

for (const path of singleFormPages) {
  test(`single-form page ${path} is one centred column`, async ({ page }) => {
    await stubApi(page);
    await page.goto(path);
    const form = page.locator('main > form').first();
    await expect(form).toBeVisible();
    const { viewport, formBox, headingLeft } = await page.evaluate(() => {
      const box = document.querySelector('main > form')!.getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        formBox: { left: box.left, right: box.right },
        headingLeft: document.querySelector('main h1')!.getBoundingClientRect().left,
      };
    });
    // The form is centred in the viewport and the heading lines up with it.
    expect(Math.abs(formBox.left - (viewport - formBox.right))).toBeLessThanOrEqual(2);
    expect(Math.abs(headingLeft - formBox.left)).toBeLessThanOrEqual(2);
  });
}

// Aaron's report (7 Oct): in a two-column FormSection, a field whose
// neighbour has a hint was stretched to the row's height and its control slid
// down. The UI kit pairs a hinted field with a plain one so this stays caught.
test('fields side by side keep their controls level when only one has a hint', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/ui-kit');
  const form = page.locator('form.ui-form').first();
  const withHint = form.getByLabel('Expected attendance', { exact: true });
  const withoutHint = form.getByLabel('Layout', { exact: true });
  await expect(withHint).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Re-measure until styles and fonts settle: a real misalignment never does.
  const gap = async () => {
    const [a, b] = [await withHint.boundingBox(), await withoutHint.boundingBox()];
    return a && b && a.x < b.x ? Math.abs(a.y - b.y) : Number.POSITIVE_INFINITY;
  };
  // Same row in the two-column grid, and the controls start at the same height.
  await expect.poll(gap, { timeout: 5000 }).toBeLessThanOrEqual(1);
});

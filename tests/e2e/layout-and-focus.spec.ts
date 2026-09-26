// App-wide layout and focus regressions from the UX audit (no Jira ticket).
// The API is stubbed; these check presentation only.
import { expect, test, type Page } from '@playwright/test';

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
  '/organiser/requests/EVT-O01/clarify', '/coordinator/events/EVT-C01/decide',
  '/venue/inventory/new', '/venue/inventory/V-01/edit', '/admin/users/U-01/role',
];

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

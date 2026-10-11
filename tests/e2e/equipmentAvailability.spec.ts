import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';
const item = {
  id: 'eq1',
  name: 'Wireless Microphone',
  totalStock: 10,
  location: 'Grand Ballroom',
  operationalStatus: 'available',
  reservedQuantity: 3,
  unavailableQuantity: 2,
  freeQuantity: 5,
  operationallyUnavailable: false,
};
test.beforeEach(async ({ page }) => {
  await signInAs(page, 'technical_support_staff');
  await page.route('**/api/equipment?**', (route) => {
    const p = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: {
        period: { start: p.get('start'), end: p.get('end') },
        equipment: [item],
      },
    });
  });
  await page.goto('/support/availability');
});
async function check(
  page: import('@playwright/test').Page,
  start: string,
  end: string,
) {
  await page.getByLabel('Start', { exact: true }).fill(start);
  await page.getByLabel('End', { exact: true }).fill(end);
  await page
    .getByRole('button', { name: 'Check availability', exact: true })
    .click();
}
test('TC_E07S03_01 reserved and damaged quantities show five free units with responsive shared layout', async ({
  page,
}) => {
  await check(page, '2026-11-15T09:00', '2026-11-15T12:00');
  await expect(page.getByRole('table')).toContainText('Wireless Microphone');
  await expect(page.getByRole('table')).toContainText('5');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('TC_E07S03_02 equipment at another venue remains available without transit allowance', async ({
  page,
}) => {
  await check(page, '2026-11-15T09:00', '2026-11-15T12:00');
  await expect(page.getByRole('table')).toContainText('Grand Ballroom');
  await expect(page.getByText(/no transport allowance/i)).toBeVisible();
});
test('TC_E07S03_03 adjacent time windows can each show the full free quantity', async ({
  page,
}) => {
  await page.route('**/api/equipment?**', (route) => {
    const p = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: {
        period: { start: p.get('start'), end: p.get('end') },
        equipment: [
          {
            ...item,
            reservedQuantity: 0,
            unavailableQuantity: 0,
            freeQuantity: 10,
          },
        ],
      },
    });
  });
  for (const [start, end] of [
    ['2026-11-15T09:00', '2026-11-15T12:00'],
    ['2026-11-15T12:00', '2026-11-15T17:00'],
  ]) {
    await check(page, start, end);
    await expect(page.getByRole('table')).toContainText('10');
  }
});

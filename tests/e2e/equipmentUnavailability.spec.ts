// E07-S05 (SCRUM-55) browser acceptance cases. A stateful fake of the
// equipment API stands in for the server: one item, its unavailable periods,
// one reservation, and the same in-service and flag rules as
// backend/src/modules/equipmentSupport/unavailability.ts. Persistence, locking,
// notices and audit entries are proved against a real database in
// backend/tests/equipmentUnavailability.integration.test.ts. Dates are in 2030,
// so "the end date must be today or later" never makes these tests expire.
import { test, expect, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

type Period = { id: string; equipmentId: string; quantity: number; reason: string; from: string; to: string; startsAt: string; endsAt: string };
const STOCK = 4;
// 3 Dec 2030, 9:00 am – 5:00 pm Singapore time.
const DAY = '2030-12-03';
const reservation = {
  id: 'res1', eventId: 'event-a', eventCode: 'EVT-1003', title: 'Tech Conference 2026', quantity: 2,
  startsAt: '2030-12-03T01:00:00.000Z', endsAt: '2030-12-03T09:00:00.000Z', status: 'reserved', requiresReconfirmation: false,
};

async function setup(page: Page, options: { reserved?: boolean; periods?: Period[] } = {}) {
  const posts: Record<string, unknown>[] = [];
  const periods: Period[] = [...(options.periods ?? [])];
  const reservations = options.reserved ? [{ ...reservation }] : [];
  const outOn = (day: string) => periods.filter((p) => p.from <= day && p.to >= day).reduce((sum, p) => sum + p.quantity, 0);
  const reservedOn = (day: string) => (day === DAY ? reservations.reduce((sum, r) => sum + r.quantity, 0) : 0);
  await signInAs(page, 'technical_support_staff');
  await page.route('**/api/equipment?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('mode') === 'availability') {
      const day = DAY;
      return route.fulfill({ json: {
        period: { start: params.get('start'), end: params.get('end') },
        equipment: [{
          id: 'eq1', name: 'HD Camera', totalStock: STOCK, location: 'Store room', operationalStatus: 'available',
          reservedQuantity: reservedOn(day), unavailableQuantity: outOn(day),
          freeQuantity: Math.max(0, STOCK - outOn(day) - reservedOn(day)), operationallyUnavailable: false,
        }],
      } });
    }
    return route.fulfill({ json: { equipment: {
      id: 'eq1', name: 'HD Camera', category: 'Video', description: 'Broadcast camera', total_quantity: STOCK,
      home_location: 'Store room', operational_status: 'available', is_active: true,
      reservations, unavailability: periods,
    } } });
  });
  await page.route('**/api/equipment', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    posts.push(body);
    if (body.action === 'returnToService') {
      const index = periods.findIndex((p) => p.id === body.unavailabilityId);
      const [gone] = periods.splice(index, 1);
      return route.fulfill({ json: { returned: true, equipment: { id: 'eq1', name: 'HD Camera' }, unavailability: gone } });
    }
    const from = body.from as string;
    const to = body.to as string;
    const quantity = body.quantity as number;
    const period: Period = {
      id: `p${posts.length}`, equipmentId: 'eq1', quantity, reason: body.reason as string, from, to,
      startsAt: `${from}T00:00:00+08:00`, endsAt: `${to}T23:59:59+08:00`,
    };
    periods.push(period);
    // D54: flagged only when the reservation no longer fits.
    const affected = reservations.filter((r) => from <= DAY && to >= DAY && STOCK - outOn(DAY) < r.quantity);
    for (const r of affected) r.requiresReconfirmation = true;
    return route.fulfill({ status: 201, json: {
      unavailability: period,
      affectedReservations: affected.map((r) => ({ id: r.id, eventId: r.eventId, eventCode: r.eventCode, title: r.title, quantity: r.quantity })),
      notified: affected.length,
    } });
  });
  return posts;
}

async function markUnavailable(page: Page, values: { from: string; to: string; quantity?: string; reason: string }) {
  await page.goto('/support/catalogue/eq1');
  await page.getByRole('link', { name: 'Mark unavailable' }).click();
  await page.getByLabel('From', { exact: true }).fill(values.from);
  await page.getByLabel('To', { exact: true }).fill(values.to);
  if (values.quantity) await page.getByLabel('Units to take out').fill(values.quantity);
  await page.getByLabel('Reason').fill(values.reason);
  await page.getByRole('button', { name: 'Mark unavailable' }).click();
}

async function freeOn3December(page: Page) {
  await page.goto('/support/availability');
  await page.getByLabel('Start', { exact: true }).fill('2030-12-03T09:00');
  await page.getByLabel('End', { exact: true }).fill('2030-12-03T17:00');
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  return page.getByRole('row', { name: /HD Camera/ }).locator('td[data-label="Free quantity"]');
}

const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('TC_E07S05_01 - marking an item with no reservations unavailable for a period with a reason excludes it from availability for that period', async ({ page }, info) => {
  const posts = await setup(page);
  await page.goto('/support/catalogue/eq1');
  await expect(page.getByText('No unavailable periods')).toBeVisible();
  await page.getByRole('link', { name: 'Mark unavailable' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mark equipment unavailable' })).toBeVisible();
  await page.getByLabel('From', { exact: true }).fill('2030-12-01');
  await page.getByLabel('To', { exact: true }).fill('2030-12-05');
  await page.getByLabel('Reason').fill('Sensor repair');
  await expect(page.getByLabel('Units to take out')).toHaveValue('4');
  await page.screenshot({ path: `artifacts/equipment-unavailable-form-${info.project.name}.png`, fullPage: true });
  expect(await noSideways(page)).toBe(true);
  await page.getByRole('button', { name: 'Mark unavailable' }).click();
  await expect(page.getByText('HD Camera × 4 out of service for 1 Dec 2030 – 5 Dec 2030 (Sensor repair). No reservations were affected.')).toBeVisible();
  await expect(page.getByRole('row', { name: /1 Dec 2030 – 5 Dec 2030/ })).toContainText('4 of 4');
  expect(posts).toEqual([{ action: 'markUnavailable', id: 'eq1', from: '2030-12-01', to: '2030-12-05', quantity: 4, reason: 'Sensor repair' }]);
  await page.screenshot({ path: `artifacts/equipment-unavailable-saved-${info.project.name}.png`, fullPage: true });
  expect(await noSideways(page)).toBe(true);
  await expect(await freeOn3December(page)).toHaveText('0');
});

test('TC_E07S05_02 - marking a reserved item unavailable flags the affected event and says its Coordinator was notified', async ({ page }, info) => {
  await setup(page, { reserved: true });
  await markUnavailable(page, { from: '2030-12-01', to: '2030-12-05', reason: 'Sensor repair' });
  const warning = page.getByRole('alert').filter({ hasText: 'Reservations need review' });
  await expect(warning).toContainText('These reservations no longer fit and are flagged for review:');
  await expect(warning).toContainText('EVT-1003 Tech Conference 2026: 2 reserved');
  await expect(warning).toContainText('Its Coordinator has been notified.');
  await expect(page.getByRole('table', { name: 'Reservation history' }).getByRole('row', { name: /EVT-1003/ })).toContainText('Needs review');
  await page.screenshot({ path: `artifacts/equipment-unavailable-flagged-${info.project.name}.png`, fullPage: true });
  expect(await noSideways(page)).toBe(true);
});

test('TC_E07S05_03 - returning an item to service restores it to availability checks', async ({ page }) => {
  const posts = await setup(page, { periods: [{
    id: 'p1', equipmentId: 'eq1', quantity: 4, reason: 'Sensor repair', from: '2030-12-01', to: '2030-12-05',
    startsAt: '2030-11-30T16:00:00.000Z', endsAt: '2030-12-05T16:00:00.000Z',
  }] });
  await expect(await freeOn3December(page)).toHaveText('0');
  await page.goto('/support/catalogue/eq1');
  await page.getByRole('button', { name: 'Return to service…' }).click();
  await expect(page.getByRole('heading', { name: 'Return HD Camera to service?' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to service', exact: true }).click();
  await expect(page.getByText('HD Camera × 4 is back in service for 1 Dec 2030 – 5 Dec 2030.')).toBeVisible();
  await expect(page.getByText('No unavailable periods')).toBeVisible();
  expect(posts).toEqual([{ action: 'returnToService', unavailabilityId: 'p1' }]);
  await expect(await freeOn3December(page)).toHaveText('4');
});

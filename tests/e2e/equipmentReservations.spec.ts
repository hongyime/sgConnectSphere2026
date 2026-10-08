// E07-S04 (SCRUM-54) browser acceptance cases. A stateful fake of the
// equipment API stands in for the server: one event period, stock held by
// other events, and the same free-quantity and refusal rules as
// backend/src/modules/equipmentSupport/reservations.ts. Persistence, locking
// and notices are proved against a real database in
// backend/tests/equipmentReservations.integration.test.ts.
import { test, expect, type Page } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

type Reservation = { id: string; status: 'reserved' | 'partial' | 'released'; quantityReserved: number; requiresReconfirmation: boolean };
type Line = { id: string; equipmentId: string; quantity: number; reservation: Reservation | null };
const event = {
  id: 'event-a', eventCode: 'EVT-1003', title: 'Tech Conference 2026', status: 'planning',
  // 20 Nov 2026, 9:00 am – 5:00 pm Singapore time.
  startsAt: '2026-11-20T01:00:00.000Z', endsAt: '2026-11-20T09:00:00.000Z',
};
const items: Record<string, { name: string; stock: number; heldElsewhere: number }> = {
  mic: { name: 'Wireless Microphone', stock: 5, heldElsewhere: 0 },
  projector: { name: 'Projector-HD', stock: 10, heldElsewhere: 6 },
  stage: { name: 'Portable Stage', stock: 2, heldElsewhere: 0 },
};
const freeSentence = (free: number) =>
  free <= 0 ? "None are free for this event's dates." : `Only ${free} ${free === 1 ? 'is' : 'are'} free for this event's dates.`;

async function setup(page: Page, lines: Line[]) {
  const posts: Record<string, unknown>[] = [];
  const active = (r: Reservation | null) => !!r && r.status !== 'released';
  const free = (equipmentId: string, except?: Line) =>
    items[equipmentId]!.stock - items[equipmentId]!.heldElsewhere -
    lines.filter((l) => l !== except && l.equipmentId === equipmentId && active(l.reservation))
      .reduce((sum, l) => sum + l.reservation!.quantityReserved, 0);
  const outcome = (l: Line, changed = true, notified = 1) => ({
    changed, notified, event,
    reservation: {
      id: l.reservation!.id, requestId: l.id, name: items[l.equipmentId]!.name, status: l.reservation!.status,
      quantityReserved: l.reservation!.quantityReserved, quantityRequested: l.quantity,
      outstanding: Math.max(0, l.quantity - l.reservation!.quantityReserved),
    },
  });
  await signInAs(page, 'technical_support_staff');
  await page.route('**/api/equipment?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('mode') === 'availability')
      return route.fulfill({ json: {
        period: { start: params.get('start'), end: params.get('end') },
        equipment: Object.entries(items).map(([id, item]) => ({
          id, name: item.name, totalStock: item.stock, location: 'Main Storage', operationalStatus: 'available',
          reservedQuantity: item.stock - free(id), unavailableQuantity: 0, freeQuantity: free(id), operationallyUnavailable: false,
        })),
      } });
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      posts.push(body);
      const l = body.action === 'reserve'
        ? lines.find((x) => x.id === body.requestId)!
        : lines.find((x) => x.reservation?.id === body.reservationId)!;
      if (body.action === 'releaseReservation') {
        l.reservation = { ...l.reservation!, status: 'released' };
        return route.fulfill({ json: outcome(l, true, 0) });
      }
      const quantity = body.quantity as number;
      if (quantity > l.quantity)
        return route.fulfill({ status: 400, json: { error: 'more_than_requested', message: `You can reserve at most the ${l.quantity} requested.` } });
      const available = free(l.equipmentId, l);
      if (quantity > available)
        return route.fulfill({ status: 409, json: { error: 'not_enough_free', message: freeSentence(available), errors: { quantity: [freeSentence(available)] }, freeQuantity: available } });
      l.reservation = { id: l.reservation?.id ?? `res-${l.id}`, status: quantity === l.quantity ? 'reserved' : 'partial', quantityReserved: quantity, requiresReconfirmation: false };
      return route.fulfill({ status: body.action === 'reserve' ? 201 : 200, json: outcome(l) });
    }
    return route.fulfill({ json: {
      event, equipment: [], canEdit: false, canReserve: true, canRelease: true,
      requests: lines.map((l) => ({
        id: l.id, equipmentId: l.equipmentId, name: items[l.equipmentId]!.name, quantity: l.quantity, notes: '',
        totalStock: items[l.equipmentId]!.stock, operationalStatus: 'available', isActive: true,
        reserved: !!l.reservation, reservation: l.reservation, freeQuantity: free(l.equipmentId, l),
      })),
    } });
  });
  return posts;
}

async function reserve(page: Page, name: string, quantity?: string) {
  await page.goto('/support/events/EVT-1003/equipment');
  await page.getByRole('link', { name: `Reserve ${name}` }).click();
  if (quantity) await page.getByLabel('Quantity to reserve').fill(quantity);
  await page.getByRole('button', { name: 'Reserve equipment' }).click();
}

async function freeOnAvailabilityPage(page: Page, name: string) {
  await page.goto('/support/availability');
  await page.getByLabel('Start', { exact: true }).fill('2026-11-20T09:00');
  await page.getByLabel('End', { exact: true }).fill('2026-11-20T17:00');
  await page.getByRole('button', { name: 'Check availability', exact: true }).click();
  return page.getByRole('row', { name: new RegExp(name) }).locator('td[data-label="Free quantity"]');
}

const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('TC_E07S04_01 - reserving the requested quantity records the reservation and confirms the event, date, time, item and quantity', async ({ page }, info) => {
  const posts = await setup(page, [{ id: 'l1', equipmentId: 'mic', quantity: 2, reservation: null }]);
  await page.goto('/support/events/EVT-1003/equipment');
  await page.getByRole('link', { name: 'Reserve Wireless Microphone' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reserve equipment' })).toBeVisible();
  await page.screenshot({ path: `artifacts/equipment-reserve-form-${info.project.name}.png`, fullPage: true });
  expect(await noSideways(page)).toBe(true);
  await page.getByRole('button', { name: 'Reserve equipment' }).click();
  await expect(page.getByText('Wireless Microphone × 2 reserved for EVT-1003 Tech Conference 2026, 20 Nov 2026, 9:00 am – 5:00 pm.')).toBeVisible();
  await expect(page.getByText('The Coordinator has been notified.')).toBeVisible();
  await expect(page.getByRole('row', { name: /Wireless Microphone/ })).toContainText('Reserved');
  expect(posts).toEqual([{ action: 'reserve', requestId: 'l1', quantity: 2 }]);
  await page.screenshot({ path: `artifacts/equipment-reserved-${info.project.name}.png`, fullPage: true });
  expect(await noSideways(page)).toBe(true);
});

test('TC_E07S04_02 - a partial reservation records Partial and states the outstanding quantity', async ({ page }) => {
  await setup(page, [{ id: 'l1', equipmentId: 'stage', quantity: 3, reservation: null }]);
  await page.goto('/support/events/EVT-1003/equipment/l1/reserve');
  // More than is free is refused before anything is saved.
  await page.getByLabel('Quantity to reserve').fill('3');
  await page.getByRole('button', { name: 'Reserve equipment' }).click();
  await expect(page.getByText("Only 2 are free for this event's dates.")).toBeVisible();
  await page.getByLabel('Quantity to reserve').fill('2');
  await page.getByRole('button', { name: 'Reserve equipment' }).click();
  await expect(page.getByText('Portable Stage × 2 of 3 reserved for EVT-1003 Tech Conference 2026, 20 Nov 2026, 9:00 am – 5:00 pm. 1 still outstanding.')).toBeVisible();
  await expect(page.getByRole('row', { name: /Portable Stage/ })).toContainText('Partial: 2 of 3 reserved');
});

test('TC_E07S04_03 - once every unit is reserved the availability check shows no free quantity', async ({ page }) => {
  await setup(page, [{ id: 'l1', equipmentId: 'stage', quantity: 2, reservation: null }]);
  await reserve(page, 'Portable Stage');
  await expect(page.getByText('Portable Stage × 2 reserved', { exact: false })).toBeVisible();
  await expect(await freeOnAvailabilityPage(page, 'Portable Stage')).toHaveText('0');
});

test('TC_E07S04_04 - releasing a reservation returns its units to the available pool', async ({ page }) => {
  await setup(page, [{ id: 'l1', equipmentId: 'mic', quantity: 2, reservation: { id: 'r1', status: 'reserved', quantityReserved: 2, requiresReconfirmation: false } }]);
  await expect(await freeOnAvailabilityPage(page, 'Wireless Microphone')).toHaveText('3');
  await page.goto('/support/events/EVT-1003/equipment');
  await page.getByRole('button', { name: 'Release Wireless Microphone…' }).click();
  await page.getByRole('button', { name: 'Release reservation' }).click();
  await expect(page.getByText('Wireless Microphone × 2 returned to the available pool for EVT-1003 Tech Conference 2026, 20 Nov 2026, 9:00 am – 5:00 pm.')).toBeVisible();
  await expect(page.getByRole('row', { name: /Wireless Microphone/ })).toContainText('Released');
  await expect(await freeOnAvailabilityPage(page, 'Wireless Microphone')).toHaveText('5');
});

test('TC_E07S04_05 - reserving one fewer than the free quantity is a full reservation and leaves one free', async ({ page }) => {
  await setup(page, [{ id: 'l1', equipmentId: 'projector', quantity: 3, reservation: null }]);
  await reserve(page, 'Projector-HD', '3');
  await expect(page.getByText('Projector-HD × 3 reserved for', { exact: false })).toBeVisible();
  await expect(page.getByRole('row', { name: /Projector-HD/ })).toContainText('Reserved');
  await expect(await freeOnAvailabilityPage(page, 'Projector-HD')).toHaveText('1');
});

test('TC_E07S04_06 - reserving exactly the free quantity is a full reservation with no shortfall and leaves none free', async ({ page }) => {
  await setup(page, [{ id: 'l1', equipmentId: 'projector', quantity: 4, reservation: null }]);
  await reserve(page, 'Projector-HD', '4');
  await expect(page.getByText('Projector-HD × 4 reserved for', { exact: false })).toBeVisible();
  await expect(page.getByText('still outstanding', { exact: false })).toHaveCount(0);
  await expect(await freeOnAvailabilityPage(page, 'Projector-HD')).toHaveText('0');
});

// Its last step (the Coordinator can't confirm the event) is E08-S03's
// (SCRUM-60) and is tested there (D48).
test('TC_E07S04_07 - one more requested than is free gives a partial reservation with one outstanding', async ({ page }) => {
  await setup(page, [{ id: 'l1', equipmentId: 'projector', quantity: 5, reservation: null }]);
  await page.goto('/support/events/EVT-1003/equipment/l1/reserve');
  await expect(page.getByLabel('Quantity to reserve')).toHaveValue('4');
  await page.getByRole('button', { name: 'Reserve equipment' }).click();
  await expect(page.getByText('Projector-HD × 4 of 5 reserved for EVT-1003 Tech Conference 2026, 20 Nov 2026, 9:00 am – 5:00 pm. 1 still outstanding.')).toBeVisible();
  await expect(page.getByRole('row', { name: /Projector-HD/ })).toContainText('Partial: 4 of 5 reserved');
});

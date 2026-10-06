import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  availabilityPeriod,
  capacityFor,
  checkEquipmentAvailability,
} from '../src/modules/equipmentSupport/availability.js';
import { createEquipmentHandler } from '../src/modules/equipmentSupport/handler.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { VercelResponse } from '../src/vercel.js';
const staff = {
  id: randomUUID(),
  email: 'staff@example.test',
  role: 'technical_support_staff' as const,
  isActive: true,
  failedLoginCount: 0,
};
const row = {
  id: randomUUID(),
  name: 'Microphone',
  totalStock: 10,
  location: 'Other venue',
  operationalStatus: 'available',
  commitments: [],
};
const start = '2026-11-15T01:00:00Z',
  end = '2026-11-15T04:00:00Z';
test('TC_E07S03_01 reserved and damaged quantities reduce free capacity', () => {
  assert.equal(
    capacityFor({
      ...row,
      commitments: [
        { startsAt: start, endsAt: end, quantity: 3, kind: 'reserved' },
        { startsAt: start, endsAt: end, quantity: 2, kind: 'unavailable' },
      ],
    }).freeQuantity,
    5,
  );
  assert.equal(
    capacityFor({ ...row, operationalStatus: 'maintenance' }).freeQuantity,
    0,
  );
});
test('TC_E07S03_02 location has no effect and overcommitted stock never becomes negative', () => {
  assert.equal(capacityFor(row).freeQuantity, 10);
  assert.equal(
    capacityFor({
      ...row,
      commitments: [
        { startsAt: start, endsAt: end, quantity: 12, kind: 'reserved' },
      ],
    }).freeQuantity,
    0,
  );
});
test('TC_E07S03_03 peak concurrency handles adjacent periods without adding independent reservations', () => {
  const middle = '2026-11-15T02:00:00Z';
  assert.equal(
    capacityFor({
      ...row,
      commitments: [
        { startsAt: start, endsAt: middle, quantity: 4, kind: 'reserved' },
        { startsAt: middle, endsAt: end, quantity: 4, kind: 'reserved' },
      ],
    }).freeQuantity,
    6,
  );
  assert.equal(
    capacityFor({
      ...row,
      commitments: [
        { startsAt: start, endsAt: middle, quantity: 4, kind: 'reserved' },
        { startsAt: middle, endsAt: end, quantity: 2, kind: 'unavailable' },
      ],
    }).freeQuantity,
    6,
  );
});
test('period validation rejects missing offsets, invalid ranges and malformed ids', () => {
  for (const params of [
    new URLSearchParams(),
    new URLSearchParams({ start: '2026-02-30T01:00:00Z', end }),
    new URLSearchParams({ start, end: start }),
    new URLSearchParams({ start: '2026-11-15T09:00', end }),
    new URLSearchParams({ start, end, id: 'bad' }),
  ])
    assert.throws(() => availabilityPeriod(params), { status: 400 });
  assert.equal(
    availabilityPeriod(new URLSearchParams({ start, end })).start,
    new Date(start).toISOString(),
  );
});
test('availability denies wrong, inactive and locked roles before period validation or equipment reads', async () => {
  const calls: string[] = [];
  const query: Query = async (sql) => {
    calls.push(sql);
    return { rows: [] };
  };
  await assert.rejects(
    checkEquipmentAvailability(query, undefined, new URLSearchParams()),
    { status: 401 },
  );
  for (const user of [
    { ...staff, role: 'event_coordinator' as const },
    { ...staff, isActive: false },
    { ...staff, failedLoginCount: 5 },
  ])
    await assert.rejects(
      checkEquipmentAvailability(query, user, new URLSearchParams()),
      { status: 403 },
    );
  assert.equal(calls.length, 3);
  assert.ok(calls.every((sql) => sql.includes('audit_logs')));
});
test('handler exposes availability as authenticated read-only API', async () => {
  let status = 0;
  let body: unknown;
  const response = {
    setHeader() {},
    status(code: number) {
      status = code;
      return {
        json(value: unknown) {
          body = value;
        },
      };
    },
  } as unknown as VercelResponse;
  const query: Query = async () => ({ rows: [] });
  const handler = createEquipmentHandler({
    authenticate: async () => staff,
    query,
    pool: () => {
      throw new Error('No writes allowed');
    },
    allowedOrigin: () => true,
  });
  await handler(
    {
      method: 'GET',
      url: `/api/equipment?mode=availability&start=${start}&end=${end}`,
      headers: {},
    },
    response,
  );
  assert.equal(status, 200);
  assert.ok(body);
  await handler(
    {
      method: 'POST',
      url: '/api/equipment?mode=availability',
      headers: {},
      body: {},
    },
    response,
  );
  assert.equal(status, 405);
});

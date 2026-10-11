// E07-S05 (SCRUM-55) unit tests: input rules, wording and the route's
// dispatch, without a database. Persistence is in the .integration file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  formatDay,
  inServiceSentence,
  markUnavailable,
  returnToService,
  validateUnavailabilityInput,
} from '../src/modules/equipmentSupport/unavailability.js';
import { createEquipmentHandler } from '../src/modules/equipmentSupport/handler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelResponse } from '../src/vercel.js';

const user = (role: AuthenticatedUser['role'], isActive = true): AuthenticatedUser => ({
  id: randomUUID(),
  email: 'person@example.test',
  role,
  isActive,
  failedLoginCount: 0,
});
// 12 Oct 2026, 11:30 pm Singapore time: still the 12th there, already past
// 3 pm UTC.
const NOW = new Date('2026-10-12T15:30:00Z');
const valid = { from: '2026-12-01', to: '2026-12-05', quantity: 2, reason: '  Sensor repair  ' };

test('E07-S05 D51 a withdrawal is whole Singapore days with a trimmed reason, stored as a half-open range', () => {
  assert.deepEqual(validateUnavailabilityInput(valid, NOW).input, {
    quantity: 2,
    reason: 'Sensor repair',
    start: new Date('2026-11-30T16:00:00Z'),
    end: new Date('2026-12-05T16:00:00Z'),
  });
  // One day; ending today in Singapore; starting in the past; the limits.
  assert.equal(validateUnavailabilityInput({ ...valid, to: '2026-12-01' }, NOW).input?.end.toISOString(), '2026-12-01T16:00:00.000Z');
  assert.ok(validateUnavailabilityInput({ ...valid, from: '2026-10-01', to: '2026-10-12' }, NOW).input);
  assert.equal(validateUnavailabilityInput({ ...valid, quantity: 2147483647 }, NOW).input?.quantity, 2147483647);
  assert.equal(validateUnavailabilityInput({ ...valid, reason: 'x'.repeat(255) }, NOW).input?.reason.length, 255);
});

test('E07-S05 D51 invalid dates quantities and reasons are refused with field errors', () => {
  const errors = (body: unknown) => validateUnavailabilityInput(body, NOW).errors;
  assert.deepEqual(errors({ ...valid, from: '2026-10-01', to: '2026-10-11' }), { to: ['The end date must be today or later.'] });
  assert.deepEqual(errors({ ...valid, to: '2026-11-30' }), { to: ['End date must be on or after the start date.'] });
  for (const day of ['2027-02-31', '01/12/2026', '2026-12-1', '', 20261201, undefined])
    assert.deepEqual(errors({ ...valid, from: day }), { from: ['Start date must be a real date.'] });
  assert.deepEqual(errors({ ...valid, to: '2026-13-01' }), { to: ['End date must be a real date.'] });
  for (const quantity of [0, -1, 1.5, '2', Infinity, 2147483648, undefined])
    assert.deepEqual(errors({ ...valid, quantity }), { quantity: ['Enter a whole number greater than 0.'] });
  for (const reason of ['', '   ', undefined, 7])
    assert.deepEqual(errors({ ...valid, reason }), { reason: ['Enter a reason.'] });
  assert.deepEqual(errors({ ...valid, reason: 'x'.repeat(256) }), { reason: ['Reason must be at most 255 characters.'] });
  for (const body of [undefined, null, [], 'bad'])
    assert.deepEqual(Object.keys(errors(body) ?? {}).sort(), ['from', 'quantity', 'reason', 'to']);
});

test('E07-S05 days and in-service sentences read the way the screens write them', () => {
  assert.equal(formatDay('2026-12-01'), '1 Dec 2026');
  assert.equal(formatDay('2026-09-30'), '30 Sept 2026');
  assert.equal(inServiceSentence(0), 'No units are in service for these dates.');
  assert.equal(inServiceSentence(-1), 'No units are in service for these dates.');
  assert.equal(inServiceSentence(1), 'Only 1 unit is in service for these dates.');
  assert.equal(inServiceSentence(3), 'Only 3 units are in service for these dates.');
});

test('E07-S05 writers refuse signed-out callers and other roles before opening a transaction, and audit the refusal', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      return { rows: [] };
    },
    connect: async () => assert.fail('no transaction for a refused caller'),
  } as unknown as Pool;
  await assert.rejects(markUnavailable(pool, undefined, randomUUID(), valid), { status: 401, message: 'Sign in to continue.' });
  await assert.rejects(returnToService(pool, undefined, { unavailabilityId: randomUUID() }), { status: 401 });
  assert.equal(calls.length, 0, 'a signed-out caller has nobody to audit');
  for (const caller of [user('event_coordinator'), user('event_organiser'), user('attendee'), user('technical_support_staff', false)]) {
    await assert.rejects(markUnavailable(pool, caller, randomUUID(), valid), { status: 403 });
    await assert.rejects(returnToService(pool, caller, { unavailabilityId: randomUUID() }), { status: 403 });
  }
  assert.equal(calls.length, 8);
  assert.ok(calls.every((call) => call.sql.includes("'Access Denied'")));
});

test('E07-S05 invalid ids and input are answered without a transaction once the caller is Technical Support', async () => {
  const pool = {
    query: async () => ({ rows: [] }),
    connect: async () => assert.fail('no transaction for invalid input'),
  } as unknown as Pool;
  const staff = user('technical_support_staff');
  for (const id of [undefined, 'not-a-uuid', 7])
    await assert.rejects(markUnavailable(pool, staff, id, valid), { status: 400, message: 'A valid equipment id is required.' });
  const refused = await markUnavailable(pool, staff, randomUUID(), { ...valid, quantity: 0 });
  assert.deepEqual(refused, {
    status: 400,
    body: { error: 'validation_failed', errors: { quantity: ['Enter a whole number greater than 0.'] } },
  });
  for (const body of [undefined, [], { unavailabilityId: 'x' }])
    await assert.rejects(returnToService(pool, staff, body), { status: 400, message: 'Choose an unavailable period.' });
});

test('E07-S05 the equipment route sends markUnavailable and returnToService to the writers and lists periods with the item', async () => {
  let status = 0;
  let body: unknown;
  const response: VercelResponse = {
    setHeader: () => {},
    status: (code) => {
      status = code;
      return { json: (value) => { body = value; } };
    },
    json: () => {},
  };
  const staff = user('technical_support_staff');
  const sql: string[] = [];
  const equipmentId = randomUUID();
  const handler = createEquipmentHandler({
    authenticate: async () => staff,
    query: async (text: string) => {
      sql.push(text);
      if (text.includes('FROM equipment WHERE id=$1'))
        return { rows: [{ id: equipmentId, name: 'HD Camera', is_active: true }] } as never;
      if (text.includes('FROM equipment_unavailability'))
        return {
          rows: [{ id: 'p1', equipment_id: equipmentId, quantity: 2, reason: 'Sensor repair',
            starts_at: new Date('2030-11-30T16:00:00Z'), ends_at: new Date('2030-12-05T16:00:00Z') }],
        } as never;
      return { rows: [] } as never;
    },
    pool: () => ({ query: async () => ({ rows: [] }), connect: async () => assert.fail('validation stops first') }) as unknown as Pool,
    allowedOrigin: () => true,
  });
  await handler({ method: 'GET', url: `/api/equipment?id=${equipmentId}`, headers: {} }, response);
  assert.equal(status, 200);
  assert.deepEqual((body as { equipment: { unavailability: unknown } }).equipment.unavailability, [
    { id: 'p1', equipmentId, quantity: 2, reason: 'Sensor repair', from: '2030-12-01', to: '2030-12-05',
      startsAt: '2030-11-30T16:00:00.000Z', endsAt: '2030-12-05T16:00:00.000Z' },
  ]);
  await handler({ method: 'POST', url: '/api/equipment', headers: {}, body: { action: 'markUnavailable', id: equipmentId, quantity: 0 } }, response);
  assert.equal(status, 400);
  assert.equal((body as { error: string }).error, 'validation_failed');
  await handler({ method: 'POST', url: '/api/equipment', headers: {}, body: { action: 'returnToService' } }, response);
  assert.deepEqual([status, body], [400, { error: 'Choose an unavailable period.' }]);
  await handler({ method: 'POST', url: '/api/equipment', headers: {}, body: { action: 'other' } }, response);
  assert.deepEqual([status, body], [400, { error: 'Choose create, update, retire, markUnavailable or returnToService.' }]);
});

// E07-S04 (SCRUM-54) unit tests: input rules, wording and the route's
// dispatch, without a database. Persistence is in the .integration file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  changeReservation,
  eventLabel,
  formatEventDates,
  freeSentence,
  releaseReservation,
  reserveEquipment,
  validateReservationInput,
} from '../src/modules/equipmentSupport/reservations.js';
import { createEquipmentRequestHandler } from '../src/modules/equipmentSupport/requestHandler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelResponse } from '../src/vercel.js';

const user = (role: AuthenticatedUser['role'], isActive = true): AuthenticatedUser => ({
  id: randomUUID(),
  email: 'person@example.test',
  role,
  isActive,
  failedLoginCount: 0,
});

test('E07-S04 reservation input needs a request or reservation id and a whole quantity of at least 1', () => {
  const requestId = randomUUID();
  const reservationId = randomUUID();
  assert.deepEqual(validateReservationInput('reserve', { requestId, quantity: 2 }).input, { id: requestId, quantity: 2 });
  assert.deepEqual(validateReservationInput('change', { reservationId, quantity: 1 }).input, { id: reservationId, quantity: 1 });
  assert.deepEqual(validateReservationInput('release', { reservationId }).input, { id: reservationId, quantity: 0 });
  assert.equal(validateReservationInput('reserve', { requestId, quantity: 2147483647 }).input?.quantity, 2147483647);
  for (const quantity of [0, -1, 1.5, '2', Infinity, 2147483648, undefined])
    assert.deepEqual(validateReservationInput('reserve', { requestId, quantity }).errors, {
      quantity: ['Enter a whole number greater than 0.'],
    });
  for (const body of [undefined, null, [], 'bad', { requestId: 'not-a-uuid', quantity: 1 }])
    assert.deepEqual(validateReservationInput('reserve', body).errors?.requestId, ['Choose an equipment request to reserve.']);
  assert.deepEqual(validateReservationInput('change', { requestId, quantity: 1 }).errors, { reservationId: ['Choose a reservation.'] });
  assert.deepEqual(validateReservationInput('release', { reservationId: ['x'] }).errors, { reservationId: ['Choose a reservation.'] });
});

test('E07-S04 notices write Singapore dates the way the screens do', () => {
  // 15 Oct 2026 9:00 am to 5:00 pm Singapore time.
  assert.equal(
    formatEventDates(new Date('2026-10-15T01:00:00Z'), new Date('2026-10-15T09:00:00Z')),
    '15 Oct 2026, 9:00 am – 5:00 pm',
  );
  // Across midnight in Singapore, though one UTC day: both dates shown.
  assert.equal(
    formatEventDates(new Date('2026-09-30T14:00:00Z'), new Date('2026-09-30T17:30:00Z')),
    '30 Sept 2026, 10:00 pm – 1 Oct 2026, 1:30 am',
  );
});

test('E07-S04 event labels and free-quantity sentences read naturally', () => {
  assert.equal(eventLabel({ eventCode: 'EVT-3001', title: 'EVT-3001 Approved Annual Conference' }), 'EVT-3001 Approved Annual Conference');
  assert.equal(eventLabel({ eventCode: 'EVT-9', title: 'Winter Gala' }), 'EVT-9 Winter Gala');
  assert.equal(eventLabel({ eventCode: null, title: 'Winter Gala' }), 'Winter Gala');
  assert.equal(freeSentence(0), "None are free for this event's dates.");
  assert.equal(freeSentence(-2), "None are free for this event's dates.");
  assert.equal(freeSentence(1), "Only 1 is free for this event's dates.");
  assert.equal(freeSentence(4), "Only 4 are free for this event's dates.");
});

test('E07-S04 reservation writers refuse signed-out callers and other roles before opening a transaction', async () => {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      return { rows: [] };
    },
    connect: async () => assert.fail('no transaction for a refused caller'),
  } as unknown as Pool;
  const body = { requestId: randomUUID(), reservationId: randomUUID(), quantity: 1 };
  await assert.rejects(reserveEquipment(pool, undefined, 'EVT-A', body), { status: 401, message: 'Sign in to continue.' });
  assert.equal(calls.length, 0, 'a signed-out caller has nobody to audit');
  for (const caller of [user('event_coordinator'), user('event_organiser'), user('attendee'), user('technical_support_staff', false)])
    for (const write of [reserveEquipment, changeReservation, releaseReservation])
      await assert.rejects(write(pool, caller, 'EVT-A', body), {
        status: 403,
        message: 'Access denied. Only Technical Support Staff can reserve equipment.',
      });
  assert.equal(calls.length, 12);
  assert.ok(calls.every((call) => call.sql.includes("'Access Denied'") && call.values?.[1] === 'equipment_reservations:EVT-A'));
  // A long identifier is cut to the column's 160 characters.
  await assert.rejects(reserveEquipment(pool, user('attendee'), 'E'.repeat(400), body), { status: 403 });
  assert.equal((calls.at(-1)!.values![1] as string).length, 'equipment_reservations:'.length + 160);
});

test('E07-S04 invalid input is answered with field errors and no transaction once the caller is Technical Support', async () => {
  const pool = { connect: async () => assert.fail('no transaction for invalid input') } as unknown as Pool;
  const tech = user('technical_support_staff');
  assert.deepEqual(await reserveEquipment(pool, tech, 'EVT-A', { requestId: randomUUID(), quantity: 0 }), {
    status: 400,
    body: { error: 'validation_failed', errors: { quantity: ['Enter a whole number greater than 0.'] } },
  });
  assert.equal((await changeReservation(pool, tech, 'EVT-A', { quantity: 1 })).status, 400);
  assert.equal((await releaseReservation(pool, tech, 'EVT-A', {})).status, 400);
});

test('E07-S04 the equipment request route sends reserve changeReservation and releaseReservation to the reservation writers', async () => {
  let status = 0;
  let payload: unknown;
  const response = {
    setHeader() {},
    status(code: number) {
      status = code;
      return { json(body: unknown) { payload = body; } };
    },
    json(body: unknown) { payload = body; },
  } as unknown as VercelResponse;
  const audited: unknown[][] = [];
  const handler = createEquipmentRequestHandler({
    // A Coordinator reaches each writer and is refused there, which shows the
    // action was dispatched to the reservation code.
    authenticate: async () => user('event_coordinator'),
    query: async () => ({ rows: [] }),
    pool: () => ({ query: async (_sql: string, values: unknown[]) => { audited.push(values); return { rows: [] }; } }) as unknown as Pool,
    allowedOrigin: (origin) => origin === 'http://localhost:5173',
  });
  for (const action of ['reserve', 'changeReservation', 'releaseReservation']) {
    await handler(
      { method: 'POST', url: '/api/equipment?mode=requests&event=EVT-A', headers: { origin: 'http://localhost:5173' }, body: { action } },
      response,
    );
    assert.equal(status, 403);
    assert.deepEqual(payload, { error: 'Access denied. Only Technical Support Staff can reserve equipment.' });
  }
  assert.equal(audited.length, 3);
  await handler(
    { method: 'POST', url: '/api/equipment?mode=requests&event=EVT-A', headers: { origin: 'http://localhost:5173' }, body: { action: 'book' } },
    response,
  );
  assert.equal(status, 400);
  assert.deepEqual(payload, {
    error: 'Choose saveRequest, removeRequest, reserve, changeReservation or releaseReservation.',
  });
});

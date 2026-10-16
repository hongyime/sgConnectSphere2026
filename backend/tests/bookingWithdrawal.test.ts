import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withdrawBooking } from '../src/modules/venueBooking/bookingWithdrawal.js';
import { createBookingSubmissionHandler } from '../src/modules/venueBooking/bookingSubmissionHandler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelResponse } from '../src/vercel.js';

const actor: AuthenticatedUser = { id: randomUUID(), role: 'event_coordinator', email: 'synthetic@example.test', isActive: true, failedLoginCount: 0 };
const id = randomUUID(), event = randomUUID(), venue = randomUUID(), staff = randomUUID();
type State = { event?: boolean; assigned?: boolean; reassigned?: boolean; account?: boolean; active?: boolean; role?: string; failures?: number; lock?: Date | null; booking?: boolean; wrongEvent?: boolean; status?: string; fail?: string; staff?: boolean; busy?: boolean };
function database(state: State = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const query = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (state.fail && sql.includes(state.fail)) throw new Error('Synthetic failure');
    if (state.busy && sql.includes('NOWAIT')) throw Object.assign(new Error('busy'), { code: '55P03' });
    let rows: unknown[] = [];
    if (sql.startsWith('SELECT id,coordinator_id')) rows = state.event === false ? [] : [{ id: event, coordinator_id: state.assigned === false ? randomUUID() : actor.id }];
    else if (sql.startsWith('SELECT id FROM events WHERE')) rows = state.reassigned ? [] : [{ id: event }];
    else if (sql.startsWith('SELECT is_active')) rows = state.account === false ? [] : [{ is_active: state.active !== false, role: state.role ?? actor.role, failed_login_count: state.failures ?? 0, locked_until: state.lock ?? null }];
    else if (sql.startsWith('SELECT id,event_id')) rows = state.booking === false ? [] : [{ id, event_id: state.wrongEvent ? randomUUID() : event, venue_id: venue, status: state.status ?? 'pending' }];
    else if (sql.includes('FROM events e LEFT JOIN')) rows = [{ id: event, title: 'Synthetic event', public_name: null, status: 'planning', starts_at: new Date(), ends_at: new Date(), organiser_id: null, coordinator_id: actor.id }];
    else if (sql.startsWith('SELECT id FROM users WHERE')) rows = state.staff === false ? [] : [{ id: staff }];
    else if (sql.startsWith('SELECT clock_timestamp')) rows = [{ now: new Date() }];
    else if (sql.includes('INSERT INTO notifications')) rows = [{ id: randomUUID() }];
    else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: randomUUID() }];
    else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', recipient_email: null, email: 'synthetic@example.test', title: 'Event update', message: 'Synthetic notice' }];
    return { rows, rowCount: rows.length };
  };
  const client = { query, release() {} } as unknown as PoolClient;
  return { pool: { connect: async () => client } as unknown as Pool, calls };
}
const options = { resolveVenueStaff: async () => [staff] };

test('TC_E06S03_09 withdrawal rejects missing identity, stale accounts and other roles before writing', async () => {
  const db = database();
  await assert.rejects(withdrawBooking(db.pool, undefined, {}), { status: 401 });
  await assert.rejects(withdrawBooking(db.pool, { ...actor, role: 'venue_staff' }, {}), { status: 403 });
  for (const body of [undefined, 'bad', {}, { booking_id: 3 }, { booking_id: 'bad' }])
    await assert.rejects(withdrawBooking(db.pool, actor, body), { status: 400 });
  assert.equal(db.calls.length, 0);
  for (const state of [{ event: false }, { assigned: false }, { reassigned: true }, { account: false }, { active: false }, { role: 'venue_staff' }, { failures: 5 }, { lock: new Date(Date.now() + 60000) }]) {
    const denied = database(state);
    await assert.rejects(withdrawBooking(denied.pool, actor, { booking_id: id }), { status: state.event === false || state.assigned === false || state.reassigned ? 404 : 403 });
    assert.equal(denied.calls.at(-1)?.sql, 'ROLLBACK');
    assert.ok(!denied.calls.some(c => c.sql.startsWith('UPDATE')));
  }
  const busy = database({ busy: true });
  await assert.rejects(withdrawBooking(busy.pool, actor, { booking_id: id }), { status: 409 });
  assert.equal(busy.calls.at(-1)?.sql, 'ROLLBACK');
});

test('TC_E06S03_09 TC_E06S03_10 status and identity are rechecked after venue-before-booking locks', async () => {
  for (const state of [{ booking: false }, { wrongEvent: true }, ...['confirmed','rejected','released','tentative','expired'].map(status => ({ status }))]) {
    const db = database(state);
    await assert.rejects(withdrawBooking(db.pool, actor, { booking_id: id }), { status: 'status' in state ? 409 : 404 });
    assert.equal(db.calls.at(-1)?.sql, 'ROLLBACK');
    assert.ok(db.calls.findIndex(c => c.sql.includes('FOR NO KEY UPDATE OF v')) < db.calls.findIndex(c => c.sql.endsWith('FOR UPDATE')));
  }
});

test('TC_E06S03_08 TC_E06S03_11 withdrawal changes only one booking, audits and scopes atomic staff delivery', async () => {
  for (const state of [{}, { lock: new Date(0) }, { staff: false }]) {
    const db = database(state);
    const result = await withdrawBooking(db.pool, actor, { booking_id: id }, options);
    assert.equal(result.body.booking.status, 'released');
    assert.equal(db.calls.filter(c => c.sql.startsWith('UPDATE venue_bookings')).length, 1);
    assert.ok(!db.calls.some(c => c.sql.startsWith('UPDATE events')));
    assert.deepEqual(db.calls.find(c => c.sql.startsWith('UPDATE venue_bookings'))?.values, [id]);
    assert.deepEqual(db.calls.find(c => c.sql.includes('Booking Withdrawn'))?.values?.slice(1), [actor.id,id,event]);
    assert.deepEqual(db.calls.find(c => c.sql.includes('SELECT id FROM users WHERE'))?.values, [[staff]]);
    assert.equal(db.calls.filter(c => c.sql.includes('INSERT INTO notifications')).length, state.staff === false ? 0 : 1);
    assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
  }
  const db = database();
  await withdrawBooking(db.pool, actor, { booking_id: id });
  assert.ok(db.calls.some(c => c.sql.includes('venue_staff_assignments')));
  for (const fail of ["UPDATE venue_bookings", 'INSERT INTO audit_logs', 'INSERT INTO notifications', 'INSERT INTO notification_deliveries']) {
    const failed = database({ fail });
    await assert.rejects(withdrawBooking(failed.pool, actor, { booking_id: id }, options), /Synthetic failure/);
    assert.equal(failed.calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('withdrawal handler shares POST origin/authentication boundary and needs no submission key', async () => {
  let status = 0;
  const response = { setHeader() {}, status(n: number) { status = n; return { json() {} }; }, json() {} } as VercelResponse;
  const handler = createBookingSubmissionHandler({ authenticate: async () => actor, pool: () => database().pool, allowedOrigin: () => true, notifications: options });
  await handler({ method: 'POST', headers: {}, body: { action: 'withdraw_booking', booking_id: id } }, response);
  assert.equal(status, 200);
});

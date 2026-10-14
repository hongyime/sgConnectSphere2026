import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { submitBooking, validateBookingInput } from '../src/modules/venueBooking/bookingSubmission.js';
import { createBookingSubmissionHandler } from '../src/modules/venueBooking/bookingSubmissionHandler.js';
import type { VercelResponse } from '../src/vercel.js';

const actor: AuthenticatedUser = { id: randomUUID(), role: 'event_coordinator', email: 'coord@example.test', isActive: true, failedLoginCount: 0 };
const eventId = randomUUID(), venueId = randomUUID(), holdId = randomUUID();
const start = new Date('2027-01-15T01:00:00Z'), end = new Date('2027-01-15T10:00:00Z');
const input = { event_id: eventId, venue_id: venueId, starts_at: start.toISOString(), ends_at: end.toISOString() };
const audience = { id: eventId, title: 'Synthetic Event', public_name: null, status: 'approved', starts_at: start, ends_at: end, organiser_id: null, coordinator_id: actor.id };
type State = { assigned?: boolean; active?: boolean; locked?: boolean; role?: string; status?: string; sessions?: number; sessionOutside?: boolean; venue?: boolean; candidate?: boolean; clash?: boolean; block?: boolean; requirements?: boolean; hold?: string; expiry?: Date | null; previous?: Record<string, unknown>; failure?: Error; staff?: string[] };
function database(state: State = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const answer = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    let rows: unknown[] = [];
    if (sql.includes('FROM events WHERE')) rows = state.assigned === false ? [] : [{ id: eventId, status: state.status ?? 'approved', coordinator_id: actor.id, starts_at: start, ends_at: end }];
    else if (sql.includes('SELECT is_active,role')) rows = [{ is_active: state.active !== false, role: state.role ?? actor.role, locked_until: state.locked ? new Date(Date.now() + 60000) : null }];
    else if (sql.includes('SELECT id,submission_payload')) rows = state.previous ? [state.previous] : [];
    else if (sql.includes('SELECT id,event_id,venue_id,status,expires_at')) rows = state.hold === 'missing' ? [] : [{ id: holdId, event_id: eventId, venue_id: venueId, status: state.hold ?? 'tentative', expires_at: state.expiry === undefined ? new Date(Date.now() + 60000) : state.expiry, starts_at: start, ends_at: end, purpose: null, headcount: null, requested_by: actor.id }];
    else if (sql.includes('SELECT clock_timestamp()')) rows = [{ now: new Date() }];
    else if (sql.includes('FROM sessions WHERE')) rows = Array.from({ length: state.sessions ?? 1 }, () => ({ id: randomUUID(), starts_at: state.sessionOutside ? end : start, ends_at: end }));
    else if (sql.includes('SELECT opens_at')) rows = state.venue === false ? [] : [{ opens_at: '08:00:00', closes_at: '22:00:00' }];
    else if (sql.includes('SELECT lower(occupied_window')) rows = state.clash ? [{ starts_at: start, ends_at: end }] : [];
    else if (sql.includes('SELECT id FROM venue_blocks')) rows = state.block ? [{ id: randomUUID() }] : [];
    else if (sql.includes('FROM events e WHERE')) rows = [{ id: eventId, title: audience.title, start, end, attendance: state.requirements === false ? 0 : 150, layout: '', accessibility: [], facilities: [] }];
    else if (sql.includes('FROM venues v WHERE')) rows = state.candidate === false ? [] : [{ id: venueId, name: 'Small Hall', location: 'Campus', max_capacity: 100, layouts: [], accessibility: [], facilities: [], available: true }];
    else if (sql.includes('FROM events e LEFT JOIN')) rows = [audience];
    else if (sql.includes('SELECT id FROM users WHERE')) rows = (state.staff ?? []).map(id => ({ id }));
    else if (sql.includes('SELECT id,event_id,venue_id,session_id')) rows = [{ id: holdId, status: 'pending', suitability: { mismatches: [] } }];
    else if (sql.includes('INSERT INTO venue_bookings') || sql.includes("UPDATE venue_bookings SET status='pending'")) { if (state.failure) throw state.failure; }
    else if (sql.includes('INSERT INTO notifications')) rows = [{ id: randomUUID() }];
    else if (sql.includes('INSERT INTO notification_deliveries')) rows = [{ id: randomUUID() }];
    else if (sql.includes('SELECT d.delivery_status')) rows = [{ delivery_status: 'queued', recipient_email: null, email: 'staff@example.test', title: 'Event update', message: 'Synthetic notice' }];
    return { rows, rowCount: rows.length };
  };
  const client = { query: answer, release() {} } as unknown as PoolClient;
  return { pool: { connect: async () => client, query: answer } as unknown as Pool, calls };
}

test('booking input normalizes instants and optional fields, rejects invalid types/bounds', () => {
  assert.deepEqual(validateBookingInput({ ...input, event_id: ' EVT-1 ', purpose: ' Main ', headcount: 12 }).input,
    { ...input, event_id: 'EVT-1', purpose: 'Main', headcount: 12 });
  assert.equal(validateBookingInput({ ...input, purpose: ' ' }).input?.purpose, null);
  for (const delta of [{ event_id: '' }, { event_id: 'x'.repeat(161) }, { venue_id: 3 }, { starts_at: 'bad' }, { ends_at: start.toISOString() }, { starts_at: '2027-01-15T09:00' }, { purpose: 3 }, { purpose: 'x'.repeat(81) }, { headcount: 0 }, { headcount: 1.2 }, { headcount: '3' }, { headcount: 2147483648 }]) assert.ok(validateBookingInput({ ...input, ...delta }).errors);
  assert.ok(validateBookingInput({}).errors);
});

test('authentication/input refusals happen before a transaction', async () => {
  const db = database();
  for (const user of [undefined, { ...actor, isActive: false }, { ...actor, role: 'venue_staff' as const }, { ...actor, failedLoginCount: 5 }]) await assert.rejects(submitBooking(db.pool, user, input, randomUUID()), { status: user ? 403 : 401 });
  for (const key of [undefined, 'bad']) await assert.rejects(submitBooking(db.pool, actor, input, key), { status: 400 });
  await assert.rejects(submitBooking(db.pool, actor, { action: 'convert_hold', booking_id: 4 }), { status: 400 });
  assert.equal((await submitBooking(db.pool, actor, null, randomUUID())).status, 400);
  assert.equal(db.calls.length, 0);
});

test('TC_E06S03_01 TC_E06S03_02 advisory failure does not block Pending; status and audit commit together', async () => {
  const db = database();
  const result = await submitBooking(db.pool, actor, input, randomUUID());
  assert.equal(result.status, 201);
  assert.equal(result.body.event_status, 'planning');
  assert.equal(result.body.suitability?.suitable, false);
  assert.match(JSON.stringify(result.body.suitability), /Capacity 100/);
  assert.ok(db.calls.some(c => c.sql.includes("UPDATE events SET status='planning'")));
  assert.equal(db.calls.filter(c => c.sql.includes('INSERT INTO audit_logs')).length, 2);
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
});

test('transactional gates refuse assignment/account/status/session/venue/block/conflicts', async () => {
  for (const [state, status] of [[{ assigned: false },404],[{ active: false },403],[{ locked: true },403],[{ role: 'venue_staff' },403],[{ status: 'confirmed' },409],[{ sessions: 0 },409],[{ sessions: 2 },409],[{ sessionOutside: true },400],[{ venue: false },404],[{ candidate: false },404],[{ clash: true },409],[{ block: true },409],[{ requirements: false },400]] as const) {
    const db = database(state);
    await assert.rejects(submitBooking(db.pool, actor, input, randomUUID()), { status });
    assert.equal(db.calls.at(-1)?.sql, 'ROLLBACK');
    assert.ok(!db.calls.some(c => c.sql.includes('INSERT INTO venue_bookings')));
  }
  const outside = database();
  await assert.rejects(submitBooking(outside.pool, actor, { ...input, starts_at: '2027-01-15T00:00:00Z' }, randomUUID()), { status: 400 });
});

test('direct retry returns stored request without effects; changed payload is rejected', async () => {
  const previous = { id: holdId, submission_payload: { ...input, purpose: null, headcount: null } };
  const db = database({ previous });
  assert.equal((await submitBooking(db.pool, actor, input, randomUUID())).body.replayed, true);
  assert.ok(!db.calls.some(c => /INSERT INTO|UPDATE events/.test(c.sql)));
  await assert.rejects(submitBooking(db.pool, actor, { ...input, headcount: 3 }, randomUUID()), { status: 409 });
});

test('TC_E06S05_04 hold conversion shares effects, preserves identity, clears expiry, retries safely', async () => {
  const db = database();
  const result = await submitBooking(db.pool, actor, { action: 'convert_hold', booking_id: holdId });
  assert.equal(result.status, 200);
  assert.ok(db.calls.some(c => c.sql.includes("status='pending',expires_at=NULL")));
  assert.ok(!db.calls.some(c => c.sql.includes('INSERT INTO venue_bookings')));
  const replay = database({ hold: 'pending', status: 'confirmed' });
  assert.equal((await submitBooking(replay.pool, actor, { action: 'convert_hold', booking_id: holdId })).body.replayed, true);
  assert.ok(!replay.calls.some(c => /INSERT INTO|UPDATE venue_bookings/.test(c.sql)));
});

test('expired/missing/non-hold conversion rolls back and reads clock after the hold lock', async () => {
  for (const [state, status] of [[{ hold: 'missing' },404],[{ hold: 'expired' },409],[{ hold: 'confirmed' },409],[{ expiry: null },409],[{ expiry: new Date(0) },409]] as const) {
    const db = database(state);
    await assert.rejects(submitBooking(db.pool, actor, { action: 'convert_hold', booking_id: holdId }), { status });
    assert.equal(db.calls.at(-1)?.sql, 'ROLLBACK');
    const lock = db.calls.findIndex(c => c.sql.includes('WHERE id=$1 FOR UPDATE'));
    const clock = db.calls.findIndex(c => c.sql.includes('SELECT clock_timestamp()'));
    if (state.hold !== 'missing') assert.ok(clock > lock);
  }
});

test('write failures roll back; database conflict maps to 409', async () => {
  for (const code of ['23P01','23505','XX000']) {
    const db = database({ failure: Object.assign(new Error('Synthetic failure'), { code }) });
    await assert.rejects(submitBooking(db.pool, actor, input, randomUUID()), code === 'XX000' ? /Synthetic failure/ : { status: 409 });
    assert.equal(db.calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('request notices target selected venue only; actor excluded; outbox shares transaction', async () => {
  const staff = randomUUID(), db = database({ status: 'planning', staff: [staff] });
  const resolved: readonly string[][] = [];
  await submitBooking(db.pool, actor, { ...input, headcount: 50 }, randomUUID(), { resolveVenueStaff: async (_client, venues) => { (resolved as string[][]).push([...venues]); return [staff, staff, actor.id]; } });
  assert.deepEqual(resolved.at(-1), [venueId]);
  assert.equal(db.calls.filter(c => c.sql.includes('INSERT INTO notifications')).length, 1);
  assert.equal(db.calls.filter(c => c.sql.includes('INSERT INTO notification_deliveries')).length, 1);
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
});

test('submission handler enforces method/origin and hides server errors', async () => {
  let status = 0, body: unknown;
  const headers: Record<string,string> = {};
  const response: VercelResponse = { setHeader: (k,v) => { headers[k]=v; }, status: n => { status=n; return { json: b => { body=b; } }; }, json: b => { body=b; } };
  const handler = createBookingSubmissionHandler({ authenticate: async () => actor, pool: () => database().pool, allowedOrigin: origin => origin === 'https://app.example.test' });
  await handler({ method: 'GET', headers: {} }, response); assert.equal(status,405); assert.equal(headers.Allow,'POST');
  await handler({ method: 'POST', headers: {} }, response); assert.equal(status,403);
  await handler({ method: 'POST', headers: { origin: 'https://app.example.test' }, body: input }, response); assert.equal(status,400);
  await handler({ method: 'POST', headers: { origin: 'https://app.example.test', 'idempotency-key': randomUUID() }, body: input }, response); assert.equal(status,201); assert.equal(headers['Cache-Control'],'private, no-store');
  const failed = createBookingSubmissionHandler({ authenticate: async () => { throw new Error('PRIVATE SQL'); }, pool: () => database().pool, allowedOrigin: () => true });
  await failed({ method: 'POST', headers: {} }, response); assert.equal(status,503); assert.ok(!JSON.stringify(body).includes('PRIVATE'));
});

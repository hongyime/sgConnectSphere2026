import test from 'node:test';
import assert from 'node:assert/strict';
import { listBookingRequests } from '../src/modules/venueBooking/bookingRequests.js';
import { createBookingRequestsHandler } from '../src/modules/venueBooking/bookingRequestsHandler.js';
import { AccessError, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelResponse } from '../src/vercel.js';

const actor: AuthenticatedUser = { id: '00000000-0000-4000-8000-000000000001', role: 'event_coordinator', email: 'coordinator@example.test', isActive: true, failedLoginCount: 0 };
const input = { event_id: '00000000-0000-4000-8000-000000000002', venue_id: '00000000-0000-4000-8000-000000000003', starts_at: '2027-01-15T09:00:00+08:00', ends_at: '2027-01-15T18:00:00+08:00' };
const event = { id: input.event_id, event_code: 'EVT-1', title: 'Synthetic Event', status: 'approved', starts_at: input.starts_at, ends_at: input.ends_at, expected_attendance: 150, layout_id: 'theatre', accessibility: ['ramp'], facilities: ['wifi'] };
function repository(overrides = {}, assigned = true) {
  const calls: string[] = [];
  const query: Query = async <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => {
    calls.push(sql);
    assert.ok(sql.startsWith('SELECT'), 'Preparation/list must not write business data');
    if (!sql.includes('FROM venues WHERE')) assert.equal(values?.[1], actor.id);
    const rows = sql.includes('FROM events e WHERE') ? assigned ? [{ ...event, ...overrides }] : [] : [{ id: 'booking', status: 'pending' }];
    return { rows: rows as T[] };
  };
  return { query, calls };
}

test('TC_E06S03_05: assigned Coordinator reads own booking statuses by event code without writes', async () => {
  const repo = repository();
  const result = await listBookingRequests(repo.query, actor, 'EVT-1');
  assert.equal(result.event.id, event.id);
  assert.equal(result.bookings[0].status, 'pending');
  assert.ok(repo.calls[0].includes('e.coordinator_id=$2'));
  assert.ok(repo.calls[1].includes('ORDER BY b.created_at DESC, b.id DESC'));
});

test('read reject anonymous, inactive, locked and wrong-role users', async () => {
  for (const user of [undefined, { ...actor, isActive: false }, { ...actor, failedLoginCount: 5 }, { ...actor, role: 'venue_staff' as const }]) {
    const query: Query = async () => { throw new Error('Must reject before database read'); };
    await assert.rejects(listBookingRequests(query, user, 'EVT-1'), { status: user ? 403 : 401 });
  }
});

test('read refuse another Coordinator or unassigned event without loading bookings', async () => {
  const repo = repository({}, false);
  await assert.rejects(listBookingRequests(repo.query, actor, 'EVT-OTHER'), { status: 404, message: 'Event not found.' });
  assert.equal(repo.calls.length, 1);
  for (const identifier of ['', 'x'.repeat(161)]) await assert.rejects(listBookingRequests(repo.query, actor, identifier), { status: 400 });
});

test('booking-list HTTP handler authenticates, prevents caching, refuses writes and hides internal errors', async () => {
  let code = 0; let body: unknown;
  const headers: Record<string, string> = {};
  const response: VercelResponse = { setHeader: (key, value) => { headers[key] = value; }, status: value => { code = value; return { json: value => { body = value; } }; }, json: value => { body = value; } };
  const handler = createBookingRequestsHandler({ authenticate: async () => actor, query: repository().query });
  await handler({ method: 'GET', url: '/api/venues?event_id=EVT-1', headers: {} }, response);
  assert.equal(code, 200); assert.equal(headers['Cache-Control'], 'private, no-store'); assert.equal(headers.Vary, 'Cookie');
  await handler({ method: 'POST', headers: {} }, response);
  assert.equal(code, 405); assert.equal(headers.Allow, 'GET');
  await handler({ method: 'GET', headers: {} }, response);
  assert.equal(code, 400);
  for (const error of [new AccessError(401, 'Sign in to continue.'), new Error('private SQL details')]) {
    await createBookingRequestsHandler({ authenticate: async () => { throw error; }, query: repository().query })({ method: 'GET', headers: {} }, response);
    assert.equal(code, error instanceof AccessError ? 401 : 503);
    assert.ok(!JSON.stringify(body).includes('private SQL details'));
  }
});

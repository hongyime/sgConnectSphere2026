import test from 'node:test';
import assert from 'node:assert/strict';
import { listBookingRequests, prepareBookingRequest, validateBookingRequestInput } from '../src/modules/venueBooking/bookingRequests.js';
import { createBookingRequestsHandler } from '../src/modules/venueBooking/bookingRequestsHandler.js';
import { assessEventVenue } from '../src/modules/venueBooking/suitability.js';
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

test('booking validation normalizes dates, trims optional purpose and whitelists client input', () => {
  const result = validateBookingRequestInput({ ...input, purpose: ' Breakout A ', headcount: 80, role: 'venue_staff', requested_by: 'forged', status: 'confirmed', is_primary: true });
  assert.deepEqual(result.input, { ...input, starts_at: '2027-01-15T01:00:00.000Z', ends_at: '2027-01-15T10:00:00.000Z', purpose: 'Breakout A', headcount: 80 });
  assert.equal(validateBookingRequestInput({ ...input, purpose: '  ' }).input?.purpose, null);
  assert.equal(validateBookingRequestInput(input).input?.headcount, null);
  assert.equal(validateBookingRequestInput({ ...input, purpose: 'a'.repeat(80), headcount: 2147483647 }).errors, undefined);
});

test('booking validation rejects malformed IDs, dates, reversed periods and non-integer headcounts', () => {
  for (const body of [null, [], 'invalid', {}]) assert.ok(validateBookingRequestInput(body).errors);
  for (const value of ['bad', 1, null]) assert.ok(validateBookingRequestInput({ ...input, event_id: value }).errors?.event_id);
  assert.ok(validateBookingRequestInput({ ...input, venue_id: 'bad' }).errors?.venue_id);
  for (const value of ['2027-01-15T09:00:00', '2027-02-30T09:00:00Z', '2027-13-01T09:00:00Z', '2027-01-15T24:00:00Z', '2027-01-15T09:00:00+99:00', 12]) {
    assert.ok(validateBookingRequestInput({ ...input, starts_at: value }).errors?.starts_at);
  }
  assert.ok(validateBookingRequestInput({ ...input, ends_at: 'bad' }).errors?.ends_at);
  for (const ends_at of [input.starts_at, '2027-01-15T08:59:59+08:00']) assert.ok(validateBookingRequestInput({ ...input, ends_at }).errors?.ends_at);
  for (const headcount of [0, -1, 1.5, '80', true, {}, NaN, Infinity, 2147483648]) assert.ok(validateBookingRequestInput({ ...input, headcount }).errors?.headcount);
  assert.ok(validateBookingRequestInput({ ...input, purpose: 5 }).errors?.purpose);
  assert.ok(validateBookingRequestInput({ ...input, purpose: 'a'.repeat(81) }).errors?.purpose);
});

test('TC_E06S03_05: assigned Coordinator reads own booking statuses by event code without writes', async () => {
  const repo = repository();
  const result = await listBookingRequests(repo.query, actor, 'EVT-1');
  assert.equal(result.event.id, event.id);
  assert.equal(result.bookings[0].status, 'pending');
  assert.ok(repo.calls[0].includes('e.coordinator_id=$2'));
  assert.ok(repo.calls[1].includes('ORDER BY b.created_at DESC, b.id DESC'));
});

test('read and preparation reject anonymous, inactive, locked and wrong-role users', async () => {
  for (const user of [undefined, { ...actor, isActive: false }, { ...actor, failedLoginCount: 5 }, { ...actor, role: 'venue_staff' as const }]) {
    const query: Query = async () => { throw new Error('Must reject before database read'); };
    await assert.rejects(listBookingRequests(query, user, 'EVT-1'), { status: user ? 403 : 401 });
    await assert.rejects(prepareBookingRequest(query, user, input), { status: user ? 403 : 401 });
  }
});

test('read/preparation refuse another Coordinator or unassigned event without loading bookings', async () => {
  const repo = repository({}, false);
  await assert.rejects(listBookingRequests(repo.query, actor, 'EVT-OTHER'), { status: 404, message: 'Event not found.' });
  await assert.rejects(prepareBookingRequest(repo.query, actor, { ...input, coordinator_id: actor.id }), { status: 404 });
  assert.equal(repo.calls.length, 2);
  for (const identifier of ['', 'x'.repeat(161)]) await assert.rejects(listBookingRequests(repo.query, actor, identifier), { status: 400 });
});

test('preparation uses recorded requirements and optional booking headcount in Approved/Planning only', async () => {
  for (const status of ['approved', 'planning']) {
    const result = await prepareBookingRequest(repository({ status }).query, actor, { ...input, headcount: 80, attendance: 1, accessibility: [] });
    assert.equal(result.requested_by, actor.id);
    assert.equal(result.criteria?.attendance, 80);
    assert.equal(result.criteria?.capacity, 80);
    assert.deepEqual(result.criteria?.accessibility, ['ramp']);
    assert.deepEqual(result.criteria?.facilities, ['wifi']);
    assert.equal(result.criteria?.layout, 'theatre');
  }
  const fallback = await prepareBookingRequest(repository({ layout_id: null }).query, actor, input);
  assert.equal(fallback.criteria?.attendance, 150);
  assert.equal(fallback.criteria?.layout, '');
  assert.equal(fallback.input?.headcount, null);
  for (const status of ['draft', 'under_review', 'confirmed', 'completed', 'cancelled']) {
    await assert.rejects(prepareBookingRequest(repository({ status }).query, actor, input), { status: 409 });
  }
});

test('preparation validates contained windows including exact boundaries and missing event attendance', async () => {
  assert.ok((await prepareBookingRequest(repository().query, actor, input)).input);
  assert.ok((await prepareBookingRequest(repository().query, actor, { ...input, starts_at: '2027-01-15T14:00:00+08:00', ends_at: '2027-01-15T16:00:00+08:00' })).input);
  for (const change of [{ starts_at: '2027-01-15T08:59:59+08:00' }, { ends_at: '2027-01-15T18:00:01+08:00' }]) {
    assert.ok((await prepareBookingRequest(repository().query, actor, { ...input, ...change })).errors?.booking_range);
  }
  assert.ok((await prepareBookingRequest(repository().query, actor, {})).errors);
  await assert.rejects(prepareBookingRequest(repository({ expected_attendance: 0 }).query, actor, input), { status: 409 });
  for (const change of [{ starts_at: 'bad' }, { ends_at: 'bad' }, { ends_at: input.starts_at }]) {
    await assert.rejects(prepareBookingRequest(repository(change).query, actor, input), { status: 409 });
  }
});

test('preparation refuses missing or inactive venues', async () => {
  const repo = repository();
  const query: Query = (sql, values) => sql.includes('FROM venues WHERE') ? Promise.resolve({ rows: [] }) : repo.query(sql, values);
  await assert.rejects(prepareBookingRequest(query, actor, input), { status: 404, message: 'Active venue not found.' });
});

test('prepared booking criteria can produce an advisory unsuitable assessment without creating a booking', async () => {
  const repo = repository();
  const prepared = await prepareBookingRequest(repo.query, actor, { ...input, headcount: 200 });
  const assessment = assessEventVenue({ id: input.venue_id, name: 'Hall', location: 'Central', max_capacity: 500, available: true,
    opens_at: '08:00', closes_at: '22:00', layouts: [{ id: 'theatre', label: 'Theatre', capacity: 100 }], accessibility: [], facilities: [] },
  prepared.criteria!, { layouts: [], accessibility: [], facilities: [] });
  assert.equal(assessment.suitable, false);
  assert.equal(assessment.advisory, true);
  assert.match(assessment.mismatches.join(' '), /required 200/);
  assert.equal(repo.calls.length, 2);
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

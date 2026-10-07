// E07-S06 (SCRUM-56) technical support requests: validation boundaries,
// access rules, the three acceptance scenarios and the HTTP handler, against a
// scripted fake database. The real-PostgreSQL run is
// supportRequests.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import {
  MAX_SUPPORT_DESCRIPTION, declareNoSupport, getSupportRequests, requestSupport, validateSupportRequestInput,
} from '../src/modules/equipmentSupport/supportRequests.js';
import { createSupportHandler } from '../src/modules/equipmentSupport/supportHandler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { VercelResponse } from '../src/vercel.js';

const coordinator: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-0000000000c1', email: 'coord@example.test', role: 'event_coordinator',
  isActive: true, failedLoginCount: 0,
};
const otherCoordinator: AuthenticatedUser = { ...coordinator, id: '00000000-0000-4000-8000-0000000000c2' };
const technician: AuthenticatedUser = { ...coordinator, id: '00000000-0000-4000-8000-0000000000t1', role: 'technical_support_staff' };
const event = { id: '00000000-0000-4000-8000-0000000000e1', eventCode: 'EVT-1', title: 'Tech Conference 2026', status: 'planning', coordinatorId: coordinator.id };
const valid = { description: '1 AV technician for the full event', startsAt: '2026-11-12T01:00:00.000Z', endsAt: '2026-11-12T04:00:00.000Z' };

type Reply = { rows: unknown[] } | Error;
// Answers each SQL statement from the first matching rule and records it.
function fakeDatabase(rules: Array<[RegExp, Reply | ((values?: unknown[]) => Reply)]>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const answer = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const rule = rules.find(([pattern]) => pattern.test(sql));
    const reply = rule ? (typeof rule[1] === 'function' ? rule[1](values) : rule[1]) : { rows: [] };
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const client = { query: answer, release: () => undefined } as unknown as PoolClient;
  const pool = { query: answer, connect: async () => client } as unknown as Pool;
  const query: Query = answer as Query;
  return { pool, query, calls };
}
const sqlCalls = (calls: Array<{ sql: string }>, pattern: RegExp) => calls.filter(call => pattern.test(call.sql));

test('validation accepts a trimmed description and an ISO range', () => {
  const result = validateSupportRequestInput({ ...valid, description: '  1 sound technician  ' });
  assert.deepEqual(result.input, { description: '1 sound technician', startsAt: valid.startsAt, endsAt: valid.endsAt });
});

test('validation boundaries: description length, missing and reversed times, non-object bodies', () => {
  assert.ok(validateSupportRequestInput({ ...valid, description: 'x'.repeat(MAX_SUPPORT_DESCRIPTION) }).input);
  assert.deepEqual(validateSupportRequestInput({ ...valid, description: 'x'.repeat(MAX_SUPPORT_DESCRIPTION + 1) }).errors?.description,
    ['The description must be 2000 characters or fewer.']);
  assert.deepEqual(validateSupportRequestInput({ ...valid, description: '   ' }).errors?.description,
    ['Describe the technical support the event needs.']);
  assert.deepEqual(validateSupportRequestInput({ ...valid, description: 42 }).errors?.description,
    ['Describe the technical support the event needs.']);
  assert.deepEqual(validateSupportRequestInput({ ...valid, startsAt: 'not a date' }).errors?.startsAt, ['Enter when the support starts.']);
  assert.deepEqual(validateSupportRequestInput({ ...valid, endsAt: undefined }).errors?.endsAt, ['Enter when the support ends.']);
  // Ending exactly when it starts is refused, as is ending before.
  assert.deepEqual(validateSupportRequestInput({ ...valid, endsAt: valid.startsAt }).errors?.endsAt, ['Support must end after it starts.']);
  assert.deepEqual(validateSupportRequestInput({ ...valid, endsAt: '2026-11-12T00:00:00.000Z' }).errors?.endsAt, ['Support must end after it starts.']);
  // An invalid start doesn't also report the end as "before the start".
  assert.equal(validateSupportRequestInput({ ...valid, startsAt: 'bad' }).errors?.endsAt, undefined);
  for (const body of [null, [], 'text']) assert.ok(validateSupportRequestInput(body).errors?.description);
});

test('reads refuse signed-out users and roles other than Coordinator and Technical Support, and audit the refusal', async () => {
  const db = fakeDatabase([]);
  await assert.rejects(getSupportRequests(db.query, undefined, 'EVT-1'), { status: 401 });
  const attendee: AuthenticatedUser = { ...coordinator, role: 'attendee' };
  await assert.rejects(getSupportRequests(db.query, attendee, 'EVT-1'), { status: 403 });
  await assert.rejects(getSupportRequests(db.query, { ...coordinator, isActive: false }, 'EVT-1'), { status: 403 });
  assert.equal(sqlCalls(db.calls, /audit_logs/).length, 2);
  assert.equal(sqlCalls(db.calls, /FROM events/).length, 0);
});

test('reads refuse an empty or oversized event identifier before querying events', async () => {
  const db = fakeDatabase([]);
  await assert.rejects(getSupportRequests(db.query, coordinator, ''), { status: 400 });
  await assert.rejects(getSupportRequests(db.query, coordinator, 'x'.repeat(161)), { status: 400 });
  assert.equal(sqlCalls(db.calls, /FROM events/).length, 0);
});

test('a Coordinator cannot read another Coordinator\'s event or an unknown event; the refusal is audited', async () => {
  const db = fakeDatabase([[/FROM events/, values => ({ rows: values?.[0] === 'EVT-1' ? [event] : [] })]]);
  await assert.rejects(getSupportRequests(db.query, otherCoordinator, 'EVT-1'), { status: 403, message: 'Access denied. This event is not assigned to you.' });
  await assert.rejects(getSupportRequests(db.query, coordinator, 'EVT-NOPE'), { status: 403 });
  const audits = sqlCalls(db.calls, /audit_logs/);
  assert.deepEqual(audits.map(call => call.values?.[1]), ['tech_support_requests:EVT-1', 'tech_support_requests:EVT-NOPE']);
});

test('reads separate requests from the "no support needed" declaration and say who can edit', async () => {
  const rows = [
    { id: 'r1', supportRequired: true, description: '1 AV technician', startsAt: valid.startsAt, endsAt: valid.endsAt, status: 'open', requestedAt: '2026-10-06T00:00:00.000Z' },
    { id: 'd1', supportRequired: false, description: '', startsAt: valid.startsAt, endsAt: valid.endsAt, status: 'open', requestedAt: '2026-10-06T00:00:00.000Z' },
  ];
  const db = fakeDatabase([[/FROM events/, { rows: [event] }], [/FROM tech_support_requests/, { rows }]]);
  const asCoordinator = await getSupportRequests(db.query, coordinator, 'EVT-1');
  assert.equal(asCoordinator.canEdit, true);
  assert.equal(asCoordinator.noSupportRequired, true);
  assert.deepEqual(asCoordinator.requests.map(request => request.id), ['r1']);
  assert.equal('supportRequired' in asCoordinator.requests[0]!, false);
  assert.deepEqual(asCoordinator.event, { id: event.id, eventCode: 'EVT-1', title: 'Tech Conference 2026', status: 'planning' });
  // Technical Support Staff read any event's requests but never edit them.
  assert.equal((await getSupportRequests(db.query, technician, 'EVT-1')).canEdit, false);
  // Outside approved/planning the Coordinator can read but not edit.
  const confirmed = fakeDatabase([[/FROM events/, { rows: [{ ...event, status: 'confirmed' }] }]]);
  const later = await getSupportRequests(confirmed.query, coordinator, 'EVT-1');
  assert.equal(later.canEdit, false);
  assert.deepEqual(later.requests, []);
  assert.equal(later.noSupportRequired, false);
});

test('TC_E07S06_01 a valid request is recorded against the event and every active Technical Support member is notified', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [event] }],
    [/INSERT INTO tech_support_requests/, { rows: [{ id: 'r1', ...valid, status: 'open', requestedAt: 'now' }] }],
    [/FROM users WHERE role = 'technical_support_staff'/, { rows: [{ id: 'tech-a' }, { id: 'tech-b' }] }],
  ]);
  const result = await requestSupport(db.pool, coordinator, 'EVT-1', valid);
  assert.equal(result.status, 201);
  assert.deepEqual(result.body, { request: { id: 'r1', ...valid, status: 'open', requestedAt: 'now' }, notified: 2 });
  const insert = sqlCalls(db.calls, /INSERT INTO tech_support_requests/)[0]!;
  assert.deepEqual(insert.values, [event.id, valid.description, valid.startsAt, valid.endsAt, coordinator.id]);
  // An earlier "no support needed" declaration is replaced, inside the transaction.
  assert.equal(sqlCalls(db.calls, /DELETE FROM tech_support_requests/).length, 1);
  assert.ok(sqlCalls(db.calls, /^BEGIN$/).length === 1 && sqlCalls(db.calls, /^COMMIT$/).length === 1);
  // The event row is locked while the request is written.
  assert.match(sqlCalls(db.calls, /FROM events/)[0]!.sql, /FOR NO KEY UPDATE/);
  // writeEventNotification inserts [user, event, title, message, id, created_at].
  const notices = sqlCalls(db.calls, /INSERT INTO notifications/);
  assert.deepEqual(notices.map(call => call.values?.[0]), ['tech-a', 'tech-b']);
  assert.deepEqual(notices.map(call => call.values?.[3]),
    ['EVT-1 needs technical support: 1 AV technician for the full event', 'EVT-1 needs technical support: 1 AV technician for the full event']);
  // One change: both notices carry the same timestamp, and their ids differ per recipient.
  assert.equal(notices[0]!.values?.[5], notices[1]!.values?.[5]);
  assert.notEqual(notices[0]!.values?.[4], notices[1]!.values?.[4]);
});

test('TC_E07S06_01 an event without a code yet is named by its title in the notice', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [{ ...event, eventCode: null }] }],
    [/INSERT INTO tech_support_requests/, { rows: [{ id: 'r1' }] }],
    [/FROM users WHERE role = 'technical_support_staff'/, { rows: [{ id: 'tech-a' }] }],
  ]);
  await requestSupport(db.pool, coordinator, event.id, valid);
  assert.equal(sqlCalls(db.calls, /INSERT INTO notifications/)[0]!.values?.[3],
    'Tech Conference 2026 needs technical support: 1 AV technician for the full event');
});

test('TC_E07S06_01 with no active Technical Support Staff the request is still recorded and reports nobody notified', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [event] }],
    [/INSERT INTO tech_support_requests/, { rows: [{ id: 'r1' }] }],
  ]);
  const result = await requestSupport(db.pool, coordinator, 'EVT-1', valid);
  assert.equal((result.body as { notified: number }).notified, 0);
});

test('TC_E07S06_02 a request is accepted while the event is approved, before any venue is confirmed', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [{ ...event, status: 'approved' }] }],
    [/INSERT INTO tech_support_requests/, { rows: [{ id: 'r1' }] }],
  ]);
  assert.equal((await requestSupport(db.pool, coordinator, 'EVT-1', valid)).status, 201);
  // No venue booking is consulted: the request stands on its own.
  assert.equal(sqlCalls(db.calls, /venue_bookings/).length, 0);
});

test('requests are refused outside approved or planning and are not written', async () => {
  for (const status of ['submitted', 'under_review', 'confirmed', 'cancelled', 'completed']) {
    const db = fakeDatabase([[/FROM events/, { rows: [{ ...event, status }] }]]);
    await assert.rejects(requestSupport(db.pool, coordinator, 'EVT-1', valid),
      { status: 409, message: 'Technical support can only be arranged while an approved event is being planned.' });
    assert.equal(sqlCalls(db.calls, /INSERT INTO tech_support_requests/).length, 0);
    assert.equal(sqlCalls(db.calls, /^ROLLBACK$/).length, 1);
  }
});

test('an invalid request returns field errors without opening a transaction; wrong roles are refused first', async () => {
  const db = fakeDatabase([]);
  const result = await requestSupport(db.pool, coordinator, 'EVT-1', { ...valid, description: '' });
  assert.equal(result.status, 400);
  assert.deepEqual((result.body as { errors: Record<string, string[]> }).errors.description, ['Describe the technical support the event needs.']);
  assert.equal(sqlCalls(db.calls, /^BEGIN$/).length, 0);
  // Technical Support Staff can read but not create requests; no validation detail leaks.
  await assert.rejects(requestSupport(db.pool, technician, 'EVT-1', { description: '' }), { status: 403 });
});

test('a refused request on someone else\'s event is audited outside the rolled-back transaction', async () => {
  const db = fakeDatabase([[/FROM events/, { rows: [event] }]]);
  await assert.rejects(requestSupport(db.pool, otherCoordinator, 'EVT-1', valid), { status: 403 });
  const order = db.calls.map(call => call.sql).filter(sql => /^ROLLBACK$|audit_logs/.test(sql));
  assert.deepEqual(order.map(sql => (sql === 'ROLLBACK' ? 'rollback' : 'audit')), ['rollback', 'audit']);
});

test('a database failure is not mistaken for a refusal and is not audited', async () => {
  const db = fakeDatabase([[/FROM events/, new Error('connection lost')]]);
  await assert.rejects(requestSupport(db.pool, coordinator, 'EVT-1', valid), { message: 'connection lost' });
  assert.equal(sqlCalls(db.calls, /audit_logs/).length, 0);
});

test('TC_E07S06_03 marking no support needed records the decision, creates no request and notifies nobody', async () => {
  const db = fakeDatabase([[/FROM events/, { rows: [event] }]]);
  const result = await declareNoSupport(db.pool, coordinator, 'EVT-1');
  assert.deepEqual(result, { status: 200, body: { noSupportRequired: true } });
  const insert = sqlCalls(db.calls, /INSERT INTO tech_support_requests/)[0]!;
  assert.match(insert.sql, /false, event_range/);
  assert.equal(sqlCalls(db.calls, /INSERT INTO notifications/).length, 0);
});

test('TC_E07S06_03 marking no support needed twice keeps a single declaration', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [event] }],
    [/AND NOT support_required LIMIT 1/, { rows: [{ id: 'd1' }] }],
  ]);
  assert.equal((await declareNoSupport(db.pool, coordinator, 'EVT-1')).status, 200);
  assert.equal(sqlCalls(db.calls, /INSERT INTO tech_support_requests/).length, 0);
});

test('an event with a live support request cannot be marked as needing none', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [event] }],
    [/AND support_required AND status <> 'cancelled'/, { rows: [{ id: 'r1' }] }],
  ]);
  await assert.rejects(declareNoSupport(db.pool, coordinator, 'EVT-1'),
    { status: 409, message: 'This event already has a technical support request, so it cannot be marked as needing none.' });
  assert.equal(sqlCalls(db.calls, /INSERT INTO tech_support_requests/).length, 0);
});

function fakeResponse() {
  const captured: { status: number; body: unknown; headers: Record<string, unknown> } = { status: 0, body: undefined, headers: {} };
  const response: VercelResponse = {
    setHeader: (key, value) => { captured.headers[key] = value; },
    status: code => { captured.status = code; return { json: value => { captured.body = value; } }; },
    json: value => { captured.body = value; },
  };
  return { response, captured };
}

test('handler: unsupported methods, cross-origin writes and unknown actions are refused', async () => {
  const handler = createSupportHandler({
    authenticate: async () => coordinator,
    query: async () => { throw new Error('unexpected query'); },
    pool: () => { throw new Error('unexpected pool'); },
    allowedOrigin: origin => origin === 'https://app.example.test',
  });
  const { response, captured } = fakeResponse();
  await handler({ method: 'DELETE', url: '/api/venues?task=support', headers: {} }, response);
  assert.equal(captured.status, 405);
  assert.equal(captured.headers.Allow, 'GET, POST');
  await handler({ method: 'POST', url: '/api/venues?task=support', headers: { origin: 'https://attacker.example.test' }, body: { action: 'none', event: 'EVT-1' } }, response);
  assert.deepEqual([captured.status, captured.body], [403, { error: 'Request origin not allowed.' }]);
  await handler({ method: 'POST', url: '/api/venues?task=support', headers: { origin: 'https://app.example.test' }, body: { action: 'delete' } }, response);
  assert.deepEqual([captured.status, captured.body], [400, { error: 'Choose request or none.' }]);
});

test('handler: GET reads by event, POST dispatches request and none', async () => {
  const db = fakeDatabase([
    [/FROM events/, { rows: [event] }],
    [/INSERT INTO tech_support_requests/, { rows: [{ id: 'r1' }] }],
  ]);
  const handler = createSupportHandler({ authenticate: async () => coordinator, query: db.query, pool: () => db.pool, allowedOrigin: () => true });
  const { response, captured } = fakeResponse();
  await handler({ method: 'GET', url: '/api/venues?task=support&event=EVT-1', headers: {} }, response);
  assert.equal(captured.status, 200);
  assert.equal((captured.body as { canEdit: boolean }).canEdit, true);
  await handler({ method: 'POST', url: '/api/venues?task=support', headers: {}, body: { action: 'request', event: 'EVT-1', ...valid } }, response);
  assert.equal(captured.status, 201);
  await handler({ method: 'POST', url: '/api/venues?task=support', headers: {}, body: { action: 'none', event: 'EVT-1' } }, response);
  assert.equal(captured.status, 200);
  // A request with no method or URL is handled, not crashed on.
  await handler({ headers: {} } as never, response);
  assert.equal(captured.status, 405);
  // A missing event identifier is a 400, not a server error.
  await handler({ method: 'GET', headers: {} }, response);
  assert.equal(captured.status, 400);
  await handler({ method: 'GET', url: '/api/venues?task=support', headers: {} }, response);
  assert.equal(captured.status, 400);
  await handler({ method: 'POST', url: '/api/venues?task=support', headers: {}, body: { action: 'none', event: 7 } }, response);
  assert.equal(captured.status, 400);
});

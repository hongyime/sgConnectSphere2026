// E07-S07 (SCRUM-57) technician assignments against a scripted fake
// database: access rules, input checks, the overlap check and its sentence,
// the simultaneous-assignment fallback, removal, and the HTTP handler. The
// real-PostgreSQL run is staffAssignments.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import {
  assignTechnician, getRequest, listQueue, mySchedule, removeAssignment,
} from '../src/modules/equipmentSupport/staffAssignments.js';
import { createStaffingHandler } from '../src/modules/equipmentSupport/staffingHandler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { VercelResponse } from '../src/vercel.js';

const tech: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-0000000000a1', email: 'tech_a@example.test', role: 'technical_support_staff',
  isActive: true, failedLoginCount: 0,
};
const coordinator: AuthenticatedUser = { ...tech, id: '00000000-0000-4000-8000-0000000000c1', role: 'event_coordinator' };
const REQUEST = '11111111-1111-4111-8111-111111111111';
const ASSIGNMENT = '22222222-2222-4222-8222-222222222222';
const COLLEAGUE = '00000000-0000-4000-8000-0000000000b2';
const locked = {
  id: REQUEST, eventId: 'evt-1', eventCode: 'EVT-TC', eventTitle: 'Tech Conference 2026', eventStatus: 'planning',
  description: '1 AV technician', status: 'open', range: '["2026-11-12 01:00:00+00","2026-11-12 04:00:00+00")',
};
const charity = { eventCode: 'EVT-CR', title: 'Charity Run', startsAt: '2026-11-12T02:00:00.000Z', endsAt: '2026-11-12T05:00:00.000Z' };

type Reply = { rows: unknown[]; rowCount?: number } | Error;
function fakeDatabase(rules: Array<[RegExp, Reply | ((values?: unknown[]) => Reply)]>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const answer = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    const rule = rules.find(([pattern]) => pattern.test(sql));
    const reply = rule ? (typeof rule[1] === 'function' ? rule[1](values) : rule[1]) : { rows: [] };
    if (reply instanceof Error) throw reply;
    return { rowCount: reply.rows.length, ...reply };
  };
  const client = { query: answer, release: () => undefined } as unknown as PoolClient;
  const pool = { query: answer, connect: async () => client } as unknown as Pool;
  return { pool, query: answer as Query, calls };
}
const sqlCalls = (calls: Array<{ sql: string }>, pattern: RegExp) => calls.filter(call => pattern.test(call.sql));
const overlapError = () => Object.assign(new Error('conflicting key value violates exclusion constraint'), { code: '23P01' });

test('every operation refuses signed-out users and roles other than Technical Support, and audits the refusal', async () => {
  const db = fakeDatabase([]);
  await assert.rejects(listQueue(db.query, undefined), { status: 401 });
  await assert.rejects(listQueue(db.query, coordinator), { status: 403, message: 'Access denied. Only Technical Support Staff can assign technicians.' });
  await assert.rejects(getRequest(db.query, { ...tech, isActive: false }, REQUEST), { status: 403 });
  await assert.rejects(mySchedule(db.query, coordinator), { status: 403 });
  await assert.rejects(assignTechnician(db.pool, coordinator, {}), { status: 403 });
  await assert.rejects(removeAssignment(db.pool, coordinator, {}), { status: 403 });
  assert.equal(sqlCalls(db.calls, /audit_logs/).length, 5);
  assert.equal(sqlCalls(db.calls, /tech_support_requests|tech_staff_assignments a/).length, 0);
});

test('the queue lists only staffable events, open requests first', async () => {
  const db = fakeDatabase([[/FROM tech_support_requests r JOIN events e/, { rows: [{ id: REQUEST, assignees: [] }] }]]);
  assert.deepEqual(await listQueue(db.query, tech), { requests: [{ id: REQUEST, assignees: [] }] });
  const call = sqlCalls(db.calls, /FROM tech_support_requests r/)[0]!;
  assert.match(call.sql, /support_required AND r.status <> 'cancelled'/);
  assert.match(call.sql, /ORDER BY \(r.status = 'open'\) DESC/);
  assert.deepEqual(call.values, [['approved', 'planning', 'confirmed']]);
});

test('a request lists every active colleague, marks who is on it, and names clashes for the rest', async () => {
  const db = fakeDatabase([
    [/AND r.id = \$1/, { rows: [{ ...locked, assignees: [{ assignmentId: ASSIGNMENT, staffId: tech.id, name: 'Tech A' }] }] }],
    [/FROM users\s+WHERE role = 'technical_support_staff'/, { rows: [{ id: tech.id, name: 'Tech A' }, { id: COLLEAGUE, name: 'Tech B' }, { id: 'c3', name: 'Tech C' }] }],
    [/a.staff_id = \$1 AND a.status = 'assigned' AND a.request_id <> \$2/, values => ({ rows: values?.[0] === COLLEAGUE ? [charity] : [] })],
  ]);
  const result = await getRequest(db.query, tech, ` ${REQUEST} `);
  assert.deepEqual(result.candidates, [
    { staffId: tech.id, name: 'Tech A', assigned: true, conflicts: [] },
    { staffId: COLLEAGUE, name: 'Tech B', assigned: false, conflicts: [charity] },
    { staffId: 'c3', name: 'Tech C', assigned: false, conflicts: [] },
  ]);
  assert.equal(result.canAssign, true);
  // Someone already on the request isn't checked for clashes.
  assert.equal(sqlCalls(db.calls, /a.request_id <> \$2/).length, 2);
});

test('a request on an event that is no longer staffable is shown but cannot be assigned', async () => {
  const db = fakeDatabase([[/AND r.id = \$1/, { rows: [{ ...locked, eventStatus: 'completed', assignees: [] }] }]]);
  assert.equal((await getRequest(db.query, tech, REQUEST)).canAssign, false);
});

test('request and assignment ids are checked before any lookup; a missing request is a 404', async () => {
  const db = fakeDatabase([]);
  for (const bad of [undefined, '', 'EVT-TC', 42]) await assert.rejects(getRequest(db.query, tech, bad), { status: 400, message: 'A support request id is required.' });
  await assert.rejects(getRequest(db.query, tech, REQUEST), { status: 404, message: 'That technical support request was not found.' });
  await assert.rejects(assignTechnician(db.pool, tech, { request: 'nope', staff: COLLEAGUE }), { status: 400 });
  await assert.rejects(assignTechnician(db.pool, tech, { request: REQUEST }), { status: 400, message: 'Choose a colleague to assign.' });
  await assert.rejects(assignTechnician(db.pool, tech, null), { status: 400 });
  await assert.rejects(removeAssignment(db.pool, tech, { assignment: 'nope' }), { status: 400, message: 'An assignment id is required.' });
  await assert.rejects(removeAssignment(db.pool, tech, null), { status: 400 });
  assert.equal(sqlCalls(db.calls, /^BEGIN$/).length, 0);
});

test('the schedule shows only the signed-in technician\'s current assignments', async () => {
  const db = fakeDatabase([[/WHERE a.staff_id = \$1 AND a.status = 'assigned'\s+ORDER BY/, { rows: [{ id: ASSIGNMENT }] }]]);
  assert.deepEqual(await mySchedule(db.query, tech), { assignments: [{ id: ASSIGNMENT }] });
  assert.deepEqual(sqlCalls(db.calls, /ORDER BY lower\(a.assignment_range\)/).at(-1)!.values, [tech.id]);
});

test('TC_E07S07_01 a free colleague is assigned over the whole support range, the request is staffed and they are notified', async () => {
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active`?/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
  ]);
  const result = await assignTechnician(db.pool, tech, { action: 'assign', request: REQUEST, staff: COLLEAGUE });
  assert.equal(result.status, 201);
  assert.equal((result.body as { assignment: { name: string } }).assignment.name, 'Tech B');
  const insert = sqlCalls(db.calls, /INSERT INTO tech_staff_assignments/)[0]!;
  assert.deepEqual(insert.values?.slice(1), [REQUEST, 'evt-1', COLLEAGUE, locked.range]);
  assert.equal(sqlCalls(db.calls, /SET status = 'staffed'/).length, 1);
  const notice = sqlCalls(db.calls, /INSERT INTO notifications/)[0]!;
  assert.deepEqual(notice.values?.slice(0, 4), [COLLEAGUE, 'evt-1', 'Technical support assignment', "You're assigned to EVT-TC Tech Conference 2026: 1 AV technician"]);
  assert.ok(sqlCalls(db.calls, /^COMMIT$/).length === 1);
});

test('TC_E07S07_03 an overlapping colleague is refused, the clashing event is named, and nothing is written', async () => {
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
    [/a.request_id <> \$2/, { rows: [charity] }],
  ]);
  const result = await assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE });
  assert.deepEqual(result, { status: 409, body: { error: 'Tech B is already assigned to EVT-CR Charity Run at an overlapping time.', conflicts: [charity] } });
  assert.equal(sqlCalls(db.calls, /INSERT INTO tech_staff_assignments|INSERT INTO notifications/).length, 0);
});

test('a clashing event whose title already starts with its code, or has no code, is named once', async () => {
  const run = async (conflict: typeof charity | Record<string, unknown>) => {
    const db = fakeDatabase([
      [/FOR UPDATE OF r/, { rows: [locked] }],
      [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
      [/a.request_id <> \$2/, { rows: [conflict] }],
    ]);
    return ((await assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE })).body as { error: string }).error;
  };
  assert.equal(await run({ ...charity, title: 'EVT-CR Charity Run' }), 'Tech B is already assigned to EVT-CR Charity Run at an overlapping time.');
  assert.equal(await run({ ...charity, eventCode: null }), 'Tech B is already assigned to Charity Run at an overlapping time.');
});

test('assignments are refused for cancelled requests, unstaffable events, unknown or inactive colleagues, and repeats', async () => {
  const refuse = async (rules: Array<[RegExp, Reply]>, expected: { status: number; message: string }) => {
    const db = fakeDatabase(rules);
    await assert.rejects(assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE }), expected);
    assert.equal(sqlCalls(db.calls, /INSERT INTO tech_staff_assignments/).length, 0);
  };
  const notStaffable = { status: 409, message: 'Technicians can only be assigned to approved, planning or confirmed events.' };
  await refuse([], { status: 404, message: 'That technical support request was not found.' });
  await refuse([[/FOR UPDATE OF r/, { rows: [{ ...locked, status: 'cancelled' }] }]], notStaffable);
  for (const status of ['draft', 'submitted', 'completed', 'cancelled', 'rejected']) {
    await refuse([[/FOR UPDATE OF r/, { rows: [{ ...locked, eventStatus: status }] }]], notStaffable);
  }
  await refuse([[/FOR UPDATE OF r/, { rows: [locked] }]], { status: 400, message: 'Only active Technical Support Staff can be assigned.' });
  await refuse([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
    [/WHERE request_id = \$1 AND staff_id = \$2/, { rows: [{}] }],
  ], { status: 409, message: 'Tech B is already assigned to this request.' });
});

test('when two people assign the same colleague at once, the database refusal is reported as the same clash', async () => {
  let checks = 0;
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
    // Inside the transaction the colleague still looks free; afterwards the winner's assignment shows.
    [/a.request_id <> \$2/, () => ({ rows: checks++ === 0 ? [] : [charity] })],
    [/INSERT INTO tech_staff_assignments/, overlapError()],
    [/SELECT full_name AS name FROM users WHERE id::text/, { rows: [{ name: 'Tech B' }] }],
  ]);
  const result = await assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE });
  assert.deepEqual(result, { status: 409, body: { error: 'Tech B is already assigned to EVT-CR Charity Run at an overlapping time.', conflicts: [charity] } });
  assert.equal(sqlCalls(db.calls, /^ROLLBACK$/).length, 1);
});

test('the colleague is locked before the clash check, so two assignments of one person queue up (follow-up to #227)', async () => {
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
  ]);
  await assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE });
  const order = db.calls.map(call => call.sql);
  const colleague = order.findIndex(sql => /FROM users\s+WHERE id::text = \$1 AND role = 'technical_support_staff' AND is_active FOR NO KEY UPDATE/.test(sql));
  assert.ok(colleague > order.findIndex(sql => /FOR UPDATE OF r/.test(sql)), 'request locked first, then the colleague');
  assert.ok(colleague < order.findIndex(sql => /a.request_id <> \$2/.test(sql)), 'colleague locked before the clash check');
});

test('a deadlock between two simultaneous assignments is reported as the same clash, not a server error', async () => {
  let checks = 0;
  const deadlock = Object.assign(new Error('deadlock detected'), { code: '40P01' });
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
    [/a.request_id <> \$2/, () => ({ rows: checks++ === 0 ? [] : [charity] })],
    [/INSERT INTO tech_staff_assignments/, deadlock],
    [/SELECT full_name AS name FROM users WHERE id::text/, { rows: [{ name: 'Tech B' }] }],
  ]);
  const result = await assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE });
  assert.deepEqual(result, { status: 409, body: { error: 'Tech B is already assigned to EVT-CR Charity Run at an overlapping time.', conflicts: [charity] } });
});

test('the database refusal still gives a sentence when the winner has already been removed or the colleague is unknown', async () => {
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
    [/INSERT INTO tech_staff_assignments/, overlapError()],
  ]);
  const result = await assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE });
  assert.deepEqual(result, { status: 409, body: { error: 'This colleague is already assigned at an overlapping time.', conflicts: [] } });
});

test('any other database failure is not mistaken for a clash', async () => {
  const db = fakeDatabase([[/FOR UPDATE OF r/, new Error('connection lost')]]);
  await assert.rejects(assignTechnician(db.pool, tech, { request: REQUEST, staff: COLLEAGUE }), { message: 'connection lost' });
});

test('TC_E07S07_04 removing the last assignment frees the slot, reopens the request and notifies the colleague', async () => {
  const db = fakeDatabase([
    [/WHERE a.id = \$1 AND a.status = 'assigned' FOR UPDATE OF a/, { rows: [{ requestId: REQUEST, staffId: COLLEAGUE, name: 'Tech B' }] }],
    [/FOR UPDATE OF r/, { rows: [{ ...locked, eventStatus: 'cancelled' }] }],
  ]);
  const result = await removeAssignment(db.pool, tech, { action: 'remove', assignment: ASSIGNMENT });
  assert.deepEqual(result, { status: 200, body: { removed: true, requestStatus: 'open' } });
  assert.deepEqual(sqlCalls(db.calls, /SET status = 'released'/)[0]!.values, [ASSIGNMENT]);
  assert.equal(sqlCalls(db.calls, /SET status = 'open'/).length, 1);
  const notice = sqlCalls(db.calls, /INSERT INTO notifications/)[0]!;
  assert.deepEqual(notice.values?.slice(0, 4), [COLLEAGUE, 'evt-1', 'Technical support assignment removed',
    "You're no longer assigned to EVT-TC Tech Conference 2026. That time is free again."]);
});

test('removing one of several keeps the request staffed; removing twice is refused', async () => {
  const db = fakeDatabase([
    [/WHERE a.id = \$1 AND a.status = 'assigned' FOR UPDATE OF a/, { rows: [{ requestId: REQUEST, staffId: COLLEAGUE, name: 'Tech B' }] }],
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/WHERE request_id = \$1 AND status = 'assigned'/, { rows: [{}] }],
  ]);
  assert.deepEqual((await removeAssignment(db.pool, tech, { assignment: ASSIGNMENT })).body, { removed: true, requestStatus: 'staffed' });
  assert.equal(sqlCalls(db.calls, /SET status = 'open'/).length, 0);
  const gone = fakeDatabase([]);
  await assert.rejects(removeAssignment(gone.pool, tech, { assignment: ASSIGNMENT }), { status: 409, message: 'That assignment has already been removed.' });
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

test('handler: methods, origin and actions', async () => {
  const handler = createStaffingHandler({
    authenticate: async () => tech, query: async () => { throw new Error('unexpected'); },
    pool: () => { throw new Error('unexpected'); }, allowedOrigin: origin => origin === 'https://app.example.test',
  });
  const { response, captured } = fakeResponse();
  await handler({ headers: {} } as never, response);
  assert.deepEqual([captured.status, captured.headers.Allow], [405, 'GET, POST']);
  await handler({ method: 'POST', url: '/api/venues?task=staffing', headers: { origin: 'https://evil.example.test' }, body: { action: 'assign' } }, response);
  assert.deepEqual([captured.status, captured.body], [403, { error: 'Request origin not allowed.' }]);
  await handler({ method: 'POST', url: '/api/venues?task=staffing', headers: { origin: 'https://app.example.test' }, body: { action: 'delete' } }, response);
  assert.deepEqual([captured.status, captured.body], [400, { error: 'Choose assign or remove.' }]);
});

test('handler: GET routes to the queue, one request or the schedule; POST to assign or remove', async () => {
  const db = fakeDatabase([
    [/AND r.id = \$1/, { rows: [{ ...locked, assignees: [] }] }],
    [/FOR UPDATE OF r/, { rows: [locked] }],
    [/role = 'technical_support_staff' AND is_active/, { rows: [{ id: COLLEAGUE, name: 'Tech B' }] }],
    [/WHERE a.id = \$1 AND a.status = 'assigned' FOR UPDATE OF a/, { rows: [{ requestId: REQUEST, staffId: COLLEAGUE, name: 'Tech B' }] }],
  ]);
  const handler = createStaffingHandler({ authenticate: async () => tech, query: db.query, pool: () => db.pool, allowedOrigin: () => true });
  const { response, captured } = fakeResponse();
  await handler({ method: 'GET', headers: {} }, response);
  assert.deepEqual([captured.status, captured.body], [200, { requests: [] }]);
  await handler({ method: 'GET', url: `/api/venues?task=staffing&request=${REQUEST}`, headers: {} }, response);
  assert.equal((captured.body as { canAssign: boolean }).canAssign, true);
  await handler({ method: 'GET', url: '/api/venues?task=staffing&schedule=mine', headers: {} }, response);
  assert.deepEqual(captured.body, { assignments: [] });
  await handler({ method: 'POST', url: '/api/venues?task=staffing', headers: {}, body: { action: 'assign', request: REQUEST, staff: COLLEAGUE } }, response);
  assert.equal(captured.status, 201);
  await handler({ method: 'POST', url: '/api/venues?task=staffing', headers: {}, body: { action: 'remove', assignment: ASSIGNMENT } }, response);
  assert.equal(captured.status, 200);
  await handler({ method: 'GET', url: '/api/venues?task=staffing&request=bad', headers: {} }, response);
  assert.deepEqual([captured.status, captured.body], [400, { error: 'A support request id is required.' }]);
});

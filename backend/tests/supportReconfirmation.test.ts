// E10-S02 follow-up (SCRUM-244, T-103): reconfirming a flagged Technical
// Support request against a scripted fake database: access and input checks,
// the refusals, the busy-colleague sentence, the simultaneous-assignment
// fallback and the HTTP routes. The real-PostgreSQL run (moving the request
// and its assignments, the Activity log, notices and Safety Review) is
// supportReconfirmation.integration.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import {
  NOT_RECONFIRMABLE, NOTHING_TO_RECONFIRM, listSupportToReconfirm, reconfirmSupport,
} from '../src/modules/equipmentSupport/supportReconfirmation.js';
import { createStaffingHandler } from '../src/modules/equipmentSupport/staffingHandler.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { VercelResponse } from '../src/vercel.js';

const tech: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-0000000000a1', email: 'tech_a@example.test', role: 'technical_support_staff',
  isActive: true, failedLoginCount: 0,
};
const REQUEST = '11111111-1111-4111-8111-111111111111';
const TARGET = '["2026-12-11 22:00:00+00","2026-12-12 04:00:00+00")';
const locked = {
  id: REQUEST, eventId: 'evt-1', eventCode: 'EVT-1082', eventTitle: 'Charity Run', eventStatus: 'planning',
  description: 'Sound desk', status: 'staffed', range: '["2026-12-04 22:00:00+00","2026-12-05 04:00:00+00")',
};
const flagged = { requires_reconfirmation: true, target: TARGET, coordinator_id: 'coord-1', was_start: new Date(), was_end: new Date() };
const clash = { staffName: 'Tech A', eventCode: 'EVT-2001', title: 'Year-end Gala', startsAt: '2026-12-12T02:00:00.000Z', endsAt: '2026-12-12T06:00:00.000Z' };

type Reply = { rows: unknown[] } | Error;
function fakeDatabase(rules: Array<[RegExp, Reply | (() => Reply)]>) {
  const calls: string[] = [];
  const answer = async (sql: string) => {
    calls.push(sql);
    const rule = rules.find(([pattern]) => pattern.test(sql))?.[1] ?? { rows: [] };
    const reply = typeof rule === 'function' ? rule() : rule;
    if (reply instanceof Error) throw reply;
    return { rowCount: reply.rows.length, ...reply };
  };
  const client = { query: answer, release: () => undefined } as unknown as PoolClient;
  return { pool: { query: answer, connect: async () => client } as unknown as Pool, query: answer as Query, calls };
}
const overlapError = () => Object.assign(new Error('conflicting key value violates exclusion constraint'), { code: '23P01' });
const refusedWith = (status: number, message: string) => (error: { status?: number; message?: string }) =>
  error.status === status && error.message === message;

test('reconfirming needs Technical Support Staff and a support request id', async () => {
  const db = fakeDatabase([]);
  await assert.rejects(reconfirmSupport(db.pool, undefined, { request: REQUEST }), refusedWith(401, 'Sign in to continue.'));
  await assert.rejects(reconfirmSupport(db.pool, { ...tech, role: 'venue_staff' }, { request: REQUEST }),
    refusedWith(403, 'Access denied. Only Technical Support Staff can assign technicians.'));
  assert.equal(db.calls.filter(sql => sql.includes('Access Denied')).length, 1, 'the refused role is audited');
  for (const body of [undefined, {}, { request: 'not-an-id' }, { request: 42 }]) {
    await assert.rejects(reconfirmSupport(db.pool, tech, body), refusedWith(400, 'A support request id is required.'));
  }
  await assert.rejects(listSupportToReconfirm(db.query, undefined), refusedWith(401, 'Sign in to continue.'));
});

test('a cancelled request, an event not going ahead, or one with nothing to reconfirm is refused and nothing moves', async () => {
  for (const [row, flag, message] of [
    [{ ...locked, status: 'cancelled' }, flagged, NOT_RECONFIRMABLE],
    [{ ...locked, eventStatus: 'safety_review' }, flagged, NOT_RECONFIRMABLE],
    [{ ...locked, eventStatus: 'cancelled' }, flagged, NOT_RECONFIRMABLE],
    [locked, { ...flagged, requires_reconfirmation: false }, NOTHING_TO_RECONFIRM],
    [locked, { ...flagged, target: null }, NOTHING_TO_RECONFIRM],
  ] as const) {
    const db = fakeDatabase([[/FOR UPDATE OF r/, { rows: [row] }], [/reconfirm_range::text AS target, e.coordinator_id/, { rows: [flag] }]]);
    await assert.rejects(reconfirmSupport(db.pool, tech, { request: REQUEST }), refusedWith(409, message));
    assert.ok(!db.calls.some(sql => sql.startsWith('UPDATE')), message);
    assert.ok(db.calls.includes('ROLLBACK'));
  }
  const missing = fakeDatabase([]);
  await assert.rejects(reconfirmSupport(missing.pool, tech, { request: REQUEST }), refusedWith(404, 'That technical support request was not found.'));
});

test('TC_E10S02_13: a colleague busy at the new time refuses the reconfirmation, naming the clashing event', async () => {
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }], [/reconfirm_range::text AS target, e.coordinator_id/, { rows: [flagged] }],
    [/JOIN tech_staff_assignments other/, { rows: [clash] }],
  ]);
  const result = await reconfirmSupport(db.pool, tech, { request: REQUEST });
  assert.deepEqual(result, { status: 409, body: {
    error: 'Tech A is already assigned to EVT-2001 Year-end Gala at an overlapping time.',
    conflicts: [{ eventCode: 'EVT-2001', title: 'Year-end Gala', startsAt: clash.startsAt, endsAt: clash.endsAt }],
  } });
  assert.ok(!db.calls.some(sql => sql.startsWith('UPDATE')), 'nothing moves and the flag stays');
});

test('a colleague taken at the same moment is reported as the same clash, or plainly when it cannot be named', async () => {
  // The clash lands concurrently: the check before the move sees none, the
  // move is refused by the exclusion constraint, and the clash is then found.
  let refused = false;
  const raced = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }], [/reconfirm_range::text AS target, e.coordinator_id/, { rows: [flagged] }],
    [/JOIN tech_staff_assignments other/, () => ({ rows: refused ? [clash] : [] })],
    [/UPDATE tech_support_requests\s+SET support_range/, { rows: [{ starts_at: new Date(), ends_at: new Date() }] }],
    [/UPDATE tech_staff_assignments SET assignment_range/, () => { refused = true; return overlapError(); }],
    [/SELECT reconfirm_range::text AS target FROM/, { rows: [{ target: TARGET }] }],
  ]);
  const named = await reconfirmSupport(raced.pool, tech, { request: REQUEST });
  assert.equal(named.status, 409);
  assert.equal((named.body as { error: string }).error, 'Tech A is already assigned to EVT-2001 Year-end Gala at an overlapping time.');
  assert.ok(raced.calls.includes('ROLLBACK'));

  const unnamed = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }], [/reconfirm_range::text AS target, e.coordinator_id/, { rows: [flagged] }],
    [/UPDATE tech_support_requests\s+SET support_range/, overlapError()],
  ]);
  assert.deepEqual(await reconfirmSupport(unnamed.pool, tech, { request: REQUEST }),
    { status: 409, body: { error: 'A colleague is already assigned at an overlapping time.', conflicts: [] } });

  const other = fakeDatabase([[/FOR UPDATE OF r/, new Error('connection lost')]]);
  await assert.rejects(reconfirmSupport(other.pool, tech, { request: REQUEST }), /connection lost/);
});

test('a reconfirmation without a Coordinator or other colleagues tells nobody else', async () => {
  const db = fakeDatabase([
    [/FOR UPDATE OF r/, { rows: [locked] }], [/reconfirm_range::text AS target, e.coordinator_id/, { rows: [{ ...flagged, coordinator_id: null }] }],
    [/FOR NO KEY UPDATE OF u/, { rows: [{ staff_id: tech.id }] }],
    [/UPDATE tech_support_requests\s+SET support_range/, { rows: [{ starts_at: new Date('2026-12-11T22:00:00Z'), ends_at: new Date('2026-12-12T04:00:00Z') }] }],
    [/INSERT INTO audit_logs/, { rows: [{ id: 'audit-1', occurred_at: new Date() }] }],
  ]);
  const result = await reconfirmSupport(db.pool, tech, { request: REQUEST });
  assert.deepEqual(result.status, 200);
  assert.deepEqual(result.body, { request: { id: REQUEST, startsAt: '2026-12-11T22:00:00.000Z', endsAt: '2026-12-12T04:00:00.000Z' },
    coordinatorNotified: false, enteredSafetyReview: false });
  assert.ok(!db.calls.some(sql => sql.includes('INSERT INTO notifications')), 'the actor is the only colleague: no notice (T-64)');
});

test('TC_E10S02_12: the Coordinator and every other moved colleague are told', async () => {
  for (const actorRow of [[{ full_name: 'Tech A' }], []]) {
    const db = fakeDatabase([
      [/FOR UPDATE OF r/, { rows: [locked] }], [/reconfirm_range::text AS target, e.coordinator_id/, { rows: [flagged] }],
      [/FOR NO KEY UPDATE OF u/, { rows: [{ staff_id: tech.id }, { staff_id: 'tech-b' }] }],
      [/UPDATE tech_support_requests\s+SET support_range/, { rows: [{ starts_at: new Date('2026-12-11T22:00:00Z'), ends_at: new Date('2026-12-12T04:00:00Z') }] }],
      [/INSERT INTO audit_logs/, { rows: [{ id: 'audit-1', occurred_at: new Date() }] }],
      [/SELECT full_name FROM users/, { rows: actorRow }],
    ]);
    const result = await reconfirmSupport(db.pool, tech, { request: REQUEST });
    assert.equal((result.body as { coordinatorNotified: boolean }).coordinatorNotified, false, 'the fake writes no notification row');
    const notices = db.calls.filter(sql => sql.includes('INSERT INTO notifications'));
    assert.equal(notices.length, 2, 'the Coordinator and tech-b; not the actor');
  }
});

function fakeResponse() {
  const captured: { status?: number; body?: unknown } = {};
  const response = {
    setHeader: () => undefined,
    status(code: number) { captured.status = code; return this; },
    json(body: unknown) { captured.body = body; return this; },
  } as unknown as VercelResponse;
  return { response, captured };
}

test('handler: GET reconfirm=list lists flagged requests; POST reconfirm reconfirms one', async () => {
  const db = fakeDatabase([
    [/WHERE r.requires_reconfirmation AND r.reconfirm_range IS NOT NULL/, { rows: [{ id: REQUEST }] }],
    [/FOR UPDATE OF r/, { rows: [{ ...locked, eventStatus: 'cancelled' }] }],
  ]);
  const handler = createStaffingHandler({ authenticate: async () => tech, query: db.query, pool: () => db.pool, allowedOrigin: () => true });
  const { response, captured } = fakeResponse();
  await handler({ method: 'GET', url: '/api/venues?task=staffing&reconfirm=list', headers: {} } as never, response);
  assert.deepEqual([captured.status, captured.body], [200, { requests: [{ id: REQUEST }] }]);
  const listing = db.calls.find(sql => sql.includes('reconfirm_range IS NOT NULL'))!;
  assert.match(listing, /r\.status = 'staffed'/, 'only staffed requests');
  await handler({ method: 'POST', url: '/api/venues?task=staffing', headers: { origin: 'x' }, body: { action: 'reconfirm', request: REQUEST } } as never, response);
  assert.deepEqual([captured.status, captured.body], [409, { error: NOT_RECONFIRMABLE }]);
});

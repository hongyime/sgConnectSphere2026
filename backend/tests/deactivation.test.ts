import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { deactivateAccount, DeactivationBlockedError, DEACTIVATION_BLOCKING_STATUSES } from '../src/modules/accessControl/deactivation.js';
import { createProfileHandler } from '../../api/account/profile.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelResponse } from '../src/vercel.js';

const user: AuthenticatedUser = { id: 'self', email: 'self@example.test', role: 'attendee', isActive: true, failedLoginCount: 0 };
function fixture(role = 'attendee', active = true, assignments: unknown[] = [], failAt = '') {
  const calls: { sql: string; values?: unknown[] }[] = [];
  let released = false;
  const pool = { async connect() { return {
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values });
      if (failAt && sql.includes(failAt)) throw new Error('private database failure');
      if (sql.startsWith('SELECT id, role')) return { rows: [{ id: 'self', role, is_active: active }] };
      if (sql.includes('FROM events') && sql.includes('SELECT')) return { rows: assignments };
      if (sql.includes('UPDATE event_registrations')) return { rows: [{ id: 'registration' }], rowCount: 1 };
      return { rows: [] };
    }, release() { released = true; },
  }; } } as unknown as Pool;
  return { pool, calls, released: () => released };
}

test('eligible attendee: locks identity, withdraws, deactivates, revokes sessions, audits and commits', async () => {
  const { pool, calls, released } = fixture();
  const result = await deactivateAccount(pool, user, { confirm: true });
  assert.equal(result.deactivated, true); assert.equal(result.withdrawnRegistrations, 1);
  assert.equal(calls[0].sql, 'BEGIN'); assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.ok(calls.some(call => call.sql.includes('is_active = false, deactivated_at = now()')));
  assert.ok(calls.some(call => call.sql.includes('DELETE FROM auth_sessions')));
  const audit = calls.find(call => call.sql.includes('INSERT INTO audit_logs'))!;
  assert.deepEqual(audit.values, ['self']); assert.match(audit.sql, /Account Deactivated/);
  assert.equal(calls.some(call => /DELETE FROM (users|events|event_registrations)/.test(call.sql)), false);
  assert.equal(released(), true);
});
for (const role of ['event_organiser', 'venue_staff', 'technical_support_staff']) {
  test(`${role} follows standard deactivation, without withdrawing registrations`, async () => {
    const { pool, calls } = fixture(role);
    await deactivateAccount(pool, { ...user, role: 'event_coordinator' }, { confirm: true });
    assert.equal(calls.some(call => call.sql.includes('UPDATE event_registrations')), false);
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
  });
}
test('coordinator assignments block without successful audit or mutations', async () => {
  const { pool, calls } = fixture('event_coordinator', true, [{ id: 'event', title: 'Assigned event', event_code: 'EVT-A' }]);
  await assert.rejects(deactivateAccount(pool, user, { confirm: true }), error => error instanceof DeactivationBlockedError && error.events.length === 1);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  assert.equal(calls.some(call => call.sql.startsWith('UPDATE users') || call.sql.includes('INSERT INTO audit_logs')), false);
  assert.deepEqual(DEACTIVATION_BLOCKING_STATUSES, ['submitted', 'under_review', 'awaiting_clarification', 'approved', 'planning', 'confirmed']);
});
test('coordinator without blocking assignments succeeds', async () => {
  const { pool } = fixture('event_coordinator');
  assert.equal((await deactivateAccount(pool, user, { confirm: true })).deactivated, true);
});
test('already deactivated returns safe conflict without audit', async () => {
  const { pool, calls } = fixture('attendee', false);
  await assert.rejects(deactivateAccount(pool, user, { confirm: true }), { status: 409 });
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO audit_logs')), false);
});
for (const failAt of ['UPDATE event_registrations', 'UPDATE users', 'DELETE FROM auth_sessions', 'INSERT INTO audit_logs']) {
  test(`failure in ${failAt} rolls back and releases connection`, async () => {
    const { pool, calls, released } = fixture('attendee', true, [], failAt);
    await assert.rejects(deactivateAccount(pool, user, { confirm: true }));
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK'); assert.equal(released(), true);
    assert.equal(calls.some(call => call.sql === 'COMMIT'), false);
  });
}
for (const body of [undefined, {}, { confirm: false }, { confirm: 'true' }, { confirm: true, user_id: 'other' }, { confirm: true, role: 'attendee' }]) {
  test(`explicit confirmation only: ${JSON.stringify(body)}`, async () => {
    const { pool, calls } = fixture();
    await assert.rejects(deactivateAccount(pool, user, body), { status: 400 });
    assert.equal(calls.length, 0);
  });
}

test('endpoint authentication, CSRF, identity and cookie clearing', async () => {
  const repo = { async load() { return null; }, async update() { return null; } };
  let identity: AuthenticatedUser | undefined = user;
  let failure: Error | undefined;
  let called = 0;
  const handler = createProfileHandler(repo, async () => {
    if (!identity) throw new AccessError(401, 'Sign in to continue.');
    return identity;
  }, () => 'https://app.example.test', undefined, async (who, body) => {
    called++; assert.equal(who.id, 'self'); assert.deepEqual(body, { confirm: true });
    if (failure) throw failure;
    return { deactivated: true, signedOut: true };
  });
  async function request(origin: string | undefined = 'https://app.example.test') {
    let status = 0; let body: any; const headers: Record<string, string> = {};
    const json = (value: unknown) => { body = value; };
    const response: VercelResponse = { setHeader(name, value) { headers[name] = value; }, status(code) { status = code; return { json }; }, json };
    await handler({ method: 'DELETE', url: '/api/account/profile?user_id=other', headers: { origin }, body: { confirm: true } }, response);
    return { status, body, headers };
  }
  identity = undefined;
  assert.equal((await request()).status, 401); assert.equal(called, 0);
  identity = user;
  assert.equal((await request('https://evil.example.test')).status, 403); assert.equal(called, 0);
  failure = new DeactivationBlockedError([{ id: 'event', title: 'Reassign this event', event_code: null }]);
  const blocked = await request(); assert.equal(blocked.status, 409); assert.ok(blocked.body.events);
  assert.equal(blocked.headers['Set-Cookie'], undefined);
  failure = new Error('private database detail');
  const failed = await request(); assert.equal(failed.status, 503);
  assert.equal(JSON.stringify(failed.body).includes('private database detail'), false);
  assert.equal(failed.headers['Set-Cookie'], undefined);
  failure = undefined;
  const success = await request(); assert.equal(success.status, 200);
  assert.match(success.headers['Set-Cookie'], /cs_access=; Max-Age=0; Path=\/; HttpOnly; SameSite=Strict/);
});

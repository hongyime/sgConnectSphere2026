// Unit tests for the login lockout state machine (SCRUM-94, BDR O-02).
//
// Uses a hand-rolled Pool double so we do not need a live PostgreSQL for
// these tests. The double records every SQL statement the login flow
// issues and lets each test assert both the returned status (throwing
// AccessError for refusals, returning a session token for successes) and
// the exact side-effect writes to the users row.
//
// What each case is checking:
// - "increments failed_login_count on wrong password" — the counter grows
//   linearly for the first four bad attempts, matching E01-S01 Scenario 2.
// - "sets locked_until at the fifth failed attempt" — the transition that
//   was missing before this story: threshold reached, lockout window
//   recorded so downstream requests can be refused.
// - "refuses further attempts while locked_until is in the future" — the
//   guard, matching E01-S01 Scenario 3.
// - "auto-unlocks after locked_until has passed" — a user who waited out
//   the window can try again; failed_login_count resets so the counter
//   does not permanently block the account.
// - "resets both counter and lock on successful sign-in" — mid-window
//   correct password clears any partial state.
// - "does not increment counter for already-locked or inactive accounts" —
//   an attacker cannot keep the lockout window open by pounding a dormant
//   account with wrong passwords.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { hashPassword } from '../src/modules/accessControl/passwords.js';
import { login, LOCKOUT_MINUTES, LOCKOUT_THRESHOLD } from '../src/modules/accessControl/sessions.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  failed_login_count: number;
  locked_until: Date | null;
};

const knownPassword = 'ValidPassw0rd!'; // pragma: allowlist secret - synthetic test credential
const wrongPassword = 'WrongPassw0rd!'; // pragma: allowlist secret - synthetic test credential

async function fixtureUser(overrides: Partial<UserRow> = {}): Promise<UserRow> {
  const passwordHash = await hashPassword(knownPassword);
  return {
    id: 'user-1',
    email: 'organiser@example.com',
    password_hash: passwordHash,
    is_active: true,
    failed_login_count: 0,
    locked_until: null,
    ...overrides,
  };
}

function fakePool(user: UserRow | undefined): { pool: Pool; queries: string[]; row: () => UserRow | undefined } {
  const queries: string[] = [];
  let currentUser = user ? { ...user } : undefined;
  const client: PoolClient = {
    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
      queries.push(sql);
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [], rowCount: 0 } as unknown as QueryResult;
      }
      if (sql.startsWith('SELECT * FROM users WHERE lower(email)')) {
        return { rows: currentUser ? [currentUser] : [], rowCount: currentUser ? 1 : 0 } as unknown as QueryResult;
      }
      if (sql.startsWith('UPDATE users SET failed_login_count = 0, locked_until = NULL')) {
        if (currentUser) { currentUser.failed_login_count = 0; currentUser.locked_until = null; }
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      }
      if (sql.startsWith('UPDATE users SET failed_login_count = $1, locked_until')) {
        // params: [nextCount, `${LOCKOUT_MINUTES}`, userId]
        if (currentUser && params) {
          currentUser.failed_login_count = Number(params[0]);
          currentUser.locked_until = new Date(Date.now() + Number(params[1]) * 60 * 1000);
        }
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      }
      if (sql.startsWith('UPDATE users SET failed_login_count = $1 WHERE')) {
        if (currentUser && params) currentUser.failed_login_count = Number(params[0]);
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      }
      if (sql.startsWith('INSERT INTO auth_sessions')) {
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      }
      throw new Error(`Unexpected SQL in fake pool: ${sql}`);
    },
    release() { /* no-op */ },
  } as unknown as PoolClient;
  const pool = { connect: async () => client } as unknown as Pool;
  return { pool, queries, row: () => currentUser };
}

async function expectAccessError(promise: Promise<unknown>, status: number) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AccessError, `Expected AccessError, got ${error}`);
    assert.equal((error as AccessError).status, status);
    return true;
  });
}

test('increments failed_login_count on wrong password below threshold', async () => {
  const { pool, row } = fakePool(await fixtureUser({ failed_login_count: 2 }));
  await expectAccessError(login(pool, 'organiser@example.com', wrongPassword), 401);
  assert.equal(row()!.failed_login_count, 3);
  assert.equal(row()!.locked_until, null);
});

test('sets locked_until at the fifth consecutive failed attempt', async () => {
  const before = Date.now();
  const { pool, row } = fakePool(await fixtureUser({ failed_login_count: 4 }));
  await expectAccessError(login(pool, 'organiser@example.com', wrongPassword), 401);
  const updated = row()!;
  assert.equal(updated.failed_login_count, LOCKOUT_THRESHOLD);
  assert.ok(updated.locked_until, 'locked_until must be set once the threshold is reached');
  const lockDuration = updated.locked_until!.getTime() - before;
  // Give a wide tolerance because the fake pool computes new Date() at call time.
  assert.ok(lockDuration >= LOCKOUT_MINUTES * 60 * 1000 - 1000, `lockout window shorter than expected: ${lockDuration}ms`);
  assert.ok(lockDuration <= LOCKOUT_MINUTES * 60 * 1000 + 2000, `lockout window longer than expected: ${lockDuration}ms`);
});

test('refuses correct password while the lockout window is still in effect', async () => {
  const future = new Date(Date.now() + 10 * 60 * 1000);
  const { pool, row } = fakePool(await fixtureUser({ failed_login_count: LOCKOUT_THRESHOLD, locked_until: future }));
  await expectAccessError(login(pool, 'organiser@example.com', knownPassword), 401);
  // The counter is not incremented further while locked — attackers should not
  // be able to keep the lockout window open by pounding a locked account.
  assert.equal(row()!.failed_login_count, LOCKOUT_THRESHOLD);
  assert.equal(row()!.locked_until!.getTime(), future.getTime());
});

test('auto-unlocks after locked_until has passed and accepts a fresh success', async () => {
  const past = new Date(Date.now() - 60 * 1000);
  const { pool, row } = fakePool(await fixtureUser({ failed_login_count: LOCKOUT_THRESHOLD, locked_until: past }));
  const token = await login(pool, 'organiser@example.com', knownPassword);
  assert.match(token, /^[a-f0-9]{64}$/, 'Successful sign-in must return a 32-byte hex token.');
  assert.equal(row()!.failed_login_count, 0);
  assert.equal(row()!.locked_until, null);
});

test('resets counter and lock on a mid-window correct password', async () => {
  // failed_login_count below threshold but non-zero simulates a user who
  // mistyped twice and then remembered the correct password.
  const { pool, row } = fakePool(await fixtureUser({ failed_login_count: 3 }));
  const token = await login(pool, 'organiser@example.com', knownPassword);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(row()!.failed_login_count, 0);
  assert.equal(row()!.locked_until, null);
});

test('does not increment counter for an inactive account', async () => {
  const { pool, row } = fakePool(await fixtureUser({ is_active: false, failed_login_count: 1 }));
  await expectAccessError(login(pool, 'organiser@example.com', wrongPassword), 401);
  assert.equal(row()!.failed_login_count, 1);
});

test('does not increment counter when the account does not exist', async () => {
  const { pool, queries } = fakePool(undefined);
  await expectAccessError(login(pool, 'unknown@example.com', wrongPassword), 401);
  const updates = queries.filter(sql => sql.startsWith('UPDATE users'));
  assert.equal(updates.length, 0, 'Missing user must not produce any users-table write.');
});

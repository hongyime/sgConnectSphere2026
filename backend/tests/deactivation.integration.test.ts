import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { deactivateAccount, DEACTIVATION_BLOCKING_STATUSES } from '../src/modules/accessControl/deactivation.js';
import { login, tokenDigest } from '../src/modules/accessControl/sessions.js';
import { hashPassword } from '../src/modules/accessControl/passwords.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('PostgreSQL: retention, time boundaries, capacity count, session revocation, coordinator statuses and rollback', async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
  assert.ok(url, 'Configure a database connection; all fixture changes are confined to test schema and rolled back');
  const database = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  const client = await database.connect();
  try {
    // T-59: same database, isolated test schema. Even fixture DDL is rolled back.
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 15000');
    await client.query('CREATE SCHEMA IF NOT EXISTS test');
    await client.query('SET LOCAL search_path = test, public');
    const present = await client.query(`SELECT to_regclass('test.users') AS users`);
    if (!present.rows[0].users) {
      // These extensions must already exist; do not change global DB setup.
      const extensions = await client.query(`SELECT count(*)::int AS count FROM pg_extension WHERE extname IN ('pgcrypto', 'btree_gist')`);
      assert.equal(extensions.rows[0].count, 2, 'Provision pgcrypto and btree_gist before running integration tests');
      for (const file of ['0001_connectsphere_schema.sql', '0003_auth_sessions.sql']) {
        await client.query(await readFile(new URL(`../database/migrations/${file}`, import.meta.url), 'utf8'));
      }
    }
    for (const table of ['users', 'events', 'event_registrations', 'event_threads', 'audit_logs', 'auth_sessions', 'client_organisations', 'room_layouts']) {
      const resolved = await client.query(`SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid = to_regclass($1)`, [table]);
      assert.equal(resolved.rows[0]?.nspname, 'test', `${table} must resolve to test, never public`);
    }
    // Nested service transactions are real PostgreSQL savepoints within the
    // rollback-only fixture transaction. Production still uses BEGIN/COMMIT.
    let failAudit = false;
    const servicePool = { async connect() {
      let active = false;
      return { async query(sql: string, values?: unknown[]) {
        if (sql === 'BEGIN') { active = true; return client.query('SAVEPOINT account_operation'); }
        if (sql === 'COMMIT') { active = false; return client.query('RELEASE SAVEPOINT account_operation'); }
        if (sql === 'ROLLBACK') {
          if (!active) return { rows: [] };
          active = false;
          await client.query('ROLLBACK TO SAVEPOINT account_operation');
          return client.query('RELEASE SAVEPOINT account_operation');
        }
        if (failAudit && sql.includes('INSERT INTO audit_logs')) throw new Error('Injected audit failure');
        return client.query(sql, values);
      }, release() {} };
    } } as unknown as Pool;
    const org = randomUUID(), layout = randomUUID();
    await client.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, `Synthetic ${org}`]);
    await client.query('INSERT INTO room_layouts (id, code, label) VALUES ($1, $2, $3)', [layout, layout, 'Synthetic']);
    const credential = randomBytes(20).toString('hex');
    const digest = await hashPassword(credential);
    async function makeUser(role: AuthenticatedUser['role']) {
      const id = randomUUID();
      const email = `${id}@example.test`;
      await client.query(`INSERT INTO users (id, full_name, email, password_hash, role, client_org_id)
        VALUES ($1, 'Synthetic User', $2, $3, $4, $5)`, [id, email, digest, role, org]);
      return { id, email, role, clientOrgId: org, isActive: true, failedLoginCount: 0 } as AuthenticatedUser;
    }
    const organiser = await makeUser('event_organiser');
    async function event(status: string, start: string, coordinator?: string) {
      const id = randomUUID();
      await client.query(`INSERT INTO events (id, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance, layout_id, withdrawal_deadline)
        VALUES ($1, $2, $3, $4, 'Synthetic event', $5, tstzrange(now() + $6::interval, now() + $6::interval + interval '1 hour', '[)'), 10, $7, now() - interval '1 day')`,
      [id, organiser.id, coordinator ?? null, org, status, start, layout]);
      return id;
    }
    const attendee = await makeUser('attendee');
    const future = await event('confirmed', '1 day');
    const boundary = await event('confirmed', '0 seconds');
    const started = await event('confirmed', '-30 minutes');
    const ended = await event('completed', '-2 days');
    const waiting = await event('confirmed', '2 days');
    const alreadyWithdrawn = await event('confirmed', '3 days');
    for (const [eventId, status] of [[future, 'registered'], [boundary, 'registered'], [started, 'registered'], [ended, 'registered'], [waiting, 'waitlisted'], [alreadyWithdrawn, 'withdrawn']]) {
      await client.query('INSERT INTO event_registrations (event_id, attendee_id, status) VALUES ($1, $2, $3)', [eventId, attendee.id, status]);
    }
    const token = await login(servicePool, attendee.email, credential);
    await client.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [tokenDigest(randomBytes(32).toString('hex')), attendee.id]);
    const result = await deactivateAccount(servicePool, attendee, { confirm: true });
    assert.equal(result.withdrawnRegistrations, 2);
    const self = (await client.query('SELECT * FROM users WHERE id = $1', [attendee.id])).rows[0];
    assert.equal(self.is_active, false); assert.ok(self.deactivated_at); assert.equal(self.role, 'attendee'); assert.equal(self.password_hash, digest);
    assert.equal((await client.query('SELECT * FROM auth_sessions WHERE user_id = $1 OR token_hash = $2', [attendee.id, tokenDigest(token)])).rowCount, 0);
    await assert.rejects(login(servicePool, attendee.email, credential), { status: 401 });
    const registrations = (await client.query('SELECT * FROM event_registrations WHERE attendee_id = $1', [attendee.id])).rows;
    assert.equal(registrations.length, 6);
    for (const id of [future, waiting]) { const row = registrations.find(row => row.event_id === id); assert.equal(row.status, 'withdrawn'); assert.ok(row.withdrawn_at); }
    for (const id of [boundary, started, ended]) { const row = registrations.find(row => row.event_id === id); assert.equal(row.status, 'registered'); assert.equal(row.withdrawn_at, null); }
    assert.equal(registrations.find(row => row.event_id === alreadyWithdrawn).withdrawn_at, null);
    assert.equal((await client.query(`SELECT count(*)::int AS occupied FROM event_registrations WHERE event_id = $1 AND status = 'registered'`, [future])).rows[0].occupied, 0);
    const audits = (await client.query(`SELECT * FROM audit_logs WHERE entity_id = $1 AND action = 'Account Deactivated'`, [attendee.id])).rows;
    assert.equal(audits.length, 1); assert.equal(audits[0].actor_id, attendee.id); assert.ok(audits[0].occurred_at);
    await assert.rejects(deactivateAccount(servicePool, attendee, { confirm: true }), { status: 409 });

    for (const status of DEACTIVATION_BLOCKING_STATUSES) {
      const coordinator = await makeUser('event_coordinator');
      await event(status, '-2 days', coordinator.id); // Status blocks even if its dates are in the past.
      await assert.rejects(deactivateAccount(servicePool, coordinator, { confirm: true }), { status: 409 });
      assert.equal((await client.query('SELECT is_active FROM users WHERE id = $1', [coordinator.id])).rows[0].is_active, true);
      assert.equal((await client.query('SELECT * FROM audit_logs WHERE entity_id = $1', [coordinator.id])).rowCount, 0);
    }
    for (const status of ['completed', 'cancelled', 'rejected']) {
      const coordinator = await makeUser('event_coordinator');
      const id = await event(status, '1 day', coordinator.id);
      await deactivateAccount(servicePool, coordinator, { confirm: true });
      assert.equal((await client.query('SELECT coordinator_id FROM events WHERE id = $1', [id])).rows[0].coordinator_id, coordinator.id);
    }
    await deactivateAccount(servicePool, await makeUser('event_coordinator'), { confirm: true });
    for (const role of ['venue_staff', 'technical_support_staff'] as const) await deactivateAccount(servicePool, await makeUser(role), { confirm: true });
    await deactivateAccount(servicePool, organiser, { confirm: true });
    assert.equal((await client.query('SELECT organiser_id FROM events WHERE id = $1', [ended])).rows[0].organiser_id, organiser.id);

    const rollbackUser = await makeUser('attendee');
    await client.query(`INSERT INTO event_registrations (event_id, attendee_id) VALUES ($1, $2)`, [future, rollbackUser.id]);
    await login(servicePool, rollbackUser.email, credential);
    failAudit = true;
    await assert.rejects(deactivateAccount(servicePool, rollbackUser, { confirm: true }));
    failAudit = false;
    const unchanged = (await client.query('SELECT is_active, deactivated_at FROM users WHERE id = $1', [rollbackUser.id])).rows[0];
    assert.equal(unchanged.is_active, true); assert.equal(unchanged.deactivated_at, null);
    assert.equal((await client.query('SELECT status FROM event_registrations WHERE attendee_id = $1', [rollbackUser.id])).rows[0].status, 'registered');
    assert.equal((await client.query('SELECT * FROM auth_sessions WHERE user_id = $1', [rollbackUser.id])).rowCount, 1);
    assert.equal((await client.query('SELECT * FROM audit_logs WHERE entity_id = $1', [rollbackUser.id])).rowCount, 0);
  } finally {
    await client.query('ROLLBACK'); client.release(); await database.end();
  }
});

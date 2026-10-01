import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { registerAccount } from '../src/modules/accessControl/registration';
import { createAccountRepository } from '../src/modules/accessControl/postgresRepository';
import { verifyPassword } from '../src/modules/accessControl/password';

test('PostgreSQL persists defaults, enforces concurrent uniqueness and prevents internal roles', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable migrated PostgreSQL database');
  // This test commits real rows and has no rollback, so it must never reach a
  // shared database. Two independent guards, because either alone is escapable:
  // the address check stops an obviously remote target, and the search_path
  // assertion below catches a pooler silently discarding the startup options
  // that are supposed to confine writes to the disposable schema.
  const target = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(
    ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname),
    'Use a loopback test database; this test commits and cannot be rolled back',
  );
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `registration_test_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.query(`CREATE TABLE ${schema}.users (LIKE public.users INCLUDING ALL)`);
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema},public` });
    // Fail closed if search_path did not take. Without this, every write below
    // would land in the first schema on the default path, which is public.
    const resolved = await pool.query<{ schema: string | null }>('SELECT current_schema() AS schema');
    assert.equal(
      resolved.rows[0]?.schema,
      schema,
      'search_path did not resolve to the disposable schema; refusing to write',
    );
    const repository = createAccountRepository(pool);
    const input = { full_name: 'Jamie Lee', email: 'jamie@example.com', password: 'LongPassword12!', contact_number: '+65 9000 0000' }; // pragma: allowlist secret - synthetic test credential
    const results = await Promise.all([registerAccount({ ...input, email: '  Jamie@Example.COM  ' }, repository), registerAccount(input, repository)]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    const { rows } = await pool.query('SELECT * FROM users');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'jamie@example.com');
    assert.equal(rows[0].role, 'attendee');
    assert.equal(rows[0].is_active, true);
    assert.equal(rows[0].failed_login_count, 0);
    assert.equal(rows[0].locked_until, null);
    assert.equal(rows[0].client_org_id, null);
    assert.ok(rows[0].created_at);
    assert.equal(rows[0].full_name, input.full_name);
    assert.equal(rows[0].contact_number, input.contact_number);
    assert.equal(await verifyPassword(input.password, rows[0].password_hash), true);
    await assert.rejects(pool.query(`INSERT INTO users (email, password_hash, full_name, contact_number, role) VALUES ($1, 'unused', 'Test', '123', 'attendee')`, ['JAMIE@EXAMPLE.COM']), { code: '23505' });
    assert.equal((await registerAccount({ ...input, email: 'staff@example.com', role: 'EVENT_COORDINATOR' }, repository)).status, 400);
    assert.equal((await registerAccount({ ...input, email: 'invalid@example.com', contact_number: '' }, repository)).status, 400);
    assert.equal((await pool.query('SELECT * FROM users')).rowCount, 1);
    // Existing mixed-case users must also block normalized registration.
    await pool.query(`INSERT INTO users (email, password_hash, full_name, role) VALUES ('Legacy@Example.com', 'unused', 'Legacy', 'attendee')`);
    assert.equal((await registerAccount({ ...input, email: 'legacy@example.com' }, repository)).status, 409);
    assert.equal((await pool.query('SELECT * FROM users')).rowCount, 2);
  } finally {
    await pool?.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});

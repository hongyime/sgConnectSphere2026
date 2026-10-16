import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { login, tokenDigest } from '../modules/accessControl/sessions.js';

const seedCredential = 'ValidPass123';
const seededRoles = [
  { email: 'coord_lead@connectsphere.com', role: 'event_coordinator_lead' },
  { email: 'safety_officer@connectsphere.com', role: 'safety_officer' },
] as const;

async function main() {
  const connectionString = requireLoopbackDatabaseUrl();
  const pool = new Pool({ connectionString, max: 2 });

  try {
    const schemaResult = await pool.query<{ schema_name: string }>(
      'SELECT current_schema() AS schema_name',
    );
    assert.equal(schemaResult.rows[0]?.schema_name, 'public');

    const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../database/migrations');
    const migrationFiles = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const applied = await pool.query<{ name: string }>(
      'SELECT name FROM _connectsphere_migrations ORDER BY name',
    );
    const appliedNames = applied.rows.map((row) => row.name);
    assert.deepEqual(appliedNames, migrationFiles);
    assert.ok(appliedNames.includes('0012_user_role_enum_additions.sql'));
    assert.ok(appliedNames.includes('0013_tentative_venue_holds.sql'));
    console.log(`PASS migration ledger: ${appliedNames.length} files — ${appliedNames.join(', ')}`);

    const seedCount = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM users');
    assert.equal(seedCount.rows[0]?.count, '15');
    console.log('PASS seed: 15 users loaded');

    for (const seededRole of seededRoles) {
      const userResult = await pool.query<{ id: string; role: string; is_active: boolean }>(
        'SELECT id, role, is_active FROM users WHERE lower(email) = lower($1)',
        [seededRole.email],
      );
      assert.equal(userResult.rowCount, 1, `seeded account exists: ${seededRole.email}`);
      const user = userResult.rows[0]!;
      assert.equal(user.role, seededRole.role);
      assert.equal(user.is_active, true);

      const token = await login(pool, seededRole.email, seedCredential);
      assert.match(token, /^[a-f0-9]{64}$/);
      const sessionResult = await pool.query(
        'SELECT 1 FROM auth_sessions WHERE user_id = $1 AND token_hash = $2 AND expires_at > now()',
        [user.id, tokenDigest(token)],
      );
      assert.equal(sessionResult.rowCount, 1, `active session persisted: ${seededRole.email}`);
      console.log(`PASS sign-in: ${seededRole.email} (${seededRole.role}); active session persisted`);
    }
  } finally {
    await pool.end();
  }
}

function requireLoopbackDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error('DATABASE_URL is not set.');

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
  assert.ok(loopbackHosts.has(parsed.hostname), 'This verifier requires loopback PostgreSQL.');

  return connectionString;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

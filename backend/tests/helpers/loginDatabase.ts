import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Pool } from 'pg';

// Tests own a random schema in an explicitly selected loopback database.
// Never connect to the application's configured database or reset public data.
export async function loginDatabase() {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable local PostgreSQL database');
  const address = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname), 'Use a loopback test database');
  assert.match(address.pathname, /^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/);
  const schema = `login_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: address.href, max: 2 });
  await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public');
  await admin.query('CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public');
  await admin.query(`CREATE SCHEMA ${schema}`);
  const connection = new URL(address);
  connection.searchParams.set('options', `-c search_path=${schema},public`);
  const pool = new Pool({ connectionString: connection.href, max: 10 });
  const close = async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  };
  try {
    const directory = new URL('../../database/migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
      await pool.query(await readFile(new URL(name, directory), 'utf8'));
    }
    return { pool, connectionString: connection.href, close };
  } catch (error) { await close(); throw error; }
}

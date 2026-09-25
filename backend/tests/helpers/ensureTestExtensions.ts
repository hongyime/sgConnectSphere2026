// Postgres's `CREATE EXTENSION IF NOT EXISTS` has a documented TOCTOU race
// under concurrent sessions: two sessions can both pass the "does it exist"
// check before either commits its own CREATE EXTENSION, so both attempt the
// actual insert into pg_extension and one loses with a unique_violation on
// pg_extension_name_index. Node's test runner schedules separate test files
// concurrently by default, and every *.integration.test.ts file in this
// directory creates the same two database-wide extensions against a
// freshly-created disposable database -- so this race is real, not
// theoretical (reproduced locally: one run in four hit it against a
// brand-new container). Losing the race means a concurrent test file's
// session created the extension first, which is the outcome every caller
// actually wants -- swallow only that specific, narrowly-matched error.
async function createExtensionIfNotExists(
  db: { query(sql: string): Promise<unknown> },
  name: 'pgcrypto' | 'btree_gist',
): Promise<void> {
  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS ${name} WITH SCHEMA public`);
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint === 'pg_extension_name_index') {
      return; // A concurrent session created it first; that is success, not failure.
    }
    throw error;
  }
}

/**
 * Creates the pgcrypto and btree_gist extensions every integration test's
 * migrations depend on, tolerating concurrent creation races from other
 * test files sharing the same disposable PostgreSQL database. Accepts a
 * `pg` Client or Pool (or anything with a compatible `query`).
 */
export async function ensureTestExtensions(db: { query(sql: string): Promise<unknown> }): Promise<void> {
  await createExtensionIfNotExists(db, 'pgcrypto');
  await createExtensionIfNotExists(db, 'btree_gist');
}

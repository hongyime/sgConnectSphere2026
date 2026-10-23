import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMigrationSelection,
  runMigrations,
  selectPendingMigrations,
  setGuardedMigrationSearchPath,
  type MigrationClient,
} from '../src/database/migrationSelection.js';

const files = [
  '0009_keepalive_logs.sql',
  '0010_audit_logs_immutable.sql',
  '0013_tentative_venue_holds.sql',
];

function mockClient(
  appliedNames: string[] = [],
  failOnSql?: string,
  ledgerExists = true,
  currentSchema: string | null = 'public',
  lockAcquired = true,
) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const applied = new Set(appliedNames);
  const client = {
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values });
      if (sql.includes("SELECT to_regclass('public._connectsphere_migrations')")) {
        return { rows: [{ ledger: ledgerExists ? '_connectsphere_migrations' : null }] };
      }
      if (sql.includes('SELECT current_schema() AS schema')) {
        return { rows: [{ schema: currentSchema }] };
      }
      if (sql.includes('pg_try_advisory_lock')) {
        return { rows: [{ locked: lockAcquired }] };
      }
      if (sql.includes('pg_advisory_unlock')) {
        return { rows: [{ unlocked: true }] };
      }
      if (sql.includes('SELECT name FROM') && sql.includes('_connectsphere_migrations')) {
        return { rows: [...applied].map((name) => ({ name })) };
      }
      if (sql === failOnSql) {
        throw new Error('migration query failed');
      }
      if (sql.includes('INSERT INTO') && sql.includes('_connectsphere_migrations')) {
        applied.add(String(values?.[0]));
      }
      return { rows: [] };
    },
  } as unknown as MigrationClient;
  return { client, calls };
}

test('the migration selector is optional and accepts one exact available filename', () => {
  assert.equal(parseMigrationSelection([], files), undefined);
  assert.equal(
    parseMigrationSelection(['--only', files[2]!], files),
    '0013_tentative_venue_holds.sql',
  );
});

test('the migration selector rejects malformed arguments and unknown or path-like filenames', () => {
  for (const args of [
    ['--file', files[0]!],
    ['--only'],
    ['--only', files[0]!, 'extra'],
    ['--only', 'missing.sql'],
    ['--only', '../0009_keepalive_logs.sql'],
  ]) {
    assert.throws(() => parseMigrationSelection(args, files));
  }
});

test('guarded migration sessions pin and verify the public search path', async () => {
  const validSession = mockClient();
  await setGuardedMigrationSearchPath(validSession.client);
  assert.deepEqual(
    validSession.calls.map((call) => call.sql),
    ['SET search_path TO public, extensions', 'SELECT current_schema() AS schema'],
  );

  const unexpectedSession = mockClient([], undefined, true, 'private');
  await assert.rejects(
    setGuardedMigrationSearchPath(unexpectedSession.client),
    /not using the public schema/,
  );
});

test('the default selection returns every pending file in filename order', () => {
  assert.deepEqual(
    selectPendingMigrations(files, new Set(['0009_keepalive_logs.sql'])),
    ['0010_audit_logs_immutable.sql', '0013_tentative_venue_holds.sql'],
  );
});

test('an explicit selection returns only that pending migration', () => {
  assert.deepEqual(
    selectPendingMigrations(files, new Set(), '0013_tentative_venue_holds.sql'),
    ['0013_tentative_venue_holds.sql'],
  );
});

test('an explicit selection already in the ledger returns an empty list', () => {
  assert.deepEqual(
    selectPendingMigrations(files, new Set(files), '0010_audit_logs_immutable.sql'),
    [],
  );
});

test('an explicit filename outside the migration directory is rejected', () => {
  assert.throws(() => selectPendingMigrations(files, new Set(), '../unexpected.sql'));
});

test('the runner applies only the selected migration and records only that filename', async () => {
  const { client, calls } = mockClient(['0009_keepalive_logs.sql']);
  const logged: string[] = [];
  const applied = await runMigrations(
    client,
    files,
    '0013_tentative_venue_holds.sql',
    async (file) => `SQL for ${file}`,
    (message) => logged.push(message),
  );

  assert.deepEqual(applied, ['0013_tentative_venue_holds.sql']);
  assert.equal(calls.filter((call) => call.sql.startsWith('SQL for ')).length, 1);
  assert.deepEqual(
    calls.filter((call) => call.sql.includes('INSERT INTO _connectsphere_migrations')).map((call) => call.values?.[0]),
    ['0013_tentative_venue_holds.sql'],
  );
  assert.deepEqual(logged, ['applied migration 0013_tentative_venue_holds.sql']);
});

test('guarded migration runner requires an existing ledger and never creates one', async () => {
  const missingLedger = mockClient([], undefined, false);
  await assert.rejects(
    runMigrations(
      missingLedger.client,
      files,
      '0009_keepalive_logs.sql',
      async () => 'unexpected SQL',
      () => {},
      { requireExistingLedger: true },
    ),
    /refusing to create it in guarded mode/,
  );
  assert.equal(
    missingLedger.calls.some((call) => call.sql.includes('CREATE TABLE IF NOT EXISTS')),
    false,
  );

  const existingLedger = mockClient();
  await runMigrations(
    existingLedger.client,
    files,
    '0009_keepalive_logs.sql',
    async (file) => `SQL for ${file}`,
    () => {},
    { requireExistingLedger: true },
  );
  assert.equal(
    existingLedger.calls.some((call) => call.sql.includes('CREATE TABLE IF NOT EXISTS')),
    false,
  );
  assert.ok(existingLedger.calls.some((call) => call.sql.includes("SELECT to_regclass('public._connectsphere_migrations')")));
  assert.ok(existingLedger.calls.some((call) => call.sql.includes('SELECT name FROM public._connectsphere_migrations')));
  assert.ok(existingLedger.calls.some((call) => call.sql.includes('INSERT INTO public._connectsphere_migrations')));
});

test('guarded migration runner refuses a selection that is not the next pending migration', async () => {
  const { client, calls } = mockClient(['0009_keepalive_logs.sql']);
  await assert.rejects(
    runMigrations(
      client,
      files,
      '0013_tentative_venue_holds.sql',
      async () => 'unexpected SQL',
      () => {},
      { requireExistingLedger: true },
    ),
    /The next pending migration is 0010_audit_logs_immutable\.sql; refusing a different selection\./,
  );
  assert.equal(calls.some((call) => call.sql === 'BEGIN'), false);
  assert.equal(calls.some((call) => call.sql.startsWith('SQL for ')), false);
  assert.equal(calls.some((call) => call.sql.includes('pg_advisory_unlock')), true);
});

test('guarded migration runner refuses to start when the advisory lock is held', async () => {
  const { client, calls } = mockClient([], undefined, true, 'public', false);
  await assert.rejects(
    runMigrations(
      client,
      files,
      '0009_keepalive_logs.sql',
      async () => 'unexpected SQL',
      () => {},
      { requireExistingLedger: true },
    ),
    /Another production migration is already running; refusing to start\./,
  );
  assert.equal(calls.some((call) => call.sql.includes('SELECT to_regclass')), false);
  assert.equal(calls.some((call) => call.sql.includes('SELECT name FROM')), false);
  assert.equal(calls.some((call) => call.sql.includes('pg_advisory_unlock')), false);
  assert.equal(calls.some((call) => call.sql.includes('INSERT INTO')), false);
});

test('guarded migration runner releases the advisory lock when a migration fails', async () => {
  const sql = 'FAIL THIS GUARDED MIGRATION';
  const { client, calls } = mockClient([], sql);
  await assert.rejects(
    runMigrations(
      client,
      files,
      '0009_keepalive_logs.sql',
      async () => sql,
      () => {},
      { requireExistingLedger: true },
    ),
    /migration query failed/,
  );
  assert.equal(calls.some((call) => call.sql === 'BEGIN'), true);
  assert.equal(calls.some((call) => call.sql === 'ROLLBACK'), true);
  assert.equal(calls.some((call) => call.sql.includes('pg_advisory_unlock')), true);
});

test('guarded migration runner rejects an already-applied selected migration', async () => {
  const { client, calls } = mockClient(files);
  await assert.rejects(
    runMigrations(
      client,
      files,
      '0010_audit_logs_immutable.sql',
      async () => 'unexpected SQL',
      () => {},
      { requireExistingLedger: true },
    ),
    /The selected migration is already recorded as applied\./,
  );
  assert.equal(calls.some((call) => call.sql === 'BEGIN'), false);
  assert.equal(calls.some((call) => call.sql.includes('pg_advisory_unlock')), true);
});

test('the runner preserves all-pending behavior without a selector', async () => {
  const { client, calls } = mockClient(['0009_keepalive_logs.sql']);
  const applied = await runMigrations(client, files, undefined, async (file) => `SQL for ${file}`, () => {});

  assert.deepEqual(applied, ['0010_audit_logs_immutable.sql', '0013_tentative_venue_holds.sql']);
  assert.equal(calls.filter((call) => call.sql.startsWith('SQL for ')).length, 2);
});

test('an already-applied selected migration reports a no-op without opening a transaction', async () => {
  const { client, calls } = mockClient(files);
  const logged: string[] = [];
  const applied = await runMigrations(
    client,
    files,
    '0010_audit_logs_immutable.sql',
    async () => 'unexpected SQL',
    (message) => logged.push(message),
  );

  assert.deepEqual(applied, []);
  assert.equal(calls.some((call) => call.sql === 'BEGIN'), false);
  assert.deepEqual(logged, ['migration already applied 0010_audit_logs_immutable.sql']);
});

test('an unknown selected filename is rejected before any database query', async () => {
  const { client, calls } = mockClient();
  await assert.rejects(
    runMigrations(client, files, '../unexpected.sql', async () => 'unexpected SQL', () => {}),
    /Unknown migration file/,
  );
  assert.equal(calls.length, 0);
});

test('a failed migration is rolled back and the error is preserved', async () => {
  const sql = 'FAIL THIS MIGRATION';
  const { client, calls } = mockClient([], sql);
  await assert.rejects(
    runMigrations(client, files, '0009_keepalive_logs.sql', async () => sql, () => {}),
    /migration query failed/,
  );
  assert.equal(calls.some((call) => call.sql === 'ROLLBACK'), true);
  assert.equal(calls.some((call) => call.sql === 'COMMIT'), false);
});

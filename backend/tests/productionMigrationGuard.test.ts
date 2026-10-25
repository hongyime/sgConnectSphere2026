import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCTION_DATABASE_HOST,
  assertNextProductionMigration,
  assertOnlySelectedMigrationWasApplied,
  assertProductionDatabaseUrl,
  productionDatabaseClientConfig,
} from '../src/database/productionMigrationGuard.js';

const migrations = [
  '0001_connectsphere_schema.sql',
  '0002_event_visibility.sql',
  '0002_users_email_case_insensitive.sql',
];

function databaseUrl(options: { username?: string; authenticated?: boolean; database?: string; host?: string } = {}) {
  const url = new URL(`postgresql://${options.host ?? PRODUCTION_DATABASE_HOST}:5432/${options.database ?? 'postgres'}`);
  url.username = options.username ?? 'postgres';
  if (options.authenticated !== false) Reflect.set(url, 'pass' + 'word', 'unit-test-only');
  return url.toString();
}

test('production URL guard accepts the configured PostgreSQL target and rejects other targets', () => {
  const parsed = assertProductionDatabaseUrl(databaseUrl());
  assert.equal(parsed.hostname, PRODUCTION_DATABASE_HOST);

  assert.throws(() => assertProductionDatabaseUrl(undefined), /not configured/);
  assert.throws(() => assertProductionDatabaseUrl('not a URL'), /valid PostgreSQL URL/);
  const nonPostgresUrl = new URL(`https://${PRODUCTION_DATABASE_HOST}/postgres`);
  assert.throws(() => assertProductionDatabaseUrl(nonPostgresUrl.toString()), /must use PostgreSQL/);
  assert.throws(
    () => assertProductionDatabaseUrl(databaseUrl({ host: 'localhost' })),
    /unexpected database host/,
  );
  assert.throws(
    () => assertProductionDatabaseUrl(databaseUrl().replace(':5432/', ':6543/')),
    /service port/,
  );
  assert.throws(
    () => assertProductionDatabaseUrl(databaseUrl({ username: 'other' })),
    /configured production database account/,
  );
  assert.throws(
    () => assertProductionDatabaseUrl(databaseUrl({ authenticated: false })),
    /configured production database account/,
  );
  assert.throws(
    () => assertProductionDatabaseUrl(databaseUrl({ database: 'other' })),
    /target the postgres database/,
  );
});

test('guarded database config ignores URL parameters and forces verified TLS', () => {
  const connectionUrl = new URL(`postgresql://${PRODUCTION_DATABASE_HOST}:5432/postgres`);
  connectionUrl.username = 'postgres';
  Reflect.set(connectionUrl, 'pass' + 'word', 'unit-test-only');
  connectionUrl.searchParams.set('sslmode', 'disable');
  connectionUrl.searchParams.set('ssl', 'no-verify');
  connectionUrl.searchParams.set('sslrootcert', '/tmp/ca.pem');
  connectionUrl.searchParams.set('options', '-c search_path=private');
  const config = productionDatabaseClientConfig(connectionUrl.toString());
  assert.equal(config.host, PRODUCTION_DATABASE_HOST);
  assert.equal(config.database, 'postgres');
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal('connectionString' in config, false);
  assert.equal('options' in config, false);
});

test('precheck accepts only the next pending migration in repository order', () => {
  assert.equal(
    assertNextProductionMigration(migrations, [migrations[0]], migrations[1]),
    migrations[1],
  );

  assert.throws(
    () => assertNextProductionMigration(migrations, [migrations[0]], migrations[2]),
    /next pending migration is 0002_event_visibility\.sql/,
  );
  assert.throws(
    () => assertNextProductionMigration(migrations, [migrations[0]], '9999_unknown.sql'),
    /does not exist/,
  );
  assert.throws(
    () => assertNextProductionMigration(migrations, [migrations[0]], '../0002_event_visibility.sql'),
    /exact migration filename/,
  );
  assert.throws(
    () => assertNextProductionMigration(migrations, [migrations[0], 'legacy.sql'], migrations[1]),
    /absent from this checkout/,
  );
  assert.throws(
    () => assertNextProductionMigration(migrations, migrations, migrations[1]),
    /already recorded as applied/,
  );
  assert.throws(
    () => assertNextProductionMigration(migrations, migrations, migrations[0]),
    /already recorded as applied/,
  );
});

test('postcheck requires only the selected migration to be newly recorded', () => {
  const before = { migration: migrations[1], applied: [migrations[0]] };
  assert.doesNotThrow(() =>
    assertOnlySelectedMigrationWasApplied(before, [migrations[0], migrations[1]], migrations[1]),
  );

  assert.throws(
    () => assertOnlySelectedMigrationWasApplied(before, [migrations[0]], migrations[1]),
    /exactly the selected migration newly recorded/,
  );
  assert.throws(
    () =>
      assertOnlySelectedMigrationWasApplied(
        before,
        [migrations[0], migrations[1], migrations[2]],
        migrations[1],
      ),
    /exactly the selected migration newly recorded/,
  );
  assert.throws(
    () => assertOnlySelectedMigrationWasApplied(before, [migrations[1]], migrations[1]),
    /changed unexpectedly/,
  );
  assert.throws(
    () => assertOnlySelectedMigrationWasApplied(before, [migrations[0], migrations[1]], migrations[2]),
    /snapshot does not match/,
  );
});

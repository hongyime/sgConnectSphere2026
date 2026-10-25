import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import {
  assertNextProductionMigration,
  assertOnlySelectedMigrationWasApplied,
  productionDatabaseClientConfig,
  type MigrationLedgerSnapshot,
} from './productionMigrationGuard.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(currentDirectory, '../../database/migrations');

async function main() {
  const [phase, requestedMigration, snapshotPath] = process.argv.slice(2);
  if (!['pre', 'post'].includes(phase) || !requestedMigration || !snapshotPath) {
    throw new Error('Usage: productionMigrationGuardCli.ts <pre|post> <migration.sql> <snapshot.json>');
  }

  const databaseUrl = process.env.DATABASE_URL;
  const client = new Client(productionDatabaseClientConfig(databaseUrl));

  try {
    await client.connect();
  } catch {
    throw new Error('Unable to connect to the configured production database.');
  }
  try {
    const ledger = await client.query<{ ledger: string | null }>(
      "SELECT to_regclass('public._connectsphere_migrations')::text AS ledger",
    );
    if (!ledger.rows[0]?.ledger) {
      throw new Error('The production migration ledger is missing; stop for manual investigation.');
    }

    const result = await client.query<{ name: string }>(
      'SELECT name FROM public._connectsphere_migrations ORDER BY name',
    );
    const appliedNames = result.rows.map((row) => row.name);

    if (phase === 'pre') {
      const migrationFiles = (await readdir(migrationsDirectory))
        .filter((file) => file.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));
      const next = assertNextProductionMigration(migrationFiles, appliedNames, requestedMigration);
      const snapshot: MigrationLedgerSnapshot = { migration: next, applied: appliedNames };
      await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
      console.log(`Read-only production precheck passed for ${next}.`);
      return;
    }

    let snapshot: MigrationLedgerSnapshot;
    try {
      snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as MigrationLedgerSnapshot;
    } catch {
      throw new Error('The precheck snapshot is missing or unreadable; postcheck cannot continue.');
    }
    assertOnlySelectedMigrationWasApplied(snapshot, appliedNames, requestedMigration);
    console.log(`Read-only production postcheck passed for ${requestedMigration}.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown guard error.';
  console.error(`Production migration guard failed: ${message}`);
  process.exitCode = 1;
});

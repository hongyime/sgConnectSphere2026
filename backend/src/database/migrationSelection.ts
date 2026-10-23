import type { Client } from 'pg';
import { assertNextProductionMigration } from './productionMigrationGuard.js';

export type MigrationClient = Pick<Client, 'query'>;

// Stable two-int key shared by every production migration process. Changing it
// would let an old and a new runner bypass each other.
const PRODUCTION_MIGRATION_LOCK_NAMESPACE = 20261018;
const PRODUCTION_MIGRATION_LOCK_ID = 1;

export type MigrationRunnerOptions = {
  requireExistingLedger?: boolean;
};

export async function setGuardedMigrationSearchPath(client: MigrationClient) {
  await client.query('SET search_path TO public, extensions');
  const result = await client.query<{ schema: string | null }>(
    'SELECT current_schema() AS schema',
  );
  if (result.rows[0]?.schema !== 'public') {
    throw new Error('Guarded migration session is not using the public schema.');
  }
}

export function parseMigrationSelection(args: string[], availableFiles: string[]) {
  if (args.length === 0) {
    return undefined;
  }

  if (args.length !== 2 || args[0] !== '--only' || !args[1]) {
    throw new Error('Usage: migrate [--only <exact-migration-file.sql>]');
  }

  const selectedFile = args[1];
  if (!availableFiles.includes(selectedFile)) {
    throw new Error(`Unknown migration file: ${selectedFile}`);
  }

  return selectedFile;
}

export function selectPendingMigrations(
  availableFiles: string[],
  appliedNames: Set<string>,
  selectedFile?: string,
) {
  if (selectedFile !== undefined && !availableFiles.includes(selectedFile)) {
    throw new Error(`Unknown migration file: ${selectedFile}`);
  }

  if (selectedFile !== undefined) {
    return appliedNames.has(selectedFile) ? [] : [selectedFile];
  }

  return availableFiles.filter((file) => !appliedNames.has(file));
}

export async function runMigrations(
  client: MigrationClient,
  availableFiles: string[],
  selectedFile: string | undefined,
  readMigration: (file: string) => Promise<string>,
  log: (message: string) => void = console.log,
  options: MigrationRunnerOptions = {},
) {
  // Validate a selector before touching the database, even when this function
  // is called without the CLI argument parser.
  selectPendingMigrations(availableFiles, new Set(), selectedFile);

  const ledgerTable = options.requireExistingLedger
    ? 'public._connectsphere_migrations'
    : '_connectsphere_migrations';

  let lockAcquired = false;
  if (options.requireExistingLedger) {
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1::int, $2::int) AS locked',
      [PRODUCTION_MIGRATION_LOCK_NAMESPACE, PRODUCTION_MIGRATION_LOCK_ID],
    );
    if (lock.rows[0]?.locked !== true) {
      throw new Error('Another production migration is already running; refusing to start.');
    }
    lockAcquired = true;
  }

  try {
    if (options.requireExistingLedger) {
      const ledger = await client.query<{ ledger: string | null }>(
        "SELECT to_regclass('public._connectsphere_migrations')::text AS ledger",
      );
      if (!ledger.rows[0]?.ledger) {
        throw new Error('The migration ledger is missing; refusing to create it in guarded mode.');
      }
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _connectsphere_migrations (
          name text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    }

    const applied = await client.query<{ name: string }>(`SELECT name FROM ${ledgerTable}`);
    const appliedNames = new Set(applied.rows.map((row) => row.name));

    if (options.requireExistingLedger && selectedFile !== undefined) {
      // Re-check under the advisory lock so a concurrent apply cannot move the
      // next-pending target after the workflow precheck.
      assertNextProductionMigration(availableFiles, [...appliedNames], selectedFile);
    }

    const pendingFiles = selectPendingMigrations(availableFiles, appliedNames, selectedFile);

    if (selectedFile !== undefined && appliedNames.has(selectedFile)) {
      log(`migration already applied ${selectedFile}`);
      return [];
    }

    for (const file of pendingFiles) {
      const sql = await readMigration(file);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO ${ledgerTable} (name) VALUES ($1)`, [file]);
        await client.query('COMMIT');
        log(`applied migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    return pendingFiles;
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1::int, $2::int)', [
        PRODUCTION_MIGRATION_LOCK_NAMESPACE,
        PRODUCTION_MIGRATION_LOCK_ID,
      ]);
    }
  }
}

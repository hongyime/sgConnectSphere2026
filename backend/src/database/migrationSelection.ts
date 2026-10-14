import type { Client } from 'pg';

export type MigrationClient = Pick<Client, 'query'>;

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
) {
  // Validate a selector before touching the database, even when this function
  // is called without the CLI argument parser.
  selectPendingMigrations(availableFiles, new Set(), selectedFile);

  await client.query(`
    CREATE TABLE IF NOT EXISTS _connectsphere_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = await client.query<{ name: string }>(
    'SELECT name FROM _connectsphere_migrations',
  );
  const appliedNames = new Set(applied.rows.map((row) => row.name));
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
      await client.query('INSERT INTO _connectsphere_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log(`applied migration ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  return pendingFiles;
}

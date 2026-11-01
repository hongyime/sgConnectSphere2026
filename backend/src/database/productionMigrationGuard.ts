import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_SSL_CA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../database/certs/supabase-pooler-ca.pem');

// The direct db.<ref>.supabase.co host is IPv6-only, and GitHub Actions runners have
// no IPv6, so the guarded run must reach the project through the IPv4 session pooler.
// The project ref stays pinned in the username below, so this is still exactly one project.
export const PRODUCTION_DATABASE_HOST = 'aws-0-ap-southeast-1.pooler.supabase.com';
export const PRODUCTION_DATABASE_USER = 'postgres.kqpjuwogtaykonhxzvna';

export type MigrationLedgerSnapshot = {
  migration: string;
  applied: string[];
};

export function assertProductionDatabaseUrl(value: string | undefined) {
  if (!value) {
    throw new Error('Production DATABASE_URL is not configured.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Production DATABASE_URL is not a valid PostgreSQL URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Production DATABASE_URL must use PostgreSQL.');
  }
  if (url.hostname !== PRODUCTION_DATABASE_HOST) {
    throw new Error('Production DATABASE_URL points to an unexpected database host.');
  }
  if (url.port && url.port !== '5432') {
    throw new Error('Production DATABASE_URL must use the PostgreSQL service port.');
  }
  if (decodeURIComponent(url.username) !== PRODUCTION_DATABASE_USER || !url.password) {
    throw new Error('Production DATABASE_URL must use the configured production database account.');
  }
  if (url.pathname !== '/postgres') {
    throw new Error('Production DATABASE_URL must target the postgres database.');
  }

  return url;
}

export function productionDatabaseClientConfig(value: string | undefined) {
  const url = assertProductionDatabaseUrl(value);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { ca: readFileSync(PRODUCTION_SSL_CA_PATH, 'utf8'), rejectUnauthorized: true },
  };
}

export function assertNextProductionMigration(
  migrationFiles: string[],
  appliedNames: string[],
  requestedMigration: string,
) {
  if (!/^[0-9]{4}_[a-z0-9_]+\.sql$/.test(requestedMigration)) {
    throw new Error('Select one exact migration filename.');
  }
  if (!migrationFiles.includes(requestedMigration)) {
    throw new Error('The selected migration does not exist in this checkout.');
  }

  const applied = new Set(appliedNames);
  const unknownApplied = [...applied].filter((name) => !migrationFiles.includes(name));
  if (unknownApplied.length > 0) {
    throw new Error('The production ledger contains migration names absent from this checkout.');
  }

  if (applied.has(requestedMigration)) {
    throw new Error('The selected migration is already recorded as applied.');
  }

  const nextPending = migrationFiles.find((file) => !applied.has(file));
  if (!nextPending) {
    throw new Error('The production ledger has no pending migration.');
  }
  if (requestedMigration !== nextPending) {
    throw new Error(`The next pending migration is ${nextPending}; refusing a different selection.`);
  }

  return nextPending;
}

export function assertOnlySelectedMigrationWasApplied(
  before: MigrationLedgerSnapshot,
  afterNames: string[],
  requestedMigration: string,
) {
  if (before.migration !== requestedMigration) {
    throw new Error('The saved precheck snapshot does not match the requested migration.');
  }

  const after = new Set(afterNames);
  const disappeared = before.applied.filter((name) => !after.has(name));
  if (disappeared.length > 0) {
    throw new Error('The production migration ledger changed unexpectedly during the run.');
  }

  const beforeSet = new Set(before.applied);
  const added = [...after].filter((name) => !beforeSet.has(name));
  if (added.length !== 1 || added[0] !== requestedMigration) {
    throw new Error('The postcheck did not find exactly the selected migration newly recorded.');
  }
}

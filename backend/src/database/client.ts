import pg from 'pg';
import { requireEnv, runtimeConfig } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabasePool() {
  pool ??= new Pool({
    connectionString: requireEnv(process.env.DATABASE_POOLER_URL || runtimeConfig.databaseUrl, 'DATABASE_URL'),
    max: 2,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    statement_timeout: 5000,
    query_timeout: 6000,
    application_name: 'connectsphere-api',
  });

  return pool;
}

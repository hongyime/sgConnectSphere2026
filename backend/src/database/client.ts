import pg from 'pg';
import { requireEnv } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let currentConnectionString: string | null = null;

export function getDatabasePool(): pg.Pool {
  const targetUrl = process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;

  if (pool && !(pool as any).ended && !(pool as any).ending) {
    if (!targetUrl || targetUrl === currentConnectionString) {
      return pool;
    }
  }

  if (pool && ((pool as any).ended || (pool as any).ending) && !targetUrl) {
    return pool;
  }

  const connectionString = requireEnv(targetUrl, 'DATABASE_URL');

  pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    statement_timeout: 5000,
    query_timeout: 6000,
    application_name: 'connectsphere-api',
  });
  currentConnectionString = connectionString;

  return pool;
}

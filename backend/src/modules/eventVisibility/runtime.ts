import { sessionToken, tokenDigest } from '../accessControl/sessions.js';
import { Pool } from 'pg';
import { requireEnv } from '../../config.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { sendJson } from '../../http.js';
import { AccessError, type Query } from './service.js';

let pool: Pool | undefined;
export function databasePool() {
  pool ??= new Pool({ connectionString: requireEnv(process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL, 'DATABASE_URL'), max: 3 });
  return pool;
}
export const query: Query = (sql: string, values?: unknown[]) => databasePool().query(sql, values);

export async function currentUser(request: VercelRequest): Promise<AuthenticatedUser> {
  const token = sessionToken(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AccessError(401, 'Sign in to continue.');
  const result = await query(`SELECT u.id, u.email, u.role, u.client_org_id AS "clientOrgId", u.is_active AS "isActive",
    u.failed_login_count AS "failedLoginCount", u.locked_until AS "lockedUntil"
    FROM auth_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > now()`, [tokenDigest(token)]);
  if (!result.rows[0]) throw new AccessError(401, 'Your session has expired. Please sign in again.');
  return result.rows[0] as AuthenticatedUser;
}

export async function respond(response: VercelResponse, work: () => Promise<Record<string, unknown>>) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Vary', 'Cookie');
  try { sendJson(response, 200, await work()); }
  catch (error) {
    const accessError = error instanceof AccessError ? error : undefined;
    sendJson(response, accessError?.status ?? 503,
      { error: accessError?.message ?? 'Service unavailable. Please try again.' });
  }
}

// Like respond(), but for handlers whose work already carries its own
// success status (e.g. 201 on create, 409 on a business-rule conflict)
// instead of always answering 200.
export async function respondWithResult(
  response: VercelResponse,
  work: () => Promise<{ status: number; body: Record<string, unknown> }>,
) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Vary', 'Cookie');
  try {
    const result = await work();
    sendJson(response, result.status, result.body);
  } catch (error) {
    const accessError = error instanceof AccessError ? error : undefined;
    sendJson(response, accessError?.status ?? 503,
      { error: accessError?.message ?? 'Service unavailable. Please try again.' });
  }
}

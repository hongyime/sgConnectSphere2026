// SCRUM-93: email verification token flow.
//
// Issues and consumes single-use tokens for the "prove you own this email"
// step of account onboarding. The raw token string is generated once,
// handed to the caller so it can be sent via email, and never persisted.
// Only the SHA-256 hash of the token is stored, matching the same pattern
// used for auth_sessions in sessions.ts.
//
// The service exposes two entry points:
// - issueVerificationToken(pool, userId, purpose, ttlMinutes?) issues a new
//   token and returns the raw string. Callers hand this to the notification
//   layer so it can appear in an email; the raw string is never persisted.
// - consumeVerificationToken(pool, token, purpose) redeems a token: checks
//   existence, not expired, not consumed, marks it consumed, and returns
//   the user id it was issued to. On failure it returns a structured
//   VerificationError that names the specific reason.
//
// The error codes align with the HTTP status codes documented on the
// POST /api/auth/verify endpoint:
//   'unknown'         -> 400 Bad Request (unrecognised token)
//   'expired'         -> 410 Gone      (past expires_at)
//   'consumed'        -> 409 Conflict  (already redeemed)
//   'wrong_purpose'   -> 403 Forbidden (token issued for a different flow)

import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';

export type VerificationPurpose = 'email_verification' | 'password_reset';
export const DEFAULT_TTL_MINUTES = 60 * 24; // 24 hours

export type VerificationErrorCode = 'unknown' | 'expired' | 'consumed' | 'wrong_purpose';

export class VerificationError extends Error {
  constructor(public readonly code: VerificationErrorCode) {
    super(`verification token rejected: ${code}`);
  }
}

const tokenHash = (raw: string) => createHash('sha256').update(raw).digest('hex');

export async function issueVerificationToken(
  pool: Pool,
  userId: string,
  purpose: VerificationPurpose,
  ttlMinutes: number = DEFAULT_TTL_MINUTES,
): Promise<string> {
  if (ttlMinutes <= 0) throw new Error('ttlMinutes must be positive');
  const raw = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO verification_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, tokenHash(raw), purpose, String(ttlMinutes)],
  );
  return raw;
}

export async function consumeVerificationToken(
  pool: Pool,
  token: string,
  purpose: VerificationPurpose,
): Promise<{ userId: string }> {
  // Basic shape check keeps the DB call cheap for obviously-invalid input.
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    throw new VerificationError('unknown');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SELECT ... FOR UPDATE prevents two concurrent consume requests from
    // both succeeding: the second one sees consumed_at IS NOT NULL and is
    // rejected as consumed.
    const { rows } = await client.query(
      `SELECT id, user_id, purpose, expires_at, consumed_at
       FROM verification_tokens
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash(token)],
    );
    const row = rows[0];
    if (!row) throw new VerificationError('unknown');
    if (row.purpose !== purpose) throw new VerificationError('wrong_purpose');
    if (row.consumed_at !== null) throw new VerificationError('consumed');
    if (row.expires_at <= new Date()) throw new VerificationError('expired');
    await client.query(
      `UPDATE verification_tokens SET consumed_at = now() WHERE id = $1`,
      [row.id],
    );
    if (purpose === 'email_verification') {
      // Recording email_verified_at at consumption time is idempotent — a
      // second verification token for the same user still just sets the
      // same column. The service does not currently re-issue tokens for
      // already-verified users, but this UPDATE is safe if it happens.
      await client.query(
        `UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1`,
        [row.user_id],
      );
    }
    await client.query('COMMIT');
    return { userId: row.user_id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

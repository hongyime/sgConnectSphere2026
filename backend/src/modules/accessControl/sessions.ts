import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import type { VercelRequest } from '../../vercel.js';
import { AccessError } from '../eventVisibility/service.js';
import { verifyPassword } from './passwords.js';

// SCRUM-94 / BDR O-02: five consecutive failed attempts trigger a lockout.
// The lockout window auto-expires after LOCKOUT_MINUTES; after that a fresh
// attempt is allowed and the counter resets. A successful sign-in resets both
// the counter and locked_until.
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MINUTES = 30;

export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex');
export function sessionToken(request: VercelRequest) {
  const cookie = request.headers.cookie;
  return typeof cookie === 'string' ? cookie.split(';').map(v => v.trim()).find(v => v.startsWith('cs_access='))?.slice(10) : undefined;
}

export async function login(pool: Pool, email: string, password: string) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    // Serialize failures and successful logins for the same account.
    const result = await db.query(`SELECT * FROM users WHERE lower(email) = lower($1) FOR UPDATE`, [email.trim()]);
    const user = result.rows[0];

    // Auto-unlock: an expired lockout window is treated as unlocked, and the
    // counter resets before this attempt. Without this a user who waited out
    // the configured lockout would still be blocked because failed_login_count
    // is still >= LOCKOUT_THRESHOLD from the previous run.
    if (user && user.locked_until && user.locked_until <= new Date()) {
      await db.query('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1', [user.id]);
      user.failed_login_count = 0;
      user.locked_until = null;
    }

    const matches = await verifyPassword(password, user?.password_hash || '');
    const isCurrentlyLocked = Boolean(user && (
      user.failed_login_count >= LOCKOUT_THRESHOLD
      || (user.locked_until && user.locked_until > new Date())
    ));

    if (!user || !matches || !user.is_active || isCurrentlyLocked) {
      // Bad-credentials path: only bump the counter when the account exists,
      // is not already locked, and the password did not match. Locked or
      // inactive accounts do not accumulate further failures — that would let
      // an attacker keep the lockout window open indefinitely against a
      // dormant target.
      if (user && !matches && !isCurrentlyLocked && user.is_active) {
        const nextCount = user.failed_login_count + 1;
        if (nextCount >= LOCKOUT_THRESHOLD) {
          await db.query(
            `UPDATE users SET failed_login_count = $1, locked_until = clock_timestamp() + ($2 || ' minutes')::interval WHERE id = $3`,
            [nextCount, String(LOCKOUT_MINUTES), user.id],
          );
          // E14-S02: the lockout is a significant action and must appear in
          // the audit log alongside the failed access. Inserting inside the
          // same transaction guarantees the audit entry is present iff the
          // users update committed.
          await db.query(
            `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
             VALUES ($1, 'user', $1, 'Account Locked', $2)`,
            [user.id, `locked for ${LOCKOUT_MINUTES} minutes after ${nextCount} failed attempts`],
          );
        } else {
          await db.query('UPDATE users SET failed_login_count = $1 WHERE id = $2', [nextCount, user.id]);
        }
      }
      await db.query('COMMIT');
      throw new AccessError(401, 'Invalid email or password. After five incorrect attempts, sign-in is locked for 30 minutes. Reset your password to regain access sooner.');
    }

    // Successful sign-in clears any accumulated counter and any expired
    // lockout state that survived the auto-unlock above.
    await db.query('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1', [user.id]);
    const token = randomBytes(32).toString('hex');
    await db.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [tokenDigest(token), user.id]);
    await db.query('COMMIT');
    return token;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}

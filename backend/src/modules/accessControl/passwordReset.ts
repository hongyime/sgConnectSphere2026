import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { AccessError } from '../eventVisibility/service.js';
import { insertNotificationDelivery } from '../notificationDispatcher/postgres.js';
import { hashPassword, passwordPolicyErrors } from './password.js';
import { tokenDigest } from './sessions.js';

export const RESET_REQUEST_MESSAGE = 'If an active account matches that email, a password reset link will be sent. Check your inbox.';
export const RESET_TOKEN_ERROR = 'This reset link is invalid, expired, or already used. Request a new link.';

export async function requestPasswordReset(pool: Pool, email: string): Promise<void> {
  await inTransaction(pool, async db => {
    const { rows } = await db.query(`SELECT id FROM users
      WHERE lower(email) = $1 AND is_active FOR UPDATE`, [email.trim().toLowerCase()]);
    if (!rows[0]) return;
    // Retain only a non-sensitive notice. The worker creates the capability at
    // send time, so queue delays cannot consume the token's 15-minute lifetime.
    const notice = await db.query(`INSERT INTO notifications (user_id, title, message)
      VALUES ($1, 'Reset your ConnectSphere password', 'A password reset was requested. The reset link is sent by email only.') RETURNING id`, [rows[0].id]);
    const deliveryId = await insertNotificationDelivery(db, notice.rows[0].id);
    await db.query(`UPDATE notification_deliveries SET delivery_purpose = 'password_reset' WHERE id = $1`, [deliveryId]);
  });
}

export async function resetPassword(pool: Pool, token: string, password: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new AccessError(400, RESET_TOKEN_ERROR);
  const errors = passwordPolicyErrors(password);
  if (password.length > 1024) errors.push('Password must be at most 1024 characters.');
  if (errors.length) throw new AccessError(400, errors.join(' '));
  const digest = tokenDigest(token);
  const candidate = await pool.query('SELECT user_id FROM password_reset_tokens WHERE token_hash = $1', [digest]);
  if (!candidate.rows[0]) throw new AccessError(400, RESET_TOKEN_ERROR);
  const passwordHash = await hashPassword(password);
  await inTransaction(pool, async db => {
    // Same lock order as login and token issuance: user before token. This also
    // serializes two different reset tokens belonging to the same account.
    const user = await db.query('SELECT id, is_active FROM users WHERE id = $1 FOR UPDATE', [candidate.rows[0].user_id]);
    if (!user.rows[0]?.is_active) throw new AccessError(400, RESET_TOKEN_ERROR);
    const used = await db.query(`UPDATE password_reset_tokens SET used_at = clock_timestamp()
      WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > clock_timestamp()
      RETURNING id`, [digest, user.rows[0].id]);
    if (!used.rows[0]) throw new AccessError(400, RESET_TOKEN_ERROR);
    await db.query(`UPDATE users SET password_hash = $2, failed_login_count = 0, locked_until = NULL WHERE id = $1`, [user.rows[0].id, passwordHash]);
    // Other outstanding capabilities and old sessions cannot undo recovery.
    await db.query('UPDATE password_reset_tokens SET used_at = clock_timestamp() WHERE user_id = $1 AND used_at IS NULL', [user.rows[0].id]);
    await db.query('DELETE FROM auth_sessions WHERE user_id = $1', [user.rows[0].id]);
  });
}

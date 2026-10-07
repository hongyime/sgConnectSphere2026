import { createHash, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { SendLease } from '../notificationDispatcher/durable.js';

export async function preparePasswordResetEmail(db: PoolClient, lease: SendLease, appUrl: string) {
  const base = new URL(appUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Invalid APP_URL');
  const { rows } = await db.query(`SELECT u.id, u.is_active, u.email FROM users u
    JOIN notifications n ON n.user_id = u.id WHERE n.id = $1 FOR UPDATE OF u`, [lease.notificationId]);
  const user = rows[0];
  if (!user?.is_active || user.email !== lease.to) return false;
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  await db.query(`INSERT INTO password_reset_tokens (user_id, token_hash, created_at, expires_at)
    SELECT $1, $2, issued_at, issued_at + interval '15 minutes' FROM (SELECT clock_timestamp() AS issued_at) issuance`, [user.id, hash]);
  // Fragment stays out of HTTP URLs, referrers and server access logs.
  const link = new URL('/reset-password', base);
  link.hash = `token=${raw}`;
  const escaped = link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  lease.html = `<p>A password reset was requested for your ConnectSphere account.</p><p><a href="${escaped}">Reset your password</a></p><p>This link expires in 15 minutes and can be used once. If you did not request it, ignore this email.</p>`;
  return true;
}

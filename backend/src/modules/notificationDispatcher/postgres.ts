import type { Pool, PoolClient } from 'pg';
import { runtimeConfig, requireEnv } from '../../config.js';
import { preparePasswordResetEmail } from '../accessControl/passwordResetDelivery.js';
import { inTransaction } from '../../database/pool.js';
import { batchLimit, isDeliveryId } from './durable.js';
import type { DurableDeliveryStore, SendClaim, SendLease } from './durable.js';

import { buildNotificationEmailHtml } from './emailTemplate.js';

// Call with the SAME PoolClient that writes the business change. A rollback
// then removes both the business change and its notification delivery.
export async function insertNotificationDelivery(client: PoolClient, notificationId: string) {
  if (!isDeliveryId(notificationId)) throw new Error('invalid_notification_id');
  const { rows } = await client.query<{ id: string }>(`
    INSERT INTO notification_deliveries (notification_id, channel)
    VALUES ($1, 'email') RETURNING id`, [notificationId]);
  await prepareCommittedDelivery(client, rows[0]!.id);
  return rows[0]!.id;
}

// Payload and recipient come from the authoritative notification/user rows,
// never from arbitrary caller-supplied HTML or email addresses.
export async function prepareCommittedDelivery(client: PoolClient, id: string) {
  if (!isDeliveryId(id)) throw new Error('invalid_delivery_id');
  const { rows } = await client.query<{
    delivery_status: string; dispatch_state: string; recipient_email: string | null;
    email: string; title: string; message: string;
  }>(`SELECT d.delivery_status, d.dispatch_state, d.recipient_email, u.email, n.title, n.message
    FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id
    JOIN users u ON u.id = n.user_id WHERE d.id = $1 AND d.channel = 'email'
    FOR UPDATE OF d`, [id]);
  const row = rows[0];
  if (!row) throw new Error('delivery_not_found');
  if (row.recipient_email === null && row.delivery_status === 'queued') {
    const html = buildNotificationEmailHtml(row.title, row.message);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || /[\r\n]/.test(row.title)) {
      throw new Error('invalid_retained_notification');
    }
    await client.query(`UPDATE notification_deliveries
      SET recipient_email = $2, subject = $3, html = $4 WHERE id = $1`,
    [id, row.email, row.title, html]);
  }
  return { id, status: row.delivery_status };
}

export function postgresDeliveryStore(database: Pool, appUrl = runtimeConfig.appUrl): DurableDeliveryStore {
  return {
    async claimPublish(limit) {
      const { rows } = await database.query<{ id: string; token: string }>(`
        WITH candidates AS (
          SELECT id FROM notification_deliveries
          WHERE delivery_status = 'queued' AND recipient_email IS NOT NULL
            AND dispatch_state IN ('pending', 'publishing', 'published') AND next_attempt_at <= now()
            AND next_publish_at <= now()
            AND (publish_lease_until IS NULL OR publish_lease_until <= now())
          ORDER BY next_publish_at, created_at, id FOR UPDATE SKIP LOCKED LIMIT $1
        ) UPDATE notification_deliveries d SET dispatch_state = 'publishing',
          publish_token = gen_random_uuid(), publish_lease_until = now() + interval '45 seconds'
        FROM candidates c WHERE d.id = c.id RETURNING d.id, d.publish_token AS token`, [batchLimit(limit)]);
      return rows;
    },
    async markPublished({ id, token }) {
      await database.query(`UPDATE notification_deliveries SET dispatch_state = 'published',
        publish_token = NULL, publish_lease_until = NULL, next_publish_at = now() + interval '5 minutes'
        WHERE id = $1 AND publish_token = $2 AND dispatch_state = 'publishing'`, [id, token]);
    },
    async releasePublish({ id, token }) {
      await database.query(`UPDATE notification_deliveries SET dispatch_state = 'pending',
        publish_token = NULL, publish_lease_until = NULL, next_publish_at = now() + interval '1 minute'
        WHERE id = $1 AND publish_token = $2 AND dispatch_state = 'publishing'`, [id, token]);
    },
    async claimSend(id): Promise<SendClaim> {
      if (!isDeliveryId(id)) return { kind: 'missing' };
      return inTransaction(database, async (client) => {
        const { rows } = await client.query<{ delivery_status: string; dispatch_state: string; delivery_purpose?: string }>(`
          SELECT delivery_status, dispatch_state, delivery_purpose FROM notification_deliveries WHERE id = $1 FOR UPDATE`, [id]);
        const current = rows[0];
        if (!current) return { kind: 'missing' };
        if (current.delivery_status === 'sent') return { kind: 'retained', state: 'sent' };
        if (current.dispatch_state === 'uncertain') return { kind: 'retained', state: 'uncertain' };
        if (current.delivery_status === 'failed') return { kind: 'retained', state: 'failed' };
        const result = await client.query<SendLease>(`UPDATE notification_deliveries
          SET dispatch_state = 'sending', send_token = gen_random_uuid(),
            send_lease_until = now() + interval '45 seconds', attempts = attempts + 1
          WHERE id = $1 AND recipient_email IS NOT NULL AND next_attempt_at <= now()
            AND dispatch_state IN ('pending', 'publishing', 'published')
          RETURNING id, notification_id AS "notificationId", recipient_email AS "to", subject, html,
            send_token AS token, attempts`, [id]);
        const lease = result.rows[0];
        if (!lease) return { kind: 'busy' };
        if (current.delivery_purpose === 'password_reset') {
          if (!await preparePasswordResetEmail(client, lease, requireEnv(appUrl, 'APP_URL'))) {
            await client.query(`UPDATE notification_deliveries SET delivery_status = 'failed', dispatch_state = 'failed',
              failure_reason = 'reset_recipient_unavailable', send_token = NULL, send_lease_until = NULL WHERE id = $1`, [id]);
            return { kind: 'retained', state: 'failed' };
          }
        }
        return { kind: 'claimed', lease };
      });
    },
    async finishSend(lease, outcome) {
      const retry = outcome.kind === 'retry' && lease.attempts < 5;
      const state = outcome.kind === 'sent' ? 'done' : retry ? 'published' : outcome.kind === 'uncertain' ? 'uncertain' : 'failed';
      const status = outcome.kind === 'sent' ? 'sent' : retry ? 'queued' : 'failed';
      const result = await database.query(`UPDATE notification_deliveries SET
        dispatch_state = $3, delivery_status = $4::delivery_status,
        sent_at = CASE WHEN $4 = 'sent' THEN now() ELSE sent_at END,
        failure_reason = $5, provider_message_id = $6,
        next_attempt_at = CASE WHEN $3 = 'published' THEN now() + interval '15 minutes' ELSE next_attempt_at END,
        send_token = NULL, send_lease_until = NULL
        WHERE id = $1 AND send_token = $2 AND dispatch_state = 'sending'`,
      [lease.id, lease.token, state, status, outcome.kind === 'sent' ? null : outcome.code,
        outcome.kind === 'sent' ? outcome.messageId ?? null : null]);
      return result.rowCount === 1;
    },
    async retainExpiredAttempts(limit) {
      // A crashed/expired sender may already have been accepted by the provider.
      // Preserve an explicit uncertain outcome; automatic resend is unsafe.
      const result = await database.query(`WITH expired AS (
        SELECT id FROM notification_deliveries WHERE dispatch_state = 'sending'
          AND send_lease_until <= now() ORDER BY send_lease_until, id
          FOR UPDATE SKIP LOCKED LIMIT $1
      ) UPDATE notification_deliveries d SET dispatch_state = 'uncertain', delivery_status = 'failed',
        failure_reason = 'sender_expired_outcome_unknown', send_token = NULL, send_lease_until = NULL
      FROM expired e WHERE d.id = e.id`, [batchLimit(limit)]);
      return result.rowCount ?? 0;
    },
  };
}

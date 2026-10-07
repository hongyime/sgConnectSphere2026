// SCRUM-93 follow-up: queue a verification email at account creation.
//
// This module is the bridge between the token-issuing service in
// verificationTokens.ts and the durable notification outbox described in
// ADR-006. On a fresh registration, sendVerificationEmail:
//
//   1. Issues a verification token via issueVerificationToken.
//   2. Inserts a row into `notifications` with the verification link.
//   3. Calls insertNotificationDelivery to enqueue the email delivery.
//
// Steps 2 and 3 run in one transaction so a rollback here does not leave a
// notification without a delivery or vice versa. Step 1 runs outside the
// transaction because the token row already commits on its own; if the
// notification insert fails, the token is simply orphaned (it will expire
// and be ignored). Follow-up (SCRUM-106 candidate): "resend verification
// email" flow that reuses this function.

import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { insertNotificationDelivery } from '../notificationDispatcher/postgres.js';
import { issueVerificationToken } from './verificationTokens.js';

export const VERIFICATION_TITLE = 'Verify your ConnectSphere email';

export function buildVerificationMessage(appUrl: string, token: string): string {
  // Plain-text body; the notification dispatcher wraps it as HTML on send.
  // Include the raw token as a URL query so the /verify page can consume it
  // from the address bar without a form submission.
  return `Welcome to ConnectSphere.

Confirm your email address by opening the link below within 24 hours:
${appUrl.replace(/\/+$/, '')}/verify?token=${token}

If you did not create this account you can ignore this email.`;
}

export type SendVerificationEmailInput = {
  pool: Pool;
  userId: string;
  appUrl: string;
  ttlMinutes?: number;
};

export type SendVerificationEmailResult = {
  notificationId: string;
  deliveryId: string;
  token: string;
};

export async function sendVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<SendVerificationEmailResult> {
  const { pool, userId, appUrl, ttlMinutes } = input;
  if (!userId) throw new Error('userId is required');
  if (!appUrl) throw new Error('appUrl is required');
  const token = await issueVerificationToken(pool, userId, 'email_verification', ttlMinutes);
  const message = buildVerificationMessage(appUrl, token);
  return inTransaction(pool, async client => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO notifications (user_id, event_id, title, message)
       VALUES ($1, NULL, $2, $3) RETURNING id`,
      [userId, VERIFICATION_TITLE, message],
    );
    const notificationId = rows[0]!.id;
    const deliveryId = await insertNotificationDelivery(client, notificationId);
    return { notificationId, deliveryId, token };
  });
}

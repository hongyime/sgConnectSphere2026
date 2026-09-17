// SCRUM-93 outbox wiring. Verifies that sendVerificationEmail:
// 1. Issues a token via the verification service
// 2. Inserts one row into notifications with the verification link body
// 3. Inserts one delivery via insertNotificationDelivery (i.e. the outbox)
//
// The test uses a hand-rolled Pool + PoolClient double that records every
// SQL statement so we can assert the sequence without a live Postgres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient, QueryResult } from 'pg';
import {
  buildVerificationMessage,
  sendVerificationEmail,
  VERIFICATION_TITLE,
} from '../src/modules/accessControl/verificationEmail.js';

function fakePool() {
  const queries: string[] = [];
  const client: PoolClient = {
    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
      const trimmed = sql.trim().replace(/\s+/g, ' ');
      queries.push(trimmed);
      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [], rowCount: 0 } as unknown as QueryResult;
      }
      if (trimmed.startsWith('INSERT INTO verification_tokens')) {
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      }
      if (trimmed.startsWith('INSERT INTO notifications')) {
        return { rows: [{ id: '00000000-0000-4000-8000-000000000001' }], rowCount: 1 } as unknown as QueryResult;
      }
      if (trimmed.startsWith('INSERT INTO notification_deliveries')) {
        return { rows: [{ id: '00000000-0000-4000-8000-000000000002' }], rowCount: 1 } as unknown as QueryResult;
      }
      if (trimmed.startsWith('SELECT d.delivery_status')) {
        return { rows: [{
          delivery_status: 'queued',
          dispatch_state: 'pending',
          recipient_email: null,
          email: 'user@example.test',
          title: VERIFICATION_TITLE,
          message: buildVerificationMessage('https://app.example.test', 'a'.repeat(64)),
        }], rowCount: 1 } as unknown as QueryResult;
      }
      if (trimmed.startsWith('UPDATE notification_deliveries')) {
        return { rows: [], rowCount: 1 } as unknown as QueryResult;
      }
      void params;
      throw new Error(`Unexpected SQL: ${trimmed}`);
    },
    release() { /* no-op */ },
  } as unknown as PoolClient;
  const pool = {
    connect: async () => client,
    query: async (sql: string, params?: unknown[]) => client.query(sql, params ?? []),
  } as unknown as Pool;
  return { pool, queries };
}

test('sendVerificationEmail issues one token, one notification, one delivery', async () => {
  const { pool, queries } = fakePool();
  const result = await sendVerificationEmail({
    pool,
    userId: '00000000-0000-4000-8000-000000000000',
    appUrl: 'https://app.example.test',
  });
  assert.ok(result.notificationId, 'notificationId must be returned');
  assert.ok(result.deliveryId, 'deliveryId must be returned');
  assert.match(result.token, /^[a-f0-9]{64}$/);

  const tokenInserts = queries.filter(sql => sql.startsWith('INSERT INTO verification_tokens'));
  const notificationInserts = queries.filter(sql => sql.startsWith('INSERT INTO notifications'));
  const deliveryInserts = queries.filter(sql => sql.startsWith('INSERT INTO notification_deliveries'));
  assert.equal(tokenInserts.length, 1, 'exactly one verification token issued');
  assert.equal(notificationInserts.length, 1, 'exactly one notification row');
  assert.equal(deliveryInserts.length, 1, 'exactly one delivery row');
});

test('buildVerificationMessage embeds the token in a /verify link and trims trailing slashes on appUrl', () => {
  const message = buildVerificationMessage('https://app.example.test/', 'b'.repeat(64));
  assert.match(message, /https:\/\/app\.example\.test\/verify\?token=b{64}/);
  assert.doesNotMatch(message, /example\.test\/\/verify/);
});

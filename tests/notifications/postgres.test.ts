import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { Pool } from 'pg';
import { inTransaction } from '../../backend/src/database/pool.js';
import { insertNotificationDelivery, postgresDeliveryStore, prepareCommittedDelivery } from '../../backend/src/modules/notificationDispatcher/postgres.js';
import { dispatchCommittedDeliveries, publishCommittedDeliveries } from '../../backend/src/modules/notificationDispatcher/dispatch.js';
import type { DeliveryTransport } from '../../backend/src/modules/notificationDispatcher/durable.js';

const address = new URL(process.env.TEST_DATABASE_URL ?? 'http://missing.invalid');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname), 'Tests require an explicit loopback TEST_DATABASE_URL');
assert.ok(/^\/connectsphere_notification_test(?:_[a-z0-9_]+)?$/.test(address.pathname), 'Tests require their dedicated synthetic database');
const admin = new Pool({ connectionString: address.href, max: 2 });
const pools: Pool[] = [];
after(async () => { await Promise.all(pools.map((pool) => pool.end())); await admin.end(); });
await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public; CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public');
await admin.query(`DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'connectsphere_app') THEN CREATE ROLE connectsphere_app NOLOGIN; END IF;
END $$`);
const original = await readFile(new URL('../../backend/database/migrations/0001_connectsphere_schema.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../backend/database/migrations/0002_durable_notification_dispatch.sql', import.meta.url), 'utf8');

async function fixture(beforeMigration?: (pool: Pool) => Promise<void>) {
  const schema = `notification_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: address.href, max: 6, options: `-c search_path=${schema},public` });
  pools.push(pool);
  await pool.query(original);
  if (beforeMigration) await beforeMigration(pool);
  await pool.query(migration);
  await pool.query(await readFile(new URL('../../backend/database/migrations/0007_password_reset_delivery.sql', import.meta.url), 'utf8'));
  const store = postgresDeliveryStore(pool);
  return { pool, store, schema };
}

async function notification(client: Pick<Pool, 'query'>, text = '<Synthetic> & retained') {
  const email = `${randomUUID()}@example.invalid`;
  const user = await client.query<{ id: string }>(`INSERT INTO users (email, password_hash, full_name, role)
    VALUES ($1, 'synthetic-not-a-password-hash', 'Synthetic fixture', 'attendee') RETURNING id`, [email]);
  const result = await client.query<{ id: string }>(`INSERT INTO notifications (user_id, title, message)
    VALUES ($1, 'Synthetic notification', $2) RETURNING id`, [user.rows[0]!.id, text]);
  return result.rows[0]!.id;
}

async function seed(pool: Pool) {
  return inTransaction(pool, async (client) => {
    const id = await notification(client);
    return insertNotificationDelivery(client, id);
  });
}

function queue(initial: string[] = []) {
  const pointers = [...initial];
  const transport: DeliveryTransport = {
    async publish(id) { pointers.unshift(id); },
    async peek(limit) { return pointers.slice(-limit); },
    async acknowledge(id) { for (let i = pointers.length - 1; i >= 0; i--) if (pointers[i] === id) pointers.splice(i, 1); },
    async defer(id) { const index = pointers.indexOf(id); if (index >= 0) pointers.unshift(...pointers.splice(index, 1)); },
  };
  return { pointers, transport };
}

test('additive migration preserves old deliveries and prepares escaped authoritative payloads', async () => {
  let id = '';
  const f = await fixture(async (pool) => {
    const notificationId = await notification(pool);
    const result = await pool.query<{ id: string }>(`INSERT INTO notification_deliveries (notification_id, channel)
      VALUES ($1, 'email') RETURNING id`, [notificationId]);
    id = result.rows[0]!.id;
  });
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM notification_deliveries')).rows[0].n, 1);
  assert.deepEqual(await f.store.claimPublish(5), []);
  await inTransaction(f.pool, (client) => prepareCommittedDelivery(client, id));
  const row = (await f.pool.query('SELECT * FROM notification_deliveries WHERE id=$1', [id])).rows[0];
  assert.equal(row.id, id);
  assert.equal(row.html, '<p>&lt;Synthetic&gt; &amp; retained</p>');
  assert.match(row.recipient_email, /@example\.invalid$/);
  assert.equal(row.delivery_status, 'queued');
  assert.equal((await f.store.claimPublish(5)).length, 1);
});

test('business rollback retains no outbox row and uncommitted rows cannot be relayed', async () => {
  const f = await fixture();
  await assert.rejects(inTransaction(f.pool, async (client) => {
    await insertNotificationDelivery(client, await notification(client));
    assert.deepEqual(await f.store.claimPublish(5), []);
    throw new Error('Synthetic business rollback');
  }), /business rollback/);
  for (const table of ['users', 'notifications', 'notification_deliveries']) {
    assert.equal((await f.pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
  }
  await seed(f.pool);
  assert.equal((await f.store.claimPublish(5)).length, 1);
});

test('overlapping publishers claim different rows and old tokens cannot overwrite new leases', async () => {
  const f = await fixture(); await seed(f.pool); await seed(f.pool);
  const claimed = (await Promise.all([f.store.claimPublish(1), f.store.claimPublish(1)])).flat();
  assert.equal(new Set(claimed.map((row) => row.id)).size, 2);
  const old = claimed[0]!;
  await f.pool.query(`UPDATE notification_deliveries SET publish_lease_until=now()-interval '1 second' WHERE id=$1`, [old.id]);
  const fresh = (await f.store.claimPublish(1))[0]!;
  assert.equal(fresh.id, old.id); assert.notEqual(fresh.token, old.token);
  await f.store.markPublished(old);
  assert.equal((await f.pool.query('SELECT publish_token FROM notification_deliveries WHERE id=$1', [old.id])).rows[0].publish_token, fresh.token);
});

test('concurrent workers and duplicate pointers send once after a durable database claim', async () => {
  const f = await fixture(); const id = await seed(f.pool); const q = queue([id, id]);
  let sends = 0;
  const send = async () => { sends++; await new Promise((resolve) => setTimeout(resolve, 40)); return { kind: 'sent' as const, messageId: 'synthetic-message' }; };
  await Promise.all([dispatchCommittedDeliveries(f.store, q.transport, send), dispatchCommittedDeliveries(f.store, q.transport, send)]);
  assert.equal(sends, 1); assert.deepEqual(q.pointers, []);
  const row = (await f.pool.query('SELECT * FROM notification_deliveries WHERE id=$1', [id])).rows[0];
  assert.equal(row.delivery_status, 'sent'); assert.equal(row.provider_message_id, 'synthetic-message');
  assert.ok(row.html && row.notification_id && row.sent_at); assert.equal(row.attempts, 1);
});

test('ambiguous publication retains SQL source and duplicate pointers do not resend', async () => {
  const f = await fixture(); const id = await seed(f.pool); const q = queue();
  const ambiguous = { ...q.transport, async publish(value: string) { await q.transport.publish(value); throw new Error('Synthetic lost response'); } };
  assert.equal((await publishCommittedDeliveries(f.store, ambiguous)).retained, 1);
  await f.pool.query('UPDATE notification_deliveries SET next_publish_at=now() WHERE id=$1', [id]);
  await publishCommittedDeliveries(f.store, q.transport);
  assert.equal(q.pointers.length, 2);
  let sends = 0;
  await dispatchCommittedDeliveries(f.store, q.transport, async () => { sends++; return { kind: 'sent' }; });
  assert.equal(sends, 1); assert.equal(q.pointers.length, 0);
});

test('a lost Redis pointer can be rebuilt from the committed SQL delivery', async () => {
  const f = await fixture(); const id = await seed(f.pool);
  const lost = queue();
  await publishCommittedDeliveries(f.store, lost.transport);
  assert.deepEqual(await f.store.claimPublish(5), []);
  const replacement = queue();
  await f.pool.query(`UPDATE notification_deliveries SET next_publish_at=now()-interval '1 second' WHERE id=$1`, [id]);
  await publishCommittedDeliveries(f.store, replacement.transport);
  assert.deepEqual(replacement.pointers, [id]);
  let sends = 0;
  await dispatchCommittedDeliveries(f.store, replacement.transport, async () => { sends++; return { kind: 'sent' }; });
  assert.equal(sends, 1);
});

test('rebuilding a due retry pointer does not postpone the email retry deadline', async () => {
  const f = await fixture(); const id = await seed(f.pool); const q = queue();
  await publishCommittedDeliveries(f.store, q.transport);
  await dispatchCommittedDeliveries(f.store, q.transport, async () => ({ kind: 'retry', code: 'provider_throttled' }));
  assert.deepEqual(await f.store.claimPublish(5), []);
  await f.pool.query(`UPDATE notification_deliveries SET next_publish_at=now(), next_attempt_at=now() WHERE id=$1`, [id]);
  await publishCommittedDeliveries(f.store, q.transport);
  let sends = 0;
  await dispatchCommittedDeliveries(f.store, q.transport, async () => { sends++; return { kind: 'sent' }; });
  assert.equal(sends, 1);
  assert.equal((await f.pool.query('SELECT attempts FROM notification_deliveries WHERE id=$1', [id])).rows[0].attempts, 2);
});

test('throttling uses bounded retry, preserves content, and frees the queue tail for other jobs', async () => {
  const f = await fixture(); const slow = await seed(f.pool); const next = await seed(f.pool); const q = queue([next, slow]);
  await dispatchCommittedDeliveries(f.store, q.transport, async () => ({ kind: 'retry', code: 'provider_throttled' }), 1);
  assert.equal(q.pointers.at(-1), next);
  const row = (await f.pool.query('SELECT * FROM notification_deliveries WHERE id=$1', [slow])).rows[0];
  assert.equal(row.delivery_status, 'queued'); assert.equal(row.attempts, 1); assert.ok(row.next_attempt_at > new Date());
  assert.ok(row.html);
  await f.pool.query('UPDATE notification_deliveries SET attempts=4,next_attempt_at=now() WHERE id=$1', [slow]);
  const solo = queue([slow]);
  await dispatchCommittedDeliveries(f.store, solo.transport, async () => ({ kind: 'retry', code: 'provider_throttled' }));
  assert.equal((await f.pool.query('SELECT delivery_status FROM notification_deliveries WHERE id=$1', [slow])).rows[0].delivery_status, 'failed');
  assert.deepEqual(solo.pointers, []);
});

test('unknown provider outcome is retained and never automatically resent', async () => {
  const f = await fixture(); const id = await seed(f.pool); const q = queue([id]); let sends = 0;
  await dispatchCommittedDeliveries(f.store, q.transport, async () => { sends++; throw new Error('Synthetic timeout'); });
  q.pointers.push(id);
  await dispatchCommittedDeliveries(f.store, q.transport, async () => { sends++; return { kind: 'sent' }; });
  assert.equal(sends, 1);
  const row = (await f.pool.query('SELECT * FROM notification_deliveries WHERE id=$1', [id])).rows[0];
  assert.equal(row.dispatch_state, 'uncertain'); assert.equal(row.delivery_status, 'failed'); assert.ok(row.html);
});

test('database failure after provider acceptance retains the pointer and expired attempt', async () => {
  const f = await fixture(); const id = await seed(f.pool); const q = queue([id]); let sends = 0;
  const unavailable = { ...f.store, async finishSend() { throw new Error('Synthetic SQL disconnect'); } };
  await assert.rejects(dispatchCommittedDeliveries(unavailable, q.transport, async () => { sends++; return { kind: 'sent' }; }), /SQL disconnect/);
  assert.deepEqual(q.pointers, [id]);
  await f.pool.query(`UPDATE notification_deliveries SET send_lease_until=now()-interval '1 second' WHERE id=$1`, [id]);
  await dispatchCommittedDeliveries(f.store, q.transport, async () => { sends++; return { kind: 'sent' }; });
  assert.equal(sends, 1); assert.deepEqual(q.pointers, []);
  assert.equal((await f.pool.query('SELECT dispatch_state FROM notification_deliveries WHERE id=$1', [id])).rows[0].dispatch_state, 'uncertain');
});

test('an expired sender cannot replace a durable uncertain outcome with a stale token', async () => {
  const f = await fixture(); const id = await seed(f.pool); const claim = await f.store.claimSend(id);
  assert.equal(claim.kind, 'claimed'); if (claim.kind !== 'claimed') throw new Error('missing lease');
  await f.pool.query(`UPDATE notification_deliveries SET send_lease_until=now()-interval '1 second' WHERE id=$1`, [id]);
  assert.equal(await f.store.retainExpiredAttempts(5), 1);
  assert.equal(await f.store.finishSend(claim.lease, { kind: 'sent' }), false);
});

test('missing and malformed references remain in transport without an email attempt', async () => {
  const f = await fixture(); const q = queue(['malformed-retained-record', randomUUID()]);
  const result = await dispatchCommittedDeliveries(f.store, q.transport, async () => { throw new Error('must not send'); });
  assert.equal(result.invalid, 2); assert.equal(q.pointers.length, 2);
});

test('an oversized retained payload fails atomically without creating a delivery', async () => {
  const f = await fixture();
  await assert.rejects(inTransaction(f.pool, async (client) => {
    await insertNotificationDelivery(client, await notification(client, '<'.repeat(20000)));
  }), /payload_bound/);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM notification_deliveries')).rows[0].n, 0);
  assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n, 0);
});

test('browser roles cannot read private delivery payloads', async () => {
  const f = await fixture(); await seed(f.pool);
  await f.pool.query(`GRANT USAGE ON SCHEMA ${f.schema} TO anon, authenticated, connectsphere_app`);
  const client = await f.pool.connect();
  try {
    for (const role of ['anon', 'authenticated']) {
      await client.query(`SET ROLE ${role}`);
      await assert.rejects(client.query('SELECT html FROM notification_deliveries'), /permission denied/);
      await client.query('RESET ROLE');
    }
    await client.query('SET ROLE connectsphere_app');
    assert.equal((await client.query('SELECT id FROM notification_deliveries')).rowCount, 1);
  } finally { await client.query('RESET ROLE'); client.release(); }
});

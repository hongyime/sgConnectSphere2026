import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, beforeEach, test } from 'node:test';
import type { SendLease } from '../../backend/src/modules/notificationDispatcher/durable.js';

// Every request is intercepted. These public dummy values never authenticate
// against a live database or email provider.
Object.assign(process.env, {
  UPSTASH_REDIS_REST_URL: 'https://synthetic-queue.example.invalid',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-queue-credential',
  UPSTASH_REDIS_QUEUE_NOTIFICATIONS: 'synthetic:notifications',
  BREVO_API_KEY: 'synthetic-email-credential', // pragma: allowlist secret - all requests intercepted
  EMAIL_FROM: 'sender@example.invalid',
  EMAIL_REPLY_TO: '',
});
const originalFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];
let respond: (url: string, init: RequestInit) => Promise<Response>;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push({ url, init });
  return respond(url, init);
};
beforeEach(() => {
  calls = [];
  respond = async () => { throw new Error('Synthetic unexpected request'); };
});
after(() => { globalThis.fetch = originalFetch; });
const { createDeliveryTransport } = await import('../../backend/src/providers/durableRedis.js');
const { sendDurableBrevoEmail } = await import('../../backend/src/providers/brevo.js');
const job: SendLease = {
  id: randomUUID(), notificationId: randomUUID(), token: randomUUID(), attempts: 1,
  to: 'recipient@example.invalid', subject: 'Synthetic subject', html: '<p>Synthetic</p>',
};

test('real Redis SDK uses only the versioned ID queue and peeks without removing data', async () => {
  const results = [1, [job.id], 1, 1];
  respond = async (url) => {
    assert.equal(url, 'https://synthetic-queue.example.invalid');
    return Response.json({ result: results.shift() });
  };
  const queue = createDeliveryTransport();
  await queue.publish(job.id);
  assert.deepEqual(await queue.peek(5), [job.id]);
  await queue.defer(job.id);
  await queue.acknowledge(job.id);
  const commands = calls.map(({ init }) => JSON.parse(String(init.body)) as unknown[]);
  assert.deepEqual(commands.map((command) => command[0]), ['eval', 'lrange', 'eval', 'lrem']);
  assert.deepEqual(commands[1], ['lrange', 'synthetic:notifications:delivery-ids:v2', -5, -1]);
  for (const command of commands) {
    assert.ok(command.includes('synthetic:notifications:delivery-ids:v2'));
    assert.ok(!command.includes('synthetic:notifications'));
    assert.ok(!JSON.stringify(command).includes(job.html));
  }
  assert.equal(calls.length, 4);
});

test('Redis SDK does not retry an ambiguous transport error', async () => {
  respond = async () => { throw new Error('Synthetic response lost'); };
  await assert.rejects(createDeliveryTransport().publish(job.id));
  assert.equal(calls.length, 1);
  assert.ok(calls[0]!.init.signal instanceof AbortSignal);
});

test('a full transport rejects publication so the caller retains its SQL row', async () => {
  respond = async () => Response.json({ result: 0 });
  await assert.rejects(createDeliveryTransport().publish(job.id), /transport_capacity_reached/);
  assert.equal(calls.length, 1);
});

test('invalid IDs and oversized batch requests are rejected before a Redis request', async () => {
  const queue = createDeliveryTransport();
  await assert.rejects(queue.publish('raw email payload'), /invalid_delivery_id/);
  await assert.rejects(queue.acknowledge('raw email payload'), /invalid_delivery_id/);
  await assert.rejects(queue.peek(6), /batch/);
  assert.equal(calls.length, 0);
});

for (const [status, kind] of [[201, 'sent'], [429, 'retry'], [400, 'failed'], [401, 'failed'], [503, 'uncertain']] as const) {
  test(`email provider ${status} produces ${kind} after exactly one request`, async () => {
    respond = async () => Response.json({ messageId: 'synthetic-message' }, { status });
    const outcome = await sendDurableBrevoEmail(job);
    assert.equal(outcome.kind, kind);
    assert.equal(calls.length, 1);
    const request = calls[0]!;
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.init.redirect, 'error');
    assert.ok(request.init.signal instanceof AbortSignal);
    const body = JSON.parse(String(request.init.body));
    assert.equal(body.to[0].email, job.to);
    assert.equal(body.htmlContent, job.html);
    assert.equal(body.headers['X-ConnectSphere-Notification-ID'], job.notificationId);
    assert.ok(!JSON.stringify(outcome).includes('credential'));
  });
}

test('email network ambiguity is retained without an automatic resend', async () => {
  respond = async () => { throw new Error('Synthetic provider response lost'); };
  assert.deepEqual(await sendDurableBrevoEmail(job), { kind: 'uncertain', code: 'provider_outcome_unknown' });
  assert.equal(calls.length, 1);
});

test('accepted emails remain sent when optional provider metadata is malformed or oversized', async () => {
  for (const body of ['not-json', 'x'.repeat(5000)]) {
    respond = async () => new Response(body, { status: 201 });
    assert.deepEqual(await sendDurableBrevoEmail(job), { kind: 'sent' });
  }
  assert.equal(calls.length, 2);
});

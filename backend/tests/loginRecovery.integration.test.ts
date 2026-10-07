import assert from 'node:assert/strict';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { test } from 'node:test';
import { loginDatabase } from './helpers/loginDatabase.js';
import { hashPassword, verifyPassword } from '../src/modules/accessControl/password.js';
import { login, tokenDigest } from '../src/modules/accessControl/sessions.js';
import { requestPasswordReset, resetPassword, RESET_TOKEN_ERROR } from '../src/modules/accessControl/passwordReset.js';
import { postgresDeliveryStore } from '../src/modules/notificationDispatcher/postgres.js';
import { dispatchCommittedDeliveries, publishCommittedDeliveries } from '../src/modules/notificationDispatcher/dispatch.js';
import { runtimeConfig } from '../src/config.js';
import { sendDurableBrevoEmail } from '../src/providers/brevo.js';
import { createAccountRepository } from '../src/modules/accessControl/postgresRepository.js';
import { registerAccount } from '../src/modules/accessControl/registration.js';
import type { VercelResponse } from '../src/vercel.js';

const password = 'SyntheticStart12!'; // pragma: allowlist secret - synthetic credential
const replacement = 'SyntheticReset34!'; // pragma: allowlist secret - synthetic credential

test('E01-S01 real database, API, registration and recovery acceptance cases', async t => {
  const f = await loginDatabase();
  const { pool } = f;
  const saved = { database: process.env.DATABASE_URL, pooler: process.env.DATABASE_POOLER_URL, node: process.env.NODE_ENV, config: { ...runtimeConfig } };
  process.env.DATABASE_URL = f.connectionString;
  delete process.env.DATABASE_POOLER_URL;
  runtimeConfig.appUrl = 'https://connectsphere.example.test';
  runtimeConfig.brevoApiKey = 'synthetic-provider-key'; // pragma: allowlist secret - intercepted provider fixture
  runtimeConfig.emailFrom = 'no-reply@example.test';
  process.env.NODE_ENV = 'production';
  const { default: handler } = await import('../../api/auth/session.js');
  const { databasePool } = await import('../src/modules/eventVisibility/runtime.js');
  const hashed = await hashPassword(password);
  let sequence = 0;
  async function user(active = true) {
    const id = randomUUID(), email = `organiser${++sequence}@example.test`;
    await pool.query(`INSERT INTO users (id, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, 'Synthetic organiser', 'event_organiser', $4)`, [id, email, hashed, active]);
    return { id, email };
  }
  const row = async (id: string) => (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
  async function api(body?: unknown, task = '', method = 'POST', origin = runtimeConfig.appUrl!, cookie?: string) {
    let status = 200, result: any;
    const headers: Record<string, string> = {};
    const json = (value: unknown) => { result = value; };
    await handler({ method, url: `/api/auth/session${task ? `?task=${task}` : ''}`, headers: { origin, cookie }, body }, {
      setHeader: (name, value) => { headers[name] = String(value); },
      status: code => { status = code; return { json }; }, json,
    } as VercelResponse);
    return { status, body: result, headers };
  }
  async function issue(email: string) {
    await requestPasswordReset(pool, email);
    const delivery = (await pool.query(`SELECT d.id FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id
      JOIN users u ON u.id = n.user_id WHERE u.email = $1 ORDER BY d.created_at DESC LIMIT 1`, [email])).rows[0];
    const store = postgresDeliveryStore(pool, runtimeConfig.appUrl);
    const claim = await store.claimSend(delivery.id);
    assert.equal(claim.kind, 'claimed');
    if (claim.kind !== 'claimed') throw new Error('Expected send lease');
    const token = /#token=([a-f0-9]{64})/.exec(claim.lease.html)![1];
    await store.finishSend(claim.lease, { kind: 'sent' });
    return token;
  }
  try {
    await t.test('registered credentials authenticate; email is normalized; secure cookie and no hash exposure', async () => {
      const registered = await registerAccount({ full_name: 'Synthetic attendee', email: ' REGISTERED@EXAMPLE.TEST ', password, contact_number: '12345678' }, createAccountRepository(pool));
      assert.equal(registered.status, 201);
      const response = await api({ email: '  REGISTERED@Example.Test  ', password, role: 'admin' });
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { signedIn: true });
      assert.match(response.headers['Set-Cookie'], /HttpOnly; SameSite=Strict; Secure/);
      const cookie = response.headers['Set-Cookie'].split(';')[0];
      const who = await api(undefined, '', 'GET', runtimeConfig.appUrl, cookie);
      assert.equal(who.body.user.role, 'attendee');
      assert.equal(JSON.stringify(who.body).includes('password'), false);
      const token = cookie.split('=')[1];
      const sessions = await pool.query('SELECT * FROM auth_sessions WHERE token_hash = $1', [tokenDigest(token)]);
      assert.equal(sessions.rowCount, 1);
      assert.notEqual(sessions.rows[0].token_hash, token);
    });
    await t.test('legacy hashes remain readable and wrong passwords are rejected', async () => {
      const salt = randomBytes(16).toString('hex');
      const legacy = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
      assert.equal(await verifyPassword(password, legacy), true);
      assert.equal(await verifyPassword('wrong', legacy), false);
    });
    await t.test('wrong, unknown and inactive accounts have the same response; inactive correct password fails', async () => {
      const a = await user(), inactive = await user(false);
      const responses = await Promise.all([
        api({ email: a.email, password: 'wrong' }), api({ email: 'missing@example.test', password }), // pragma: allowlist secret - synthetic invalid credential
        api({ email: inactive.email, password }),
      ]);
      for (const response of responses) { assert.equal(response.status, 401); assert.deepEqual(response.body, responses[0].body); assert.equal(response.headers['Set-Cookie'], undefined); }
    });
    await t.test('counts each failure, locks on five, writes one audit, refuses correct password; success resets count', async () => {
      const a = await user();
      for (let i = 1; i <= 4; i++) {
        await assert.rejects(login(pool, a.email, 'wrong'));
        assert.equal((await row(a.id)).failed_login_count, i);
      }
      await login(pool, a.email, password);
      assert.equal((await row(a.id)).failed_login_count, 0);
      for (let i = 1; i <= 5; i++) await assert.rejects(login(pool, a.email, 'wrong'));
      const locked = await row(a.id);
      assert.equal(locked.failed_login_count, 5);
      assert.ok(locked.locked_until.getTime() - Date.now() > 29 * 60_000);
      assert.ok(locked.locked_until.getTime() - Date.now() <= 30 * 60_000);
      await assert.rejects(login(pool, a.email, password));
      await assert.rejects(login(pool, a.email, 'wrong'));
      assert.equal((await row(a.id)).locked_until.getTime(), locked.locked_until.getTime());
      const logs = await pool.query("SELECT * FROM audit_logs WHERE entity_id = $1 AND action = 'Account Locked'", [a.id]);
      assert.equal(logs.rowCount, 1);
      assert.ok(logs.rows[0].occurred_at);
      await pool.query("UPDATE users SET locked_until = clock_timestamp() - interval '1 second' WHERE id = $1", [a.id]);
      await login(pool, a.email, password);
      assert.equal((await row(a.id)).locked_until, null);
    });
    await t.test('concurrent incorrect attempts cannot bypass the threshold or duplicate audit', async () => {
      const a = await user();
      const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => login(pool, a.email, 'wrong')));
      assert.ok(attempts.every(result => result.status === 'rejected'));
      assert.equal((await row(a.id)).failed_login_count, 5);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM audit_logs WHERE entity_id = $1 AND action = 'Account Locked'", [a.id])).rows[0].n, 1);
    });
    await t.test('reset request API normalizes email and does not expose account eligibility', async () => {
      const a = await user(), inactive = await user(false);
      const responses = await Promise.all([api({ email: ` ${a.email.toUpperCase()} ` }, 'request-reset'), api({ email: 'absent@example.test' }, 'request-reset'), api({ email: inactive.email }, 'request-reset')]);
      for (const response of responses) { assert.equal(response.status, 200); assert.deepEqual(response.body, responses[0].body); }
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1', [inactive.id])).rows[0].n, 0);
    });
    await t.test('outbox delivers a hashed single-use 15-minute link through the existing provider adapter', async () => {
      const a = await user();
      await pool.query('UPDATE users SET failed_login_count = 5, locked_until = now() + interval \'30 minutes\' WHERE id = $1', [a.id]);
      await requestPasswordReset(pool, a.email);
      const store = postgresDeliveryStore(pool, runtimeConfig.appUrl);
      const ids: string[] = [];
      const transport = { async publish(id: string) { ids.push(id); }, async peek() { return [...ids]; }, async acknowledge(id: string) { ids.splice(ids.indexOf(id), 1); }, async defer() {} };
      await publishCommittedDeliveries(store, transport);
      const messages: any[] = [];
      const oldFetch = globalThis.fetch;
      globalThis.fetch = async (_url, options) => { messages.push(JSON.parse(options!.body as string)); return new Response(JSON.stringify({ messageId: 'synthetic-message' }), { status: 201 }); };
      try { await dispatchCommittedDeliveries(store, transport, sendDurableBrevoEmail); }
      finally { globalThis.fetch = oldFetch; }
      const email = messages.find(message => message.to[0].email === a.email);
      assert.ok(email);
      const token = /#token=([a-f0-9]{64})/.exec(email.htmlContent)![1];
      const stored = (await pool.query('SELECT * FROM password_reset_tokens WHERE token_hash = $1', [tokenDigest(token)])).rows[0];
      assert.ok(stored);
      assert.notEqual(stored.token_hash, token);
      assert.equal(stored.expires_at - stored.created_at, 15 * 60_000);
      const retained = await pool.query('SELECT n.message, d.html FROM notifications n JOIN notification_deliveries d ON n.id = d.notification_id WHERE n.user_id = $1', [a.id]);
      assert.equal(JSON.stringify(retained.rows).includes(token), false);
      assert.equal((await api({ token, password: replacement }, 'reset-password')).status, 200);
      const updated = await row(a.id);
      assert.equal(updated.failed_login_count, 0); assert.equal(updated.locked_until, null);
      assert.notEqual(updated.password_hash, replacement);
      assert.equal(await verifyPassword(replacement, updated.password_hash), true);
      assert.ok((await pool.query('SELECT used_at FROM password_reset_tokens WHERE id = $1', [stored.id])).rows[0].used_at);
      await assert.rejects(login(pool, a.email, password));
      await login(pool, a.email, replacement);
      await assert.rejects(resetPassword(pool, token, password), { message: RESET_TOKEN_ERROR });
    });
    await t.test('invalid, expired, inactive and policy-invalid resets are rejected without consuming usable tokens', async () => {
      const a = await user();
      const token = await issue(a.email);
      for (const invalid of ['short', 'lowercase123!', 'UppercaseOnly!', 'NoSpecial12345']) {
        await assert.rejects(resetPassword(pool, token, invalid), /Password must/);
      }
      assert.equal((await pool.query('SELECT used_at FROM password_reset_tokens WHERE token_hash = $1', [tokenDigest(token)])).rows[0].used_at, null);
      await assert.rejects(resetPassword(pool, 'bad', replacement), { message: RESET_TOKEN_ERROR });
      await assert.rejects(resetPassword(pool, 'f'.repeat(64), replacement), { message: RESET_TOKEN_ERROR });
      await pool.query("UPDATE password_reset_tokens SET expires_at = clock_timestamp() - interval '1 millisecond' WHERE token_hash = $1", [tokenDigest(token)]);
      await assert.rejects(resetPassword(pool, token, replacement), { message: RESET_TOKEN_ERROR });
      const second = await issue(a.email);
      await pool.query('UPDATE users SET is_active = false WHERE id = $1', [a.id]);
      await assert.rejects(resetPassword(pool, second, replacement), { message: RESET_TOKEN_ERROR });
    });
    await t.test('concurrent reset uses token once, invalidates sibling tokens and old sessions', async () => {
      const a = await user();
      await login(pool, a.email, password);
      const token = await issue(a.email), sibling = await issue(a.email);
      const attempts = await Promise.allSettled([resetPassword(pool, token, replacement), resetPassword(pool, token, replacement)]);
      assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 1);
      await assert.rejects(resetPassword(pool, sibling, password));
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM auth_sessions WHERE user_id = $1', [a.id])).rows[0].n, 0);
    });
    await t.test('queued recovery is not delivered to deactivated or changed recipients', async () => {
      for (const change of ['inactive', 'email']) {
        const a = await user();
        await requestPasswordReset(pool, a.email);
        if (change === 'inactive') await pool.query('UPDATE users SET is_active = false WHERE id = $1', [a.id]);
        else await pool.query('UPDATE users SET email = $2 WHERE id = $1', [a.id, `changed-${a.email}`]);
        const delivery = (await pool.query('SELECT d.id FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id WHERE n.user_id = $1', [a.id])).rows[0];
        assert.deepEqual(await postgresDeliveryStore(pool, runtimeConfig.appUrl).claimSend(delivery.id), { kind: 'retained', state: 'failed' });
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM password_reset_tokens WHERE user_id = $1', [a.id])).rows[0].n, 0);
      }
    });
    await t.test('reset transaction rolls back token consumption and lock changes on database failure', async () => {
      const a = await user();
      const token = await issue(a.email);
      await pool.query("UPDATE users SET failed_login_count = 5, locked_until = now() + interval '30 minutes' WHERE id = $1", [a.id]);
      await pool.query(`CREATE FUNCTION refuse_password_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic reset failure'; END $$`);
      await pool.query('CREATE TRIGGER refuse_password_write BEFORE UPDATE OF password_hash ON users FOR EACH ROW EXECUTE FUNCTION refuse_password_write()');
      try { await assert.rejects(resetPassword(pool, token, replacement), /synthetic reset failure/); }
      finally { await pool.query('DROP TRIGGER refuse_password_write ON users'); await pool.query('DROP FUNCTION refuse_password_write()'); }
      assert.equal((await row(a.id)).failed_login_count, 5);
      assert.equal((await pool.query('SELECT used_at FROM password_reset_tokens WHERE token_hash = $1', [tokenDigest(token)])).rows[0].used_at, null);
      await pool.query("UPDATE password_reset_tokens SET created_at = now() - interval '14 minutes', expires_at = now() + interval '1 minute' WHERE token_hash = $1", [tokenDigest(token)]);
      await resetPassword(pool, token, replacement);
      await login(pool, a.email, replacement);
    });
    await t.test('API rejects cross-origin changes and wrong methods', async () => {
      assert.equal((await api({ email: 'someone@example.test' }, 'request-reset', 'POST', 'https://attacker.example')).status, 403);
      assert.equal((await api({}, 'reset-password', 'GET')).status, 405);
      assert.equal((await api({ token: 7, password: replacement }, 'reset-password')).status, 400);
    });
  } finally {
    await databasePool().end();
    Object.assign(runtimeConfig, saved.config);
    for (const [key, value] of Object.entries({ DATABASE_URL: saved.database, DATABASE_POOLER_URL: saved.pooler, NODE_ENV: saved.node })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await f.close();
  }
});

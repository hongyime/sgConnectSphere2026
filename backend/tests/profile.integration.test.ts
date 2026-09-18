import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createProfileRepository } from '../src/modules/accessControl/profileRepository.js';
import { loadProfile, updateProfile } from '../src/modules/accessControl/profile.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import { tokenDigest } from '../src/modules/accessControl/sessions.js';
import { insertNotificationDelivery } from '../src/modules/notificationDispatcher/postgres.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelResponse } from '../src/vercel.js';

test('real sessions, profile persistence, case-insensitive uniqueness and future notification address', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const address = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname), 'Use a loopback test database');
  const schema = `profile_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: address.href });
  let database: Pool | undefined;
  let runtimePool: Pool | undefined;
  const previous = { url: process.env.DATABASE_URL, pooler: process.env.DATABASE_POOLER_URL, app: process.env.APP_URL };
  try {
    await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public');
    await admin.query('CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public');
    await admin.query(`CREATE SCHEMA ${schema}`);
    database = new Pool({ connectionString: address.href, options: `-c search_path=${schema},public` });
    for (const migration of ['0001_connectsphere_schema.sql', '0002_users_email_case_insensitive.sql', '0003_auth_sessions.sql', '0002_durable_notification_dispatch.sql']) {
      await database.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    const org = randomUUID(), id = randomUUID(), other = randomUUID();
    await database.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Client A']);
    await database.query(`INSERT INTO users (id, client_org_id, full_name, email, password_hash, role, contact_number)
      VALUES ($1, $2, 'Alex', 'alex@example.test', 'synthetic-fixture', 'event_organiser', '9123 4567'),
      ($3, $2, 'Other', 'other@example.test', 'synthetic-fixture', 'event_organiser', '9000 0000')`, [id, org, other]);
    const identity: AuthenticatedUser = { id, email: 'alex@example.test', role: 'event_organiser', clientOrgId: org, isActive: true, failedLoginCount: 0 };
    const dbQuery: Query = (sql, values) => database!.query(sql, values);
    const repository = createProfileRepository(dbQuery);
    const changed = { full_name: 'Alexandra', email: ' NEW@EXAMPLE.TEST ', contact_number: '9876 5432' };
    await updateProfile(dbQuery, repository, identity, changed);
    const profile = await loadProfile(dbQuery, repository, identity);
    assert.equal(profile.full_name, changed.full_name);
    assert.equal(profile.email, 'new@example.test');
    assert.equal(profile.contact_number, changed.contact_number);
    assert.equal(profile.client_org_id, org);
    assert.equal(profile.organisation_name, 'Client A');
    assert.equal((await updateProfile(dbQuery, repository, identity, { ...changed, email: 'NEW@example.test' })).email, profile.email);
    for (const email of ['other@example.test', ' OTHER@EXAMPLE.TEST ']) {
      await assert.rejects(updateProfile(dbQuery, repository, identity, { ...changed, full_name: 'Should not persist', email }), { status: 409 });
      assert.equal((await loadProfile(dbQuery, repository, identity)).full_name, changed.full_name);
    }
    for (const forbidden of ['role', 'user_id', 'client_org_id', 'organisation_name', 'password_hash', 'is_active', 'locked_until', 'deactivated_at', 'failed_login_count']) {
      await assert.rejects(updateProfile(dbQuery, repository, identity, { ...changed, [forbidden]: other }), { status: 400 });
    }
    const rows = (await database.query('SELECT * FROM users ORDER BY email')).rows;
    assert.equal(rows.length, 2);
    assert.equal(rows.find(row => row.id === other).full_name, 'Other');
    const self = rows.find(row => row.id === id);
    assert.equal(self.role, 'event_organiser'); assert.equal(self.password_hash, 'synthetic-fixture');
    assert.equal(self.is_active, true); assert.equal(self.failed_login_count, 0); assert.equal(self.locked_until, null);
    assert.equal((await database.query('SELECT name FROM client_organisations WHERE id = $1', [org])).rows[0].name, 'Client A');

    // Use the production delivery preparation code after the profile email update.
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const notification = await client.query(`INSERT INTO notifications (user_id, title, message) VALUES ($1, 'Event changed', 'Synthetic event update') RETURNING id`, [id]);
      const deliveryId = await insertNotificationDelivery(client, notification.rows[0].id);
      await client.query('COMMIT');
      const delivery = (await database.query('SELECT recipient_email FROM notification_deliveries WHERE id = $1', [deliveryId])).rows[0];
      assert.equal(delivery.recipient_email, 'new@example.test');
    } finally { client.release(); }

    // Actual cookie lookup must continue working after email changes, since sessions use user_id.
    const token = randomBytes(32).toString('hex');
    await database.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [tokenDigest(token), id]);
    address.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = address.href; delete process.env.DATABASE_POOLER_URL;
    process.env.APP_URL = 'https://app.example.test';
    const runtime = await import('../src/modules/eventVisibility/runtime.js');
    runtimePool = runtime.databasePool();
    const { createProfileHandler } = await import('../../api/account/profile.js');
    const handler = createProfileHandler(repository, runtime.currentUser, () => 'https://app.example.test');
    async function request(cookie?: string, method = 'GET', body?: unknown) {
      let status = 0; let result: any;
      const json = (value: unknown) => { result = value; };
      const response: VercelResponse = { setHeader() {}, status(code) { status = code; return { json }; }, json };
      await handler({ method, url: `/api/account/profile?user_id=${other}`, headers: { cookie, origin: 'https://app.example.test' }, body }, response);
      return { status, result };
    }
    assert.equal((await request()).status, 401);
    assert.equal((await request('cs_access=forged')).status, 401);
    const loaded = await request(`cs_access=${token}`);
    assert.equal(loaded.status, 200); assert.equal(loaded.result.profile.id, id);
    assert.equal(loaded.result.profile.email, 'new@example.test');
    assert.equal((await request(`cs_access=${token}`, 'PUT', { ...changed, user_id: other })).status, 400);
    assert.equal((await request(`cs_access=${token}`, 'PUT', { ...changed, full_name: 'Saved through session' })).status, 200);
    assert.equal((await request(`cs_access=${token}`)).result.profile.full_name, 'Saved through session');
    await database.query(`UPDATE auth_sessions SET expires_at = now() - interval '1 hour' WHERE user_id = $1`, [id]);
    assert.equal((await request(`cs_access=${token}`)).status, 401);
  } finally {
    if (previous.url === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.url;
    if (previous.pooler === undefined) delete process.env.DATABASE_POOLER_URL; else process.env.DATABASE_POOLER_URL = previous.pooler;
    if (previous.app === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous.app;
    await runtimePool?.end(); await database?.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end();
  }
});

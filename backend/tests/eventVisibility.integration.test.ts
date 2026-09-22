import { tokenDigest } from '../src/modules/accessControl/sessions';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { getEvent, listEvents, listNotifications, permittedDelivery, type Query } from '../src/modules/eventVisibility/service';
import type { VercelRequest, VercelResponse } from '../src/vercel';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';

test('E01-S02: organisation isolation, colleagues, search, audit and notification delivery', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const schema = `visibility_${randomUUID().replaceAll('-', '')}`;
  const a = randomUUID(), b = randomUUID(), organiser = randomUUID(), colleague = randomUUID();
  const ownEvent = randomUUID(), organiserB = randomUUID();
  const eventA = randomUUID(), eventB = randomUUID(), notificationA = randomUUID(), notificationB = randomUUID();
  const user: AuthenticatedUser = { id: organiser, email: 'organiser@example.test', role: 'event_organiser', clientOrgId: a, isActive: true, failedLoginCount: 0 };
  let closeRuntime: (() => Promise<void>) | undefined;
  try {
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public');
    await db.query('CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public');
    await db.query(`SET search_path TO ${schema}, public`);
    // Exercise the actual repository migrations, not an approximation of the schema.
    await db.query(await readFile(new URL('../database/migrations/0001_connectsphere_schema.sql', import.meta.url), 'utf8'));
    await db.query(await readFile(new URL('../database/migrations/0002_event_visibility.sql', import.meta.url), 'utf8'));
    await db.query(await readFile(new URL('../database/migrations/0003_auth_sessions.sql', import.meta.url), 'utf8'));
    await db.query(await readFile(new URL('../database/migrations/0004_attendee_visibility.sql', import.meta.url), 'utf8'));
    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2), ($3, $4)', [a, 'Client A', b, 'Client B']);
    await db.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, 'organiser@example.test', 'unused', 'Organiser A', 'event_organiser'),
      ($3, $2, 'colleague@example.test', 'unused', 'Colleague A', 'event_organiser')`, [organiser, a, colleague]);
    await db.query(`INSERT INTO room_layouts (id, code, label) VALUES ($1, 'test-layout', 'Test layout')`, [a]);
    await db.query(`INSERT INTO events (id, event_code, organiser_id, client_org_id, title, event_range, expected_attendance, layout_id, status)
      VALUES ($1, 'EVT-A02', $2, $3, 'Colleague conference', '[2027-01-01,2027-01-02)', 10, $3, 'submitted'),
      ($4, 'EVT-B01', $2, $5, 'Confidential conference', '[2027-01-01,2027-01-02)', 10, $3, 'submitted')`, [eventA, colleague, a, eventB, b]);
    await db.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, 'organiser-b@example.test', 'unused', 'Organiser B', 'event_organiser')`, [organiserB, b]);
    await db.query('UPDATE events SET organiser_id = $1 WHERE id = $2', [organiserB, eventB]);
    await db.query(`INSERT INTO events (id, event_code, organiser_id, client_org_id, title, event_range, expected_attendance, layout_id)
      VALUES ($1, 'EVT-A01', $2, $3, 'Own workshop', '[2027-01-01,2027-01-02)', 10, $3)`, [ownEvent, organiser, a]);
    const query: Query = (sql, values) => db.query(sql, values);
    assert.deepEqual((await listEvents(query, user)).map(e => e.event_code).sort(), ['EVT-A01', 'EVT-A02']);
    assert.equal((await getEvent(query, user, 'EVT-A02')).creator_name, 'Colleague A');
    assert.deepEqual(await listEvents(query, user, 'Confidential'), []);
    assert.deepEqual(await listEvents(query, user, "%' OR true --"), []);
    assert.equal((await listEvents(query, user, 'conference')).length, 1);
    const before = (await db.query('SELECT clock_timestamp() AS time')).rows[0].time;
    await assert.rejects(getEvent(query, user, 'EVT-B01'), { status: 403 });
    await assert.rejects(getEvent(query, user, eventB), { status: 403 });
    const audits = (await db.query('SELECT * FROM audit_logs ORDER BY occurred_at')).rows;
    assert.equal(audits.length, 2);
    for (const audit of audits) {
      assert.equal(audit.actor_id, organiser); assert.equal(audit.event_id, eventB);
      assert.equal(audit.action, 'Access Denied'); assert.ok(audit.occurred_at >= before);
    }
    await db.query(`INSERT INTO notifications (id, user_id, event_id, title, message) VALUES
      ($1, $2, $3, 'Own reminder', '<script>example</script>'), ($4, $2, $5, 'Foreign reminder', 'Confidential')`,
    [notificationA, organiser, eventA, notificationB, eventB]);
    assert.deepEqual((await listNotifications(query, user)).map(n => n.id), [notificationA]);
    assert.equal(await permittedDelivery(query, notificationB, user.email), null);
    assert.equal(await permittedDelivery(query, notificationA, 'someone@example.test'), null);
    assert.equal((await permittedDelivery(query, notificationA, user.email))?.html, '<p>&lt;script&gt;example&lt;/script&gt;</p>');
    await db.query('UPDATE users SET client_org_id = $1 WHERE id = $2', [b, organiser]);
    assert.equal(await permittedDelivery(query, notificationA, user.email), null);
    const userB = { ...user, id: organiserB, clientOrgId: b, email: 'organiser-b@example.test' };
    assert.deepEqual((await listEvents(query, userB)).map(e => e.id), [eventB]);
    await assert.rejects(getEvent(query, userB, 'EVT-A02'), { status: 403 });
    await assert.rejects(getEvent(query, user, 'unknown-event'), { status: 403 });
    const unknownAudit = (await db.query("SELECT * FROM audit_logs WHERE new_value = 'unknown-event'")).rows[0];
    assert.equal(unknownAudit.actor_id, organiser);
    assert.equal(unknownAudit.event_id, null);

    // Exercise real PostgreSQL sessions and the actual API membership lookup.
    await db.query('UPDATE users SET client_org_id = $1 WHERE id = $2', [a, organiser]);
    const token = 'a'.repeat(64);
    await db.query("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')", [tokenDigest(token), organiser]);
    const savedEnv = { ...process.env };
    const scopedUrl = new URL(process.env.TEST_DATABASE_URL!);
    scopedUrl.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = scopedUrl.toString();
    delete process.env.DATABASE_POOLER_URL;
    process.env.APP_URL = 'https://app.example.test';
    try {
      const runtime = await import('../src/modules/eventVisibility/runtime');
      closeRuntime = () => runtime.databasePool().end();
      const { default: handler } = await import('../../api/events');
      async function request(url: string, cookie?: string) {
        let status = 200;
        let body: Record<string, any> = {};
        const headers: Record<string, string> = {};
        const response: VercelResponse = {
          setHeader(name, value) { headers[name] = value; },
          status(code) { status = code; return { json(value) { body = value as typeof body; } }; },
          json(value) { body = value as typeof body; },
        };
        await handler({ method: 'GET', url, headers: { cookie } } as VercelRequest, response);
        return { status, body, headers };
      }
      assert.equal((await request('/api/events')).status, 401);
      assert.equal((await request('/api/events', 'cs_access=forged-session')).status, 401);
      const cookie = `cs_access=${token}`;
      const listed = await request(`/api/events?clientOrgId=${b}`, cookie);
      assert.equal(listed.status, 200);
      assert.deepEqual(listed.body.events.map((e: { event_code: string }) => e.event_code).sort(), ['EVT-A01', 'EVT-A02']);
      assert.equal(listed.headers['Cache-Control'], 'private, no-store');
      assert.equal(JSON.stringify(listed.body).includes('Confidential'), false);
      const denied = await request('/api/events?id=EVT-B01', cookie);
      assert.equal(denied.status, 403);
      assert.deepEqual(Object.keys(denied.body), ['error']);
      assert.equal(JSON.stringify(denied.body).includes('Confidential'), false);
      // This connection sees the audit committed by the API's separate pool.
      assert.ok((await db.query("SELECT id FROM audit_logs WHERE actor_id = $1 AND new_value = 'EVT-B01'", [organiser])).rows.length >= 2);
      await db.query('UPDATE users SET client_org_id = $1 WHERE id = $2', [b, organiser]);
      const moved = await request('/api/events', cookie);
      assert.deepEqual(moved.body.events.map((e: { id: string }) => e.id), [eventB]);
      await db.query('UPDATE users SET is_active = false WHERE id = $1', [organiser]);
      assert.equal((await request('/api/events', cookie)).status, 403);
      await db.query('UPDATE users SET is_active = true, client_org_id = NULL WHERE id = $1', [organiser]);
      assert.equal((await request('/api/events', cookie)).status, 403);
      await db.query("UPDATE users SET client_org_id = $1, role = 'attendee' WHERE id = $2", [a, organiser]);
      assert.equal((await request('/api/events', cookie)).status, 403);
    } finally {
      for (const key of ['DATABASE_URL', 'DATABASE_POOLER_URL', 'APP_URL']) {
        if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key];
      }
    }
  } finally {
    if (closeRuntime) await closeRuntime();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

// SCRUM-60 (E08-S03): the readiness, submission and confirm routes in
// api/events.ts, driven through the real handler with real cookie sessions
// against PostgreSQL. The rules themselves are proven in
// eventReadiness.integration.test.ts; this file checks the wiring: query
// parameters, status codes and response bodies.
//
// The API reads DATABASE_URL when its modules load, so every application
// module is imported after it is pointed at this test's schema.
//
// Requires TEST_DATABASE_URL pointing at a disposable local database named
// connectsphere_notification_test, never the live Supabase project.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { VercelRequest, VercelResponse } from '../src/vercel.js';

test('TC_E08S03_08 and TC_E08S03_09: the readiness, submission and confirm routes answer with the right status and body', async () => {
  const f = await loginDatabase();
  const saved = { ...process.env };
  let closeRuntime: (() => Promise<unknown>) | undefined;
  try {
    process.env.DATABASE_URL = f.connectionString;
    delete process.env.DATABASE_POOLER_URL;
    process.env.APP_URL = 'https://app.example.test';
    const { tokenDigest } = await import('../src/modules/accessControl/sessions.js');
    const runtime = await import('../src/modules/eventVisibility/runtime.js');
    const client = await import('../src/database/client.js');
    closeRuntime = async () => { await runtime.databasePool().end(); await client.getDatabasePool().end(); };
    const { default: handler } = await import('../../api/events.js');

    const org = randomUUID(), organiser = randomUUID(), coordinator = randomUUID(), lead = randomUUID();
    await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A')`, [org]);
    for (const [id, orgId, role] of [[organiser, org, 'event_organiser'], [coordinator, null, 'event_coordinator'], [lead, null, 'event_coordinator_lead']]) {
      await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, 'unused', $4, $5::user_role)`, [id, orgId, `${id}@example.test`, `Person ${role}`, role]);
    }
    const cookies: Record<string, string> = {};
    for (const [name, id] of [['organiser', organiser], ['coordinator', coordinator], ['lead', lead]] as const) {
      const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
      await f.pool.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
        [tokenDigest(token), id]);
      cookies[name] = `cs_access=${token}`;
    }
    const range = "tstzrange('2027-01-15 09:00+08', '2027-01-15 17:00+08', '[)')";
    const event = async (code: string, status: string) => {
      const id = randomUUID();
      await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
          expected_attendance, equipment_requirements)
        VALUES ($1, $2, $3, $4, $5, $6, $7::event_status, ${range}, 80, 'none_required')`,
      [id, code, organiser, coordinator, org, `Event ${code}`, status]);
      const venue = randomUUID();
      await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
        VALUES ($1, $2, 'Level 1', 200, '07:00', '23:00')`, [venue, `Hall ${code}`]);
      return { id, venue };
    };
    const ready = await event('EVT-R01', 'planning');
    await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status, purpose)
      VALUES ($1, $2, ${range}, 'confirmed', 'Main programme')`, [ready.venue, ready.id]);
    const waiting = await event('EVT-R02', 'planning');
    await f.pool.query(`INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
      VALUES ($1, $2, ${range}, 'pending')`, [waiting.venue, waiting.id]);

    async function call(method: 'GET' | 'POST', url: string, cookie?: string) {
      let status = 200;
      let body: Record<string, any> = {};
      const response: VercelResponse = {
        setHeader() {},
        status(code) { status = code; return { json(value) { body = value as typeof body; } }; },
        json(value) { body = value as typeof body; },
      };
      await handler({ method, url, headers: { cookie }, body: {} } as VercelRequest, response);
      return { status, body };
    }

    const read = await call('GET', '/api/events?readiness=1&id=EVT-R02', cookies.coordinator);
    assert.equal(read.status, 200);
    assert.equal(read.body.readiness.canSubmit, false);
    assert.deepEqual(read.body.readiness.blockers.map((row: { message: string }) => row.message),
      ['No venue booking is Confirmed yet.', 'Hall EVT-R02 — Pending']);
    assert.equal((await call('GET', '/api/events?readiness=1&id=EVT-R02', cookies.organiser)).status, 403);
    assert.equal((await call('GET', '/api/events?readiness=1&id=EVT-R02')).status, 401);
    assert.equal((await call('GET', '/api/events?readiness=1', cookies.coordinator)).status, 400);

    const refused = await call('POST', '/api/events?safetyReview=1&id=EVT-R02', cookies.coordinator);
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error, "This event can't be submitted for its safety check until every outstanding item is resolved.");
    assert.equal(refused.body.readiness.blockers.length, 2);
    assert.equal((await call('POST', '/api/events?safetyReview=1', cookies.coordinator)).status, 400);
    const wrongRole = await call('POST', '/api/events?safetyReview=1&id=EVT-R02', cookies.organiser);
    assert.equal(wrongRole.status, 403);
    assert.equal(wrongRole.body.error, 'Only the assigned Coordinator can submit this event for its safety check.');

    const submitted = await call('POST', '/api/events?safetyReview=1&id=EVT-R01', cookies.coordinator);
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.submission.status, 'safety_review');
    assert.equal(submitted.body.submission.eventCode, 'EVT-R01');

    const confirm = await call('POST', '/api/events?confirm=1&id=EVT-R01', cookies.lead);
    assert.equal(confirm.status, 403);
    assert.equal(confirm.body.error, 'Only a Safety Officer can confirm an event in Safety Review.');
    const stored = await f.pool.query('SELECT status::text AS status FROM events WHERE id = $1', [ready.id]);
    assert.equal(stored.rows[0]!.status, 'safety_review');

    // Scenario 6: arrangements are on the Organiser's read once Confirmed.
    await f.pool.query(`UPDATE events SET status = 'confirmed' WHERE id = $1`, [ready.id]);
    const organiserRead = await call('GET', '/api/events?id=EVT-R01', cookies.organiser);
    assert.equal(organiserRead.status, 200);
    assert.deepEqual(organiserRead.body.event.arrangements.venues.map((row: { venueName: string; purpose: string }) => [row.venueName, row.purpose]),
      [['Hall EVT-R01', 'Main programme']]);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    if (closeRuntime) await closeRuntime();
    await f.close();
  }
});

// SCRUM-60 (E08-S03): the readiness, submission and confirm routes in
// api/events.ts, driven through the real handler with real cookie sessions
// against PostgreSQL. The rules themselves are proven in
// eventReadiness.integration.test.ts; this file checks the wiring: query
// parameters, status codes and response bodies.
//
// SCRUM-61 (E08-S04): the revert route's persistence (status, audit row,
// Organiser and Attendee notices, refusal) is proven here against the real
// database too; eventReversion.test.ts covers the same rules with a mock pool.
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

test('TC_E08S03_08, TC_E08S03_09, TC_E08S04_01, TC_E08S04_02 and TC_E08S04_04: the readiness, submission, confirm and revert routes answer with the right status and body', async () => {
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

    async function call(method: 'GET' | 'POST', url: string, cookie?: string, body: unknown = {}) {
      let status = 200;
      let reply: Record<string, any> = {};
      const response: VercelResponse = {
        setHeader() {},
        status(code) { status = code; return { json(value) { reply = value as typeof reply; } }; },
        json(value) { reply = value as typeof reply; },
      };
      await handler({ method, url, headers: { cookie, origin: 'https://app.example.test' }, body } as VercelRequest, response);
      return { status, body: reply };
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

    // E08-S04: the assigned Coordinator reverts the Confirmed EVT-R01 to Planning.
    const attendee = randomUUID(), otherCoordinator = randomUUID();
    for (const [id, role] of [[attendee, 'attendee'], [otherCoordinator, 'event_coordinator']]) {
      await f.pool.query(`INSERT INTO users (id, email, password_hash, full_name, role)
        VALUES ($1, $2, 'unused', $3, $4::user_role)`, [id, `${id}@example.test`, `Person ${role}`, role]);
    }
    const otherToken = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    await f.pool.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
      [tokenDigest(otherToken), otherCoordinator]);
    // Attendees are only told about a published event (selectEventRecipients).
    await f.pool.query(`INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
      VALUES ($1, 'Leadership Summit', '2027-01-15 09:00+08', '2027-01-15 17:00+08', 'Hall EVT-R01', 'Level 1')`, [ready.id]);
    await f.pool.query(`INSERT INTO event_registrations (event_id, attendee_id) VALUES ($1, $2)`, [ready.id, attendee]);
    const noticesFor = async (userId: string) => (await f.pool.query<{ title: string; message: string }>(
      'SELECT title, message FROM notifications WHERE user_id = $1 AND event_id = $2 ORDER BY created_at', [userId, ready.id])).rows;
    const organiserBefore = (await noticesFor(organiser)).length;
    const reason = 'Venue reported a plumbing issue';

    const refusedRevert = await call('POST', '/api/events?revert=1&id=EVT-R01', `cs_access=${otherToken}`, { reason });
    assert.equal(refusedRevert.status, 403);
    assert.equal(refusedRevert.body.error, 'Access denied. This event is not assigned to you.');
    const denial = await f.pool.query(`SELECT field_changed FROM audit_logs
      WHERE actor_id = $1 AND event_id = $2 AND action = 'Access Denied'`, [otherCoordinator, ready.id]);
    assert.deepEqual(denial.rows, [{ field_changed: 'event_reversion' }]);
    assert.equal((await call('POST', '/api/events?revert=1&id=EVT-R01', cookies.coordinator, { reason: '  ' })).status, 400);

    const reverted = await call('POST', '/api/events?revert=1&id=EVT-R01', cookies.coordinator, { reason });
    assert.equal(reverted.status, 200);
    assert.equal(reverted.body.reversion.status, 'planning');
    assert.equal((await f.pool.query('SELECT status::text AS status FROM events WHERE id = $1', [ready.id])).rows[0]!.status, 'planning');
    const audit = await f.pool.query(`SELECT actor_id, old_value, new_value FROM audit_logs
      WHERE event_id = $1 AND action = 'Reverted to Planning'`, [ready.id]);
    assert.deepEqual(audit.rows, [{ actor_id: coordinator, old_value: 'confirmed', new_value: 'planning' }]);
    const organiserNotices = (await noticesFor(organiser)).slice(organiserBefore);
    assert.equal(organiserNotices.length, 1, 'one Organiser notice, not the generic one as well');
    assert.equal(organiserNotices[0]!.title, 'Event reverted to planning');
    assert.match(organiserNotices[0]!.message, new RegExp(`Reason: ${reason}$`));
    const attendeeNotices = await noticesFor(attendee);
    assert.equal(attendeeNotices.length, 1);
    assert.match(attendeeNotices[0]!.message, /Previously confirmed arrangements are being revised./);
    assert.doesNotMatch(attendeeNotices[0]!.message, /plumbing/, 'the reason is internal');
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    if (closeRuntime) await closeRuntime();
    await f.close();
  }
});

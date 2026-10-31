// SCRUM-242 (E08-S04 Scenario 4): the reconfirm list and action in
// api/venues/index.ts, driven through the real handler with a real cookie
// session against PostgreSQL. The rule itself is proven in
// venueReconfirmation.integration.test.ts; this file checks the wiring:
// GET ?bookings=reconfirm and POST { action: 'reconfirm', booking_id }.
//
// The API reads DATABASE_URL when its modules load, so every application
// module is imported after it is pointed at this test's schema.
//
// Requires TEST_DATABASE_URL pointing at a disposable local database, never
// the live Supabase project.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { VercelRequest, VercelResponse } from '../src/vercel.js';

test('Venue Staff list and reconfirm a flagged booking through /api/venues', async () => {
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
    const { default: handler } = await import('../../api/venues/index.js');

    const org = randomUUID(), organiser = randomUUID(), coordinator = randomUUID(), staff = randomUUID(), venue = randomUUID(), event = randomUUID();
    await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A')`, [org]);
    for (const [id, orgId, role] of [[organiser, org, 'event_organiser'], [coordinator, null, 'event_coordinator'], [staff, null, 'venue_staff']]) {
      await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, 'unused', $4, $5::user_role)`, [id, orgId, `${id}@example.test`, `Person ${role}`, role]);
    }
    const cookies: Record<string, string> = {};
    for (const [name, id] of [['staff', staff], ['coordinator', coordinator]] as const) {
      const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
      await f.pool.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [tokenDigest(token), id]);
      cookies[name] = `cs_access=${token}`;
    }
    await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, 'Hall R', 'Level 1', 200, '07:00', '23:00')`, [venue]);
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, 'EVT-RC1', $2, $3, $4, 'Reconfirm route', 'planning', '[2027-02-01T10:00:00+08:00,2027-02-01T12:00:00+08:00)', 80)`, [event, organiser, coordinator, org]);
    const booking = (await f.pool.query<{ id: string }>(`INSERT INTO venue_bookings (venue_id, event_id, session_id, booking_range, status, is_primary, requires_reconfirmation)
      SELECT $1, $2, s.id, s.session_range, 'confirmed', true, true FROM sessions s WHERE s.event_id = $2 RETURNING id`, [venue, event])).rows[0]!.id;

    async function call(method: 'GET' | 'POST', url: string, cookie: string, body: unknown = {}) {
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

    const listed = await call('GET', '/api/venues?bookings=reconfirm', cookies.staff!);
    assert.equal(listed.status, 200);
    assert.deepEqual(listed.body.bookings.map((row: { id: string; requiresReconfirmation: boolean }) => [row.id, row.requiresReconfirmation]), [[booking, true]]);
    assert.equal((await call('GET', '/api/venues?bookings=reconfirm', cookies.coordinator!)).status, 403);

    const reconfirmed = await call('POST', '/api/venues', cookies.staff!, { action: 'reconfirm', booking_id: booking });
    assert.equal(reconfirmed.status, 200);
    assert.equal(reconfirmed.body.booking.requiresReconfirmation, false);
    assert.equal(reconfirmed.body.coordinatorNotified, true);

    const again = await call('POST', '/api/venues', cookies.staff!, { action: 'reconfirm', booking_id: booking });
    assert.equal(again.status, 409);
    assert.equal((await call('POST', '/api/venues', cookies.staff!, { action: 'reconfirm' })).status, 400);
    assert.deepEqual((await call('GET', '/api/venues?bookings=reconfirm', cookies.staff!)).body.bookings, []);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    if (closeRuntime) await closeRuntime();
    await f.close();
  }
});

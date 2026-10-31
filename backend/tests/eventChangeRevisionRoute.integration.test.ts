// SCRUM-237 (E10-S02, #380 review): the Coordinator's save is bound to the
// preview through PATCH /api/events?edit=1&id=…&reviewed=<revision>, driven
// through the real handler with a real cookie session against PostgreSQL.
// The rule itself is proven in arrangementImpact.integration.test.ts; this
// file checks the wiring: the query parameter, the 409 body and that a
// stale save is not offered a change request.
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

test('the save route refuses a stale preview revision with the fresh list, and saves with a current one', async () => {
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

    const org = randomUUID(), organiser = randomUUID(), coordinator = randomUUID();
    await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A')`, [org]);
    for (const [id, orgId, role] of [[organiser, org, 'event_organiser'], [coordinator, null, 'event_coordinator']]) {
      await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, 'unused', $4, $5::user_role)`, [id, orgId, `${id}@example.test`, `Person ${role}`, role]);
    }
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    await f.pool.query(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
      [tokenDigest(token), coordinator]);
    const cookie = `cs_access=${token}`;

    const event = randomUUID();
    const range = '[2027-03-12 00:00Z,2027-03-14 00:00Z)';
    // Inserting the Event creates its sole Session (0014).
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, 'EVT-RV1', $2, $3, $4, 'Revision route', 'planning', $5, 80)`, [event, organiser, coordinator, org, range]);
    const session = (await f.pool.query('SELECT id FROM sessions WHERE event_id=$1', [event])).rows[0].id as string;
    const book = async (name: string) => {
      const venue = randomUUID();
      await f.pool.query(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at) VALUES ($1, $2, 'Level 1', 200, '00:00', '23:59')`, [venue, name]);
      return (await f.pool.query(`INSERT INTO venue_bookings (event_id, session_id, venue_id, booking_range, status) VALUES ($1, $2, $3, $4, 'confirmed') RETURNING id`,
        [event, session, venue, range])).rows[0].id as string;
    };
    const hallA = await book('Hall A');

    async function patch(query: string, body: unknown) {
      let status = 200;
      let reply: Record<string, any> = {};
      const response: VercelResponse = {
        setHeader() {},
        status(code) { status = code; return { json(value) { reply = value as typeof reply; } }; },
        json(value) { reply = value as typeof reply; },
      };
      await handler({ method: 'PATCH', url: `/api/events?edit=1&id=EVT-RV1${query}`, headers: { cookie, origin: 'https://app.example.test' }, body } as VercelRequest, response);
      return { status, body: reply };
    }
    const move = { startAt: '2027-03-19T00:00:00Z', endAt: '2027-03-21T00:00:00Z' };

    const preview = await patch('&preview=1', move);
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.body.impact.bookings.map((booking: { id: string }) => booking.id), [hallA]);
    assert.match(preview.body.revision, /^[0-9a-f]{32}$/);

    const hallB = await book('Hall B');
    const stale = await patch(`&reviewed=${preview.body.revision}`, move);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error, 'arrangements_changed');
    assert.equal(stale.body.message, 'What this change affects has changed since you checked. Review the updated list before saving.');
    assert.deepEqual(stale.body.impact.bookings.map((booking: { id: string }) => booking.id).sort(), [hallA, hallB].sort());
    assert.notEqual(stale.body.revision, preview.body.revision);
    assert.equal(stale.body.changeRequestUrl, undefined, 'a stale review is not a restricted field, so no change request is offered');
    assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM venue_bookings WHERE event_id=$1 AND requires_reconfirmation', [event])).rows[0].n, 0);

    const current = await patch(`&reviewed=${stale.body.revision}`, move);
    assert.equal(current.status, 200);
    assert.equal(current.body.revision, stale.body.revision);
    assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM venue_bookings WHERE event_id=$1 AND requires_reconfirmation', [event])).rows[0].n, 2);

    // Callers that send no revision (the Organiser's form) save as before.
    const unbound = await patch('', { description: 'No preview' });
    assert.equal(unbound.status, 200);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    if (closeRuntime) await closeRuntime();
    await f.close();
  }
});

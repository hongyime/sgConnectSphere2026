// E07-S06 (SCRUM-56) against PostgreSQL: requests are recorded and notify only
// active Technical Support Staff; requests are accepted before any venue is
// confirmed; "no support needed" records a declaration without notifying
// anyone; refusals leave nothing behind. Needs TEST_DATABASE_URL pointing at a
// disposable local database (see tests/helpers/loginDatabase.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { declareNoSupport, getSupportRequests, requestSupport } from '../src/modules/equipmentSupport/supportRequests.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL', async () => {
  const db = await loginDatabase();
  const { pool } = db;
  const q = pool.query.bind(pool);
  const org = randomUUID(), organiser = randomUUID(), coordId = randomUUID(), otherCoordId = randomUUID();
  const techA = randomUUID(), techB = randomUUID(), techInactive = randomUUID();
  const coord: AuthenticatedUser = { id: coordId, email: 'coord@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };
  const otherCoord: AuthenticatedUser = { ...coord, id: otherCoordId };
  const tech: AuthenticatedUser = { ...coord, id: techA, role: 'technical_support_staff' };
  try {
    await q(`INSERT INTO client_organisations(id,name) VALUES ($1,'Test client')`, [org]);
    for (const [id, role, active] of [[organiser, 'event_organiser', true], [coordId, 'event_coordinator', true], [otherCoordId, 'event_coordinator', true],
      [techA, 'technical_support_staff', true], [techB, 'technical_support_staff', true], [techInactive, 'technical_support_staff', false]] as const) {
      await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id,is_active) VALUES ($1,$2,'unused','Synthetic user',$3,$4,$5)`,
        [id, `${id}@example.test`, role, org, active]);
    }
    async function event(code: string, status: string) {
      const id = randomUUID();
      await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status)
        VALUES ($1,$2,$3,$4,$5,$2,'[2026-11-12 09:00+08,2026-11-12 12:00+08)'::tstzrange,100,$6)`, [id, code, organiser, coordId, org, status]);
      return id;
    }
    const conference = await event('EVT-TECH', 'planning');
    const approved = await event('EVT-APPROVED', 'approved');
    const confirmed = await event('EVT-CONFIRMED', 'confirmed');
    const run = await event('EVT-RUN', 'planning');
    const body = { description: '1 AV technician for the full event', startsAt: '2026-11-12T01:00:00.000Z', endsAt: '2026-11-12T04:00:00.000Z' };

    // TC_E07S06_01: recorded against the event; active Technical Support Staff notified, the inactive one not.
    const created = await requestSupport(pool, coord, 'EVT-TECH', body);
    assert.equal(created.status, 201);
    assert.equal((created.body as { notified: number }).notified, 2);
    const stored = (await q(`SELECT support_required, support_description, status, requested_by,
      lower(support_range) AS starts, upper(support_range) AS ends FROM tech_support_requests WHERE event_id=$1`, [conference])).rows;
    assert.equal(stored.length, 1);
    assert.deepEqual([stored[0].support_required, stored[0].support_description, stored[0].status, stored[0].requested_by],
      [true, body.description, 'open', coordId]);
    assert.equal(new Date(stored[0].starts).toISOString(), body.startsAt);
    assert.equal(new Date(stored[0].ends).toISOString(), body.endsAt);
    const notified = (await q(`SELECT user_id FROM notifications WHERE event_id=$1 ORDER BY user_id`, [conference])).rows.map(r => r.user_id);
    assert.deepEqual(notified, [techA, techB].sort());
    assert.equal((await q(`SELECT * FROM notification_deliveries`)).rowCount, 2);
    const asTech = await getSupportRequests(q, tech, 'EVT-TECH');
    assert.equal(asTech.requests.length, 1);
    assert.equal(asTech.canEdit, false);

    // TC_E07S06_02: an approved event with no venue booking accepts a request.
    assert.equal((await q(`SELECT * FROM venue_bookings WHERE event_id=$1`, [approved])).rowCount, 0);
    assert.equal((await requestSupport(pool, coord, approved, { ...body, description: '1 sound technician' })).status, 201);

    // TC_E07S06_03: "no support needed" records a declaration, creates no request and notifies nobody.
    const before = (await q(`SELECT count(*)::int AS n FROM notifications`)).rows[0].n;
    assert.equal((await declareNoSupport(pool, coord, 'EVT-RUN')).status, 200);
    assert.equal((await declareNoSupport(pool, coord, 'EVT-RUN')).status, 200);
    const declarations = (await q(`SELECT support_required FROM tech_support_requests WHERE event_id=$1`, [run])).rows;
    assert.deepEqual(declarations, [{ support_required: false }]);
    assert.equal((await q(`SELECT count(*)::int AS n FROM notifications`)).rows[0].n, before);
    const runView = await getSupportRequests(q, coord, 'EVT-RUN');
    assert.deepEqual([runView.requests, runView.noSupportRequired], [[], true]);
    // A later request replaces the declaration.
    await requestSupport(pool, coord, 'EVT-RUN', body);
    assert.deepEqual((await q(`SELECT support_required FROM tech_support_requests WHERE event_id=$1`, [run])).rows, [{ support_required: true }]);
    await assert.rejects(declareNoSupport(pool, coord, 'EVT-RUN'), { status: 409 });

    // Refusals change nothing, and the refusal is audited.
    await assert.rejects(requestSupport(pool, coord, 'EVT-CONFIRMED', body), { status: 409 });
    assert.equal((await q(`SELECT * FROM tech_support_requests WHERE event_id=$1`, [confirmed])).rowCount, 0);
    await assert.rejects(requestSupport(pool, otherCoord, 'EVT-TECH', body), { status: 403 });
    assert.equal((await q(`SELECT * FROM tech_support_requests WHERE event_id=$1`, [conference])).rowCount, 1);
    assert.equal((await q(`SELECT * FROM audit_logs WHERE actor_id=$1 AND action='Access Denied'`, [otherCoordId])).rowCount, 1);
  } finally {
    await db.close();
  }
});

// SCRUM-180 / E02-S07 Event-level delivery. Real cookie-authenticated API and
// PostgreSQL persistence, including the automatically mirrored sole Session.
// This does NOT prove authoring or validating independent Session dates; that
// requires the E04 write path and remains a separate acceptance gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { VercelRequest, VercelResponse } from '../src/vercel.js';

test('TC_E02S07_01 TC_E02S07_02 TC_E02S07_03 TC_E02S07_04 Event-only API horizon and draft resubmission persist correctly', async t => {
  const f = await loginDatabase();
  const savedEnvironment = { ...process.env };
  let closeRuntime: (() => Promise<unknown>) | undefined;
  try {
    process.env.DATABASE_URL = f.connectionString;
    delete process.env.DATABASE_POOLER_URL;
    process.env.APP_URL = 'https://app.example.test';
    const { tokenDigest } = await import('../src/modules/accessControl/sessions.js');
    const { getDatabasePool } = await import('../src/database/client.js');
    const { default: handler } = await import('../../api/events.js');
    const { twoCalendarYearsFromSingaporeDate, singaporeDateKey } = await import('../src/modules/eventLifecycle/dateHorizon.js');
    closeRuntime = () => getDatabasePool().end();
    const org = randomUUID(), owner = randomUUID();
    await f.pool.query("INSERT INTO client_organisations(id,name) VALUES($1,'Horizon test')", [org]);
    await f.pool.query(`INSERT INTO users(id,client_org_id,email,password_hash,full_name,role)
      VALUES($1,$2,$3,'unused','Horizon organiser','event_organiser')`, [owner,org,`${owner}@example.test`]);
    const token = randomBytes(32).toString('hex');
    await f.pool.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')", [tokenDigest(token), owner]);
    async function call(method: string, body: unknown, id?: string, signedIn = true) {
      const replies: { status: number; body: any }[] = [];
      const response: VercelResponse = {
        setHeader() {},
        status(status) { return { json(body) { replies.push({ status, body }); } }; },
        json(body) { replies.push({ status: 200, body }); },
      };
      await handler({ method, url: `/api/events${id ? `?id=${id}` : ''}`, headers: { origin: 'https://app.example.test', ...(signedIn ? { cookie: `cs_access=${token}` } : {}) }, body } as VercelRequest, response);
      assert.equal(replies.length, 1, 'each request sends exactly one response');
      return replies[0];
    }
    const tomorrow = new Date(Date.now() + 86400000);
    const maximumDate = twoCalendarYearsFromSingaporeDate(new Date());
    const boundaryStart = new Date(`${maximumDate}T09:00:00+08:00`);
    const boundaryEnd = new Date(`${maximumDate}T23:59:59.999+08:00`);
    const beyond = new Date(boundaryStart.getTime() + 86400000);
    const request = (startAt = tomorrow, endAt = new Date(startAt.getTime() + 3600000)) => ({
      title: 'Horizon request', description: 'Complete request', purpose: 'Testing submission', status: 'submitted',
      startAt: startAt.toISOString(), endAt: endAt.toISOString(), expectedAttendance: 20,
      venueRequirements: 'Small room', accessibilityNote: 'Step-free', equipmentRequirements: 'none_required',
      layoutPreference: 'none_required', registrationSetup: 'none_required',
    });
    async function stored(id: string) {
      return (await f.pool.query(`SELECT e.status,lower(e.event_range) AS starts_at,
        upper(e.event_range) AS ends_at,lower(s.session_range) AS session_start,upper(s.session_range) AS session_end
        FROM events e JOIN sessions s ON s.event_id=e.id WHERE e.id=$1`, [id])).rows;
    }
    await t.test('start beyond horizon refuses without an Event or Session', async () => {
      const response = await call('POST', request(beyond));
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, { error: 'event_date_outside_horizon', field: 'startAt', maximumDate });
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM events')).rows[0].n, 0);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM sessions')).rows[0].n, 0);
    });
    await t.test('end beyond horizon identifies endAt', async () => {
      const response = await call('POST', request(tomorrow, beyond));
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, { error: 'event_date_outside_horizon', field: 'endAt', maximumDate });
    });
    await t.test('the last millisecond of the boundary date is allowed and mirrored to the default Session', async () => {
      const response = await call('POST', request(boundaryStart, boundaryEnd));
      assert.equal(response.status, 201);
      const rows = await stored(response.body.event.id);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].starts_at.toISOString(), boundaryStart.toISOString());
      assert.equal(rows[0].ends_at.toISOString(), boundaryEnd.toISOString());
      assert.equal(rows[0].session_start.toISOString(), boundaryStart.toISOString());
      assert.equal(rows[0].session_end.toISOString(), boundaryEnd.toISOString());
      assert.equal(singaporeDateKey(rows[0].session_end), maximumDate);
    });
    await t.test('near-term Event has no minimum lead-time refusal', async () => {
      const response = await call('POST', request());
      assert.equal(response.status, 201);
      assert.notEqual((await stored(response.body.event.id))[0].status, 'draft');
    });
    await t.test('the past Event rule still blocks submission', async () => {
      const response = await call('POST', request(new Date(Date.now() - 86400000)));
      assert.equal(response.status, 400);
      assert.equal(response.body.error, 'Preferred date must be in the future');
    });
    await t.test('far-future draft saves, refused submission keeps it intact, correction permits submission', async () => {
      const created = await call('POST', { ...request(beyond), status: 'draft' });
      assert.equal(created.status, 201);
      const id = created.body.event.id;
      const before = await stored(id);
      assert.equal(before[0].status, 'draft');
      const rejected = await call('PATCH', { status: 'submitted' }, id);
      assert.equal(rejected.status, 400);
      assert.deepEqual(rejected.body, { error: 'event_date_outside_horizon', field: 'startAt', maximumDate });
      assert.deepEqual(await stored(id), before);
      const corrected = await call('PATCH', { ...request(), status: 'submitted' }, id);
      assert.equal(corrected.status, 200);
      const rows = await stored(id);
      assert.notEqual(rows[0].status, 'draft');
      assert.equal(rows[0].session_start.toISOString(), tomorrow.toISOString());
    });
    await t.test('unsigned requests still require authentication', async () => {
      assert.equal((await call('POST', request(), undefined, false)).status, 401);
    });
  } finally {
    if (closeRuntime) await closeRuntime();
    for (const key of Object.keys(process.env)) if (!(key in savedEnvironment)) delete process.env[key];
    Object.assign(process.env, savedEnvironment);
    await f.close();
  }
});

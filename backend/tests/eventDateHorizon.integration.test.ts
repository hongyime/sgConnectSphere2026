// SCRUM-180 / E02-S07 Event-level delivery. Real cookie-authenticated API and
// PostgreSQL persistence, including the automatically mirrored sole Session.
// Independent Sessions are authored through the real E04 API and rechecked on submission.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { VercelRequest, VercelResponse } from '../src/vercel.js';

test('TC_E02S07_01 TC_E02S07_02 TC_E02S07_03 TC_E02S07_04 Event and Session API horizon and draft resubmission persist correctly', async t => {
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
    async function call(method: string, body: unknown, id?: string, signedIn = true, extra = '') {
      const replies: { status: number; body: any }[] = [];
      const response: VercelResponse = {
        setHeader() {},
        status(status) { return { json(body) { replies.push({ status, body }); } }; },
        json(body) { replies.push({ status: 200, body }); },
      };
      await handler({ method, url: `/api/events${id ? `?id=${id}${extra}` : ''}`, headers: { origin: 'https://app.example.test', ...(signedIn ? { cookie: `cs_access=${token}` } : {}) }, body } as VercelRequest, response);
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
    async function twoSessions(startAt = tomorrow, endAt = new Date(startAt.getTime() + 3600000)) {
      const created = await call('POST', { ...request(startAt, endAt), status: 'draft' });
      assert.equal(created.status, 201);
      const id = created.body.event.id;
      const first = (await call('GET', undefined, id, true, '&sessions=1')).body.sessions[0];
      const added = await call('POST', { title: 'Afternoon', startAt: startAt.toISOString(), endAt: endAt.toISOString(), expectedAttendance: 20 }, id, true, '&sessions=1');
      assert.equal(added.status, 201);
      return { id, first: first.id, second: added.body.session.id };
    }
    const editSession = (eventId: string, sessionId: string, start: Date, end: Date) => call('PATCH', {
      title: 'Afternoon', startAt: start.toISOString(), endAt: end.toISOString(), expectedAttendance: 20,
    }, eventId, true, `&sessions=1&sessionId=${sessionId}`);
    for (const field of ['startAt', 'endAt']) {
      await t.test(`TC_E02S07_01: beyond-horizon Session ${field} blocks submission, correction permits resubmission`, async () => {
        const draft = await twoSessions();
        assert.equal((await editSession(draft.id, draft.second, field === 'startAt' ? beyond : tomorrow, new Date(beyond.getTime() + 3600000))).status, 200);
        const before = await stored(draft.id);
        const auditCount = (await f.pool.query('SELECT count(*) n FROM audit_logs WHERE event_id=$1', [draft.id])).rows[0].n;
        const rejected = await call('PATCH', { status: 'submitted' }, draft.id);
        assert.equal(rejected.status, 400);
        assert.equal(rejected.body.error, 'session_date_outside_horizon');
        assert.equal(rejected.body.sessionId, draft.second);
        assert.equal(rejected.body.sessionTitle, 'Afternoon');
        assert.equal(rejected.body.field, field);
        assert.equal(rejected.body.maximumDate, maximumDate);
        assert.deepEqual(await stored(draft.id), before);
        assert.equal((await f.pool.query('SELECT count(*) n FROM audit_logs WHERE event_id=$1', [draft.id])).rows[0].n, auditCount);
        assert.equal((await editSession(draft.id, draft.second, tomorrow, new Date(tomorrow.getTime() + 3600000))).status, 200);
        assert.equal((await call('PATCH', { status: 'submitted' }, draft.id)).status, 200);
      });
    }
    await t.test('TC_E02S07_02: multiple Sessions on the inclusive Singapore boundary submit unchanged', async () => {
      const draft = await twoSessions(boundaryStart, boundaryEnd);
      const before = (await stored(draft.id)).map(row => row.session_end.toISOString());
      assert.equal((await call('PATCH', { status: 'submitted' }, draft.id)).status, 200);
      assert.deepEqual((await stored(draft.id)).map(row => row.session_end.toISOString()), before);
    });
    await t.test('TC_E02S07_03: multiple next-day Sessions submit without a minimum lead time', async () => {
      const draft = await twoSessions();
      assert.equal((await call('PATCH', { status: 'submitted' }, draft.id)).status, 200);
      assert.equal((await stored(draft.id)).length, 2);
    });
    await t.test('TC_E02S07_04 TC_E02S07_05: a past Session blocks a future Event, then passes after correction', async () => {
      const draft = await twoSessions();
      const past = new Date(Date.now() - 86400000);
      assert.equal((await editSession(draft.id, draft.first, past, new Date(past.getTime() + 3600000))).status, 200);
      const before = await stored(draft.id);
      const rejected = await call('PATCH', { status: 'submitted' }, draft.id);
      assert.equal(rejected.status, 400);
      assert.equal(rejected.body.error, 'session_date_in_past');
      assert.equal(rejected.body.sessionId, draft.first);
      assert.equal(rejected.body.field, 'startAt');
      assert.deepEqual(await stored(draft.id), before);
      assert.equal((await editSession(draft.id, draft.first, tomorrow, new Date(tomorrow.getTime() + 3600000))).status, 200);
      assert.equal((await call('PATCH', { status: 'submitted' }, draft.id)).status, 200);
    });
    for (const action of ['insert', 'update']) {
      await t.test(`submission lock refuses a queued draft Session ${action} after submission`, async () => {
        const draft = await twoSessions();
        const { createSessionRepository } = await import('../src/modules/eventSessions/repository.js');
        const { Pool } = await import('pg');
        const writer = new Pool({ connectionString: f.connectionString, max: 1 });
        const locker = await f.pool.connect();
        try {
          const pid = (await writer.query('SELECT pg_backend_pid() pid')).rows[0].pid;
          await locker.query('BEGIN');
          await locker.query('SELECT id FROM events WHERE id=$1 FOR UPDATE', [draft.id]);
          const repository = createSessionRepository(writer);
          const input = { title: 'Queued invalid edit', startAt: beyond, endAt: new Date(beyond.getTime() + 3600000), expectedAttendance: 20 };
          const pending = (action === 'insert' ? repository.insertSession(draft.id, input) : repository.updateSession(draft.second, draft.id, input))
            .then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
          let waiting = false;
          for (let i = 0; i < 100; i++) {
            waiting = (await f.pool.query("SELECT wait_event_type='Lock' waiting FROM pg_stat_activity WHERE pid=$1", [pid])).rows[0]?.waiting;
            if (waiting) break;
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          assert.equal(waiting, true, 'the Session writer waits for the Event lock');
          await locker.query("UPDATE events SET status='submitted' WHERE id=$1", [draft.id]);
          await locker.query('COMMIT');
          const outcome = await pending;
          assert.equal(outcome.error?.status, 409);
          assert.equal((await stored(draft.id)).length, 2);
          assert.equal((await f.pool.query("SELECT count(*)::int n FROM sessions WHERE event_id=$1 AND title='Queued invalid edit'", [draft.id])).rows[0].n, 0);
        } finally {
          await locker.query('ROLLBACK');
          locker.release();
          await writer.end();
        }
      });
    }
    await t.test('draft Session writers refuse a missing Event', async () => {
      const { createSessionRepository } = await import('../src/modules/eventSessions/repository.js');
      const repository = createSessionRepository(f.pool);
      const input = { startAt: tomorrow, endAt: new Date(tomorrow.getTime() + 3600000), expectedAttendance: 20 };
      await assert.rejects(repository.insertSession(randomUUID(), input), { status: 409 });
      await assert.rejects(repository.updateSession(randomUUID(), randomUUID(), input), { status: 409 });
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

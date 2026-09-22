import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { hashPassword, verifyPassword } from '../src/modules/accessControl/passwords';
import { attendeeEvents, publishEvent } from '../src/modules/attendeeVisibility/service';
import { permittedDelivery } from '../src/modules/eventVisibility/service';
import type { Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';
import type { VercelRequest, VercelResponse } from '../src/vercel';

test('E01-S03: real PostgreSQL sign-in, published fields, registration isolation and audited planning denial', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Use a disposable TEST_DATABASE_URL');
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect();
  const schema = `attendee_${randomUUID().replaceAll('-', '')}`;
  const ids = Array.from({ length: 9 }, () => randomUUID());
  const [org, organiser, coordinator, attendee, other, event, hidden, layout, venue] = ids;
  const savedEnv = { ...process.env };
  let closeRuntime: (() => Promise<void>) | undefined;
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public');
    await db.query('CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public');
    await db.query(`CREATE SCHEMA ${schema}`); await db.query(`SET search_path TO ${schema}, public`);
    for (const migration of ['0001_connectsphere_schema.sql', '0002_event_visibility.sql', '0003_auth_sessions.sql', '0004_attendee_visibility.sql']) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    const credential = randomUUID();
    const digest = await hashPassword(credential);
    assert.equal(await verifyPassword(credential, digest), true);
    assert.equal(await verifyPassword('wrong', digest), false);
    assert.equal(await verifyPassword(credential, 'seed-sha256:legacy'), false);
    await db.query('INSERT INTO client_organisations(id,name) VALUES ($1, $2)', [org, 'Test client']);
    for (const [id, role, email] of [[organiser, 'event_organiser', 'organiser@example.test'], [coordinator, 'event_coordinator', 'coordinator@example.test'], [attendee, 'attendee', 'attendee@example.test'], [other, 'attendee', 'other@example.test']]) {
      await db.query('INSERT INTO users(id, client_org_id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5,$6)', [id, org, email, digest, role, role]);
    }
    await db.query("INSERT INTO room_layouts(id, code, label) VALUES ($1,'theatre','Theatre')", [layout]);
    await db.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES ($1,'Published Hall','Level 2',100,'08:00','22:00')", [venue]);
    for (const [id, code, title] of [[event, 'EVT-PUB', 'Published event'], [hidden, 'EVT-HIDDEN', 'Unregistered event']]) {
      await db.query(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,description,purpose,decision_reason,status,event_range,expected_attendance,layout_id)
        VALUES ($1,$2,$3,$4,$5,$6,'PRIVATE_DESCRIPTION','PRIVATE_PURPOSE','PRIVATE_DECISION','confirmed','[2027-01-01 09:00Z,2027-01-01 10:00Z)',20,$7)`, [id,code,organiser,coordinator,org,title,layout]);
    }
    await db.query(`INSERT INTO venue_bookings(venue_id,event_id,booking_range,status,decision_reason) VALUES ($1,$2,'[2027-01-01 09:00Z,2027-01-01 10:00Z)','confirmed','PRIVATE_BOOKING')`, [venue,event]);
    await db.query(`INSERT INTO event_threads(event_id,author_id,type,body) VALUES ($1,$2,'comment','PRIVATE_COMMENT')`, [event,coordinator]);
    await db.query('INSERT INTO event_registrations(event_id,attendee_id) VALUES ($1,$2)', [event,attendee]);
    const query: Query = (sql, values) => db.query(sql, values);
    const user: AuthenticatedUser = { id: attendee, email: 'attendee@example.test', role: 'attendee', isActive: true, failedLoginCount: 0 };
    assert.deepEqual(await attendeeEvents(query,user), []); // Registered but not published.
    await assert.rejects(publishEvent(query,user,event), { status: 403 });
    await publishEvent(query,{ ...user, id: coordinator, role: 'event_coordinator' },event);
    await db.query('INSERT INTO event_publications SELECT $1,name,starts_at,ends_at,venue_name,venue_location,published_at FROM event_publications WHERE event_id=$2', [hidden,event]);
    const rows = await attendeeEvents(query,user);
    assert.equal(rows.length,1);
    assert.deepEqual(Object.keys(rows[0]).sort(), ['ends_at','id','name','starts_at','venue_location','venue_name']);
    assert.equal(rows[0].name,'Published event'); assert.equal(rows[0].venue_name,'Published Hall');
    assert.equal(JSON.stringify(rows).includes('PRIVATE_'),false);
    const notification = randomUUID();
    await db.query("INSERT INTO notifications(id,user_id,event_id,title,message) VALUES ($1,$2,$3,'PRIVATE_SUBJECT','PRIVATE_MESSAGE')", [notification,attendee,event]);
    const email = await permittedDelivery(query,notification,user.email);
    assert.ok(email); assert.equal(JSON.stringify(email).includes('PRIVATE_'),false);
    assert.equal(email.subject,'Published event');
    assert.deepEqual(await attendeeEvents(query,{ ...user,id: other }),[]);
    await assert.rejects(attendeeEvents(query,user,hidden), { status: 403 });
    // E14-S02 Scenario 2: denied access to a specific unregistered event is audited too.
    const eventDenialAudit=(await db.query("SELECT * FROM audit_logs WHERE actor_id=$1 AND entity_type='event' AND event_id=$2 AND action='Access Denied'",[attendee,hidden])).rows[0];
    assert.ok(eventDenialAudit);
    await db.query("UPDATE events SET title='PRIVATE_UNPUBLISHED_EDIT' WHERE id=$1", [event]);
    assert.equal((await attendeeEvents(query,user,event))[0].name,'Published event');
    for (const state of ['withdrawn','waitlisted']) {
      await db.query('UPDATE event_registrations SET status=$1 WHERE attendee_id=$2',[state,attendee]);
      assert.deepEqual(await attendeeEvents(query,user),[]);
      assert.equal(await permittedDelivery(query,notification,user.email),null);
    }
    await db.query("UPDATE event_registrations SET status='registered' WHERE attendee_id=$1",[attendee]);

    const url = new URL(process.env.TEST_DATABASE_URL!); url.searchParams.set('options',`-csearch_path=${schema},public`);
    process.env.DATABASE_URL=url.toString(); delete process.env.DATABASE_POOLER_URL; process.env.APP_URL='https://app.example.test';
    const runtime = await import('../src/modules/eventVisibility/runtime'); closeRuntime=()=>runtime.databasePool().end();
    const { default: session } = await import('../../api/auth/session');
    const { default: api } = await import('../../api/attendee/events');
    const { default: planning } = await import('../../api/internal/planning');
    async function call(handler: typeof api, request: VercelRequest) {
      let status=200; let body: any; const headers: Record<string,string>={};
      const response: VercelResponse={ setHeader(k,v){headers[k]=v;},status(code){status=code;return {json(value){body=value;}};},json(value){body=value;} };
      await handler(request,response); return {status,body,headers};
    }
    const attempt = (password: string) => call(session,{method:'POST',headers:{origin:'https://app.example.test'},body:{email:user.email,password}});
    assert.equal((await attempt('wrong')).status,401);
    const signedIn=await attempt(credential); assert.equal(signedIn.status,200);
    const cookie=signedIn.headers['Set-Cookie'].split(';')[0]; assert.match(signedIn.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);
    const response=await call(api,{method:'GET',url:`/api/attendee/events?attendee_id=${other}`,headers:{cookie}});
    assert.equal(response.status,200); assert.equal(response.body.events.length,1);
    assert.equal(JSON.stringify(response.body).includes('PRIVATE_'),false);
    assert.equal(response.headers['Cache-Control'],'private, no-store');
    const before=(await db.query('SELECT clock_timestamp() AS time')).rows[0].time;
    const denied=await call(planning,{method:'GET',url:`/api/internal/planning?id=${event}`,headers:{cookie}});
    assert.equal(denied.status,403); assert.deepEqual(Object.keys(denied.body),['error']);
    const audit=(await db.query("SELECT * FROM audit_logs WHERE actor_id=$1 AND event_id=$2 AND action='Access Denied' AND entity_type='internal_planning' ORDER BY occurred_at DESC LIMIT 1",[attendee,event])).rows[0];
    assert.ok(audit); assert.ok(audit.occurred_at>=before);
    assert.equal((await call(api,{method:'GET',headers:{cookie:'cs_access=forged'}})).status,401);
    assert.equal((await call(session,{method:'DELETE',headers:{cookie,origin:'https://evil.example.test'}})).status,403);
    assert.equal((await call(session,{method:'DELETE',headers:{cookie,origin:'https://app.example.test'}})).status,200);
    assert.equal((await call(api,{method:'GET',headers:{cookie}})).status,401);
    for(let i=0;i<5;i++) await attempt('wrong');
    assert.equal((await attempt(credential)).status,401);
  } finally {
    if(closeRuntime) await closeRuntime();
    for(const key of ['DATABASE_URL','DATABASE_POOLER_URL','APP_URL']) { if(savedEnv[key]===undefined) delete process.env[key]; else process.env[key]=savedEnv[key]; }
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await db.end();
  }
});

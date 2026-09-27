// E11-S01 / PR #143: real isolated PostgreSQL via helpers/loginDatabase.ts.
// Synthetic event/account fixtures prove SQL filtering, ordering, read persistence
// and email-only capability isolation; only the outbound email provider is stubbed.
import type { Pool } from 'pg';
import { sendVerificationEmail } from '../src/modules/accessControl/verificationEmail.js';
import { consumeVerificationToken } from '../src/modules/accessControl/verificationTokens.js';
import { requestPasswordReset } from '../src/modules/accessControl/passwordReset.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { inTransaction } from '../src/database/pool.js';
import { insertNotificationDelivery, postgresDeliveryStore } from '../src/modules/notificationDispatcher/postgres.js';
import { dispatchCommittedDeliveries } from '../src/modules/notificationDispatcher/dispatch.js';
import { listInbox, markInboxRead } from '../src/modules/eventNotifications/inbox.js';

async function eventFixture(pool: Pool) {
  const org=randomUUID(), organiser=randomUUID(), event=randomUUID();
  await pool.query('INSERT INTO client_organisations(id,name) VALUES($1,$2)',[org,org]);
  await pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id)
    VALUES($1,$2,'unused','Synthetic organiser','event_organiser',$3)`,[organiser,`${organiser}@example.test`,org]);
  await pool.query(`INSERT INTO events(id,organiser_id,client_org_id,title,status,event_range,expected_attendance)
    VALUES($1,$2,$3,'Public event','confirmed','[2027-01-01 09:00Z,2027-01-01 12:00Z)',20)`,[event,organiser,org]);
  return event;
}

test('TC_E11S01_06 TC_E11S01_07: PostgreSQL inbox ownership, ordering and persistent idempotent read state', async () => {
  const f = await loginDatabase();
  try {
    const owner = randomUUID(), other = randomUUID();
    for (const id of [owner, other]) await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role)
      VALUES($1,$2,'unused','Synthetic inbox user','attendee')`,[id,`${id}@example.test`]);
    const event = await eventFixture(f.pool);
    const ids = [randomUUID(),randomUUID(),randomUUID()];
    for (let index=0; index<ids.length; index++) await f.pool.query(`INSERT INTO notifications(id,user_id,title,message,created_at,event_id)
      VALUES($1,$2,'Event update','Public change',$3,$4)`,[ids[index], index===2?other:owner,`2026-09-${20+index}T09:00:00Z`,event]);
    const query = f.pool.query.bind(f.pool);
    const rows = await listInbox(query, owner);
    assert.deepEqual(rows.map(row=>row.id),[ids[1],ids[0]]);
    assert.ok(rows.every(row=>row.is_read===false && row.read_at===null));
    const read = await markInboxRead(query, owner, ids[1]);
    assert.equal(read.is_read,true); assert.ok(read.read_at);
    assert.deepEqual((await markInboxRead(query, owner, ids[1])).read_at,read.read_at);
    assert.equal((await listInbox(query,owner))[0].is_read,true);
    await assert.rejects(markInboxRead(query,owner,ids[2]),{status:404});
    assert.equal((await listInbox(query,other))[0].is_read,false);
    assert.deepEqual(await listInbox(query,randomUUID()),[]);
  } finally { await f.close(); }
});


test('prepared email uses current account email and a provider rejection preserves the inbox', async () => {
  const f=await loginDatabase();
  try {
    const owner=randomUUID(), notification=randomUUID();
    await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role)
      VALUES($1,$2,'unused','Synthetic user','attendee')`,[owner,`${owner}@example.test`]);
    const currentEmail=`updated-${owner}@example.test`;
    await f.pool.query('UPDATE users SET email=$1 WHERE id=$2',[currentEmail,owner]);
    const event=await eventFixture(f.pool);
    const delivery=await inTransaction(f.pool, async client=>{
      await client.query(`INSERT INTO notifications(id,user_id,title,message,event_id)
        VALUES($1,$2,'Public event update','The event has been confirmed.',$3)`,[notification,owner,event]);
      return insertNotificationDelivery(client,notification);
    });
    let attempts=0;
    await dispatchCommittedDeliveries(postgresDeliveryStore(f.pool),{
      async publish() {}, async peek() {return [delivery];}, async acknowledge() {}, async defer() {},
    },async lease=>{
      attempts++;
      assert.equal(lease.to,currentEmail);
      assert.match(lease.html,/The event has been confirmed/);
      return {kind:'failed',code:'provider_rejected'};
    });
    assert.equal(attempts,1);
    assert.equal((await f.pool.query('SELECT delivery_status FROM notification_deliveries WHERE id=$1',[delivery])).rows[0].delivery_status,'failed');
    const inbox=await listInbox(f.pool.query.bind(f.pool),owner);
    assert.equal(inbox.length,1); assert.equal(inbox[0].id,notification);
    assert.equal(inbox[0].is_read,false);
  } finally {await f.close();}
});


test('PR #143: email verification and other eventless notices never enter inbox responses', async () => {
  const f=await loginDatabase();
  try {
    const owner=randomUUID(), email=`${owner}@example.test`;
    await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role)
      VALUES($1,$2,'unused','Unverified attendee','attendee')`,[owner,email]);
    const event=await eventFixture(f.pool);
    const verification=await sendVerificationEmail({pool:f.pool,userId:owner,appUrl:'https://app.example.test'});
    await requestPasswordReset(f.pool,email);
    const other=(await f.pool.query(`INSERT INTO notifications(user_id,title,message)
      VALUES($1,'Security notice','Synthetic email-only capability') RETURNING id`,[owner])).rows[0].id;
    const notice=(await f.pool.query(`INSERT INTO notifications(user_id,event_id,title,message)
      VALUES($1,$2,'Event update','Safe public event message') RETURNING id`,[owner,event])).rows[0].id;
    const query=f.pool.query.bind(f.pool);
    const inbox=await listInbox(query,owner);
    assert.deepEqual(inbox.map(row=>row.id),[notice]);
    assert.equal(JSON.stringify(inbox).includes(verification.token),false);
    assert.equal(JSON.stringify(inbox).includes('/verify?token='),false);
    for (const row of (await f.pool.query('SELECT id FROM notifications WHERE user_id=$1 AND event_id IS NULL',[owner])).rows) {
      await assert.rejects(markInboxRead(query,owner,row.id),{status:404});
    }
    assert.equal((await f.pool.query('SELECT is_read FROM notifications WHERE id=$1',[other])).rows[0].is_read,false);
    assert.equal((await markInboxRead(query,owner,notice)).is_read,true);
    let sent=0;
    await dispatchCommittedDeliveries(postgresDeliveryStore(f.pool),{
      async publish() {},async peek() {return [verification.deliveryId];},async acknowledge() {},async defer() {},
    },async lease=>{
      assert.equal(lease.to,email);
      assert.ok(lease.html.includes('/verify?token='+verification.token));
      sent++; return {kind:'sent'};
    });
    assert.equal(sent,1);
    await consumeVerificationToken(f.pool,verification.token,'email_verification');
    assert.ok((await f.pool.query('SELECT email_verified_at FROM users WHERE id=$1',[owner])).rows[0].email_verified_at);
  } finally {await f.close();}
});

test('PR #143: inbox is capped at the newest 100 event notifications', async () => {
  const f=await loginDatabase();
  try {
    const event=await eventFixture(f.pool);
    const owner=(await f.pool.query('SELECT organiser_id FROM events WHERE id=$1',[event])).rows[0].organiser_id;
    await f.pool.query(`INSERT INTO notifications(user_id,event_id,title,message,created_at)
      SELECT $1,$2,'Event update',i::text,'2026-01-01'::timestamptz+i*interval '1 minute' FROM generate_series(1,105) i`,[owner,event]);
    const rows=await listInbox(f.pool.query.bind(f.pool),owner);
    assert.equal(rows.length,100);assert.equal(rows[0].message,'105');assert.equal(rows[99].message,'6');
  } finally {await f.close();}
});

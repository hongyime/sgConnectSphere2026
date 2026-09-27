import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { inTransaction } from '../src/database/pool.js';
import { insertNotificationDelivery, postgresDeliveryStore } from '../src/modules/notificationDispatcher/postgres.js';
import { dispatchCommittedDeliveries } from '../src/modules/notificationDispatcher/dispatch.js';
import { listInbox, markInboxRead } from '../src/modules/eventNotifications/inbox.js';

test('TC_E11S01_06 TC_E11S01_07: PostgreSQL inbox ownership, ordering and persistent idempotent read state', async () => {
  const f = await loginDatabase();
  try {
    const owner = randomUUID(), other = randomUUID();
    for (const id of [owner, other]) await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role)
      VALUES($1,$2,'unused','Synthetic inbox user','attendee')`,[id,`${id}@example.test`]);
    const ids = [randomUUID(),randomUUID(),randomUUID()];
    for (let index=0; index<ids.length; index++) await f.pool.query(`INSERT INTO notifications(id,user_id,title,message,created_at)
      VALUES($1,$2,'Event update','Public change',$3)`,[ids[index], index===2?other:owner,`2026-09-${20+index}T09:00:00Z`]);
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
    const delivery=await inTransaction(f.pool, async client=>{
      await client.query(`INSERT INTO notifications(id,user_id,title,message)
        VALUES($1,$2,'Public event update','The event has been confirmed.')`,[notification,owner]);
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

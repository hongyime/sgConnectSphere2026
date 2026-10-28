import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { obsoletePendingChangeRequests } from '../src/modules/eventLifecycle/obsoleteChangeRequests.js';

for (const terminalStatus of ['completed', 'cancelled'] as const) {
  test(`TC_E10S01_06 TC_E10S01_07 ${terminalStatus}: Pending-only update and one history entry per affected request`, async () => {
    const calls: { sql: string; values: unknown[] }[] = [];
    const actor = terminalStatus === 'completed' ? null : 'coordinator';
    const client = { query: async (sql: string, values: unknown[]) => {
      calls.push({ sql, values });
      return { rows: calls.length === 1 ? [{ id: 'request-a' }, { id: 'request-b' }] : [] };
    }} as unknown as PoolClient;
    await obsoletePendingChangeRequests(client, 'event', actor, terminalStatus);
    assert.match(calls[0].sql, /WHERE event_id=\$1 AND status='pending'/);
    assert.match(calls[0].sql, /SET status='obsolete'/);
    assert.match(calls[0].sql, /reviewed_at=now\(\)/);
    assert.deepEqual(calls[0].values, ['event', actor, `Event ${terminalStatus}`]);
    assert.equal(calls.length, 3);
    for (const [index, id] of ['request-a', 'request-b'].entries()) {
      assert.match(calls[index + 1].sql, /'Change request became Obsolete','status','pending','obsolete'/);
      assert.deepEqual(calls[index + 1].values, [actor, id, 'event']);
    }
  });
}
test('No affected Pending requests means no new history (including retries)', async () => {
  let calls = 0;
  const client = { query: async () => { calls++; return { rows: [] }; } } as unknown as PoolClient;
  await obsoletePendingChangeRequests(client, 'event', 'coordinator', 'completed');
  assert.equal(calls, 1);
});
for (const failAt of [1, 2, 3]) {
  test(`Failure at query ${failAt} propagates to the owning transaction`, async () => {
    let calls = 0;
    const failure = new Error('synthetic failure');
    const client = { query: async () => {
      if (++calls === failAt) throw failure;
      return { rows: [{ id: 'a' }, { id: 'b' }] };
    }} as unknown as PoolClient;
    await assert.rejects(obsoletePendingChangeRequests(client, 'event', null, 'completed'), failure);
    assert.equal(calls, failAt);
  });
}

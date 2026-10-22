import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { equipmentStaffRecipients, notifyEquipmentStaff } from '../src/modules/equipmentSupport/notifications.js';

test('TC_E11S01_10 TC_E11S01_11 equipment staff selection is event-scoped and snapshots are deduplicated', async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const client = { query: async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT DISTINCT')) return { rows: [{ id: 'staff' }] };
    return { rows: [], rowCount: 0 };
  } } as unknown as PoolClient;
  assert.deepEqual(await equipmentStaffRecipients(client, 'event', 'actor'), ['staff']);
  assert.deepEqual(calls[0]!.values, ['event', 'actor']);
  const input = { eventId: 'event', actorId: 'actor', changeId: 'change',
    occurredAt: new Date('2026-10-18T00:00:00Z'), title: 'Equipment released', message: 'Microphone released.' };
  await notifyEquipmentStaff(client, { ...input, recipients: ['actor', 'staff', 'staff'] });
  await notifyEquipmentStaff(client, input);
  await notifyEquipmentStaff(client, { ...input, recipients: [] });
  assert.equal(calls.filter(c => c.sql.startsWith('SELECT DISTINCT')).length, 2);
  const writes = calls.filter(c => c.sql.startsWith('INSERT INTO notifications'));
  assert.equal(writes.length, 2);
  assert.ok(writes.every(c => c.values?.[0] === 'staff'));
  assert.match(String(writes[0]!.values?.[3]), /Changed at 2026-10-18T00:00:00.000Z/);
});

test('TC_E11S01_09 equipment recipient lookup and notification failures propagate to the owning transaction', async () => {
  const client = { query: async () => { throw new Error('database unavailable'); } } as unknown as PoolClient;
  const input = { eventId: 'event', actorId: 'actor', changeId: 'change', occurredAt: new Date(), title: 'Title', message: 'Message' };
  await assert.rejects(notifyEquipmentStaff(client, input), /database unavailable/);
  await assert.rejects(notifyEquipmentStaff(client, { ...input, recipients: ['staff'] }), /database unavailable/);
});

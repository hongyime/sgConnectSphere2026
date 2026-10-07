// SCRUM-86: E14-S02 Scenario 5 "Log entries immutable" against a real,
// disposable PostgreSQL schema with every repository migration applied.
//
// The server connects as the table owner, so 0001's REVOKE never applied to
// it. These cases prove migration 0010's trigger refuses an edit and a delete
// from that same connection, and that deleting a draft event or a user still
// works, keeping their entries with only the link cleared.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresEventLifecycleRepository } from '../src/modules/eventLifecycle/repository.js';
import { loginDatabase } from './helpers/loginDatabase.js';

const REFUSED = /Activity log entries cannot be edited or deleted\./;

async function fixture() {
  const f = await loginDatabase();
  const ids = { org: randomUUID(), organiser: randomUUID(), coordinator: randomUUID() };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [ids.org]);
  for (const [id, role, org] of [
    [ids.organiser, 'event_organiser', ids.org], [ids.coordinator, 'event_coordinator', null],
  ] as const) {
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', 'Synthetic user', $4)`, [id, org, `${id}@example.test`, role]);
  }
  const event = async (status: string) => {
    const id = randomUUID();
    await f.pool.query(`INSERT INTO events (id, organiser_id, client_org_id, title, status, event_range, expected_attendance)
      VALUES ($1, $2, $3, 'Annual Tech Summit', $4, '[2027-01-01 01:00Z,2027-01-01 04:00Z)', 50)`, [id, ids.organiser, ids.org, status]);
    return id;
  };
  const entry = async (id: string) =>
    (await f.pool.query(`SELECT * FROM audit_logs WHERE id = $1`, [id])).rows[0] as Record<string, unknown> | undefined;
  return { ...f, ids, event, entry };
}

async function withFixture(run: (f: Awaited<ReturnType<typeof fixture>>) => Promise<void>) {
  const f = await fixture();
  try { await run(f); } finally { await f.close(); }
}

test('TC_E14S02_05: an activity log entry cannot be edited or deleted, even by the server connection', () => withFixture(async f => {
  const eventId = await f.event('under_review');
  const change = await new PostgresEventLifecycleRepository({}, f.pool).updateEventStatus(eventId, 'approved', f.ids.coordinator);
  const id = (await f.pool.query<{ id: string }>(
    `SELECT id FROM audit_logs WHERE event_id = $1 AND action = 'Status changed to approved'`, [eventId])).rows[0]?.id;
  assert.ok(change && id, 'the status change wrote its entry');
  const before = await f.entry(id);

  await assert.rejects(f.pool.query(`UPDATE audit_logs SET action = 'Status changed to rejected' WHERE id = $1`, [id]), REFUSED);
  await assert.rejects(f.pool.query(`UPDATE audit_logs SET occurred_at = now() - interval '1 day' WHERE id = $1`, [id]), REFUSED);
  await assert.rejects(f.pool.query(`DELETE FROM audit_logs WHERE id = $1`, [id]), REFUSED);
  // Clearing the actor by hand is an edit too; only the foreign key may do it.
  await assert.rejects(f.pool.query(`UPDATE audit_logs SET actor_id = NULL WHERE id = $1`, [id]), REFUSED);

  assert.deepEqual(await f.entry(id), before, 'the entry is unchanged');
}));

test('deleting a draft event keeps its activity log entries and only clears the event link', () => withFixture(async f => {
  const eventId = await f.event('draft');
  const id = (await f.pool.query<{ id: string }>(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
    VALUES ($1, 'event', $2, $2, 'Record updated', 'title', 'Annual Tech Summit') RETURNING id`, [f.ids.organiser, eventId])).rows[0]!.id;
  const before = await f.entry(id);

  await f.pool.query(`DELETE FROM events WHERE id = $1 AND status = 'draft'`, [eventId]);

  assert.deepEqual(await f.entry(id), { ...before, event_id: null });
}));

test('deleting a user keeps their activity log entries and only clears the actor', () => withFixture(async f => {
  const userId = randomUUID();
  await f.pool.query(`INSERT INTO users (id, email, password_hash, full_name, role)
    VALUES ($1, $2, 'unused', 'Leaving user', 'attendee')`, [userId, `${userId}@example.test`]);
  const id = (await f.pool.query<{ id: string }>(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action)
    VALUES ($1, 'user', $1, 'Account Deactivated') RETURNING id`, [userId])).rows[0]!.id;
  const before = await f.entry(id);

  await f.pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

  assert.deepEqual(await f.entry(id), { ...before, actor_id: null });
}));

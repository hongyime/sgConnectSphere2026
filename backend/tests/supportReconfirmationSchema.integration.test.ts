// SCRUM-244 / E10-S02 (T-103): migration 0026 against a real, disposable
// PostgreSQL schema with every repository migration applied.
//
// Proves what the follow-up code will rely on: Technical Support requests
// carry a reconfirmation flag like venue bookings and equipment reservations,
// a request written the way the deployed code writes it is unflagged, and the
// flag can be set and cleared but never left empty.
//
// Requires TEST_DATABASE_URL; see helpers/loginDatabase.ts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';

type Database = Awaited<ReturnType<typeof loginDatabase>>;

async function withEvent(work: (f: Database, event: string, coordinator: string) => Promise<void>) {
  const f = await loginDatabase();
  try {
    const org = randomUUID(), organiser = randomUUID(), coordinator = randomUUID(), event = randomUUID();
    await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Synthetic organisation')`, [org]);
    await f.pool.query(`INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'unused', 'Organiser A', 'event_organiser')`, [organiser, org, `${organiser}@example.test`]);
    await f.pool.query(`INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES ($1, $2, 'unused', 'Coordinator A', 'event_coordinator')`, [coordinator, `${coordinator}@example.test`]);
    await f.pool.query(`INSERT INTO events (id, event_code, organiser_id, client_org_id, coordinator_id, title, status, event_range, expected_attendance)
      VALUES ($1, 'EVT-9261', $2, $3, $4, 'Charity Run', 'planning', '[2027-03-05 07:00+08,2027-03-05 12:00+08)', 150)`,
    [event, organiser, org, coordinator]);
    await work(f, event, coordinator);
  } finally {
    await f.close();
  }
}

test('0026 adds a not-null reconfirmation flag to Technical Support requests, defaulting to false', () => withEvent(async f => {
  const column = (await f.pool.query<{ data_type: string; is_nullable: string; column_default: string }>(
    `SELECT data_type, is_nullable, column_default FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'tech_support_requests' AND column_name = 'requires_reconfirmation'`)).rows[0];
  assert.deepEqual(column, { data_type: 'boolean', is_nullable: 'NO', column_default: 'false' });
}));

test('a request written as the deployed code writes it is unflagged, and the flag can be set and cleared but not emptied', () => withEvent(async (f, event, coordinator) => {
  // The column list supportRequests.ts uses today, which does not name the flag.
  const request = (await f.pool.query<{ id: string; requires_reconfirmation: boolean }>(
    `INSERT INTO tech_support_requests (event_id, support_required, support_description, support_range, status, requested_by)
     VALUES ($1, true, 'Sound desk and timing system', '[2027-03-05 06:00+08,2027-03-05 12:00+08)', 'staffed', $2)
     RETURNING id, requires_reconfirmation`, [event, coordinator])).rows[0]!;
  assert.equal(request.requires_reconfirmation, false);

  await f.pool.query(`UPDATE tech_support_requests SET requires_reconfirmation = true WHERE id = $1`, [request.id]);
  assert.equal((await f.pool.query(`SELECT requires_reconfirmation FROM tech_support_requests WHERE id = $1`, [request.id])).rows[0].requires_reconfirmation, true);
  await f.pool.query(`UPDATE tech_support_requests SET requires_reconfirmation = false WHERE id = $1`, [request.id]);

  await assert.rejects(
    f.pool.query(`UPDATE tech_support_requests SET requires_reconfirmation = NULL WHERE id = $1`, [request.id]),
    (error: { code?: string }) => error.code === '23502');
}));

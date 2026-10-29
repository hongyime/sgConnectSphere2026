import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  EventSessionConflictError,
  listEventSessions,
  PostgresEventLifecycleRepository,
} from '../src/modules/eventLifecycle/repository.js';
import type { EventSessionInput } from '../src/modules/eventLifecycle/types.js';

const eventId = randomUUID();
const defaultSessionId = randomUUID();
const secondSessionId = randomUUID();
const removedSessionId = randomUUID();
const featureId = randomUUID();
const startsAt = new Date('2027-03-12T01:00:00Z');
const endsAt = new Date('2027-03-12T03:00:00Z');

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: eventId, title: 'Forum', description: null, purpose: null, client_org_id: randomUUID(),
    organiser_id: randomUUID(), coordinator_id: null, status: 'draft', status_changed_at: startsAt,
    start_at: startsAt, end_at: endsAt, expected_attendance: 20, layout_id: null, venue_requirements: null,
    accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
    ...overrides,
  };
}

function session(title: string, overrides: Partial<EventSessionInput> = {}): EventSessionInput {
  return {
    title, startAt: startsAt, endAt: endsAt, expectedAttendance: 20,
    venueRequirements: `${title} room`, accessibilityFeatureIds: [featureId], equipmentRequirements: `${title} equipment`,
    ...overrides,
  };
}

function fakePool(options: { existing?: string[]; used?: boolean } = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const existing = options.existing ?? [defaultSessionId];
  const newIds = [secondSessionId];
  const query = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    let rows: Record<string, unknown>[] = [];
    if (sql.includes('INSERT INTO events') || sql.includes('UPDATE events')) rows = [eventRow()];
    else if (sql.includes('SELECT status,organiser_id FROM events')) rows = [{ status: 'draft', organiser_id: randomUUID() }];
    else if (sql.includes('SELECT id FROM sessions WHERE event_id=$1 FOR UPDATE')) rows = existing.map(id => ({ id }));
    else if (sql.includes('INSERT INTO sessions(')) rows = [{ id: newIds.shift() ?? randomUUID() }];
    else if (sql.includes('event_registration_sessions') && sql.includes('equipment_reservations')) rows = [{ used: options.used ?? false }];
    return { rows, rowCount: rows.length };
  };
  const client = { query, release() {} } as unknown as PoolClient;
  const pool = { query, connect: async () => client } as unknown as Pool;
  return { pool, calls };
}

const eventRequest = (sessions: EventSessionInput[]) => ({
  title: 'Forum', organiserId: randomUUID(), clientOrgId: randomUUID(), status: 'draft' as const,
  startAt: startsAt, endAt: endsAt, expectedAttendance: 20, sessions,
});

const eventUpdate = (sessions: EventSessionInput[]) => ({
  title: 'Forum', status: 'draft' as const, startAt: startsAt, endAt: endsAt, expectedAttendance: 20, sessions,
});

test('create writes the first Session into the default row and inserts later Sessions', async () => {
  const db = fakePool();
  await new PostgresEventLifecycleRepository({}, db.pool).createEvent(eventRequest([
    session('Opening'), session('Closing', { expectedAttendance: 30, accessibilityFeatureIds: undefined }),
  ]));

  const update = db.calls.find(call => call.sql.includes('UPDATE sessions SET title=$2'))!;
  assert.equal(update.values?.[10], defaultSessionId);
  assert.equal(update.values?.[1], 'Opening');
  assert.equal(db.calls.filter(call => call.sql.includes('INSERT INTO sessions(')).length, 1);
  assert.ok(db.calls.some(call => call.sql.includes('INSERT INTO session_accessibility_needs') && call.values?.[1] === featureId));
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
});

test('update retains and edits supplied Sessions, inserts new ones, and removes only unused rows', async () => {
  const db = fakePool({ existing: [defaultSessionId, removedSessionId] });
  await new PostgresEventLifecycleRepository({}, db.pool).updateEvent(eventId, eventUpdate([
    session('Opening updated', { id: defaultSessionId }), session('Closing'),
  ]));

  assert.ok(db.calls.some(call => call.sql.includes('UPDATE sessions SET title=$2') && call.values?.[10] === defaultSessionId));
  assert.equal(db.calls.filter(call => call.sql.includes('INSERT INTO sessions(')).length, 1);
  assert.ok(db.calls.some(call => call.sql.includes('DELETE FROM sessions WHERE id=ANY')
    && JSON.stringify(call.values?.[0]) === JSON.stringify([removedSessionId])));
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
});

test('legacy Event creation without Session input leaves the default Session trigger in charge', async () => {
  const db = fakePool({ existing: [] });
  await new PostgresEventLifecycleRepository({}, db.pool).createEvent({
    title: 'Legacy Event', organiserId: randomUUID(), clientOrgId: randomUUID(), status: 'draft',
    startAt: startsAt, endAt: endsAt, expectedAttendance: 20,
  });
  assert.equal(db.calls.some(call => call.sql.includes('FROM sessions') || call.sql.includes('INTO sessions(')), false);
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
});

test('update rolls back if a removed Session has registrations or arrangements', async () => {
  const db = fakePool({ existing: [defaultSessionId, removedSessionId], used: true });
  await assert.rejects(
    new PostgresEventLifecycleRepository({}, db.pool).updateEvent(eventId, eventUpdate([session('Opening', { id: defaultSessionId })])),
    EventSessionConflictError,
  );
  assert.equal(db.calls.some(call => call.sql.includes('DELETE FROM sessions WHERE id=ANY')), false);
  assert.equal(db.calls.at(-1)?.sql, 'ROLLBACK');
});

test('update refuses duplicate and foreign Session ids before changing Session rows', async () => {
  for (const sessions of [
    [session('Opening', { id: defaultSessionId }), session('Duplicate', { id: defaultSessionId })],
    [session('Foreign', { id: randomUUID() })],
  ]) {
    const db = fakePool();
    await assert.rejects(
      new PostgresEventLifecycleRepository({}, db.pool).updateEvent(eventId, eventUpdate(sessions)),
      EventSessionConflictError,
    );
    assert.equal(db.calls.some(call => call.sql.includes('UPDATE sessions SET title=$2')), false);
    assert.equal(db.calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('listEventSessions maps stored ranges and accessibility features to the API shape', async () => {
  const sessionId = randomUUID();
  const result = await listEventSessions(async () => ({
    rows: [{ id: sessionId, title: 'Opening', start_at: startsAt, end_at: endsAt, expected_attendance: 20,
      layout_id: null, venue_requirements: 'Hall', accessibility_note: 'Step-free', accessibility_feature_ids: [featureId],
      equipment_requirements: 'Projector', layout_preference: 'Theatre' }],
    rowCount: 1,
  }));
  assert.deepEqual(result, [{ id: sessionId, title: 'Opening', startAt: startsAt.toISOString(), endAt: endsAt.toISOString(),
    expectedAttendance: 20, layoutId: undefined, venueRequirements: 'Hall', accessibilityNote: 'Step-free', accessibilityFeatureIds: [featureId],
    equipmentRequirements: 'Projector', layoutPreference: 'Theatre' }]);
});

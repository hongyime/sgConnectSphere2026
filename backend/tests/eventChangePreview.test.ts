// Unit tests for the E10-S02 (SCRUM-71) change preview and over-subscription
// warning. The preview runs the real edit (updateEventInformation) against a
// scripted client double: the double answers each statement by its SQL and
// switches the Event and Session to their edited values once the edit's
// UPDATE runs, so the test sees what the database would. That the savepoint
// really discards the edit is checked against PostgreSQL in the integration
// suite; here we check the statements are issued in the right order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import {
  assessOverSubscription, loadRegistrationCounts, previewEventChange, previewEventChangeWith,
} from '../src/modules/changeManagement/eventChange.js';
import type { ArrangementSnapshot } from '../src/modules/changeManagement/arrangementImpact.js';
import { RejectedRequestError } from '../src/modules/eventLifecycle/decision.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';

const coordinator: AuthenticatedUser = { id: 'coordinator-1', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };

function snapshot(bookings: ArrangementSnapshot['bookings']): ArrangementSnapshot {
  return {
    event: { startsAt: '2026-11-15T01:00:00.000Z', endsAt: '2026-11-15T09:00:00.000Z' },
    sessions: [
      { id: 'session-a', startsAt: '2026-11-15T01:00:00.000Z', endsAt: '2026-11-15T03:00:00.000Z', expectedAttendance: 80 },
      { id: 'session-b', startsAt: '2026-11-15T05:00:00.000Z', endsAt: '2026-11-15T09:00:00.000Z', expectedAttendance: 60 },
    ],
    bookings,
    reservations: [],
  };
}
const booking = (id: string, sessionId: string | null, capacity: number) =>
  ({ id, sessionId, venueId: `venue-${id}`, venueName: `Venue ${id}`, headcount: null, capacity });

test('TC_E10S02_04: registrations above the combined capacity warn, and nobody is removed', () => {
  const over = assessOverSubscription(snapshot([booking('a', 'session-a', 80)]), { event: 100, sessions: { 'session-a': 100 } });
  assert.deepEqual(over, [
    { scope: 'session', sessionId: 'session-a', registered: 100, capacity: 80 },
    { scope: 'event', sessionId: null, registered: 100, capacity: 80 },
  ]);
});

test('Session capacity adds up its Confirmed bookings; exactly full is not over-subscribed', () => {
  const over = assessOverSubscription(
    snapshot([booking('a1', 'session-a', 50), booking('a2', 'session-a', 30), booking('b', 'session-b', 40)]),
    { event: 90, sessions: { 'session-a': 80, 'session-b': 41 } });
  assert.deepEqual(over, [{ scope: 'session', sessionId: 'session-b', registered: 41, capacity: 40 }],
    'session A holds 80 of 80; the combined 120 holds all 90');
});

test('no Confirmed booking means no capacity to compare yet', () => {
  assert.deepEqual(assessOverSubscription(snapshot([]), { event: 500, sessions: { 'session-a': 500 } }), []);
  // A booking without a Session still counts toward the Event's combined capacity.
  assert.deepEqual(assessOverSubscription(snapshot([booking('x', null, 10)]), { event: 11, sessions: {} }),
    [{ scope: 'event', sessionId: null, registered: 11, capacity: 10 }]);
});

test('loadRegistrationCounts counts only Registered places, per Event and per Session', async () => {
  const calls: string[] = [];
  const answers = [[{ count: '3' }], [{ session_id: 'session-a', count: '2' }, { session_id: 'session-b', count: '1' }]];
  const counts = await loadRegistrationCounts(async (sql) => { calls.push(sql); return { rows: answers.shift() as never[] }; }, 'event-1');
  assert.deepEqual(counts, { event: 3, sessions: { 'session-a': 2, 'session-b': 1 } });
  assert.ok(calls.every(sql => sql.includes("status = 'registered'")), 'Pending registrations hold no seat (T-85)');
  const none = await loadRegistrationCounts(async () => ({ rows: [] }), 'event-1');
  assert.deepEqual(none, { event: 0, sessions: {} });
});

type Script = { event?: boolean; rejected?: boolean; registered?: number };
function scriptedClient(script: Script = {}) {
  const sql: string[] = [];
  let edited = false;
  const range = () => edited
    ? { starts_at: new Date('2026-11-20T01:00:00Z'), ends_at: new Date('2026-11-20T09:00:00Z') }
    : { starts_at: new Date('2026-11-15T01:00:00Z'), ends_at: new Date('2026-11-15T09:00:00Z') };
  const answer = (text: string): unknown[] => {
    if (text.includes('FOR UPDATE')) return script.event === false ? [] : [{ id: 'event-1' }];
    if (text.includes('AND organiser_id = $2')) return script.rejected ? [{ status: 'rejected' }] : [];
    if (text.includes('SELECT id, status, organiser_id')) return [{ id: 'event-1', status: 'planning', organiser_id: 'organiser-1', coordinator_id: coordinator.id, client_org_id: 'org-1' }];
    if (text.includes('AS start_at')) return [{ start_at: range().starts_at, end_at: range().ends_at }];
    if (text.startsWith('UPDATE events')) { edited ||= text.includes('event_range'); return []; }
    if (text.includes('FROM events WHERE id = $1')) return [range()];
    if (text.includes('FROM sessions')) return [{ id: 'session-a', ...range(), expected_attendance: 80 }];
    if (text.includes('FROM venue_bookings')) return [{ id: 'booking-a', session_id: 'session-a', venue_id: 'hall', venue_name: 'Riverside Hall', headcount: null, capacity: 200 }];
    if (text.includes('FROM equipment_reservations')) return [{ id: 'reservation-a', session_id: 'session-a', equipment_id: 'projector', equipment_name: 'Projector' }];
    if (text.includes('FROM event_registrations WHERE')) return [{ count: String(script.registered ?? 0) }];
    return [];
  };
  const client = {
    query: async (text: string) => { sql.push(text); return { rows: answer(text) }; },
    release: () => undefined,
  } as unknown as PoolClient;
  return { client, sql };
}

test('TC_E10S02_03: a date change previews the affected booking and equipment, then rolls back', async () => {
  const { client, sql } = scriptedClient({ registered: 250 });
  const preview = await previewEventChangeWith(client, coordinator, 'EVT-1', { startAt: '2026-11-20T01:00:00Z', endAt: '2026-11-20T09:00:00Z' });
  assert.deepEqual(preview.impact.bookings.map(b => [b.venueName, b.reasons]), [['Riverside Hall', ['time']]]);
  assert.deepEqual(preview.impact.reservations.map(r => [r.equipmentName, r.reasons]), [['Projector', ['time']]]);
  assert.deepEqual(preview.overSubscription, [{ scope: 'event', sessionId: null, registered: 250, capacity: 200 }]);
  const savepoint = sql.indexOf('SAVEPOINT event_change_preview');
  const update = sql.findIndex(text => text.startsWith('UPDATE events'));
  assert.ok(savepoint >= 0 && savepoint < update, 'the edit runs only inside the savepoint');
  assert.equal(sql.at(-1), 'ROLLBACK TO SAVEPOINT event_change_preview', 'the edit is discarded last');
});

test('TC_E10S02_02: a description-only preview affects nothing', async () => {
  const { client } = scriptedClient();
  const preview = await previewEventChangeWith(client, coordinator, 'EVT-1', { description: 'New wording' });
  assert.deepEqual(preview, { impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [] });
});

test('a refused edit is refused in preview too, and the savepoint is still rolled back', async () => {
  const { client, sql } = scriptedClient();
  await assert.rejects(previewEventChangeWith(client, coordinator, 'EVT-1', { notAField: 1 }), (error: AccessError) => error.status === 400);
  assert.equal(sql.at(-1), 'ROLLBACK TO SAVEPOINT event_change_preview');
});

test('an unknown Event or a rejected request is refused before any savepoint', async () => {
  const missing = scriptedClient({ event: false });
  await assert.rejects(previewEventChangeWith(missing.client, coordinator, 'nope', { description: 'x' }), (error: AccessError) => error.status === 403);
  const rejected = scriptedClient({ rejected: true });
  await assert.rejects(previewEventChangeWith(rejected.client, coordinator, 'EVT-1', { description: 'x' }), RejectedRequestError);
  assert.ok(![...missing.sql, ...rejected.sql].includes('SAVEPOINT event_change_preview'));
});

test('previewEventChange wraps the preview in its own transaction', async () => {
  const { client, sql } = scriptedClient();
  const pool = { connect: async () => client } as unknown as Pool;
  await previewEventChange(pool, coordinator, 'EVT-1', { description: 'New wording' });
  assert.equal(sql[0], 'BEGIN');
  assert.equal(sql.at(-1), 'COMMIT', 'the savepoint already discarded the edit, so committing saves nothing');
});

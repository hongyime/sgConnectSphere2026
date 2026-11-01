import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { copyPreviousEvent } from '../src/modules/eventLifecycle/copyEvent.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const organiser: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'organiser@example.test',
  role: 'event_organiser',
  clientOrgId: '00000000-0000-4000-8000-000000000002',
  isActive: true,
  failedLoginCount: 0,
};

const source = {
  id: '00000000-0000-4000-8000-000000000010',
  title: 'Previous conference',
  description: 'Copied description',
  purpose: 'Copied purpose',
  client_org_id: organiser.clientOrgId,
  organiser_id: organiser.id,
  status: 'completed',
  expected_attendance: 80,
  layout_id: '00000000-0000-4000-8000-000000000020',
  venue_requirements: 'Accessible hall',
  accessibility_note: 'Step-free access',
  equipment_requirements: 'Projector',
  layout_preference: 'theatre',
  registration_setup: 'Invite only',
  ends_at: new Date('2026-10-01T00:00:00Z'),
};

const sourceSession = {
  id: '00000000-0000-4000-8000-000000000030',
  title: 'Opening session',
  expected_attendance: 80,
  layout_id: source.layout_id,
  venue_requirements: source.venue_requirements,
  accessibility_note: source.accessibility_note,
  equipment_requirements: source.equipment_requirements,
  layout_preference: source.layout_preference,
};

function database(options: {
  source?: Record<string, unknown> | null;
  sessions?: Record<string, unknown>[];
  eventFeatureIds?: string[];
  eventFacilityIds?: string[];
  sessionFeatureIds?: string[];
  sessionFacilityIds?: string[];
  missingVenues?: Record<string, unknown>[];
  missingEquipment?: Record<string, unknown>[];
} = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const copiedId = '00000000-0000-4000-8000-000000000040';
  const copiedSessionId = '00000000-0000-4000-8000-000000000050';
  const sourceRow = options.source === undefined ? source : options.source;
  const sessions = options.sessions ?? [sourceSession];
  const client: PoolClient = {
    async query(sql: string, values?: unknown[]): Promise<QueryResult> {
      calls.push({ sql, values });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 } as QueryResult;
      if (sql.includes('FROM events') && sql.includes('FOR UPDATE')) return { rows: sourceRow ? [sourceRow] : [], rowCount: sourceRow ? 1 : 0 } as QueryResult;
      if (sql.includes('FROM sessions') && sql.includes('event_id = $1')) return { rows: sessions } as QueryResult;
      if (sql.includes('FROM event_accessibility_needs')) return { rows: (options.eventFeatureIds ?? []).map(feature_id => ({ feature_id })) } as QueryResult;
      if (sql.includes('FROM event_facility_needs')) return { rows: (options.eventFacilityIds ?? []).map(facility_id => ({ facility_id })) } as QueryResult;
      if (sql.includes('FROM session_accessibility_needs')) return { rows: (options.sessionFeatureIds ?? []).map(feature_id => ({ feature_id })) } as QueryResult;
      if (sql.includes('FROM session_facility_needs')) return { rows: (options.sessionFacilityIds ?? []).map(facility_id => ({ facility_id })) } as QueryResult;
      if (sql.includes('FROM venue_bookings')) return { rows: options.missingVenues ?? [] } as QueryResult;
      if (sql.includes('FROM equipment_reservations')) return { rows: options.missingEquipment ?? [] } as QueryResult;
      if (sql.startsWith('INSERT INTO events')) {
        return { rows: [{ ...source, id: copiedId, status: 'draft', start_at: new Date(0), end_at: new Date(60_000), dates_pending: true }] } as QueryResult;
      }
      if (sql.startsWith('INSERT INTO sessions')) {
        return { rows: [{ ...sourceSession, id: copiedSessionId, event_id: copiedId, start_at: new Date(0), end_at: new Date(60_000), dates_pending: true }] } as QueryResult;
      }
      if (sql.includes('INSERT INTO audit_logs')) return { rows: [], rowCount: 1 } as QueryResult;
      return { rows: [], rowCount: 1 } as QueryResult;
    },
    release() { /* no-op */ },
  } as unknown as PoolClient;
  const pool = { connect: async () => client } as unknown as Pool;
  return { pool, calls };
}

test('E02-S05 only an active Event Organiser can copy an own previous event', async () => {
  const { pool, calls } = database();
  await assert.rejects(copyPreviousEvent(pool, { ...organiser, role: 'event_coordinator' }, source.id),
    (error: unknown) => error instanceof AccessError && error.status === 403);
  assert.equal(calls.length, 0);
});

test('E02-S05 refuses a missing, draft, or future source event', async () => {
  await assert.rejects(copyPreviousEvent(database({ source: null }).pool, organiser, source.id),
    (error: unknown) => error instanceof AccessError && error.status === 404);
  await assert.rejects(copyPreviousEvent(database({ source: { ...source, status: 'draft' } }).pool, organiser, source.id),
    (error: unknown) => error instanceof AccessError && error.status === 409);
  await assert.rejects(copyPreviousEvent(database({ source: { ...source, status: 'planning', ends_at: new Date('2027-01-01T00:00:00Z') } }).pool, organiser, source.id),
    (error: unknown) => error instanceof AccessError && error.status === 409);
  const completedInFuture = await copyPreviousEvent(database({ source: { ...source, ends_at: new Date('2027-01-01T00:00:00Z') } }).pool, organiser, source.id);
  assert.equal(completedInFuture.event.status, 'draft');
});

test('E02-S05 copies requirements and Session structure with pending dates only', async () => {
  const { pool, calls } = database();
  const result = await copyPreviousEvent(pool, organiser, source.id);

  assert.equal(result.event.status, 'draft');
  assert.equal(result.event.title, source.title);
  assert.equal(result.event.datesPending, true);
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0]!.title, sourceSession.title);
  assert.equal(result.sessions[0]!.datesPending, true);
  assert.deepEqual(result.warnings, []);
  assert.ok(calls.some(call => call.sql.includes('event_accessibility_needs')));
  assert.ok(calls.some(call => call.sql.includes('session_accessibility_needs')));
  assert.equal(calls.some(call => call.sql.startsWith('INSERT') && /venue_bookings|equipment_reservations|event_registrations/.test(call.sql)), false);
  assert.ok(calls.some(call => call.sql.includes("Event copied to draft")));
});

test('E02-S05 copies accessibility and facility links for the Event and each Session', async () => {
  const { pool, calls } = database({
    eventFeatureIds: ['feature-1'],
    eventFacilityIds: ['facility-1'],
    sessionFeatureIds: ['feature-2'],
    sessionFacilityIds: ['facility-2'],
  });
  await copyPreviousEvent(pool, organiser, source.id);

  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO event_accessibility_needs')).length, 1);
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO event_facility_needs')).length, 1);
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO session_accessibility_needs')).length, 1);
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO session_facility_needs')).length, 1);
});

test('E02-S05 warns when an old arrangement points at an inactive reference and names its Session', async () => {
  const result = await copyPreviousEvent(database({
    missingVenues: [{ session_id: sourceSession.id, reference_id: 'venue-old', reference_name: 'Old Hall', is_active: false }],
    missingEquipment: [{ session_id: sourceSession.id, reference_id: 'equipment-old', reference_name: 'Retired projector', is_active: false }],
  }).pool, organiser, source.id);

  assert.deepEqual(result.warnings, [
    'Session Opening session: Venue reference Old Hall needs review.',
    'Session Opening session: Equipment reference Retired projector needs review.',
  ]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessError } from '../src/modules/eventVisibility/service.js';
import { addSession, editSession, getSessions, removeSession, type SessionRepository } from '../src/modules/eventSessions/service.js';
import { handNeedsToEvent } from '../src/modules/eventSessions/repository.js';
import type { SessionEditScope, SessionInput, SessionRecord } from '../src/modules/eventSessions/types.js';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_EVENT = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

const body = {
  title: 'Opening',
  startAt: '2027-03-12T01:00:00.000Z',
  endAt: '2027-03-12T03:00:00.000Z',
  expectedAttendance: 40,
  venueRequirements: 'Hall A',
};

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: SESSION_ID,
    eventId: EVENT_ID,
    title: 'Opening',
    startAt: new Date(body.startAt),
    endAt: new Date(body.endAt),
    expectedAttendance: 40,
    ...overrides,
  };
}

type Removal =
  | { status: 'deleted'; releasedBookings: number; releasedReservations: number; notifiedStaff: number; primaryNeeded: boolean }
  | { status: 'not_found' }
  | { status: 'last_session' };

function fakeRepository(
  scope: SessionEditScope | null,
  sessions: SessionRecord[] = [record()],
  removal: Removal = { status: 'deleted', releasedBookings: 0, releasedReservations: 0, notifiedStaff: 0, primaryNeeded: false },
) {
  const calls: string[] = [];
  const repository: SessionRepository = {
    async findEditScope() { return scope; },
    async listSessions() { return sessions; },
    async listOptions() { return options; },
    async insertSession(_eventId: string, input: SessionInput) {
      calls.push('insert');
      return record(input);
    },
    async updateSession(_id: string, _eventId: string, input: SessionInput) {
      calls.push('update');
      return sessions.length ? record(input) : null;
    },
    async updateSessionInPlanning(_id: string, _eventId: string, _actorId: string, input: SessionInput, options: { preview?: boolean }) {
      calls.push(options.preview ? 'planning-preview' : 'planning-update');
      const check = {
        impact: { affected: false, bookings: [], reservations: [] },
        overSubscription: [],
        revision: 'rev-1',
      };
      if (options.preview) return { status: 'preview' as const, ...check };
      return { status: 'updated' as const, session: record(input), ...check };
    },
    async removeSession() { calls.push('remove'); return removal; },
  };
  return { repository, calls };
}

const options = {
  layouts: [{ id: '44444444-4444-4444-8444-444444444444', label: 'Theatre' }],
  accessibility: [{ id: '55555555-5555-4555-8555-555555555555', label: 'Step-free access' }],
  facilities: [{ id: '66666666-6666-4666-8666-666666666666', label: 'Projector' }],
};

const draftOwner: SessionEditScope = { organiserId: 'organiser-1', status: 'draft' };

test('E04-S02: the owning Organiser sees the Sessions of their Event', async () => {
  const { repository } = fakeRepository(draftOwner);
  const result = await getSessions(repository, 'organiser-1', EVENT_ID);
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0]!.title, 'Opening');
  // E04-S02 Scenario 1: the editor needs the choices for each Session's own needs.
  assert.deepEqual(result.options, options);
});

test('E04-S02: another Organiser cannot read or add Sessions', async () => {
  const { repository, calls } = fakeRepository(draftOwner);
  await assert.rejects(getSessions(repository, 'organiser-2', EVENT_ID), (error: unknown) =>
    error instanceof AccessError && error.status === 404 && error.message === 'not_found');
  await assert.rejects(addSession(repository, 'organiser-2', EVENT_ID, body), (error: unknown) =>
    error instanceof AccessError && error.status === 404);
  assert.deepEqual(calls, []);
});

test('E04-S02: Sessions can be added to a draft Event', async () => {
  const { repository, calls } = fakeRepository(draftOwner);
  const result = await addSession(repository, 'organiser-1', EVENT_ID, body);
  assert.equal(result.session.expectedAttendance, 40);
  assert.equal(result.session.startAt.toISOString(), body.startAt);
  assert.deepEqual(calls, ['insert']);
});

test('E04-S02: Sessions cannot be changed once the event is past planning', async () => {
  for (const status of ['submitted', 'under_review', 'confirmed', 'completed', 'cancelled'] as const) {
    const { repository, calls } = fakeRepository({ organiserId: 'organiser-1', status });
    await assert.rejects(addSession(repository, 'organiser-1', EVENT_ID, body), (error: unknown) =>
      error instanceof AccessError && error.status === 409);
    await assert.rejects(editSession(repository, 'organiser-1', EVENT_ID, SESSION_ID, body), (error: unknown) =>
      error instanceof AccessError && error.status === 409);
    assert.deepEqual(calls, []);
  }
});

test('E04-S02: a Session whose end is not after its start is rejected before any write', async () => {
  const { repository, calls } = fakeRepository(draftOwner);
  await assert.rejects(
    addSession(repository, 'organiser-1', EVENT_ID, { ...body, endAt: body.startAt }),
    (error: unknown) => error instanceof AccessError && error.status === 400,
  );
  await assert.rejects(
    addSession(repository, 'organiser-1', EVENT_ID, { ...body, expectedAttendance: 0 }),
    (error: unknown) => error instanceof AccessError && error.status === 400,
  );
  assert.deepEqual(calls, []);
});

test('E04-S02: editing a Session that does not belong to the Event is a 404', async () => {
  const { repository } = fakeRepository(draftOwner, []);
  await assert.rejects(
    editSession(repository, 'organiser-1', EVENT_ID, SESSION_ID, body),
    (error: unknown) => error instanceof AccessError && error.status === 404 && error.message === 'Session not found.',
  );
});

test('E04-S02: the last Session cannot be deleted', async () => {
  const { repository, calls } = fakeRepository(draftOwner, [record()], { status: 'last_session' });
  await assert.rejects(
    removeSession(repository, 'organiser-1', EVENT_ID, SESSION_ID),
    (error: unknown) => error instanceof AccessError && error.status === 409,
  );
  assert.deepEqual(calls, ['remove']);
});

test('E04-S02: deleting one of several Sessions removes only that Session', async () => {
  const second = record({ id: '44444444-4444-4444-8444-444444444444', title: 'Second' });
  const { repository, calls } = fakeRepository(draftOwner, [record(), second], {
    status: 'deleted', releasedBookings: 1, releasedReservations: 2, notifiedStaff: 3, primaryNeeded: true,
  });
  const result = await removeSession(repository, 'organiser-1', EVENT_ID, SESSION_ID);
  assert.deepEqual(result, { deleted: true, releasedBookings: 1, releasedReservations: 2, notifiedStaff: 3, primaryNeeded: true });
  assert.deepEqual(calls, ['remove']);
});

test('E04-S02: a planning edit and its preview both run the arrangement-impact check', async () => {
  const { repository, calls } = fakeRepository({ organiserId: 'organiser-1', status: 'planning' });
  const saved = await editSession(repository, 'organiser-1', EVENT_ID, SESSION_ID, body);
  assert.equal(saved.revision, 'rev-1');
  assert.deepEqual(saved.impact, { affected: false, bookings: [], reservations: [] });

  const preview = await editSession(repository, 'organiser-1', EVENT_ID, SESSION_ID, body, { preview: true });
  assert.equal(preview.preview.revision, 'rev-1');

  assert.deepEqual(calls, ['planning-update', 'planning-preview']);
});

test('E04-S02: a Session can be removed while the event is in planning', async () => {
  const { repository, calls } = fakeRepository({ organiserId: 'organiser-1', status: 'planning' });
  const result = await removeSession(repository, 'organiser-1', EVENT_ID, SESSION_ID);
  assert.equal(result.deleted, true);
  assert.deepEqual(calls, ['remove']);
});

test('E04-S02: removal is refused once the event is past planning', async () => {
  for (const status of ['submitted', 'confirmed', 'completed', 'cancelled'] as const) {
    const { repository, calls } = fakeRepository({ organiserId: 'organiser-1', status });
    await assert.rejects(removeSession(repository, 'organiser-1', EVENT_ID, SESSION_ID), (error: unknown) =>
      error instanceof AccessError && error.status === 409);
    assert.deepEqual(calls, []);
  }
});

test('E04-S02: a malformed Session id is rejected before any query', async () => {
  const { repository, calls } = fakeRepository(draftOwner);
  await assert.rejects(
    removeSession(repository, 'organiser-1', EVENT_ID, 'not-a-uuid'),
    (error: unknown) => error instanceof AccessError && error.status === 400,
  );
  assert.deepEqual(calls, []);
});

test('E04-S02 Scenario 1: a Session carries its own accessibility and facility needs', async () => {
  const { repository } = fakeRepository(draftOwner);
  const result = await addSession(repository, 'organiser-1', EVENT_ID, {
    ...body,
    accessibilityFeatureIds: ['55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555'.toUpperCase()],
    facilityIds: [],
  });
  // Duplicates collapse, case is normalised, and an empty list clears the needs.
  assert.deepEqual(result.session.accessibilityFeatureIds, ['55555555-5555-4555-8555-555555555555']);
  assert.deepEqual(result.session.facilityIds, []);
});

test('E04-S02 Scenario 1: needs that are not lists of ids are rejected before any write', async () => {
  const { repository, calls } = fakeRepository(draftOwner);
  for (const needs of [
    { accessibilityFeatureIds: 'step-free' },
    { accessibilityFeatureIds: ['not-a-uuid'] },
    { facilityIds: [42] },
    { facilityIds: Array.from({ length: 51 }, (_, index) => `66666666-6666-4666-8666-${String(index).padStart(12, '0')}`) },
  ]) {
    await assert.rejects(addSession(repository, 'organiser-1', EVENT_ID, { ...body, ...needs }), (error: unknown) =>
      error instanceof AccessError && error.status === 400);
  }
  assert.deepEqual(calls, []);
});

test('E04-S02 Scenario 1: leaving the needs out keeps whatever the Session already has', async () => {
  const { repository } = fakeRepository(draftOwner);
  const result = await editSession(repository, 'organiser-1', EVENT_ID, SESSION_ID, body);
  assert.ok('session' in result);
  assert.equal(result.session!.accessibilityFeatureIds, undefined);
  assert.equal(result.session!.facilityIds, undefined);
});

test('E04-S02: handNeedsToEvent updates Event details to match the survivor Session and hands over needs', async () => {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const mockClient = {
    async query(sql: string, values?: unknown[]) {
      queries.push({ sql, values });
      if (sql.includes('SELECT id FROM sessions WHERE event_id = $1')) {
        return { rows: [{ id: SESSION_ID }] };
      }
      return { rows: [] };
    },
  };
  await handNeedsToEvent(mockClient, EVENT_ID);
  const updateEvent = queries.find(q => q.sql.includes('UPDATE events e'));
  assert.ok(updateEvent, 'updates event details');
  assert.ok(updateEvent.sql.includes('event_range = s.session_range'));
  assert.ok(updateEvent.sql.includes('expected_attendance = s.expected_attendance'));
  assert.ok(updateEvent.sql.includes('layout_id = s.layout_id'));
  assert.ok(updateEvent.sql.includes('venue_requirements = s.venue_requirements'));
  assert.ok(updateEvent.sql.includes('accessibility_note = s.accessibility_note'));
  assert.ok(updateEvent.sql.includes('equipment_requirements = s.equipment_requirements'));
  assert.ok(updateEvent.sql.includes('layout_preference = s.layout_preference'));
  const updatePublication = queries.find(q => q.sql.includes('UPDATE event_publications'));
  assert.ok(updatePublication, 'published dates move with the Event');
  assert.ok(updatePublication.sql.includes('starts_at = lower(e.event_range)'));
  assert.ok(updatePublication.sql.includes('ends_at = upper(e.event_range)'));
  assert.deepEqual(updatePublication.values, [EVENT_ID]);
  assert.deepEqual(updateEvent.values, [EVENT_ID, SESSION_ID]);

  assert.ok(queries.some(q => q.sql.includes('DELETE FROM event_accessibility_needs')));
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO event_accessibility_needs')));
  assert.ok(queries.some(q => q.sql.includes('DELETE FROM session_accessibility_needs')));
  assert.ok(queries.some(q => q.sql.includes('DELETE FROM event_facility_needs')));
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO event_facility_needs')));
  assert.ok(queries.some(q => q.sql.includes('DELETE FROM session_facility_needs')));
});

test('E04-S02: handNeedsToEvent does nothing if no survivor session exists', async () => {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const mockClient = {
    async query(sql: string, values?: unknown[]) {
      queries.push({ sql, values });
      return { rows: [] };
    },
  };
  await handNeedsToEvent(mockClient, EVENT_ID);
  assert.equal(queries.length, 1);
  assert.ok(queries[0]?.sql.includes('SELECT id FROM sessions WHERE event_id = $1'));
});

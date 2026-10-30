// SCRUM-61 (E08-S04) unit tests: reverting a Confirmed event to Planning.
// Covers:
// - Status transitions: Confirmed -> Planning is allowed, while Planning -> Confirmed
//   is illegal (must go through Safety Review under C-132/T-82).
// - Reason validation: non-empty string required, <= 2000 chars.
// - Role & access control: Coordinator role required, assigned coordinator required,
//   rejections audited.
// - Reversion execution: updates status to planning, sets reason and status_changed_at,
//   logs 'Reverted to Planning' audit entry, notifies organiser with reason and
//   attendees that arrangements are revised.

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import {
  allowedNextStatuses,
  validateEventStatusTransition,
} from '../src/modules/eventLifecycle/status.js';
import { applyEventStatusChange } from '../src/modules/eventLifecycle/repository.js';
import {
  confirmEvent,
  parseReversionReason,
  READINESS_MESSAGES,
  revertEventToPlanning,
} from '../src/modules/eventReadiness/submission.js';
import { AccessError } from '../src/modules/eventVisibility/service.js';

const coord: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'coordinator_1@connectsphere.com',
  role: 'event_coordinator',
  isActive: true,
  failedLoginCount: 0,
};

const safetyOfficer: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000005',
  email: 'safety_1@connectsphere.com',
  role: 'safety_officer',
  isActive: true,
  failedLoginCount: 0,
};

const otherCoord: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'coordinator_2@connectsphere.com',
  role: 'event_coordinator',
  isActive: true,
  failedLoginCount: 0,
};

const organiser: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000003',
  email: 'organiser_a@clienta.com',
  role: 'event_organiser',
  clientOrgId: '00000000-0000-4000-8000-000000000010',
  isActive: true,
  failedLoginCount: 0,
};

const attendee: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000004',
  email: 'attendee_a@example.com',
  role: 'attendee',
  isActive: true,
  failedLoginCount: 0,
};

test('TC_E08S04_01 status transitions: Confirmed -> Planning is allowed, Planning cannot jump to Confirmed (C-132, T-82)', () => {
  const reversion = validateEventStatusTransition('confirmed', 'planning');
  assert.deepEqual(reversion, { allowed: true, from: 'confirmed', to: 'planning' });

  // Scenario 4: Once reverted to planning, next allowed statuses are only safety_review or cancelled.
  // Planning cannot transition directly to Confirmed.
  assert.deepEqual(allowedNextStatuses('planning'), ['safety_review', 'cancelled']);
  const directConfirm = validateEventStatusTransition('planning', 'confirmed');
  assert.equal(directConfirm.allowed, false);
});

test('TC_E08S04_01 reason validation: non-empty string required, whitespace stripped, max 2000 chars', () => {
  assert.equal(parseReversionReason({ reason: 'Venue reported a plumbing issue' }), 'Venue reported a plumbing issue');
  assert.equal(parseReversionReason('  Arrangements need revision  '), 'Arrangements need revision');
  assert.equal(parseReversionReason('{"reason": "Venue reported a plumbing issue"}'), 'Venue reported a plumbing issue');
  assert.equal(parseReversionReason('{broken json reason}'), '{broken json reason}');

  for (const invalid of [undefined, null, '', '   ', { reason: '' }, { reason: '   ' }, '{"reason": "   "}', 123, []]) {
    assert.throws(
      () => parseReversionReason(invalid),
      (err: unknown) => err instanceof AccessError && err.status === 400 && err.message.includes('reason'),
    );
  }

  assert.throws(
    () => parseReversionReason('x'.repeat(2001)),
    (err: unknown) => err instanceof AccessError && err.status === 400 && err.message.includes('2000'),
  );
});

function mockPool(options: {
  eventRow?: {
    id: string;
    event_code: string | null;
    title: string;
    status: string;
    coordinator_id: string | null;
    organiser_id: string;
    starts_at: Date;
    ends_at: Date;
    equipment_requirements?: string;
  } | null;
  actorName?: string;
  registrations?: { attendee_id: string; status: string }[];
} = {}) {
  const sqlLog: { sql: string; values?: unknown[] }[] = [];
  const client = {
    async query(sql: string, values?: unknown[]) {
      sqlLog.push({ sql, values });
      if (sql.includes('SELECT id, event_code, title, status::text AS status') || sql.includes('FROM events WHERE')) {
        return { rows: options.eventRow ? [options.eventRow] : [], rowCount: options.eventRow ? 1 : 0 };
      }
      if (sql.includes('SELECT status FROM events WHERE id = $1 FOR UPDATE')) {
        return { rows: options.eventRow ? [{ status: options.eventRow.status }] : [], rowCount: options.eventRow ? 1 : 0 };
      }
      if (sql.includes('SELECT full_name FROM users WHERE id = $1')) {
        return { rows: [{ full_name: options.actorName ?? 'Coordinator One' }], rowCount: 1 };
      }
      if (sql.includes('UPDATE events')) {
        return {
          rows: [{
            id: options.eventRow?.id ?? 'e-1',
            title: options.eventRow?.title ?? 'Test Event',
            description: null,
            purpose: null,
            client_org_id: 'org-1',
            organiser_id: options.eventRow?.organiser_id ?? 'org-user',
            coordinator_id: options.eventRow?.coordinator_id ?? coord.id,
            status: 'planning',
            status_changed_at: new Date('2026-10-29T12:00:00Z'),
            start_at: new Date('2027-01-15T01:00:00Z'),
            end_at: new Date('2027-01-15T09:00:00Z'),
            expected_attendance: 100,
            layout_id: null,
            venue_requirements: null,
            accessibility_note: null,
            equipment_requirements: null,
            layout_preference: null,
            registration_setup: null,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('INSERT INTO audit_logs')) {
        return { rows: [{ id: 'audit-1', occurred_at: new Date('2026-10-29T12:00:00Z') }], rowCount: 1 };
      }
      if (sql.includes('SELECT e.id, e.title, p.name AS public_name, e.status')) {
        return {
          rows: [{
            id: options.eventRow?.id ?? 'e-1',
            title: options.eventRow?.title ?? 'Leadership Summit',
            public_name: 'Leadership Summit Public',
            status: 'planning',
            starts_at: new Date('2027-01-15T01:00:00Z'),
            ends_at: new Date('2027-01-15T09:00:00Z'),
            organiser_id: options.eventRow?.organiser_id ?? organiser.id,
            coordinator_id: options.eventRow?.coordinator_id ?? coord.id,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM event_registrations r')) {
        return { rows: options.registrations ?? [], rowCount: (options.registrations ?? []).length };
      }
      if (sql.includes('FROM tech_staff_assignments')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('FROM venue_bookings')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('INSERT INTO notifications')) {
        return { rows: [{ id: '00000000-0000-5000-8000-000000000001' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO notification_deliveries')) {
        return { rows: [{ id: '00000000-0000-5000-8000-000000000002' }], rowCount: 1 };
      }
      if (sql.includes('FROM notification_deliveries d')) {
        return {
          rows: [{
            delivery_status: 'pending',
            dispatch_state: 'ready',
            recipient_email: 'test@example.com',
            email: 'test@example.com',
            title: 'Event update',
            message: 'Notification content',
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  } as unknown as PoolClient;

  const pool = {
    async query(sql: string, values?: unknown[]) {
      sqlLog.push({ sql, values });
      if (sql.includes('audit_logs')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    async connect() {
      return client;
    },
  } as unknown as Pool;

  return { pool, client, sqlLog };
}

test('revertEventToPlanning refuses unauthenticated and non-coordinator roles', async () => {
  const { pool, sqlLog } = mockPool();

  await assert.rejects(
    revertEventToPlanning(pool, undefined, 'EVT-1', { reason: 'Plumbing' }),
    (err: unknown) => err instanceof AccessError && err.status === 401,
  );

  for (const roleUser of [organiser, attendee]) {
    await assert.rejects(
      revertEventToPlanning(pool, roleUser, 'EVT-1', { reason: 'Plumbing' }),
      (err: unknown) => err instanceof AccessError && err.status === 403,
    );
  }
  // Audit denial recorded for role refusals
  assert.ok(sqlLog.some(entry => entry.sql.includes('audit_logs') && entry.values?.includes('event_reversion')));
});

test('revertEventToPlanning validates identifier and reason before opening transaction', async () => {
  const { pool, sqlLog } = mockPool();

  await assert.rejects(
    revertEventToPlanning(pool, coord, '', { reason: 'Valid reason' }),
    (err: unknown) => err instanceof AccessError && err.status === 400,
  );

  await assert.rejects(
    revertEventToPlanning(pool, coord, 'EVT-1', { reason: '   ' }),
    (err: unknown) => err instanceof AccessError && err.status === 400,
  );

  assert.equal(sqlLog.filter(e => e.sql === 'BEGIN').length, 0);
});

test('revertEventToPlanning refuses unassigned coordinator or non-existent event', async () => {
  const { pool } = mockPool({
    eventRow: {
      id: 'e-1',
      event_code: 'EVT-1',
      title: 'Leadership Summit',
      status: 'confirmed',
      coordinator_id: otherCoord.id, // assigned to other coordinator
      organiser_id: organiser.id,
      starts_at: new Date('2027-01-15T01:00:00Z'),
      ends_at: new Date('2027-01-15T09:00:00Z'),
    },
  });

  await assert.rejects(
    revertEventToPlanning(pool, coord, 'EVT-1', { reason: 'Plumbing' }),
    (err: unknown) => err instanceof AccessError && err.status === 403 && err.message.includes('not assigned to you'),
  );
});

test('revertEventToPlanning refuses events that are not in Confirmed status', async () => {
  for (const status of ['planning', 'safety_review', 'under_review', 'cancelled', 'completed']) {
    const { pool } = mockPool({
      eventRow: {
        id: 'e-1',
        event_code: 'EVT-1',
        title: 'Leadership Summit',
        status,
        coordinator_id: coord.id,
        organiser_id: organiser.id,
        starts_at: new Date('2027-01-15T01:00:00Z'),
        ends_at: new Date('2027-01-15T09:00:00Z'),
      },
    });

    await assert.rejects(
      revertEventToPlanning(pool, coord, 'EVT-1', { reason: 'Plumbing issue' }),
      (err: unknown) => err instanceof AccessError && err.status === 409 && err.message.includes('Only a Confirmed event'),
    );
  }
});

test('TC_E08S04_01, TC_E08S04_02, TC_E08S04_04: reverting a Confirmed event updates status, audits, and notifies organiser & attendees', async () => {
  const { pool, sqlLog } = mockPool({
    eventRow: {
      id: 'e-1',
      event_code: 'EVT-1',
      title: 'Leadership Summit',
      status: 'confirmed',
      coordinator_id: coord.id,
      organiser_id: organiser.id,
      starts_at: new Date('2027-01-15T01:00:00Z'),
      ends_at: new Date('2027-01-15T09:00:00Z'),
    },
    actorName: 'coordinator_1@connectsphere.com',
    registrations: [{ attendee_id: attendee.id, status: 'registered' }],
  });

  const result = await revertEventToPlanning(pool, coord, 'EVT-1', {
    reason: 'Venue reported a plumbing issue',
  });

  assert.equal(result.eventId, 'e-1');
  assert.equal(result.eventCode, 'EVT-1');
  assert.equal(result.status, 'planning');
  assert.equal(result.reason, 'Venue reported a plumbing issue');

  // Verify status update query
  const updateQuery = sqlLog.find(e => e.sql.includes('UPDATE events'));
  assert.ok(updateQuery, 'Must update events table');
  assert.equal(updateQuery.values?.[1], 'planning');
  assert.equal(updateQuery.values?.[2], 'Venue reported a plumbing issue');

  // Verify TC_E08S04_04: Audit log entry with action 'Reverted to Planning'
  const auditQuery = sqlLog.find(e => e.sql.includes('INSERT INTO audit_logs') && e.values?.includes('Reverted to Planning'));
  assert.ok(auditQuery, 'Audit log entry must record "Reverted to Planning"');
  assert.equal(auditQuery.values?.[0], coord.id);
  assert.equal(auditQuery.values?.[2], 'Reverted to Planning');
  assert.equal(auditQuery.values?.[3], 'confirmed');
  assert.equal(auditQuery.values?.[4], 'planning');

  // Verify notifications
  const notifQueries = sqlLog.filter(e => e.sql.includes('INSERT INTO notifications'));
  assert.ok(notifQueries.length >= 2, 'Notifications must be sent to Organiser and registered Attendees');

  // TC_E08S04_01: Organiser notification with reason
  const organiserNotif = notifQueries.find(e => e.values?.[0] === organiser.id);
  assert.ok(organiserNotif, 'Organiser must receive a notification');
  assert.match(String(organiserNotif.values?.[3]), /Venue reported a plumbing issue/);

  // TC_E08S04_02: Registered Attendee notification with revised arrangements
  const attendeeNotif = notifQueries.find(e => e.values?.[0] === attendee.id);
  assert.ok(attendeeNotif, 'Attendee must receive a notification');
  assert.match(String(attendeeNotif.values?.[3]), /arrangements are being revised/);
});

test('Scenario 4 / C-132 / T-82: a reverted event in Planning cannot be confirmed directly; it must pass Safety Review again', async () => {
  // Reverted event is now in Planning status
  const { pool, client } = mockPool({
    eventRow: {
      id: 'e-1',
      event_code: 'EVT-1',
      title: 'Leadership Summit',
      status: 'planning',
      coordinator_id: coord.id,
      organiser_id: organiser.id,
      starts_at: new Date('2027-01-15T01:00:00Z'),
      ends_at: new Date('2027-01-15T09:00:00Z'),
    },
  });

  // Attempting to confirm the reverted event directly through confirmEvent is refused with 409
  await assert.rejects(
    confirmEvent(pool, safetyOfficer, 'e-1'),
    (err: unknown) => err instanceof AccessError && err.status === 409 && err.message === READINESS_MESSAGES.confirmNotInReview,
  );

  // Attempting direct status change planning -> confirmed in repository is rejected
  await assert.rejects(
    applyEventStatusChange(client, 'e-1', 'confirmed', safetyOfficer.id),
    /Illegal event status transition: planning -> confirmed/,
  );
});

test('revertEventToPlanning falls back to coordinator email if full_name is empty or whitespace', async () => {
  const { pool, sqlLog } = mockPool({
    eventRow: {
      id: 'e-1',
      event_code: 'EVT-1',
      title: 'Leadership Summit',
      status: 'confirmed',
      coordinator_id: coord.id,
      organiser_id: organiser.id,
      starts_at: new Date('2027-01-15T01:00:00Z'),
      ends_at: new Date('2027-01-15T09:00:00Z'),
    },
    actorName: '   ', // whitespace only
  });

  await revertEventToPlanning(pool, coord, 'e-1', { reason: 'Schedule clash' });

  const notifQueries = sqlLog.filter(e => e.sql.includes('INSERT INTO notifications'));
  const organiserNotif = notifQueries.find(e => e.values?.[0] === organiser.id);
  assert.ok(organiserNotif);
  // Must use coordinator email since full_name was whitespace
  assert.match(String(organiserNotif.values?.[3]), new RegExp(coord.email));
});

test('revertEventToPlanning refuses unassigned events (coordinator_id is null) and draft events', async () => {
  const { pool: unassignedPool } = mockPool({
    eventRow: {
      id: 'e-1',
      event_code: 'EVT-1',
      title: 'Leadership Summit',
      status: 'confirmed',
      coordinator_id: null,
      organiser_id: organiser.id,
      starts_at: new Date('2027-01-15T01:00:00Z'),
      ends_at: new Date('2027-01-15T09:00:00Z'),
    },
  });

  await assert.rejects(
    revertEventToPlanning(unassignedPool, coord, 'e-1', { reason: 'Venue issue' }),
    (err: unknown) => err instanceof AccessError && err.status === 403 && err.message.includes('not assigned to you'),
  );

  const { pool: draftPool } = mockPool({
    eventRow: {
      id: 'e-1',
      event_code: 'EVT-1',
      title: 'Leadership Summit',
      status: 'draft',
      coordinator_id: coord.id,
      organiser_id: organiser.id,
      starts_at: new Date('2027-01-15T01:00:00Z'),
      ends_at: new Date('2027-01-15T09:00:00Z'),
    },
  });

  await assert.rejects(
    revertEventToPlanning(draftPool, coord, 'e-1', { reason: 'Venue issue' }),
    (err: unknown) => err instanceof AccessError && err.status === 403 && err.message.includes('not assigned to you'),
  );
});

// SCRUM-261: real PostgreSQL proof of explicit Lead assignment and the
// retained Coordinator-to-Coordinator reassignment flow.
//
// Same isolation approach as eventLifecycle.integration.test.ts: the app's
// process-wide pool reads DATABASE_URL at import time, so the schema is
// selected through the connection string's search_path option before any
// application module is imported. Requires TEST_DATABASE_URL pointing at a
// direct (non-pooled) disposable PostgreSQL, never the live Supabase project.
// Run via `npm run test:db --workspace backend`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';
import { ensureTestExtensions } from './helpers/ensureTestExtensions.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('SCRUM-261: Lead assignment and Coordinator reassignment against PostgreSQL', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const schema = `coordassign_${randomUUID().replaceAll('-', '')}`;
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  let closePool: (() => Promise<void>) | undefined;

  try {
    await ensureTestExtensions(db);
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET search_path TO ${schema}, public`);
    for (const migration of (await readdir(new URL('../database/migrations/', import.meta.url))).filter(name => name.endsWith('.sql')).sort()) {
      await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
    }

    // --- Fixture: one client organisation, one Organiser, four Coordinators.
    const org = randomUUID();
    const organiser = randomUUID();
    const [lead, coordA, coordB, coordLocked, coordInactive] = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Test client']);
    await db.query(
      `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
       VALUES ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser')`,
      [organiser, org],
    );
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES ($1, 'lead@example.test', 'unused', 'Lead', 'event_coordinator_lead')`,
      [lead],
    );
    const coordinators: [string, string, string][] = [
      [coordA, 'coord_a@example.test', 'Coordinator A'],
      [coordB, 'coord_b@example.test', 'Coordinator B'],
      [coordLocked, 'coord_locked@example.test', 'Coordinator Locked'],
      [coordInactive, 'coord_inactive@example.test', 'Coordinator Inactive'],
    ];
    for (const [id, email, name] of coordinators) {
      await db.query(
        `INSERT INTO users (id, email, password_hash, full_name, role) VALUES ($1, $2, 'unused', $3, 'event_coordinator')`,
        [id, email, name],
      );
    }
    // Unavailable Coordinators cannot be selected by the Lead.
    await db.query(`UPDATE users SET locked_until = now() + interval '1 hour' WHERE id = $1`, [coordLocked]);
    await db.query(`UPDATE users SET is_active = false WHERE id = $1`, [coordInactive]);

    const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
    const separator = testDatabaseUrl.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${testDatabaseUrl}${separator}options=-c%20search_path%3D${schema},public`;

    const { createEventRequest, updateEventRequest, NONE_REQUIRED } = await import('../src/modules/eventLifecycle/service.js');
    const { PostgresEventLifecycleRepository } = await import('../src/modules/eventLifecycle/repository.js');
    const {
      assignQueuedEvent, getAssignedEvent, listAssignedEvents, listCoordinatorColleagues, listPendingReassignments,
      requestCoordinatorReassignment, respondToCoordinatorReassignment,
    } = await import('../src/modules/eventLifecycle/coordinatorAssignment.js');
    const { getDatabasePool } = await import('../src/database/client.js');
    const pool = getDatabasePool();
    closePool = () => pool.end();
    const repository = new PostgresEventLifecycleRepository();

    let submissionDay = 60;
    function completeRequest(title: string, status: 'submitted' | 'draft' = 'submitted') {
      const startAt = new Date(Date.now() + (submissionDay++) * 24 * 60 * 60 * 1000);
      return {
        title, organiserId: organiser, clientOrgId: org, status,
        startAt, endAt: new Date(startAt.getTime() + 3 * 60 * 60 * 1000), expectedAttendance: 50,
        description: 'A description.', purpose: 'A purpose.', accessibilityNote: 'None recorded.',
        venueRequirements: 'A seminar room', equipmentRequirements: NONE_REQUIRED,
        layoutPreference: NONE_REQUIRED, registrationSetup: NONE_REQUIRED,
      };
    }
    const coordinatorUser = (id: string): AuthenticatedUser => ({
      id, email: `${id}@example.test`, role: 'event_coordinator', isActive: true, failedLoginCount: 0,
    });
    const leadUser: AuthenticatedUser = {
      id: lead, email: 'lead@example.test', role: 'event_coordinator_lead', isActive: true, failedLoginCount: 0,
    };
    async function eventRow(id: string) {
      return (await db.query(
        'SELECT status, coordinator_id, coordinator_assigned_at FROM events WHERE id = $1', [id],
      )).rows[0];
    }
    async function auditActions(id: string) {
      return (await db.query(
        'SELECT action, old_value, new_value, actor_id FROM audit_logs WHERE event_id = $1 ORDER BY occurred_at, action', [id],
      )).rows;
    }
    async function notificationsFor(userId: string, id: string) {
      return (await db.query(
        'SELECT title, message FROM notifications WHERE user_id = $1 AND event_id = $2 ORDER BY created_at', [userId, id],
      )).rows;
    }

    // A submitted request stays unassigned and notifies the Lead.
    const first = await createEventRequest(repository, completeRequest('Charity Run'));
    assert.equal(first.status, 'submitted');
    assert.equal(first.coordinatorId, undefined);
    const firstRow = await eventRow(first.id);
    assert.equal(firstRow.status, 'submitted');
    assert.equal(firstRow.coordinator_id, null);
    const firstAudit = await auditActions(first.id);
    assert.ok(firstAudit.some(row => row.action === 'Status changed to submitted'));
    const firstNotifications = await notificationsFor(lead, first.id);
    assert.equal(firstNotifications.length, 1);
    assert.equal(firstNotifications[0].title, 'New request awaiting assignment');

    // Only the Lead chooses a valid active Coordinator; that choice moves the
    // request to Under Review and keeps the old Coordinator flow untouched.
    await assignQueuedEvent(pool, leadUser, first.id, { coordinator_id: coordB });
    const assignedFirst = await eventRow(first.id);
    assert.equal(assignedFirst.status, 'under_review');
    assert.equal(assignedFirst.coordinator_id, coordB);
    assert.ok(assignedFirst.coordinator_assigned_at instanceof Date);
    assert.ok((await auditActions(first.id)).some(row => row.action === 'Lead assigned' && row.new_value === coordB && row.actor_id === lead));
    assert.equal((await notificationsFor(coordB, first.id)).at(-1)?.title, 'New event assigned');

    // The draft -> submitted path uses the same explicit queue flow.
    const draft = await createEventRequest(repository, completeRequest('Winter Gala', 'draft'));
    assert.equal(draft.status, 'draft');
    assert.equal(draft.coordinatorId, undefined, 'drafts are never assigned');
    const submittedDraft = await updateEventRequest(repository, draft.id, organiser, { status: 'submitted' });
    assert.equal(submittedDraft.status, 'submitted');
    assert.equal(submittedDraft.coordinatorId, undefined);
    await assignQueuedEvent(pool, leadUser, draft.id, { coordinator_id: coordA });

    // --- Reassignment on the Lead-assigned Event. ---------------------------
    const userA = coordinatorUser(coordA);
    const userB = coordinatorUser(coordB);
    const eventId = submittedDraft.id;

    // Coordinator reads: A sees it in their list; the picker offers B only.
    assert.ok((await listAssignedEvents(pool, userA)).some(row => row.id === eventId));
    assert.equal((await listAssignedEvents(pool, userA, 'awaiting_clarification')).length, 0);
    const colleagues = await listCoordinatorColleagues(pool, userA);
    assert.deepEqual(colleagues.map(row => row.id), [coordB], 'only eligible colleagues, never the caller');

    // Scenario 6: B is not assigned, so B cannot reassign it.
    await assert.rejects(
      requestCoordinatorReassignment(pool, userB, eventId, { toCoordinatorId: coordA }),
      { status: 403, message: 'Only the assigned Coordinator can reassign this event.' },
    );
    assert.ok((await auditActions(eventId)).some(row => row.action === 'Access Denied'), 'the refusal is audited');

    // An ineligible colleague cannot be named.
    await assert.rejects(
      requestCoordinatorReassignment(pool, userA, eventId, { toCoordinatorId: coordLocked }), { status: 400 },
    );

    // Scenario 3: A asks B. Recorded, B notified, A still assigned.
    const request = await requestCoordinatorReassignment(pool, userA, eventId, { toCoordinatorId: coordB });
    assert.equal(request.status, 'pending');
    assert.equal((await eventRow(eventId)).coordinator_id, coordA, 'A stays assigned until B accepts');
    assert.equal((await notificationsFor(coordB, eventId)).at(-1)?.title, 'Reassignment requested');
    assert.equal((await listPendingReassignments(pool, userB)).incoming.length, 1);
    assert.equal((await listPendingReassignments(pool, userA)).outgoing.length, 1);
    assert.equal((await getAssignedEvent(pool, userA, eventId) as { pendingReassignment: unknown }).pendingReassignment !== null, true);

    // Only one pending request per event, enforced by the service...
    await assert.rejects(
      requestCoordinatorReassignment(pool, userA, eventId, { toCoordinatorId: coordB }), { status: 409 },
    );
    // ...and by the partial unique index itself.
    await assert.rejects(
      db.query(
        `INSERT INTO coordinator_reassignments (event_id, from_coordinator_id, to_coordinator_id) VALUES ($1, $2, $3)`,
        [eventId, coordA, coordB],
      ),
      (error: { code?: string }) => error.code === '23505',
    );

    // Only the named colleague may answer.
    await assert.rejects(respondToCoordinatorReassignment(pool, userA, request.id, 'accept'), { status: 403 });

    // Scenario 5: B declines. A stays assigned and is told.
    const declined = await respondToCoordinatorReassignment(pool, userB, request.id, 'decline');
    assert.equal(declined.status, 'declined');
    assert.ok(declined.decidedAt);
    assert.equal((await eventRow(eventId)).coordinator_id, coordA);
    assert.equal((await notificationsFor(coordA, eventId)).at(-1)?.title, 'Reassignment declined');
    await assert.rejects(respondToCoordinatorReassignment(pool, userB, request.id, 'accept'), { status: 409 });

    // Scenario 4: A asks again, B accepts. Ownership moves and is logged.
    const assignedBefore = (await eventRow(eventId)).coordinator_assigned_at as Date;
    const second = await requestCoordinatorReassignment(pool, userA, eventId, { toCoordinatorId: coordB });
    const accepted = await respondToCoordinatorReassignment(pool, userB, second.id, 'accept');
    assert.equal(accepted.status, 'accepted');
    const afterAccept = await eventRow(eventId);
    assert.equal(afterAccept.coordinator_id, coordB);
    assert.ok((afterAccept.coordinator_assigned_at as Date) > assignedBefore, 'the assignment time moves with ownership');
    assert.ok((await auditActions(eventId)).some(
      row => row.action === 'Coordinator reassigned' && row.old_value === coordA && row.new_value === coordB && row.actor_id === coordB,
    ));
    assert.equal((await notificationsFor(coordA, eventId)).at(-1)?.title, 'Reassignment accepted');

    // The previous assignment has ended: A can no longer see or reassign it.
    await assert.rejects(getAssignedEvent(pool, userA, eventId), { status: 403 });
    await assert.rejects(
      requestCoordinatorReassignment(pool, userA, eventId, { toCoordinatorId: coordB }), { status: 403 },
    );
    assert.ok((await listAssignedEvents(pool, userB)).some(row => row.id === eventId));

    // Migration 0008 constraints: no self-reassignment, and a decided row must
    // carry its decision time.
    await assert.rejects(
      db.query(
        `INSERT INTO coordinator_reassignments (event_id, from_coordinator_id, to_coordinator_id) VALUES ($1, $2, $2)`,
        [first.id, coordB],
      ),
      (error: { code?: string }) => error.code === '23514',
    );
    await assert.rejects(
      db.query(
        `INSERT INTO coordinator_reassignments (event_id, from_coordinator_id, to_coordinator_id, status)
         VALUES ($1, $2, $3, 'accepted')`,
        [first.id, coordB, coordA],
      ),
      (error: { code?: string }) => error.code === '23514',
    );
  } finally {
    await closePool?.();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});

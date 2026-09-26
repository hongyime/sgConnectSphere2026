// E03-S01 "Assign an Event Coordinator to a request" (SCRUM-32).
//
// - Auto-assignment on submission (Scenarios 1 and 2): the system picks
//   exactly one eligible Coordinator, the one with the fewest active events
//   (BDR C-12, C-41, C-55, T-14), and moves the request to Under Review.
// - Reassignment (Scenarios 3 to 6, BDR C-56 / T-15): only the assigned
//   Coordinator can ask a named colleague to take over; ownership moves only
//   when that colleague accepts, and a decline leaves it where it was.
// - Coordinator reads: an assigned Coordinator's own event list and detail,
//   eligible colleagues for the reassignment picker, and pending requests.
//
// Notifications are in-app rows written through notifyUser() (see
// notificationDispatcher/inApp.ts for why E03 does not wait on E11-S01).
// Audit entries follow E14-S02: every change and every refusal is recorded.

import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { canActAsRole, LOCKOUT_FAILURE_THRESHOLD } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError } from '../eventVisibility/service.js';
import { notifyUser } from '../notificationDispatcher/inApp.js';
import { ACTIVE_EVENT_STATUSES, isEventStatus, validateEventStatusTransition } from './status.js';

type Runner = Pick<PoolClient, 'query'>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Eligible to be assigned an event, or to be named in a reassignment: an
// active, unlocked Event Coordinator. Mirrors canActAsRole()/isLocked() in
// accessControl/service.ts so a Coordinator who could not sign in is never
// handed work. `$1` is always LOCKOUT_FAILURE_THRESHOLD.
const ELIGIBLE_COORDINATOR = `u.role = 'event_coordinator' AND u.is_active
  AND u.failed_login_count < $1 AND (u.locked_until IS NULL OR u.locked_until <= now())`;

// BDR T-14 plus the D3 tie-break: fewest active events, then the Coordinator
// whose most recent assignment is oldest (never assigned sorts first), then
// user id so the choice is always deterministic.
const PICK_COORDINATOR_SQL = `
  SELECT u.id, u.full_name
  FROM users u
  WHERE ${ELIGIBLE_COORDINATOR}
  ORDER BY
    (SELECT count(*) FROM events e
      WHERE e.coordinator_id = u.id AND e.status = ANY($2::event_status[])) ASC,
    (SELECT max(e.coordinator_assigned_at) FROM events e WHERE e.coordinator_id = u.id) ASC NULLS FIRST,
    u.id ASC
  LIMIT 1`;

// Transaction-scoped advisory lock: two submissions committing at the same
// moment would otherwise both see the same "least busy" Coordinator. Only the
// pick-and-assign step is serialised, and the lock is released at COMMIT.
const ASSIGNMENT_LOCK_SQL = `SELECT pg_advisory_xact_lock(hashtext('connectsphere:coordinator-assignment'))`;

function eventLabel(event: { event_code: string | null; title: string }) {
  return event.event_code ? `${event.event_code} ${event.title}` : event.title;
}

export type CoordinatorAssignment = { coordinatorId: string; coordinatorName: string };

// Scenarios 1 and 2. Runs inside the caller's transaction, straight after
// the request is stored as Submitted, so the submission, the assignment, the
// status change, their audit entries and the Coordinator's notification all
// commit together. Returns null when nothing was assigned.
export async function assignCoordinatorOnSubmit(client: Runner, eventId: string): Promise<CoordinatorAssignment | null> {
  await client.query(ASSIGNMENT_LOCK_SQL);

  const eventResult = await client.query<{
    id: string; event_code: string | null; title: string; status: string; coordinator_id: string | null;
  }>(`SELECT id, event_code, title, status, coordinator_id FROM events WHERE id = $1 FOR UPDATE`, [eventId]);
  const event = eventResult.rows[0];
  if (!event) throw new Error(`Event not found: ${eventId}`);
  if (event.status !== 'submitted' || event.coordinator_id) return null;

  const picked = await client.query<{ id: string; full_name: string }>(
    PICK_COORDINATOR_SQL, [LOCKOUT_FAILURE_THRESHOLD, [...ACTIVE_EVENT_STATUSES]],
  );
  const coordinator = picked.rows[0];

  // D4: with nobody eligible the submission still stands. The request stays
  // Submitted and unassigned, and the gap is audited so it can be followed up.
  if (!coordinator) {
    await client.query(
      `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
       VALUES (NULL, 'event', $1, $1, 'Coordinator assignment pending', 'coordinator_id', 'No eligible Event Coordinator')`,
      [eventId],
    );
    return null;
  }

  const transition = validateEventStatusTransition('submitted', 'under_review');
  if (!transition.allowed) throw new Error('Illegal event status transition: submitted -> under_review');

  await client.query(
    `UPDATE events
     SET coordinator_id = $2, coordinator_assigned_at = now(),
         status = 'under_review'::event_status, status_changed_at = now()
     WHERE id = $1`,
    [eventId, coordinator.id],
  );
  // The system, not a person, makes the assignment, so both entries have no actor.
  await client.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
     VALUES (NULL, 'event', $1, $1, 'Coordinator assigned', 'coordinator_id', NULL, $2)`,
    [eventId, coordinator.id],
  );
  await client.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
     VALUES (NULL, 'event', $1, $1, 'Status changed to under_review', 'status', 'submitted', 'under_review')`,
    [eventId],
  );
  await notifyUser(client, {
    userId: coordinator.id,
    eventId,
    title: 'New event assigned',
    message: `You have been assigned to ${eventLabel(event)}. It is now Under Review.`,
  });

  return { coordinatorId: coordinator.id, coordinatorName: coordinator.full_name };
}

// --- Access helpers ---------------------------------------------------------

// E14-S02 Scenario 2: a wrong-role denial is recorded against the screen.
async function requireCoordinator(database: Pool, user: AuthenticatedUser | undefined, screen: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await database.query(
      `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
       VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', $2)`,
      [user.id, screen],
    );
    throw new AccessError(403, 'Access denied. This action is for Event Coordinators.');
  }
  return user;
}

// E14-S02: an event-level refusal is committed on its own, outside the
// refused transaction, so rolling that transaction back cannot lose it.
// Unknown identifiers are recorded the same way, without revealing whether
// an event exists.
async function recordEventDenial(database: Pool, user: AuthenticatedUser, identifier: string, attempted: string) {
  await database.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
     SELECT $1, 'event', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', $3, $2
     FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2 OR e.event_code = $2`,
    [user.id, identifier, attempted],
  );
}

// --- Coordinator reads (D2: assigned events only, never drafts) -------------

const ASSIGNED_EVENT_FIELDS = `e.id, e.event_code, e.title, e.status, e.status_changed_at,
  lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at, e.expected_attendance,
  e.coordinator_assigned_at, o.full_name AS organiser_name`;

export async function listAssignedEvents(database: Pool, user: AuthenticatedUser | undefined, status?: string | null) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_events');
  if (status && !isEventStatus(status)) throw new AccessError(400, 'Unknown status filter.');
  const result = await database.query(
    `SELECT ${ASSIGNED_EVENT_FIELDS},
       EXISTS (SELECT 1 FROM coordinator_reassignments r
               WHERE r.event_id = e.id AND r.status = 'pending') AS reassignment_pending
     FROM events e JOIN users o ON o.id = e.organiser_id
     WHERE e.coordinator_id = $1 AND e.status <> 'draft'
       AND ($2::event_status IS NULL OR e.status = $2::event_status)
     ORDER BY lower(e.event_range), e.id
     LIMIT 200`,
    [coordinator.id, status || null],
  );
  return result.rows;
}

export async function getAssignedEvent(database: Pool, user: AuthenticatedUser | undefined, identifier: string) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_events');
  const result = await database.query(
    `SELECT ${ASSIGNED_EVENT_FIELDS}, e.description, e.purpose, e.venue_requirements, e.accessibility_note,
       e.equipment_requirements, e.layout_preference, e.registration_setup, e.coordinator_id,
       c.full_name AS coordinator_name, o.email AS organiser_email
     FROM events e JOIN users o ON o.id = e.organiser_id JOIN users c ON c.id = e.coordinator_id
     WHERE (e.id::text = $2 OR e.event_code = $2) AND e.coordinator_id = $1 AND e.status <> 'draft'`,
    [coordinator.id, identifier],
  );
  const event = result.rows[0] as Record<string, unknown> & { id: string } | undefined;
  if (!event) {
    await recordEventDenial(database, coordinator, identifier, 'coordinator_event');
    throw new AccessError(403, 'Access denied. This event is not assigned to you.');
  }
  const pending = await database.query(`${REASSIGNMENT_SELECT} WHERE r.event_id = $1 AND r.status = 'pending'`, [event.id]);
  return { ...event, pendingReassignment: pending.rows[0] ? toReassignment(pending.rows[0] as ReassignmentRow) : null };
}

// Eligible colleagues for the Scenario 3 picker: every other active,
// unlocked Coordinator, with their current active-event count.
export async function listCoordinatorColleagues(database: Pool, user: AuthenticatedUser | undefined) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_reassignment');
  const result = await database.query(
    `SELECT u.id, u.full_name, u.email,
       (SELECT count(*)::int FROM events e
         WHERE e.coordinator_id = u.id AND e.status = ANY($2::event_status[])) AS active_events
     FROM users u
     WHERE ${ELIGIBLE_COORDINATOR} AND u.id <> $3
     ORDER BY u.full_name, u.id`,
    [LOCKOUT_FAILURE_THRESHOLD, [...ACTIVE_EVENT_STATUSES], coordinator.id],
  );
  return result.rows;
}

// --- Reassignment (Scenarios 3 to 6) ----------------------------------------

type ReassignmentRow = {
  id: string; event_id: string; event_code: string | null; event_title: string; status: string;
  requested_at: Date; decided_at: Date | null;
  from_coordinator_id: string; from_coordinator_name: string;
  to_coordinator_id: string; to_coordinator_name: string;
};

const REASSIGNMENT_SELECT = `SELECT r.id, r.event_id, e.event_code, e.title AS event_title, r.status,
  r.requested_at, r.decided_at, r.from_coordinator_id, f.full_name AS from_coordinator_name,
  r.to_coordinator_id, t.full_name AS to_coordinator_name
  FROM coordinator_reassignments r JOIN events e ON e.id = r.event_id
  JOIN users f ON f.id = r.from_coordinator_id JOIN users t ON t.id = r.to_coordinator_id`;

function toReassignment(row: ReassignmentRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    eventCode: row.event_code,
    eventTitle: row.event_title,
    status: row.status,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
    fromCoordinator: { id: row.from_coordinator_id, name: row.from_coordinator_name },
    toCoordinator: { id: row.to_coordinator_id, name: row.to_coordinator_name },
  };
}

export type Reassignment = ReturnType<typeof toReassignment>;

// Pending requests the caller must answer (incoming) or is waiting on (outgoing).
export async function listPendingReassignments(database: Pool, user: AuthenticatedUser | undefined) {
  const coordinator = await requireCoordinator(database, user, 'coordinator_reassignment');
  const result = await database.query<ReassignmentRow>(
    `${REASSIGNMENT_SELECT}
     WHERE r.status = 'pending' AND (r.to_coordinator_id = $1 OR r.from_coordinator_id = $1)
     ORDER BY r.requested_at, r.id`,
    [coordinator.id],
  );
  const all = result.rows.map(toReassignment);
  return {
    incoming: all.filter(item => item.toCoordinator.id === coordinator.id),
    outgoing: all.filter(item => item.fromCoordinator.id === coordinator.id),
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

// Scenario 3 (request recorded, colleague notified, requester stays
// assigned) and Scenario 6 (anyone but the assigned Coordinator refused).
export async function requestCoordinatorReassignment(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
): Promise<Reassignment> {
  const coordinator = await requireCoordinator(database, user, 'coordinator_reassignment');
  const toCoordinatorId = (body && typeof body === 'object' && !Array.isArray(body))
    ? (body as { toCoordinatorId?: unknown }).toCoordinatorId : undefined;
  if (typeof toCoordinatorId !== 'string' || !UUID_PATTERN.test(toCoordinatorId)) {
    throw new AccessError(400, 'Choose the colleague to reassign this event to.');
  }
  if (toCoordinatorId === coordinator.id) {
    throw new AccessError(400, 'Choose a colleague other than yourself.');
  }

  let outcome: { denied: true } | { denied: false; reassignment: Reassignment };
  try {
    outcome = await inTransaction(database, async client => {
      const eventResult = await client.query<{
        id: string; event_code: string | null; title: string; status: string; coordinator_id: string | null;
      }>(
        `SELECT id, event_code, title, status, coordinator_id FROM events
         WHERE id::text = $1 OR event_code = $1 FOR UPDATE`,
        [identifier],
      );
      const event = eventResult.rows[0];
      if (!event || event.coordinator_id !== coordinator.id) return { denied: true as const };
      if (!(ACTIVE_EVENT_STATUSES as readonly string[]).includes(event.status)) {
        throw new AccessError(409, 'Only an active event can be reassigned.');
      }

      const target = await client.query<{ id: string }>(
        `SELECT u.id FROM users u WHERE u.id = $2 AND ${ELIGIBLE_COORDINATOR}`,
        [LOCKOUT_FAILURE_THRESHOLD, toCoordinatorId],
      );
      if (!target.rows[0]) {
        throw new AccessError(400, 'That colleague is not an active Event Coordinator.');
      }

      const pending = await client.query(
        `SELECT id FROM coordinator_reassignments WHERE event_id = $1 AND status = 'pending'`, [event.id],
      );
      if (pending.rows[0]) {
        throw new AccessError(409, 'A reassignment for this event is already awaiting a response.');
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO coordinator_reassignments (event_id, from_coordinator_id, to_coordinator_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [event.id, coordinator.id, toCoordinatorId],
      );
      const reassignmentId = inserted.rows[0]!.id;
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
         VALUES ($1, 'event', $2, $2, 'Coordinator reassignment requested', 'coordinator_id', $3, $4)`,
        [coordinator.id, event.id, coordinator.id, toCoordinatorId],
      );
      const saved = await client.query<ReassignmentRow>(`${REASSIGNMENT_SELECT} WHERE r.id = $1`, [reassignmentId]);
      const reassignment = toReassignment(saved.rows[0]!);
      await notifyUser(client, {
        userId: toCoordinatorId,
        eventId: event.id,
        title: 'Reassignment requested',
        message: `${reassignment.fromCoordinator.name} has asked you to take over ${eventLabel(event)}. `
          + 'Accept or decline the request in ConnectSphere.',
      });
      return { denied: false as const, reassignment };
    });
  } catch (error) {
    // Two simultaneous requests for the same event: the partial unique index
    // lets only one through.
    if (isUniqueViolation(error)) {
      throw new AccessError(409, 'A reassignment for this event is already awaiting a response.');
    }
    throw error;
  }

  if (outcome.denied) {
    await recordEventDenial(database, coordinator, identifier, 'coordinator_reassignment');
    throw new AccessError(403, 'Only the assigned Coordinator can reassign this event.');
  }
  return outcome.reassignment;
}

// Scenario 4 (accept: ownership moves, logged) and Scenario 5 (decline: the
// original Coordinator stays assigned and is told). Only the named colleague
// may answer, and only once.
export async function respondToCoordinatorReassignment(
  database: Pool,
  user: AuthenticatedUser | undefined,
  reassignmentId: string,
  decision: string | null,
): Promise<Reassignment> {
  const coordinator = await requireCoordinator(database, user, 'coordinator_reassignment');
  if (decision !== 'accept' && decision !== 'decline') {
    throw new AccessError(400, 'Choose whether to accept or decline the reassignment.');
  }
  if (!UUID_PATTERN.test(reassignmentId)) throw new AccessError(404, 'Reassignment request not found.');

  const outcome = await inTransaction(database, async client => {
    const found = await client.query<ReassignmentRow & { event_status: string; event_coordinator_id: string | null }>(
      `SELECT r.id, r.event_id, e.event_code, e.title AS event_title, r.status, r.requested_at, r.decided_at,
         r.from_coordinator_id, f.full_name AS from_coordinator_name,
         r.to_coordinator_id, t.full_name AS to_coordinator_name,
         e.status AS event_status, e.coordinator_id AS event_coordinator_id
       FROM coordinator_reassignments r JOIN events e ON e.id = r.event_id
       JOIN users f ON f.id = r.from_coordinator_id JOIN users t ON t.id = r.to_coordinator_id
       WHERE r.id = $1
       FOR UPDATE OF r, e`,
      [reassignmentId],
    );
    const row = found.rows[0];
    if (!row) throw new AccessError(404, 'Reassignment request not found.');
    if (row.to_coordinator_id !== coordinator.id) return { denied: true as const, eventId: row.event_id };
    if (row.status !== 'pending') throw new AccessError(409, 'This reassignment has already been answered.');

    const label = eventLabel({ event_code: row.event_code, title: row.event_title });
    if (decision === 'accept') {
      if (row.event_coordinator_id !== row.from_coordinator_id) {
        throw new AccessError(409, 'The event\'s Coordinator changed after this request was made.');
      }
      if (!(ACTIVE_EVENT_STATUSES as readonly string[]).includes(row.event_status)) {
        throw new AccessError(409, 'This event is no longer active, so it cannot be reassigned.');
      }
      await client.query(
        `UPDATE events SET coordinator_id = $2, coordinator_assigned_at = now() WHERE id = $1`,
        [row.event_id, coordinator.id],
      );
      await client.query(
        `UPDATE coordinator_reassignments SET status = 'accepted', decided_at = now() WHERE id = $1`,
        [row.id],
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
         VALUES ($1, 'event', $2, $2, 'Coordinator reassigned', 'coordinator_id', $3, $4)`,
        [coordinator.id, row.event_id, row.from_coordinator_id, coordinator.id],
      );
      await notifyUser(client, {
        userId: row.from_coordinator_id,
        eventId: row.event_id,
        title: 'Reassignment accepted',
        message: `${row.to_coordinator_name} accepted your reassignment of ${label} and is now its assigned Coordinator.`,
      });
    } else {
      await client.query(
        `UPDATE coordinator_reassignments SET status = 'declined', decided_at = now() WHERE id = $1`,
        [row.id],
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
         VALUES ($1, 'event', $2, $2, 'Coordinator reassignment declined', 'coordinator_id', $3, $3)`,
        [coordinator.id, row.event_id, row.from_coordinator_id],
      );
      await notifyUser(client, {
        userId: row.from_coordinator_id,
        eventId: row.event_id,
        title: 'Reassignment declined',
        message: `${row.to_coordinator_name} declined your reassignment of ${label}. You remain its assigned Coordinator.`,
      });
    }

    const saved = await client.query<ReassignmentRow>(`${REASSIGNMENT_SELECT} WHERE r.id = $1`, [row.id]);
    return { denied: false as const, reassignment: toReassignment(saved.rows[0]!) };
  });

  if (outcome.denied) {
    await recordEventDenial(database, coordinator, outcome.eventId, 'coordinator_reassignment_response');
    throw new AccessError(403, 'Only the named colleague can respond to this reassignment.');
  }
  return outcome.reassignment;
}

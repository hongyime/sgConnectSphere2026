// E07-S07 (SCRUM-57) Assign and manage technical staff for an event.
//
// Technical Support Staff assign colleagues to an event's open technical
// support request (E07-S06). The colleague is notified and the assignment is
// on their schedule (Scenario 1). A colleague already assigned elsewhere at an
// overlapping time is refused, and the conflicting event is named (Scenario 2).
// Removing an assignment notifies the colleague and frees the slot (Scenario
// 3). A replacement goes through the same check (Scenario 4).
//
// Data: `tech_staff_assignments`, one row per colleague per request, covering
// the request's whole support range. Removing sets `status = 'released'`, so
// history stays but the slot is free: the table's exclusion constraint only
// counts `assigned` rows, and it is the last guard against two people
// assigning the same colleague at once. A request is `staffed` while it has at
// least one assigned colleague and goes back to `open` when the last leaves.
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';

// Support is staffed for events that are going ahead: approved, being
// planned, or confirmed. Not for drafts, rejected, cancelled or past events.
export const STAFFABLE_STATUSES = ['approved', 'planning', 'confirmed'];
const NOT_STAFFABLE = 'Technicians can only be assigned to approved, planning or confirmed events.';

export type Conflict = { eventCode: string | null; title: string; startsAt: string; endsAt: string };
type Assignee = { assignmentId: string; staffId: string; name: string };
export type QueueRow = {
  id: string; eventId: string; eventCode: string | null; eventTitle: string; eventStatus: string;
  description: string; startsAt: string; endsAt: string; status: string; assignees: Assignee[];
};

async function recordDenied(query: Query, user: AuthenticatedUser) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
    VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'tech_staff_assignments')`, [user.id]);
}

// Only active Technical Support Staff staff requests and see the queue.
async function requireTechnician(query: Query, user: AuthenticatedUser | undefined) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['technical_support_staff']).allowed) {
    await recordDenied(query, user);
    throw new AccessError(403, 'Access denied. Only Technical Support Staff can assign technicians.');
  }
  return user;
}

const QUEUE_SELECT = `SELECT r.id, r.event_id AS "eventId", e.event_code AS "eventCode", e.title AS "eventTitle",
    e.status AS "eventStatus", r.support_description AS description, lower(r.support_range) AS "startsAt",
    upper(r.support_range) AS "endsAt", r.status,
    COALESCE((SELECT json_agg(json_build_object('assignmentId', a.id, 'staffId', a.staff_id, 'name', u.full_name)
      ORDER BY u.full_name) FROM tech_staff_assignments a JOIN users u ON u.id = a.staff_id
      WHERE a.request_id = r.id AND a.status = 'assigned'), '[]'::json) AS assignees
  FROM tech_support_requests r JOIN events e ON e.id = r.event_id
  WHERE r.support_required AND r.status <> 'cancelled'`;

// Every request still to be worked on, soonest first; open ones ahead of staffed.
export async function listQueue(query: Query, user: AuthenticatedUser | undefined) {
  await requireTechnician(query, user);
  const rows = (await query<QueueRow>(`${QUEUE_SELECT} AND e.status = ANY($1::event_status[])
    ORDER BY (r.status = 'open') DESC, lower(r.support_range), r.created_at`, [STAFFABLE_STATUSES])).rows;
  return { requests: rows };
}

async function conflictsFor(query: Query, staffId: string, requestId: string) {
  return (await query<Conflict>(`SELECT e.event_code AS "eventCode", e.title, lower(a.assignment_range) AS "startsAt",
      upper(a.assignment_range) AS "endsAt"
    FROM tech_staff_assignments a JOIN events e ON e.id = a.event_id
    JOIN tech_support_requests r ON r.id = $2
    WHERE a.staff_id = $1 AND a.status = 'assigned' AND a.request_id <> $2 AND a.assignment_range && r.support_range
    ORDER BY lower(a.assignment_range)`, [staffId, requestId])).rows;
}

function requestId(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AccessError(400, 'A support request id is required.');
  return id;
}

// One request with who is on it, and every active colleague with whether they
// are free for its times (a busy colleague lists the clashing events).
export async function getRequest(query: Query, user: AuthenticatedUser | undefined, id: unknown) {
  await requireTechnician(query, user);
  const request = (await query<QueueRow>(`${QUEUE_SELECT} AND r.id = $1`, [requestId(id)])).rows[0];
  if (!request) throw new AccessError(404, 'That technical support request was not found.');
  const staff = (await query<{ id: string; name: string }>(`SELECT id, full_name AS name FROM users
    WHERE role = 'technical_support_staff' AND is_active ORDER BY full_name`)).rows;
  const assigned = new Set(request.assignees.map(person => person.staffId));
  const candidates = await Promise.all(staff.map(async person => ({
    staffId: person.id, name: person.name, assigned: assigned.has(person.id),
    conflicts: assigned.has(person.id) ? [] : await conflictsFor(query, person.id, request.id),
  })));
  return { request, candidates, canAssign: STAFFABLE_STATUSES.includes(request.eventStatus) };
}

// The signed-in technician's own assignments, soonest first.
export async function mySchedule(query: Query, user: AuthenticatedUser | undefined) {
  const me = await requireTechnician(query, user);
  const assignments = (await query(`SELECT a.id, a.request_id AS "requestId", e.event_code AS "eventCode", e.title AS "eventTitle",
      e.status AS "eventStatus", r.support_description AS description,
      lower(a.assignment_range) AS "startsAt", upper(a.assignment_range) AS "endsAt"
    FROM tech_staff_assignments a JOIN events e ON e.id = a.event_id JOIN tech_support_requests r ON r.id = a.request_id
    WHERE a.staff_id = $1 AND a.status = 'assigned'
    ORDER BY lower(a.assignment_range)`, [me.id])).rows;
  return { assignments };
}

const name = (event: { eventCode: string | null; eventTitle: string }) =>
  event.eventCode && !event.eventTitle.startsWith(event.eventCode) ? `${event.eventCode} ${event.eventTitle}` : event.eventTitle;
const conflictSentence = (who: string, conflict: Conflict) =>
  `${who} is already assigned to ${name({ eventCode: conflict.eventCode, eventTitle: conflict.title })} at an overlapping time.`;

type LockedRequest = { id: string; eventId: string; eventCode: string | null; eventTitle: string; eventStatus: string; description: string; status: string; range: string };

// Assigning needs a staffable event; removing is always allowed, so a
// cancelled or finished event never keeps a colleague's time blocked.
async function lockRequest(client: PoolClient, id: string, forRemoval = false) {
  const request = (await client.query<LockedRequest>(`SELECT r.id, r.event_id AS "eventId", e.event_code AS "eventCode",
      e.title AS "eventTitle", e.status AS "eventStatus", r.support_description AS description, r.status,
      r.support_range::text AS range
    FROM tech_support_requests r JOIN events e ON e.id = r.event_id
    WHERE r.id = $1 AND r.support_required FOR UPDATE OF r`, [id])).rows[0];
  if (!request) throw new AccessError(404, 'That technical support request was not found.');
  if (!forRemoval && (request.status === 'cancelled' || !STAFFABLE_STATUSES.includes(request.eventStatus))) throw new AccessError(409, NOT_STAFFABLE);
  return request;
}

const isOverlapViolation = (error: unknown) =>
  (error as { code?: string })?.code === '23P01';

export async function assignTechnician(database: Pool, user: AuthenticatedUser | undefined, body: unknown) {
  await requireTechnician(database.query.bind(database) as Query, user);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const id = requestId(data.request);
  const staffId = typeof data.staff === 'string' ? data.staff.trim() : '';
  if (!staffId) throw new AccessError(400, 'Choose a colleague to assign.');
  try {
    return await inTransaction(database, async client => {
      const request = await lockRequest(client, id);
      const colleague = (await client.query<{ id: string; name: string }>(`SELECT id, full_name AS name FROM users
        WHERE id::text = $1 AND role = 'technical_support_staff' AND is_active`, [staffId])).rows[0];
      if (!colleague) throw new AccessError(400, 'Only active Technical Support Staff can be assigned.');
      const already = await client.query(`SELECT 1 FROM tech_staff_assignments
        WHERE request_id = $1 AND staff_id = $2 AND status = 'assigned'`, [request.id, colleague.id]);
      if (already.rowCount) throw new AccessError(409, `${colleague.name} is already assigned to this request.`);
      const conflicts = await conflictsFor(client.query.bind(client) as Query, colleague.id, request.id);
      if (conflicts.length) return { status: 409, body: { error: conflictSentence(colleague.name, conflicts[0]!), conflicts } };
      const assignmentId = randomUUID();
      await client.query(`INSERT INTO tech_staff_assignments (id, request_id, event_id, staff_id, assignment_range, status)
        VALUES ($1, $2, $3, $4, $5::tstzrange, 'assigned')`, [assignmentId, request.id, request.eventId, colleague.id, request.range]);
      await client.query(`UPDATE tech_support_requests SET status = 'staffed' WHERE id = $1`, [request.id]);
      await writeEventNotification(client, {
        eventId: request.eventId, changeId: `${assignmentId}:assigned`, userId: colleague.id, occurredAt: new Date(),
        title: 'Technical support assignment',
        message: `You're assigned to ${name(request)}: ${request.description}`,
      });
      return { status: 201, body: { assignment: { id: assignmentId, staffId: colleague.id, name: colleague.name } } };
    });
  } catch (error) {
    // Someone else assigned the same colleague at the same moment: the
    // exclusion constraint refused the second insert. Report it the same way.
    if (!isOverlapViolation(error)) throw error;
    const conflicts = await conflictsFor(database.query.bind(database) as Query, staffId, id);
    const who = (await database.query<{ name: string }>(`SELECT full_name AS name FROM users WHERE id::text = $1`, [staffId])).rows[0]?.name ?? 'This colleague';
    return { status: 409, body: { error: conflicts[0] ? conflictSentence(who, conflicts[0]) : `${who} is already assigned at an overlapping time.`, conflicts } };
  }
}

export async function removeAssignment(database: Pool, user: AuthenticatedUser | undefined, body: unknown) {
  await requireTechnician(database.query.bind(database) as Query, user);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const assignmentId = typeof data.assignment === 'string' ? data.assignment.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw new AccessError(400, 'An assignment id is required.');
  return inTransaction(database, async client => {
    const assignment = (await client.query<{ requestId: string; staffId: string; name: string }>(`SELECT a.request_id AS "requestId",
        a.staff_id AS "staffId", u.full_name AS name
      FROM tech_staff_assignments a JOIN users u ON u.id = a.staff_id
      WHERE a.id = $1 AND a.status = 'assigned' FOR UPDATE OF a`, [assignmentId])).rows[0];
    if (!assignment) throw new AccessError(409, 'That assignment has already been removed.');
    const request = await lockRequest(client, assignment.requestId, true);
    await client.query(`UPDATE tech_staff_assignments SET status = 'released' WHERE id = $1`, [assignmentId]);
    const left = await client.query(`SELECT 1 FROM tech_staff_assignments WHERE request_id = $1 AND status = 'assigned'`, [request.id]);
    if (!left.rowCount) await client.query(`UPDATE tech_support_requests SET status = 'open' WHERE id = $1`, [request.id]);
    await writeEventNotification(client, {
      eventId: request.eventId, changeId: `${assignmentId}:released`, userId: assignment.staffId, occurredAt: new Date(),
      title: 'Technical support assignment removed',
      message: `You're no longer assigned to ${name(request)}. That time is free again.`,
    });
    return { status: 200, body: { removed: true, requestStatus: left.rowCount ? 'staffed' : 'open' } };
  });
}

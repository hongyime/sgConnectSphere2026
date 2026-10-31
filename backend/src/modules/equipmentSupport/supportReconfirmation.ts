// E10-S02 follow-up (SCRUM-244, T-104): Technical Support Staff reconfirm a
// staffed support request that an Event date or time change flagged.
//
// The change worked out where the request moves (reconfirm_range: shifted as
// far as the Event or its Session moved, same length). Reconfirming moves the
// request and every assigned colleague's assignment there, clears the flag,
// records it in the Activity log, tells the Coordinator and any moved
// colleague, and lets a reverted Confirmed event re-enter Safety Review
// (E08-S04 Scenario 4). A colleague already assigned elsewhere at the new time
// refuses the whole reconfirmation, naming the clashing event, as assigning
// does (E07-S07 Scenario 2); the request then stays flagged.
//
//   GET  /api/venues?task=staffing&reconfirm=list
//   POST /api/venues?task=staffing  { action: 'reconfirm', request }
import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { enterSafetyReviewIfReady } from '../eventReadiness/autoSafetyReview.js';
import { formatEventDates } from './reservations.js';
import {
  STAFFABLE_STATUSES, conflictSentence, isOverlapViolation, lockRequest, name, requireTechnician, type Conflict,
} from './staffAssignments.js';

export const NOTHING_TO_RECONFIRM = 'This support request does not need reconfirmation.';
export const NOT_RECONFIRMABLE = 'Support can only be reconfirmed for approved, planning or confirmed events.';

type Assignee = { assignmentId: string; staffId: string; name: string };
export type ReconfirmRow = {
  id: string; eventId: string; eventCode: string | null; eventTitle: string; eventStatus: string; description: string;
  startsAt: string; endsAt: string; reconfirmFor: { startsAt: string; endsAt: string }; assignees: Assignee[];
};

// Every flagged request on an event still going ahead, soonest first.
export async function listSupportToReconfirm(query: Query, user: AuthenticatedUser | undefined) {
  await requireTechnician(query, user);
  const requests = (await query<ReconfirmRow>(`SELECT r.id, r.event_id AS "eventId", e.event_code AS "eventCode",
      e.title AS "eventTitle", e.status AS "eventStatus", r.support_description AS description,
      lower(r.support_range) AS "startsAt", upper(r.support_range) AS "endsAt",
      json_build_object('startsAt', lower(r.reconfirm_range), 'endsAt', upper(r.reconfirm_range)) AS "reconfirmFor",
      COALESCE((SELECT json_agg(json_build_object('assignmentId', a.id, 'staffId', a.staff_id, 'name', u.full_name)
        ORDER BY u.full_name) FROM tech_staff_assignments a JOIN users u ON u.id = a.staff_id
        WHERE a.request_id = r.id AND a.status = 'assigned'), '[]'::json) AS assignees
    FROM tech_support_requests r JOIN events e ON e.id = r.event_id
    WHERE r.requires_reconfirmation AND r.reconfirm_range IS NOT NULL AND r.status = 'staffed'
      AND e.status = ANY($1::event_status[])
    ORDER BY lower(r.reconfirm_range), r.id
    LIMIT 200`, [STAFFABLE_STATUSES])).rows;
  return { requests };
}

// TC_E10S02_13: the refusal names the busy colleague, the clashing event and
// its time, e.g. "… at an overlapping time (13 Dec 2026, 10:00 am – 2:00 pm)."
// E07-S07's assign sentence is left as it is.
const busySentence = (who: string, conflict: Conflict) =>
  `${conflictSentence(who, conflict).replace(/\.$/, '')} (${formatEventDates(new Date(conflict.startsAt), new Date(conflict.endsAt))}).`;

// Colleagues on this request already assigned elsewhere at the new time.
async function clashesAt(query: Query, requestId: string, target: string) {
  return (await query<Conflict & { staffName: string }>(`SELECT u.full_name AS "staffName", e.event_code AS "eventCode", e.title,
      lower(other.assignment_range) AS "startsAt", upper(other.assignment_range) AS "endsAt"
    FROM tech_staff_assignments mine JOIN users u ON u.id = mine.staff_id
    JOIN tech_staff_assignments other ON other.staff_id = mine.staff_id AND other.status = 'assigned'
      AND other.request_id <> mine.request_id AND other.assignment_range && $2::tstzrange
    JOIN events e ON e.id = other.event_id
    WHERE mine.request_id = $1 AND mine.status = 'assigned'
    ORDER BY u.full_name, lower(other.assignment_range)`, [requestId, target])).rows;
}

export async function reconfirmSupport(database: Pool, user: AuthenticatedUser | undefined, body: unknown) {
  const actor = await requireTechnician(database.query.bind(database) as Query, user);
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const id = typeof data.request === 'string' ? data.request.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AccessError(400, 'A support request id is required.');
  try {
    return await inTransaction(database, async client => {
      const query = client.query.bind(client) as Query;
      const request = await lockRequest(client, id, true);
      if (request.status === 'cancelled' || !STAFFABLE_STATUSES.includes(request.eventStatus)) throw new AccessError(409, NOT_RECONFIRMABLE);
      const flag = (await client.query<{ requires_reconfirmation: boolean; target: string | null; coordinator_id: string | null;
        was_start: Date; was_end: Date }>(
        `SELECT r.requires_reconfirmation, r.reconfirm_range::text AS target, e.coordinator_id,
           lower(r.support_range) AS was_start, upper(r.support_range) AS was_end
         FROM tech_support_requests r JOIN events e ON e.id = r.event_id WHERE r.id = $1`, [request.id])).rows[0]!;
      if (!flag.requires_reconfirmation || !flag.target) throw new AccessError(409, NOTHING_TO_RECONFIRM);
      // Lock the colleagues in a fixed order, as assigning locks one, so a
      // reconfirmation and an assignment of the same person queue up.
      const assigned = (await client.query<{ staff_id: string }>(`SELECT a.staff_id FROM tech_staff_assignments a
        JOIN users u ON u.id = a.staff_id WHERE a.request_id = $1 AND a.status = 'assigned'
        ORDER BY a.staff_id FOR NO KEY UPDATE OF u`, [request.id])).rows.map(row => row.staff_id);
      const clashes = await clashesAt(query, request.id, flag.target);
      if (clashes.length) {
        const conflicts: Conflict[] = clashes.map(({ staffName: _who, ...conflict }) => conflict);
        return { status: 409, body: { error: busySentence(clashes[0]!.staffName, conflicts[0]!), conflicts } };
      }
      const moved = (await client.query<{ starts_at: Date; ends_at: Date }>(`UPDATE tech_support_requests
        SET support_range = reconfirm_range, reconfirm_range = NULL, requires_reconfirmation = false
        WHERE id = $1 RETURNING lower(support_range) AS starts_at, upper(support_range) AS ends_at`, [request.id])).rows[0]!;
      await client.query(`UPDATE tech_staff_assignments SET assignment_range = $2::tstzrange
        WHERE request_id = $1 AND status = 'assigned'`, [request.id, flag.target]);
      // Times as "start to end" in UTC ISO, like edited registration dates.
      const span = (start: Date, end: Date) => `${start.toISOString()} to ${end.toISOString()}`;
      const audit = (await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs
          (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
        VALUES ($1, 'tech_support_request', $2, $3, 'Support Reconfirmed', 'support_range', $4, $5) RETURNING id, occurred_at`,
      [actor.id, request.id, request.eventId, span(flag.was_start, flag.was_end), span(moved.starts_at, moved.ends_at)])).rows[0]!;

      const when = formatEventDates(moved.starts_at, moved.ends_at);
      const notice = { eventId: request.eventId, occurredAt: audit.occurred_at };
      let coordinatorNotified = false;
      if (flag.coordinator_id) {
        const actorName = (await client.query<{ full_name: string }>(
          'SELECT full_name FROM users WHERE id = $1', [actor.id])).rows[0]?.full_name ?? 'Technical Support Staff';
        coordinatorNotified = Boolean(await writeEventNotification(client, {
          ...notice, changeId: audit.id, userId: flag.coordinator_id, title: 'Technical support reconfirmed',
          message: `${actorName} reconfirmed technical support for ${name(request)} (${when}): ${request.description}. It no longer needs reconfirmation.`,
        }));
      }
      // E11-S01 / T-64: the actor sees the result; moved colleagues are told.
      for (const staffId of assigned.filter(staffId => staffId !== actor.id)) {
        await writeEventNotification(client, {
          ...notice, changeId: `${audit.id}:${staffId}`, userId: staffId, title: 'Technical support assignment moved',
          message: `Your assignment to ${name(request)} is now ${when}: ${request.description}`,
        });
      }
      const enteredSafetyReview = await enterSafetyReviewIfReady(client, request.eventId, actor.id);
      return { status: 200, body: {
        request: { id: request.id, startsAt: moved.starts_at.toISOString(), endsAt: moved.ends_at.toISOString() },
        coordinatorNotified, enteredSafetyReview,
      } };
    });
  } catch (error) {
    // A colleague was assigned elsewhere at the new time in the same moment:
    // the exclusion constraint refused the move. Report it the same way.
    if (!isOverlapViolation(error)) throw error;
    const target = (await database.query<{ target: string | null }>(
      'SELECT reconfirm_range::text AS target FROM tech_support_requests WHERE id = $1', [id])).rows[0]?.target;
    const clashes = target ? await clashesAt(database.query.bind(database) as Query, id, target) : [];
    const conflicts: Conflict[] = clashes.map(({ staffName: _who, ...conflict }) => conflict);
    return { status: 409, body: {
      error: clashes[0] ? busySentence(clashes[0].staffName, conflicts[0]!) : 'A colleague is already assigned at an overlapping time.', conflicts,
    } };
  }
}

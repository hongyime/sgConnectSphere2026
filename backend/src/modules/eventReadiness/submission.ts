// E08-S03 "Confirm an event" (SCRUM-60), as amended for Week 7 (C-70, T-71).
//
// - Readiness read (D67): the assigned Coordinator sees what is ready and
//   what is outstanding for one event. Anyone else is refused with the usual
//   audit row (TC_E14S02 style).
// - Scenario 1: the assigned Coordinator (D62) submits a Planning event (D58)
//   whose readiness check passes. Inside one transaction the event row is
//   locked, the check runs again, and applyEventStatusChange() moves it to
//   Safety Review with its audit entry. The Organiser's "awaiting its safety
//   check" notice and every active Safety Officer's notice are written under
//   the status change's audit ID (D63, BDR T-64), so the Organiser gets one
//   notice, not an extra generic one; the Coordinator, as the actor, gets none.
// - Scenarios 2, 3 and 5: a blocked submission changes nothing and returns
//   the readiness snapshot, whose blockers list every outstanding item.
// - Scenario 7: a "confirm" action refuses anyone but a Safety Officer (D60).
//   The Safety Officer's own approval is E08-S06's; the role check also sits
//   in applyEventStatusChange(), so no other route can confirm either.
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { canActAsRole } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { eventLabel, recordEventDenial } from '../eventLifecycle/coordinatorAssignment.js';
import { applyEventStatusChange, ONLY_SAFETY_OFFICER_CONFIRMS } from '../eventLifecycle/repository.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { loadReadiness, type ReadinessEventRow } from './readiness.js';
import { parseSafetyDecision, SAFETY_FACTOR_LABELS, SAFETY_FACTORS, type ParsedSafetyDecision, type SafetyDecision } from './safetyCheck.js';
import { latestSafetyReturn, SAFETY_ACTIONS } from './safetyReturn.js';
import type { EventReadinessSnapshot, SafetyReviewSubmission } from './types.js';

export const READINESS_MESSAGES = {
  readNotAssigned: 'Access denied. This event is not assigned to you.',
  submitNotAssigned: 'Only the assigned Coordinator can submit this event for its safety check.',
  notPlanning: 'Only an event in Planning can be submitted for its safety check.',
  alreadyInReview: 'This event is already in Safety Review.',
  blocked: "This event can't be submitted for its safety check until every outstanding item is resolved.",
  onlySafetyOfficer: ONLY_SAFETY_OFFICER_CONFIRMS,
  confirmNotInReview: 'Only an event in Safety Review can be confirmed.',
  confirmThroughApproval: 'A Safety Officer confirms an event by approving its safety review.',
} as const;

// A refused submission (Scenarios 2, 3, 5). The route returns the snapshot,
// so the page can list every outstanding item next to the message.
export class ReadinessBlockedError extends AccessError {
  constructor(public readiness: EventReadinessSnapshot) { super(409, READINESS_MESSAGES.blocked); }
}

type EventRow = ReadinessEventRow & { coordinator_id: string | null; organiser_id: string };

const EVENT_SELECT = `SELECT id, event_code, title, status::text AS status, coordinator_id, organiser_id,
    lower(event_range) AS starts_at, upper(event_range) AS ends_at, equipment_requirements
  FROM events WHERE (id::text = $1 OR event_code = $1)`;

function checkIdentifier(identifier: string) {
  if (!identifier || identifier.length > 240) throw new AccessError(400, 'An event id or code is required.');
}

// GET /api/events?readiness=1&id=<event id or code>
export async function getEventReadiness(database: Pool, user: AuthenticatedUser | undefined, identifier: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  checkIdentifier(identifier);
  const event = canActAsRole(user, ['event_coordinator']).allowed
    ? (await database.query<EventRow>(`${EVENT_SELECT} AND status <> 'draft'`, [identifier])).rows[0]
    : undefined;
  if (!event || event.coordinator_id !== user.id) {
    await recordEventDenial(database, user, identifier, 'event_readiness');
    throw new AccessError(403, READINESS_MESSAGES.readNotAssigned);
  }
  const query: Query = (sql, values) => database.query(sql, values);
  // D109: "Safety arrangement rejected" shows from this until the Event re-enters Safety Review.
  return { ...await loadReadiness(query, event), safetyReturn: await latestSafetyReturn(query, event.id) };
}

// E01-S13 / E08-S06 Scenario 1: the Safety Officer's queue, oldest entry into
// Safety Review first (D113). status_changed_at is that entry time while the
// Event stays in Safety Review.
export async function listSafetyReviewEvents(database: Pool, user: AuthenticatedUser | undefined) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['safety_officer']).allowed) {
    await recordEventDenial(database, user, '', 'safety_review_queue');
    throw new AccessError(403, 'Access denied. This action is for Safety Officers.');
  }
  const result = await database.query(
    `SELECT e.id, e.event_code, e.title, e.status, e.status_changed_at,
       lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at,
       e.expected_attendance, c.full_name AS coordinator_name,
       o.full_name AS organiser_name
     FROM events e
     JOIN users o ON o.id = e.organiser_id
     LEFT JOIN users c ON c.id = e.coordinator_id
     WHERE e.status = 'safety_review'
     ORDER BY e.status_changed_at, e.id
     LIMIT 200`,
  );
  return result.rows;
}

// D117: Sessions carry their own period, attendance, layout and accessibility
// needs (E04-S02), and every venue booking and equipment line names its
// Session, so the page groups them by session_id.
export type SafetyReviewSession = {
  id: string; title: string | null; starts_at: Date; ends_at: Date; expected_attendance: number;
  layout: string | null; accessibility_note: string | null; accessibility: string[];
};
export type SafetyReviewVenue = { id: string; session_id: string | null; name: string; capacity: number; restrictions: string[] };
export type SafetyReviewEquipment = {
  id: string; session_id: string | null; name: string; requested: number; reserved: number; placement: string | null;
};
export type SafetyReviewDetail = {
  event: {
    id: string; event_code: string | null; title: string; status: 'safety_review'; status_changed_at: Date;
    starts_at: Date; ends_at: Date; expected_attendance: number;
    coordinator_id: string | null; coordinator_name: string | null; organiser_name: string;
  };
  sessions: SafetyReviewSession[];
  venues: SafetyReviewVenue[];
  equipment: SafetyReviewEquipment[];
  support: Array<{ id: string; description: string; status: string }>;
  factors: readonly string[];
};

// A Session with no accessibility needs of its own follows the Event's while it
// is the only Session, as venue search does (#408). Capacity is the venue's for
// the Session's layout, else its maximum. Restrictions are its maintenance
// blocks still in force.
async function loadArrangements(query: Query, eventId: string) {
  const sessions = (await query<SafetyReviewSession>(
    `SELECT s.id, s.title, lower(s.session_range) AS starts_at, upper(s.session_range) AS ends_at,
       s.expected_attendance, l.label AS layout, COALESCE(s.accessibility_note, e.accessibility_note) AS accessibility_note,
       ARRAY(SELECT f.label FROM accessibility_features f WHERE f.id = ANY(
         CASE WHEN EXISTS(SELECT 1 FROM session_accessibility_needs WHERE session_id=s.id)
             OR (SELECT count(*) FROM sessions o WHERE o.event_id=s.event_id) > 1
           THEN ARRAY(SELECT feature_id FROM session_accessibility_needs WHERE session_id=s.id)
           ELSE ARRAY(SELECT feature_id FROM event_accessibility_needs WHERE event_id=s.event_id) END)
         ORDER BY f.label) AS accessibility
     FROM sessions s JOIN events e ON e.id=s.event_id LEFT JOIN room_layouts l ON l.id=s.layout_id
     WHERE s.event_id=$1 ORDER BY lower(s.session_range), s.id`, [eventId])).rows;
  const venues = (await query<SafetyReviewVenue>(
    `SELECT b.id, b.session_id, v.name, COALESCE(vl.capacity, v.max_capacity) AS capacity,
       ARRAY(SELECT block.reason FROM venue_blocks block WHERE block.venue_id=v.id AND block.lifted_at IS NULL
         AND upper(block.block_range) > now() ORDER BY lower(block.block_range)) AS restrictions
     FROM venue_bookings b JOIN venues v ON v.id=b.venue_id
       LEFT JOIN sessions s ON s.id=b.session_id
       LEFT JOIN venue_supported_layouts vl ON vl.venue_id=v.id AND vl.layout_id=s.layout_id
     WHERE b.event_id=$1 AND b.status='confirmed' ORDER BY lower(b.booking_range), v.name`, [eventId])).rows;
  const equipment = (await query<SafetyReviewEquipment>(
    `SELECT req.id, req.session_id, eq.name, req.quantity_requested AS requested,
       COALESCE(SUM(res.quantity_reserved) FILTER (WHERE res.status IN ('reserved','partial')),0)::int AS reserved,
       req.technical_notes AS placement
     FROM equipment_requests req JOIN equipment eq ON eq.id=req.equipment_id
       LEFT JOIN equipment_reservations res ON res.request_id=req.id
     WHERE req.event_id=$1 GROUP BY req.id, eq.id ORDER BY eq.name, req.id`, [eventId])).rows;
  return { sessions, venues, equipment };
}

export async function getSafetyReviewEvent(database: Pool, user: AuthenticatedUser | undefined, identifier: string): Promise<SafetyReviewDetail> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['safety_officer']).allowed) {
    await recordEventDenial(database, user, identifier, 'safety_review_detail');
    throw new AccessError(403, 'Access denied. This action is for Safety Officers.');
  }
  checkIdentifier(identifier);
  const query: Query = (sql, values) => database.query(sql, values);
  const event = (await query<SafetyReviewDetail['event']>(
    `SELECT e.id, e.event_code, e.title, e.status, e.status_changed_at,
       lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at,
       e.expected_attendance, e.coordinator_id,
       c.full_name AS coordinator_name, o.full_name AS organiser_name
     FROM events e JOIN users o ON o.id=e.organiser_id LEFT JOIN users c ON c.id=e.coordinator_id
     WHERE (e.id::text=$1 OR e.event_code=$1) AND e.status='safety_review'`, [identifier])).rows[0];
  if (!event) throw new AccessError(404, 'This event is not awaiting a safety review.');
  const support = (await query<SafetyReviewDetail['support'][number]>(
    `SELECT id, COALESCE(support_description,'') AS description, status
     FROM tech_support_requests WHERE event_id=$1 ORDER BY id`, [event.id])).rows;
  return { event, ...await loadArrangements(query, event.id), support, factors: SAFETY_FACTORS };
}

export type SafetyDecisionResult = { eventId: string; eventCode: string | null; status: 'confirmed' | 'planning'; decision: SafetyDecision; reason?: string };

const SINGAPORE_TIME = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

// D115: an approval carries the confirmed details (Scenario 3); a request for
// changes or a rejection carries the unsatisfactory factors and the reason
// (Scenario 4's "items to address").
export async function safetyMessage(query: Query, event: EventRow, decision: ParsedSafetyDecision) {
  const label = eventLabel(event);
  if (decision.decision === 'approve') {
    const { venues, equipment } = await loadArrangements(query, event.id);
    const venueNames = [...new Set(venues.map(venue => venue.name))];
    const items = equipment.filter(item => item.reserved > 0).map(item => `${item.reserved} × ${item.name}`);
    return `${label} passed the Operational Safety Check and is now Confirmed. `
      + `When: ${SINGAPORE_TIME.format(new Date(event.starts_at))} to ${SINGAPORE_TIME.format(new Date(event.ends_at))}. `
      + `Venues: ${venueNames.join(', ') || 'none'}. Equipment: ${items.join(', ') || 'none'}.`;
  }
  const issues = SAFETY_FACTORS.filter(key => !decision.factors[key].satisfactory)
    .map(key => `${SAFETY_FACTOR_LABELS[key]}: ${decision.factors[key].comment}`);
  const what = decision.decision === 'reject' ? 'rejected its safety arrangement' : 'requested changes';
  return `The Safety Officer ${what}, so ${label} is back in Planning. Reason: ${decision.reason}`
    + (issues.length ? ` Items to address: ${issues.join('; ')}.` : '');
}

// D110 / Scenario 10: one immutable row holds the decision and its checklist.
async function recordSafetyDecision(client: PoolClient, event: EventRow, reviewer: AuthenticatedUser, decision: ParsedSafetyDecision, change: { auditId: string; occurredAt: Date }) {
  await client.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
     VALUES ($1,'event',$2,$2,$3,'safety_check',$4)`,
    [reviewer.id, event.id, SAFETY_ACTIONS[decision.decision], JSON.stringify({ decision: decision.decision, reason: decision.reason, factors: decision.factors })],
  );
  const message = await safetyMessage((sql, values) => client.query(sql, values), event, decision);
  const recipientIds = [event.organiser_id, event.coordinator_id].filter((id): id is string => Boolean(id));
  for (const userId of [...new Set(recipientIds)]) {
    await writeEventNotification(client, {
      eventId: event.id, changeId: change.auditId, occurredAt: change.occurredAt, userId,
      title: decision.decision === 'approve' ? 'Event confirmed'
        : decision.decision === 'reject' ? 'Safety arrangement rejected' : 'Safety check: changes requested',
      message,
    });
  }
}

// D111: venue factors flag the confirmed venue bookings, equipment placement
// the live equipment reservations; attendance and Technical Support flag nothing.
const VENUE_FACTORS = ['venue_layout', 'emergency_access', 'accessibility', 'crowd_movement', 'venue_restrictions'] as const;

// POST /api/events?safetyDecision=1&id=<event id or code>
export async function decideSafetyReview(
  database: Pool, user: AuthenticatedUser | undefined, identifier: string, input: unknown,
): Promise<SafetyDecisionResult> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  checkIdentifier(identifier);
  if (!canActAsRole(user, ['safety_officer']).allowed) {
    await recordEventDenial(database, user, identifier, 'safety_review_decision');
    throw new AccessError(403, READINESS_MESSAGES.onlySafetyOfficer);
  }
  const decision = parseSafetyDecision(input);
  return inTransaction(database, async client => {
    const event = (await client.query<EventRow>(`${EVENT_SELECT} FOR UPDATE`, [identifier])).rows[0];
    if (!event || event.status === 'draft') throw new AccessError(404, 'This event is not awaiting a safety review.');
    if (event.status !== 'safety_review') throw new AccessError(409, 'Only an event in Safety Review can receive a safety decision.');
    const target = decision.decision === 'approve' ? 'confirmed' : 'planning';
    const { event: updated } = await applyEventStatusChange(client, event.id, target, user.id, {
      reason: decision.reason,
      auditAction: SAFETY_ACTIONS[decision.decision],
      beforeNotify: async change => {
        if (decision.decision === 'request_changes') {
          if (VENUE_FACTORS.some(key => !decision.factors[key].satisfactory)) {
            await client.query(`UPDATE venue_bookings SET requires_reconfirmation=true WHERE event_id=$1 AND status='confirmed'`, [event.id]);
          }
          if (!decision.factors.equipment_placement.satisfactory) {
            await client.query(`UPDATE equipment_reservations SET requires_reconfirmation=true WHERE event_id=$1 AND status <> 'released'`, [event.id]);
          }
        }
        await recordSafetyDecision(client, event, user, decision, change);
      },
    });
    return { eventId: updated.id, eventCode: event.event_code, status: target, decision: decision.decision, reason: decision.reason };
  });
}

async function notifySubmission(client: PoolClient, event: EventRow, coordinator: AuthenticatedUser, change: {
  auditId: string; occurredAt: Date;
}) {
  // The Coordinator's row exists: the event row is locked with them assigned.
  const name = (await client.query<{ full_name: string }>('SELECT full_name FROM users WHERE id = $1', [coordinator.id]))
    .rows[0]!.full_name;
  const label = eventLabel(event);
  const notice = { eventId: event.id, changeId: change.auditId, occurredAt: change.occurredAt };
  await writeEventNotification(client, {
    ...notice,
    userId: event.organiser_id,
    title: 'Awaiting safety check',
    message: `${name} submitted ${label} for its safety check. The event is now in Safety Review, `
      + 'and is confirmed only once the Safety Officer approves it.',
  });
  // D63: no assignment model yet, so every active Safety Officer is told. The
  // role is compared as text, as it was added by migration 0012.
  const officers = (await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role::text = 'safety_officer' AND is_active ORDER BY id`)).rows;
  for (const officer of officers) {
    await writeEventNotification(client, {
      ...notice,
      userId: officer.id,
      title: 'Safety check needed',
      message: `${name} submitted ${label} for its Operational Safety Check. The event is now in Safety Review.`,
    });
  }
  return officers.length;
}

// POST /api/events?safetyReview=1&id=<event id or code>
export async function submitForSafetyReview(
  database: Pool, user: AuthenticatedUser | undefined, identifier: string,
): Promise<SafetyReviewSubmission> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  checkIdentifier(identifier);
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await recordEventDenial(database, user, identifier, 'safety_review_submission');
    throw new AccessError(403, READINESS_MESSAGES.submitNotAssigned);
  }
  const coordinator = user;

  const outcome = await inTransaction(database, async client => {
    // Locked first, as every E07 writer does, so no reservation or request
    // can change between the check below and the status change.
    const event = (await client.query<EventRow>(`${EVENT_SELECT} FOR UPDATE`, [identifier])).rows[0];
    if (!event || event.coordinator_id !== coordinator.id || event.status === 'draft') return { denied: true as const };
    if (event.status === 'safety_review') throw new AccessError(409, READINESS_MESSAGES.alreadyInReview);
    if (event.status !== 'planning') throw new AccessError(409, READINESS_MESSAGES.notPlanning);

    const readiness = await loadReadiness((sql, values) => client.query(sql, values), event);
    if (readiness.blockers.length) throw new ReadinessBlockedError(readiness);

    let notified = 0;
    const { event: updated } = await applyEventStatusChange(client, event.id, 'safety_review', coordinator.id, {
      beforeNotify: async change => { notified = await notifySubmission(client, event, coordinator, change); },
    });
    return {
      denied: false as const,
      result: {
        eventId: event.id,
        eventCode: event.event_code,
        status: 'safety_review' as const,
        statusChangedAt: updated.statusChangedAt,
        notifiedSafetyOfficers: notified,
      },
    };
  });

  if (outcome.denied) {
    await recordEventDenial(database, coordinator, identifier, 'safety_review_submission');
    throw new AccessError(403, READINESS_MESSAGES.submitNotAssigned);
  }
  return outcome.result;
}

// Roles whose names may appear in an event's Activity log: ConnectSphere
// staff. An Organiser or Attendee refusal is an ordinary access denial, which
// the log never shows (#161), so another organisation's user is never named.
const STAFF_ROLES = ['event_coordinator', 'event_coordinator_lead', 'venue_staff', 'technical_support_staff'];

// Scenario 7: the refusal is recorded on the event as an Activity log entry,
// in its own committed write.
async function recordConfirmationRefusal(database: Pool, user: AuthenticatedUser, identifier: string) {
  if (STAFF_ROLES.includes(user.role)) {
    const logged = await database.query(
      `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
       SELECT $1, 'event', e.id, e.id, 'Confirmation refused', 'confirmation', 'Refused (Safety Officer only)'
       FROM events e WHERE (e.id::text = $2 OR e.event_code = $2) AND e.status <> 'draft'`,
      [user.id, identifier]);
    if (logged.rowCount) return;
  }
  await recordEventDenial(database, user, identifier, 'event_confirm');
}

// POST /api/events?confirm=1&id=<event id or code>  (D60: refusal only)
export async function confirmEvent(database: Pool, user: AuthenticatedUser | undefined, identifier: string): Promise<never> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  checkIdentifier(identifier);
  if (!canActAsRole(user, ['safety_officer']).allowed) {
    await recordConfirmationRefusal(database, user, identifier);
    throw new AccessError(403, READINESS_MESSAGES.onlySafetyOfficer);
  }
  const query: Query = (sql, values) => database.query(sql, values);
  const event = (await query<{ status: string }>(`SELECT status::text AS status FROM events
    WHERE id::text = $1 OR event_code = $1`, [identifier])).rows[0];
  if (event?.status !== 'safety_review') throw new AccessError(409, READINESS_MESSAGES.confirmNotInReview);
  // E08-S06 owns the Safety Officer's approval, which is what confirms.
  throw new AccessError(409, READINESS_MESSAGES.confirmThroughApproval);
}

export type EventReversionResult = {
  eventId: string;
  eventCode: string | null;
  status: 'planning';
  reason: string;
  statusChangedAt: Date;
};

export function parseReversionReason(input: unknown): string {
  let parsed = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = input;
      }
    }
  }
  const reason = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
    ? (parsed as Record<string, unknown>).reason
    : parsed;
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new AccessError(400, 'A reason is required to revert this event to planning.');
  }
  if (reason.trim().length > 2000) {
    throw new AccessError(400, 'Reversion reason must not exceed 2000 characters.');
  }
  return reason.trim();
}

// POST /api/events?revert=1&id=<event id or code> (E08-S04 / SCRUM-61)
export async function revertEventToPlanning(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  input: unknown,
): Promise<EventReversionResult> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  checkIdentifier(identifier);
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await recordEventDenial(database, user, identifier, 'event_reversion');
    throw new AccessError(403, 'Only the assigned Coordinator can revert this event to Planning.');
  }
  const reason = parseReversionReason(input);
  const coordinator = user;

  const outcome = await inTransaction(database, async client => {
    const event = (await client.query<EventRow>(`${EVENT_SELECT} FOR UPDATE`, [identifier])).rows[0];
    if (!event || event.coordinator_id !== coordinator.id || event.status === 'draft') return { denied: true as const };
    if (event.status !== 'confirmed') {
      throw new AccessError(409, 'Only a Confirmed event can be reverted to Planning.');
    }

    const { event: updated } = await applyEventStatusChange(client, event.id, 'planning', coordinator.id, {
      reason,
      auditAction: 'Reverted to Planning',
      beforeNotify: async change => {
        const actor = (await client.query<{ full_name: string }>('SELECT full_name FROM users WHERE id = $1', [coordinator.id]))
          .rows[0];
        const name = actor?.full_name?.trim() || coordinator.email;
        const label = eventLabel(event);
        await writeEventNotification(client, {
          eventId: event.id,
          changeId: change.auditId,
          userId: event.organiser_id,
          occurredAt: change.occurredAt,
          title: 'Event reverted to planning',
          message: `${name} reverted ${label} to Planning. Reason: ${reason}`,
        });
      },
    });

    return {
      denied: false as const,
      result: {
        eventId: event.id,
        eventCode: event.event_code,
        status: 'planning' as const,
        reason,
        statusChangedAt: updated.statusChangedAt,
      },
    };
  });

  if (outcome.denied) {
    await recordEventDenial(database, coordinator, identifier, 'event_reversion');
    throw new AccessError(403, 'Access denied. This event is not assigned to you.');
  }
  return outcome.result;
}

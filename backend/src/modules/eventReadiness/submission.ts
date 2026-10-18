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
  return loadReadiness((sql, values) => database.query(sql, values), event);
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

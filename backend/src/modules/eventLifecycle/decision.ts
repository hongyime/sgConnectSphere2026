// E03-S03 "Decide on an event request" (SCRUM-34).
//
// - Scenarios 1 and 2: the assigned Coordinator approves an Under Review
//   request. Approval runs the same required-information check as submission
//   against the stored request (D10), so an incomplete request is refused with
//   the missing items listed and its status unchanged.
// - Scenarios 3 and 4: the assigned Coordinator rejects an Under Review request
//   with a mandatory reason (C-09, T-39, O-06), stored as decision_reason.
//   Rejected is final (T-41).
// - Scenario 5: the Organiser's event read carries the decision and its date,
//   and a rejected request is read-only for its Organiser (D11, revised).
//
// The decision commits through applyEventStatusChange() (D12), with the
// Organiser's notice written in beforeNotify under the status change's audit
// ID (BDR T-64): one targeted notice, not an extra generic "status changed"
// one, and nothing to the deciding Coordinator. Refusals are audited on their
// own connection, as in SCRUM-32 and SCRUM-33 (E14-S02).
//
// This story only changes its own code: getEvent and updateEventInformation
// (SCRUM-37) are wrapped and called around, not edited. The one exception is a
// single call in the edit transaction (informationChange.ts, #142), the only
// place the rejected check can run under the row lock.

import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { canActAsRole } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { eventLabel, recordEventDenial } from './coordinatorAssignment.js';
import { applyEventStatusChange, getAccessibilityFeatureIds } from './repository.js';
import { findMissingMandatoryFields } from './service.js';
import type { CreateEventRequest } from './types.js';

// Same cap as event comments and clarification questions.
export const MAX_DECISION_REASON = 2000;

export const DECISION_MESSAGES = {
  notAssigned: 'Only the assigned Coordinator can decide on this request.',
  notUnderReview: 'A decision can only be made while the request is Under Review.',
  incomplete: "This request can't be approved until its required information is complete.",
  reasonRequired: 'Add a reason for rejecting this request.',
  reasonTooLong: `The reason must be ${MAX_DECISION_REASON} characters or fewer.`,
  unknownDecision: 'Choose whether to approve or reject this request.',
  rejectedReadOnly: 'This request is rejected, so it can no longer be changed.',
} as const;

// Approval refused because required information is missing (Scenario 2). The
// route returns missingFields alongside the message.
export class DecisionBlockedError extends AccessError {
  constructor(public missingFields: string[]) { super(409, DECISION_MESSAGES.incomplete); }
}

export type EventDecision = { decision: 'approve' } | { decision: 'reject'; reason: string };

function bodyField(body: unknown, field: string): unknown {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>)[field] : undefined;
}

// A reason sent with an approval is ignored: only a rejection stores one.
export function parseDecision(body: unknown): EventDecision {
  const decision = bodyField(body, 'decision');
  if (decision === 'approve') return { decision };
  if (decision !== 'reject') throw new AccessError(400, DECISION_MESSAGES.unknownDecision);
  const raw = bodyField(body, 'reason');
  const reason = typeof raw === 'string' ? raw.trim() : '';
  if (!reason) throw new AccessError(400, DECISION_MESSAGES.reasonRequired);
  if (reason.length > MAX_DECISION_REASON) throw new AccessError(400, DECISION_MESSAGES.reasonTooLong);
  return { decision, reason };
}

type LockedRequest = {
  id: string; event_code: string | null; title: string; status: string;
  organiser_id: string; client_org_id: string; coordinator_id: string | null;
  description: string | null; purpose: string | null; start_at: Date | null; end_at: Date | null;
  expected_attendance: number; venue_requirements: string | null; accessibility_note: string | null;
  equipment_requirements: string | null; layout_preference: string | null; registration_setup: string | null;
};

async function lockRequest(client: PoolClient, identifier: string) {
  const result = await client.query<LockedRequest>(
    `SELECT id, event_code, title, status, organiser_id, client_org_id, coordinator_id, description, purpose,
       lower(event_range) AS start_at, upper(event_range) AS end_at, expected_attendance, venue_requirements,
       accessibility_note, equipment_requirements, layout_preference, registration_setup
     FROM events WHERE id::text = $1 OR event_code = $1 FOR UPDATE`,
    [identifier],
  );
  return result.rows[0];
}

// D10: the stored request in the shape submission validates, including the
// predefined accessibility features (E02-S03), which satisfy "Accessibility
// needs" on their own (TC_E03S03_12).
async function missingForApproval(client: PoolClient, row: LockedRequest) {
  const request: CreateEventRequest = {
    title: row.title,
    description: row.description ?? undefined,
    purpose: row.purpose ?? undefined,
    organiserId: row.organiser_id,
    clientOrgId: row.client_org_id,
    startAt: row.start_at as Date,
    endAt: row.end_at as Date,
    expectedAttendance: row.expected_attendance,
    venueRequirements: row.venue_requirements ?? undefined,
    accessibilityNote: row.accessibility_note ?? undefined,
    accessibilityFeatureIds: await getAccessibilityFeatureIds(client, row.id),
    equipmentRequirements: row.equipment_requirements ?? undefined,
    layoutPreference: row.layout_preference ?? undefined,
    registrationSetup: row.registration_setup ?? undefined,
  };
  return findMissingMandatoryFields(request, true);
}

async function fullName(client: PoolClient, userId: string, fallback: string) {
  const result = await client.query<{ full_name: string }>('SELECT full_name FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.full_name ?? fallback;
}

// Scenarios 1 to 4, TC_E03S03_01 to _04 and _06 to _10, _12.
//   POST /api/events?decide=1&id=<event id or code>
//     { decision: 'approve' } | { decision: 'reject', reason: string }
export async function decideEventRequest(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  // TC_E03S03_08: anyone who isn't a Coordinator (an Organiser deciding on
  // their own request included) gets the same refusal as an unassigned one.
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await recordEventDenial(database, user, identifier, 'event_decision');
    throw new AccessError(403, DECISION_MESSAGES.notAssigned);
  }
  const coordinator = user;
  const decision = parseDecision(body);

  const outcome = await inTransaction(database, async client => {
    const event = await lockRequest(client, identifier);
    if (!event || event.coordinator_id !== coordinator.id) return { denied: true as const };
    if (event.status !== 'under_review') throw new AccessError(409, DECISION_MESSAGES.notUnderReview);

    if (decision.decision === 'approve') {
      const missingFields = await missingForApproval(client, event);
      if (missingFields.length) throw new DecisionBlockedError(missingFields);
    }

    const coordinatorName = await fullName(client, coordinator.id, coordinator.email);
    const reason = decision.decision === 'reject' ? decision.reason : undefined;
    const { event: updated } = await applyEventStatusChange(
      client, event.id, decision.decision === 'approve' ? 'approved' : 'rejected', coordinator.id, {
        reason,
        beforeNotify: async change => {
          await writeEventNotification(client, {
            eventId: event.id,
            changeId: change.auditId,
            occurredAt: change.occurredAt,
            userId: event.organiser_id,
            ...(reason === undefined
              ? {
                title: 'Request approved',
                message: `${coordinatorName} approved ${eventLabel(event)}. The request is now Approved and moves to planning.`,
              }
              : {
                title: 'Request rejected',
                message: `${coordinatorName} rejected ${eventLabel(event)}. The request is now Rejected and can no longer be changed.`
                  + `\n\nReason: ${reason}`,
              }),
          });
        },
      },
    );

    return {
      denied: false as const,
      result: {
        eventId: event.id,
        eventCode: event.event_code,
        status: updated.status,
        statusChangedAt: updated.statusChangedAt,
        decisionReason: reason ?? null,
      },
    };
  });

  if (outcome.denied) {
    await recordEventDenial(database, coordinator, identifier, 'event_decision');
    throw new AccessError(403, DECISION_MESSAGES.notAssigned);
  }
  return outcome.result;
}

// Scenario 5, TC_E03S03_05: the decision on the Organiser's event read, added
// to a read that has already passed its own access check (getEvent). The date
// comes from the decision's own audit entry, so it survives later status
// changes (approved, then planning); a row with no such entry (seed data)
// falls back to status_changed_at while it is still Approved or Rejected. Only
// a rejection's reason is shown: a later cancellation can overwrite
// decision_reason on an approved request. A rejected request is read-only (D11).
export async function withDecision<T extends { id: string }>(query: Query, event: T) {
  const row = (await query<{
    status: string; decision_reason: string | null; status_changed_at: Date;
    decided_to: string | null; decided_at: Date | null;
  }>(`SELECT e.status, e.decision_reason, e.status_changed_at, d.new_value AS decided_to, d.occurred_at AS decided_at
    FROM events e
    LEFT JOIN LATERAL (
      SELECT a.new_value, a.occurred_at FROM audit_logs a
      WHERE a.event_id = e.id AND a.entity_type = 'event' AND a.field_changed = 'status'
        AND a.new_value IN ('approved', 'rejected')
      ORDER BY a.occurred_at DESC, a.id DESC LIMIT 1
    ) d ON true
    WHERE e.id = $1`, [event.id])).rows[0];
  if (!row) return { ...event, decision: null };

  const fromStatus = row.status === 'approved' || row.status === 'rejected';
  const outcome = row.decided_to ?? (fromStatus ? row.status : null);
  const decision = outcome
    ? {
      outcome,
      reason: outcome === 'rejected' ? row.decision_reason : null,
      decidedAt: row.decided_at ?? row.status_changed_at,
    }
    : null;
  if (row.status !== 'rejected') return { ...event, decision };
  return { ...event, decision, canEdit: false, editableFields: [] as string[] };
}

// A rejected request's refusal. Its own type so the edit route can send it
// without the change-request link it adds to other 409s.
export class RejectedRequestError extends AccessError {
  constructor() { super(409, DECISION_MESSAGES.rejectedReadOnly); }
}

// Scenario 5, TC_E03S03_05 and _11: called inside the edit transaction
// (updateEventInformationWithNotifications), after it has locked the event row
// and before updateEventInformation. Under that lock a rejection can't commit
// between this check and the edit, so Rejected stays final. Only the request's
// own Organiser is refused here; anyone else gets the edit rules' usual
// refusal, so a rejected request's status is not revealed to them.
export async function assertEditableAfterDecision(query: Query, user: AuthenticatedUser, eventId: string) {
  const result = await query<{ status: string }>(
    'SELECT status FROM events WHERE id = $1 AND organiser_id = $2', [eventId, user.id]);
  if (result.rows[0]?.status === 'rejected') throw new RejectedRequestError();
}

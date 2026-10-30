// E08-S04 Scenario 4 (SCRUM-242, C-132, T-82): a Confirmed event that came
// back to Planning (a deliberate reversion or a venue loss) enters Safety
// Review by itself once its last required arrangement is confirmed again.
//
// Called inside the transaction of each action that confirms an arrangement:
// a venue booking approved or reconfirmed, equipment reserved or re-reserved,
// Technical Support staff assigned. It runs E08-S03's readiness check on the
// locked event and, when nothing is outstanding, moves it through
// applyEventStatusChange(). The earlier safety approval stays in the Activity
// log, and only a Safety Officer can confirm the event again (the check in
// applyEventStatusChange), so it is never reused.
//
// A Planning event that was never Confirmed is left alone: its Coordinator
// submits it with E08-S03's "Submit for safety check".
import type { PoolClient } from 'pg';
import { writeEventNotification } from '../eventNotifications/service.js';
import { eventLabel } from '../eventLifecycle/coordinatorAssignment.js';
import { applyEventStatusChange } from '../eventLifecycle/repository.js';
import { loadReadiness, type ReadinessEventRow } from './readiness.js';

export const AUTO_SAFETY_REVIEW_ACTION = 'Entered Safety Review after reconfirmation';

type EventRow = ReadinessEventRow & { coordinator_id: string | null; organiser_id: string };

async function notifyAutoSubmission(client: PoolClient, event: EventRow, change: { auditId: string; occurredAt: Date }) {
  const label = eventLabel(event);
  const notice = { eventId: event.id, changeId: change.auditId, occurredAt: change.occurredAt };
  const back = `${label}'s arrangements are confirmed again, so it is back in Safety Review.`;
  await writeEventNotification(client, {
    ...notice, userId: event.organiser_id, title: 'Awaiting safety check',
    message: `${back} It is confirmed only once the Safety Officer approves it.`,
  });
  if (event.coordinator_id) await writeEventNotification(client, {
    ...notice, userId: event.coordinator_id, title: 'Back in Safety Review',
    message: `${back} You don't need to submit it; the Safety Officer has been asked to check it again.`,
  });
  // D63: every active Safety Officer, as for a Coordinator's submission.
  const officers = (await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role::text = 'safety_officer' AND is_active ORDER BY id`)).rows;
  for (const officer of officers) {
    await writeEventNotification(client, {
      ...notice, userId: officer.id, title: 'Safety check needed',
      message: `${back} It needs a new Operational Safety Check: the earlier approval does not carry over.`,
    });
  }
}

// True when the event moved to Safety Review.
export async function enterSafetyReviewIfReady(client: PoolClient, identifier: string, actorId: string): Promise<boolean> {
  const event = (await client.query<EventRow>(`SELECT id, event_code, title, status::text AS status, coordinator_id, organiser_id,
      lower(event_range) AS starts_at, upper(event_range) AS ends_at, equipment_requirements
    FROM events WHERE id::text = $1 OR event_code = $1 FOR NO KEY UPDATE`, [identifier])).rows[0];
  if (event?.status !== 'planning') return false;
  // Confirmed before: its status history holds a change to Confirmed.
  const confirmedBefore = await client.query(`SELECT 1 FROM audit_logs
    WHERE event_id = $1 AND entity_type = 'event' AND field_changed = 'status' AND new_value = 'confirmed' LIMIT 1`, [event.id]);
  if (!confirmedBefore.rowCount) return false;
  const readiness = await loadReadiness((sql, values) => client.query(sql, values), event);
  if (readiness.blockers.length) return false;
  await applyEventStatusChange(client, event.id, 'safety_review', actorId, {
    auditAction: AUTO_SAFETY_REVIEW_ACTION,
    beforeNotify: change => notifyAutoSubmission(client, event, change),
  });
  return true;
}

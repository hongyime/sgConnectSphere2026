// E08-S06 (SCRUM-158): whether a Safety Officer's decision sent an Event back
// to Planning, read from its latest status change, so no column or migration
// is needed (D109). Kept free of value imports so eventVisibility can use it
// without an import cycle.
// - D109: the Coordinator's and Organiser's pages show "Safety arrangement
//   rejected" and the reason while this says 'reject'.
// - D118: automatic re-entry (autoSafetyReview.ts) leaves such an Event for
//   its Coordinator to resubmit, as Scenario 4 says.
import type { Query } from '../eventVisibility/service.js';

// The status change's audit action for each decision.
export const SAFETY_ACTIONS = {
  approve: 'Safety check approved',
  request_changes: 'Safety check changes requested',
  reject: 'Safety arrangement rejected',
} as const;

export type SafetyReturn = { decision: 'request_changes' | 'reject'; reason: string | null; decidedAt: Date };

export async function latestSafetyReturn(query: Query, eventId: string): Promise<SafetyReturn | null> {
  // applyEventStatusChange() stores the decision's reason as decision_reason.
  const row = (await query<{ action: string; occurred_at: Date; reason: string | null }>(
    `SELECT a.action, a.occurred_at, e.decision_reason AS reason
     FROM events e
     JOIN LATERAL (SELECT action, occurred_at FROM audit_logs
       WHERE event_id = e.id AND entity_type = 'event' AND field_changed = 'status'
       ORDER BY occurred_at DESC, id DESC LIMIT 1) a ON true
     WHERE e.id = $1 AND e.status = 'planning'`, [eventId])).rows[0];
  if (row?.action === SAFETY_ACTIONS.reject) return { decision: 'reject', reason: row.reason, decidedAt: row.occurred_at };
  if (row?.action === SAFETY_ACTIONS.request_changes) return { decision: 'request_changes', reason: row.reason, decidedAt: row.occurred_at };
  return null;
}

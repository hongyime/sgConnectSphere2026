import type { PoolClient } from "pg";

// Caller holds the Event lock and owns the transaction. Never commit separately:
// completion/cancellation, request history and notification delivery are atomic.
export async function obsoletePendingChangeRequests(
  client: PoolClient,
  eventId: string,
  actorId: string | null,
  terminalStatus: "completed" | "cancelled",
): Promise<void> {
  const requests = (
    await client.query<{ id: string }>(
      `UPDATE change_requests SET status='obsolete',reviewed_by=$2,
       reviewed_at=now(),decision_reason=$3
       WHERE event_id=$1 AND status='pending' RETURNING id`,
      [eventId, actorId, `Event ${terminalStatus}`],
    )
  ).rows;
  for (const request of requests)
    await client.query(
      `INSERT INTO audit_logs
       (actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
       VALUES($1,'change_request',$2,$3,'Change request became Obsolete','status','pending','obsolete')`,
      [actorId, request.id, eventId],
    );
}

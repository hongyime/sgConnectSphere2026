import { obsoletePendingChangeRequests } from "./obsoleteChangeRequests.js";
import type { Pool, PoolClient } from "pg";
import { inTransaction } from "../../database/pool.js";
import { canActAsRole } from "../accessControl/service.js";
import type { AuthenticatedUser } from "../accessControl/types.js";
import { AccessError, listEventActivity } from "../eventVisibility/service.js";
import type { NotificationOptions } from "../eventNotifications/service.js";
import { applyEventStatusChange } from "./repository.js";
import type { EventStatus } from "./status.js";
import { completionEligibility } from "./completionRules.js";

type EventRow = {
  id: string;
  event_code: string | null;
  title: string;
  status: EventStatus;
  coordinator_id: string | null;
  starts_at: Date;
  ends_at: Date;
  status_changed_at: Date;
};
type Options = { clock?: () => Date; notifications?: NotificationOptions };
const SELECT = `SELECT id,event_code,title,status,coordinator_id,status_changed_at,
  lower(event_range) AS starts_at,upper(event_range) AS ends_at FROM events
  WHERE (id::text=$1 OR event_code=$1)`;

function requireCoordinator(
  user: AuthenticatedUser | undefined,
  identifier: string,
) {
  if (!user) throw new AccessError(401, "Sign in to continue.");
  if (!canActAsRole(user, ["event_coordinator"]).allowed)
    throw new AccessError(
      403,
      "Only the assigned Event Coordinator can complete this event.",
    );
  if (!identifier || identifier.length > 240)
    throw new AccessError(400, "An event id or code is required.");
  return user;
}

async function nowFor(client: PoolClient, options: Options) {
  // Test clocks are dependency injection only; never accepted from HTTP input.
  return options.clock
    ? options.clock()
    : (await client.query<{ now: Date }>("SELECT clock_timestamp() AS now"))
        .rows[0].now;
}

async function assigned(
  client: PoolClient,
  user: AuthenticatedUser,
  identifier: string,
  lock: boolean,
) {
  const event = (
    await client.query<EventRow>(`${SELECT}${lock ? " FOR UPDATE" : ""}`, [
      identifier,
    ])
  ).rows[0];
  if (!event || event.coordinator_id !== user.id || event.status === "draft")
    throw new AccessError(403, "This event is not assigned to you.");
  // Lock order Event -> Account, NOWAIT avoids login/deactivation deadlocks.
  const current = (
    await client.query(
      `SELECT id FROM users WHERE id=$1 AND role='event_coordinator'
    AND is_active AND failed_login_count < 5 AND (locked_until IS NULL OR locked_until <= now())
    ${lock ? "FOR SHARE NOWAIT" : ""}`,
      [user.id],
    )
  ).rows[0];
  if (!current)
    throw new AccessError(403, "Your Coordinator account is not available.");
  return event;
}

export async function getCompletion(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
) {
  const actor = requireCoordinator(user, identifier);
  return inTransaction(database, async (client) => {
    const event = await assigned(client, actor, identifier, false);
    const now = await nowFor(client, {});
    return {
      eventCode: event.event_code,
      title: event.title,
      status: event.status,
      startsAt: event.starts_at.toISOString(),
      endsAt: event.ends_at.toISOString(),
      changedAt: event.status_changed_at.toISOString(),
      canComplete: completionEligibility(
        event.status,
        event.starts_at,
        event.ends_at,
        now,
      ).manual,
      activity: (
        await listEventActivity(
          (sql, values) => client.query(sql, values),
          event.id,
        )
      ).rows,
    };
  });
}

async function transition(
  client: PoolClient,
  event: EventRow,
  actorId: string | null,
  options: Options,
) {
  return applyEventStatusChange(client, event.id, "completed", actorId, {
    notificationOptions: options.notifications,
    auditAction: actorId
      ? "Status changed to completed"
      : "Automatically completed event",
    beforeNotify: async () => {
      // C-77/T-88: Obsolete is distinct from a Coordinator rejection.
      await obsoletePendingChangeRequests(client, event.id, actorId, "completed");
    },
  });
}

export async function completeEvent(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  options: Options = {},
) {
  const actor = requireCoordinator(user, identifier);
  try {
    return await inTransaction(database, async (client) => {
      const event = await assigned(client, actor, identifier, true);
      if (event.status === "completed")
        return { status: "completed", replayed: true };
      const now = await nowFor(client, options);
      if (
        !completionEligibility(
          event.status,
          event.starts_at,
          event.ends_at,
          now,
        ).manual
      ) {
        throw new AccessError(
          409,
          event.status === "confirmed"
            ? "This event cannot be completed before it has started."
            : "Only a Confirmed event can be marked complete.",
        );
      }
      await transition(client, event, actor.id, options);
      return { status: "completed", replayed: false };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "55P03")
      throw new AccessError(
        409,
        "Your account is being updated. Please try again.",
      );
    throw error;
  }
}

// Existing daily maintenance scheduler calls this. Each event commits separately;
// failures remain retryable, already completed rows are never selected again.
export async function evaluateCompletions(
  database: Pool,
  options: Options = {},
) {
  const candidates = await inTransaction(database, async (client) => {
    const now = await nowFor(client, options);
    return (
      await client.query<{ id: string }>(
        `SELECT id FROM events WHERE status='confirmed'
      AND upper(event_range) <= $1 ORDER BY upper(event_range),id LIMIT 50`,
        [now],
      )
    ).rows;
  });
  let completed = 0;
  for (const candidate of candidates)
    await inTransaction(database, async (client) => {
      const event = (
        await client.query<EventRow>(`${SELECT} FOR UPDATE`, [candidate.id])
      ).rows[0];
      if (!event) return;
      const now = await nowFor(client, options);
      if (
        !completionEligibility(
          event.status,
          event.starts_at,
          event.ends_at,
          now,
        ).automatic
      )
        return;
      await transition(client, event, null, options);
      completed++;
    });
  return { completed };
}

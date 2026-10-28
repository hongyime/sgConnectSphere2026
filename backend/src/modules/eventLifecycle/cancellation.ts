import { obsoletePendingChangeRequests } from "./obsoleteChangeRequests.js";
import type { Pool, PoolClient } from "pg";
import type { AuthenticatedUser } from "../accessControl/types.js";
import { canActAsRole } from "../accessControl/service.js";
import { inTransaction } from "../../database/pool.js";
import { AccessError } from "../eventVisibility/service.js";
import { applyEventStatusChange } from "./repository.js";
import { allowedNextStatuses, type EventStatus } from "./status.js";
import {
  writeEventNotification,
  type NotificationOptions,
} from "../eventNotifications/service.js";

type Event = {
  id: string;
  event_code: string;
  title: string;
  status: EventStatus;
  organiser_id: string;
  coordinator_id: string | null;
  client_org_id: string;
  decision_reason: string | null;
  status_changed_at: Date;
};
const select = `SELECT id,event_code,title,status,organiser_id,coordinator_id,client_org_id,
  decision_reason,status_changed_at FROM events WHERE id::text=$1 OR event_code=$1`;
const requestPredicate = "requested_changes->>'action'='cancel'";

export function cancellationReason(input: unknown): string {
  const reason =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>).reason
      : undefined;
  if (
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 2000
  )
    throw new AccessError(
      400,
      "Enter a cancellation reason between 1 and 2000 characters.",
    );
  return reason.trim();
}
function actor(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) throw new AccessError(401, "Sign in to continue.");
  if (!canActAsRole(user, [user.role]).allowed)
    throw new AccessError(403, "Your account cannot access this event.");
  return user;
}
function identifier(value: string) {
  if (!value || value.length > 240)
    throw new AccessError(400, "An event id or code is required.");
}
function owner(event: Event | undefined, user: AuthenticatedUser) {
  return (
    !!event &&
    ((user.role === "event_coordinator" && event.coordinator_id === user.id) ||
      (user.role === "event_organiser" &&
        event.organiser_id === user.id &&
        event.client_org_id === user.clientOrgId))
  );
}
function available(event: Event) {
  return (
    event.status !== "draft" &&
    event.status !== "cancelled" &&
    allowedNextStatuses(event.status).includes("cancelled")
  );
}
async function activeAccount(client: PoolClient, user: AuthenticatedUser) {
  const row = (
    await client.query(
      `SELECT id FROM users WHERE id=$1 AND role::text=$2 AND is_active
    AND failed_login_count<5 AND (locked_until IS NULL OR locked_until<=now())
    AND client_org_id IS NOT DISTINCT FROM $3::uuid FOR SHARE NOWAIT`,
      [user.id, user.role, user.clientOrgId ?? null],
    )
  ).rows[0];
  if (!row)
    throw new AccessError(403, "Your account cannot change this event.");
}

// Read-only metadata is shared by existing authorised event views. This endpoint
// also gives affected staff and registered/waitlisted attendees a terminal view.
export async function getCancellation(
  database: Pool,
  user: AuthenticatedUser | undefined,
  ref: string,
) {
  user = actor(user);
  identifier(ref);
  const event = (await database.query<Event>(select, [ref])).rows[0];
  let permitted = owner(event, user);
  if (event && !permitted && event.status === "cancelled") {
    permitted = !!(
      await database.query(
        `SELECT 1 WHERE
      ($2='attendee' AND EXISTS (SELECT 1 FROM event_registrations r JOIN event_publications p ON p.event_id=r.event_id
        WHERE r.event_id=$1 AND r.attendee_id=$3 AND r.status IN ('registered','waitlisted')))
      OR ($2='technical_support_staff' AND EXISTS (SELECT 1 FROM tech_staff_assignments WHERE event_id=$1 AND staff_id=$3))
      OR ($2='venue_staff' AND EXISTS (SELECT 1 FROM venue_bookings b JOIN venue_staff_assignments a ON a.venue_id=b.venue_id
        WHERE b.event_id=$1 AND a.staff_id=$3 AND a.active_from<=now() AND (a.active_until IS NULL OR a.active_until>now())))`,
        [event.id, user.role, user.id],
      )
    ).rows[0];
  }
  if (!event || !permitted)
    throw new AccessError(403, "This event is not available to you.");
  const requests = owner(event, user)
    ? (
        await database.query(
          `SELECT id,description AS reason,created_at
    FROM change_requests WHERE event_id=$1 AND status='pending' AND ${requestPredicate} ORDER BY created_at,id`,
          [event.id],
        )
      ).rows
    : [];
  const obsoleteRequests = owner(event, user)
    ? (
        await database.query(
          `SELECT r.id,r.description AS reason,
    a.old_value AS "from",a.new_value AS "to",a.occurred_at AS "occurredAt",u.full_name AS "actorName"
    FROM change_requests r JOIN audit_logs a ON a.entity_id=r.id AND a.event_id=r.event_id
    AND a.entity_type='change_request' AND a.field_changed='status' AND a.old_value='pending' AND a.new_value='obsolete'
    LEFT JOIN users u ON u.id=a.actor_id WHERE r.event_id=$1 ORDER BY a.occurred_at,a.id`,
          [event.id],
        )
      ).rows
    : [];
  // Public attendees get the publication's safe name, never the private title.
  const title =
    user.role === "attendee"
      ? (
          await database.query<{ name: string }>(
            "SELECT name FROM event_publications WHERE event_id=$1",
            [event.id],
          )
        ).rows[0]!.name
      : event.title;
  return {
    id: event.id,
    eventCode: event.event_code,
    title,
    status: event.status,
    reason: event.status === "cancelled" ? event.decision_reason : null,
    cancelledAt:
      event.status === "cancelled"
        ? event.status_changed_at.toISOString()
        : null,
    canCancel: available(event) && user.role === "event_coordinator",
    canRequest: available(event) && user.role === "event_organiser" && !!event.coordinator_id && requests.length === 0,
    requests,
    obsoleteRequests,
  };
}

// One event lock serializes cancellation with booking/reservation writers and
// pending-request creation. Account NOWAIT avoids event/account lock inversion.
export async function cancelEvent(
  database: Pool,
  user: AuthenticatedUser | undefined,
  ref: string,
  input: unknown,
  options: NotificationOptions = {},
) {
  user = actor(user);
  identifier(ref);
  if (!["event_coordinator", "event_organiser"].includes(user.role))
    throw new AccessError(
      403,
      "Only the assigned Coordinator or owning Organiser can submit this action.",
    );
  const currentUser = user;
  try {
    return await inTransaction(database, async (client) => {
      const event = (await client.query<Event>(`${select} FOR UPDATE`, [ref]))
        .rows[0];
      if (!event || !owner(event, currentUser))
        throw new AccessError(403, "This event is not available to you.");
      await activeAccount(client, currentUser);
      if (
        event.status === "cancelled" &&
        currentUser.role === "event_coordinator"
      )
        return { status: "cancelled", replayed: true, eventId: event.id };
      if (!available(event))
        throw new AccessError(
          409,
          "This event can no longer be cancelled or accept cancellation requests.",
        );
      const reason = cancellationReason(input);
      if (currentUser.role === "event_organiser") {
        if (!event.coordinator_id)
          throw new AccessError(
            409,
            "An assigned Coordinator is required before requesting cancellation.",
          );
        const existing = (
          await client.query<{ id: string; description: string }>(
            `SELECT id,description FROM change_requests
        WHERE event_id=$1 AND status='pending' AND ${requestPredicate}`,
            [event.id],
          )
        ).rows[0];
        if (existing && existing.description !== reason)
          throw new AccessError(409, "A cancellation request is already pending. Your new reason was not submitted.");
        if (existing)
          return {
            status: "requested",
            requestId: existing.id,
            replayed: true,
            eventId: event.id,
          };
        const request = (
          await client.query<{ id: string }>(
            `INSERT INTO change_requests(event_id,requested_by,description,requested_changes)
        VALUES($1,$2,$3,'{"action":"cancel"}') RETURNING id`,
            [event.id, currentUser.id, reason],
          )
        ).rows[0];
        const audit = (
          await client.query<{ id: string; occurred_at: Date }>(
            `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,new_value)
        VALUES($1,'change_request',$2,$3,'Cancellation requested','status','pending') RETURNING id,occurred_at`,
            [currentUser.id, request.id, event.id],
          )
        ).rows[0];
        await writeEventNotification(client, {
          eventId: event.id,
          changeId: audit.id,
          userId: event.coordinator_id,
          occurredAt: audit.occurred_at,
          title: "Cancellation requested",
          message: `${event.title}: the Organiser requested cancellation. Review the reason on the event cancellation page.`,
        });
        return {
          status: "requested",
          requestId: request.id,
          replayed: false,
          eventId: event.id,
        };
      }
      // Wait for staffing before capturing the notification audience as well as
      // before releasing assignments. New support requests require the event lock.
      await client.query("SELECT id FROM tech_support_requests WHERE event_id=$1 ORDER BY id FOR UPDATE", [event.id]);
      // Same stable Event -> Venue -> Equipment order as arrangement writers.
      const venues = (
        await client.query<{ id: string }>(
          `SELECT id FROM venues WHERE id IN (SELECT venue_id FROM venue_bookings
      WHERE event_id=$1 AND status IN ('tentative','pending','confirmed','conflicting'))
      ORDER BY id FOR NO KEY UPDATE`,
          [event.id],
        )
      ).rows;
      await client.query(
        `SELECT id FROM equipment WHERE id IN (SELECT equipment_id FROM equipment_reservations WHERE event_id=$1)
      ORDER BY id FOR UPDATE`,
        [event.id],
      );
      const { change } = await applyEventStatusChange(
        client,
        event.id,
        "cancelled",
        currentUser.id,
        {
          reason,
          notificationOptions: options,
          notificationVenueIds: venues.map((v) => v.id),
          beforeNotify: async () => {
            const bookings = (
              await client.query<{ id: string; status: string }>(
                `UPDATE venue_bookings SET status='released',is_primary=false,requires_reconfirmation=false
          WHERE event_id=$1 AND status IN ('tentative','pending','confirmed','conflicting') RETURNING id`,
                [event.id],
              )
            ).rows;
            for (const booking of bookings)
              await client.query(
                `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,new_value)
          VALUES($1,'venue_booking',$2,$3,'Booking Released','status','released')`,
                [currentUser.id, booking.id, event.id],
              );
            const reservations = (
              await client.query<{ id: string }>(
                `UPDATE equipment_reservations SET status='released',requires_reconfirmation=false
          WHERE event_id=$1 AND status IN ('reserved','partial') RETURNING id`,
                [event.id],
              )
            ).rows;
            for (const reservation of reservations)
              await client.query(
                `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,new_value)
          VALUES($1,'equipment_reservation',$2,$3,'Equipment reservation released','status','released')`,
                [currentUser.id, reservation.id, event.id],
              );
            const supportRequests = (await client.query<{ id: string }>(
              "UPDATE tech_support_requests SET status='cancelled' WHERE event_id=$1 AND status IN ('open','staffed') RETURNING id", [event.id],
            )).rows;
            const assignments = (await client.query<{ id: string }>(
              "UPDATE tech_staff_assignments SET status='released' WHERE event_id=$1 AND status='assigned' RETURNING id", [event.id],
            )).rows;
            for (const [entityType, rows, action, value] of [
              ['tech_support_request', supportRequests, 'Technical support request cancelled', 'cancelled'],
              ['tech_staff_assignment', assignments, 'Technician assignment released', 'released'],
            ] as const) for (const row of rows) await client.query(
              `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,new_value)
               VALUES($1,$2,$3,$4,$5,'status',$6)`,
              [currentUser.id, entityType, row.id, event.id, action, value],
            );
            await obsoletePendingChangeRequests(
              client, event.id, currentUser.id, "cancelled",
            );
          },
        },
      );
      return {
        status: "cancelled",
        eventId: event.id,
        replayed: false,
        changedAt: change!.occurredAt.toISOString(),
      };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "55P03")
      throw new AccessError(
        409,
        "An account update is in progress. Refresh and try again.",
      );
    throw error;
  }
}

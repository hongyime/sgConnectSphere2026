import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';

type BookingEvent = Record<string, unknown> & { id: string; event_code: string | null; title: string; status: string; starts_at: Date; ends_at: Date };

async function requireCoordinator(user: AuthenticatedUser | undefined) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) throw new AccessError(403, 'Only Event Coordinators can view venue booking requests.');
  return user;
}

async function assignedEvent(query: Query, user: AuthenticatedUser, identifier: string) {
  if (!identifier || identifier.length > 160) throw new AccessError(400, 'An event id or code is required.');
  const event = (await query<BookingEvent>(`SELECT e.id, e.event_code, e.title, e.status, lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at
    FROM events e WHERE (e.id::text=$1 OR e.event_code=$1) AND e.coordinator_id=$2`, [identifier, user.id])).rows[0];
  if (!event) throw new AccessError(404, 'Event not found.');
  return event;
}

// E05-S06 Scenario 3 / E10-S05 Scenario 2: a booking an unavailability made
// Conflicting carries that unavailability's category, note and period, for the
// event's venue-conflict flag.
export async function listBookingRequests(query: Query, user: AuthenticatedUser | undefined, identifier: string) {
  const actor = await requireCoordinator(user);
  const event = await assignedEvent(query, actor, identifier);
  const bookings = (await query(`SELECT b.id, b.venue_id, v.name AS venue_name, v.location,
    b.status, lower(b.booking_range) AS starts_at, upper(b.booking_range) AS ends_at,
    b.created_at, b.decision_reason, b.suggested_venue_id, suggested.name AS suggested_venue_name, b.replaces_booking_id,
    EXISTS(SELECT 1 FROM venue_bookings replacement WHERE replacement.replaces_booking_id=b.id AND replacement.status<>'released') AS has_replacement, b.purpose, b.headcount, b.is_primary, b.suitability_snapshot,
    b.status_before_conflict, cb.reason_category AS conflict_reason_category, cb.reason AS conflict_note,
    lower(cb.block_range) AS conflict_starts_at, upper(cb.block_range) AS conflict_ends_at
    FROM venue_bookings b JOIN venues v ON v.id=b.venue_id
    LEFT JOIN venue_blocks cb ON cb.id=b.conflict_block_id
    LEFT JOIN venues suggested ON suggested.id=b.suggested_venue_id
    JOIN events e ON e.id=b.event_id
    WHERE b.event_id=$1 AND e.coordinator_id=$2
    ORDER BY b.created_at DESC, b.id DESC`, [event.id, actor.id])).rows;
  return { event: { id: event.id, event_code: event.event_code, title: event.title, status: event.status, starts_at: event.starts_at, ends_at: event.ends_at }, bookings };
}

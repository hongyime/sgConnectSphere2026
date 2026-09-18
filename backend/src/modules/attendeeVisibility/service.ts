import { canActAsRole } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';

// E14-S02 Scenario 2: a role-mismatch denial has no specific event to attach
// to, so it's logged against the screen the caller was trying to reach.
async function requireAttendee(query: Query, user: AuthenticatedUser) {
  if (!canActAsRole(user, ['attendee']).allowed) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
      VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'attendee_events')`, [user.id]);
    throw new AccessError(403, 'Access denied.');
  }
}

export async function recordPlanningDenial(query: Query, user: AuthenticatedUser, identifier: string) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, new_value)
    SELECT $1, 'internal_planning', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', $2
    FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2 OR e.event_code = $2`, [user.id, identifier]);
}

export async function refusePlanning(query: Query, user: AuthenticatedUser, identifier: string) {
  await recordPlanningDenial(query, user, identifier);
  throw new AccessError(403, 'Access denied. Internal planning is not available here.');
}

// E14-S02 Scenario 2: same denial shape as recordPlanningDenial above, for an
// attendee asking for a specific event that isn't in their registered list.
async function recordEventAccessDenial(query: Query, user: AuthenticatedUser, identifier: string) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, new_value)
    SELECT $1, 'event', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', $2
    FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2 OR e.event_code = $2`, [user.id, identifier]);
}

export async function attendeeEvents(query: Query, user: AuthenticatedUser, identifier?: string) {
  await requireAttendee(query, user);
  // Explicit allowlist: never select planning fields, notes, decisions or comments.
  const rows = (await query(`SELECT p.event_id AS id, p.name, p.starts_at, p.ends_at, p.venue_name, p.venue_location
    FROM event_publications p JOIN event_registrations r ON r.event_id = p.event_id
    JOIN events e ON e.id = p.event_id
    WHERE r.attendee_id = $1 AND r.status = 'registered'
      AND ($2::text IS NULL OR e.id::text = $2 OR e.event_code = $2)
    ORDER BY p.starts_at, p.event_id`, [user.id, identifier ?? null])).rows;
  if (identifier && rows.length === 0) {
    await recordEventAccessDenial(query, user, identifier);
    throw new AccessError(403, 'This event is not available in your registered events.');
  }
  return rows;
}

// E14-S02 Scenario 2: covers both denial branches below - wrong role entirely,
// and a coordinator whose event doesn't qualify for publication.
async function recordPublishDenial(query: Query, user: AuthenticatedUser, eventId: string) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, new_value)
    SELECT $1, 'event', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', 'publish'
    FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2`, [user.id, eventId]);
}

// Publication is an explicit coordinator operation; it never copies private text.
export async function publishEvent(query: Query, user: AuthenticatedUser, eventId: string) {
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await recordPublishDenial(query, user, eventId);
    throw new AccessError(403, 'Access denied.');
  }
  const result = await query(`INSERT INTO event_publications (event_id, name, starts_at, ends_at, venue_name, venue_location)
    SELECT e.id, e.title, lower(e.event_range), upper(e.event_range), v.name, v.location
    FROM events e JOIN venue_bookings b ON b.event_id = e.id AND b.status = 'confirmed'
    JOIN venues v ON v.id = b.venue_id
    WHERE e.id::text = $1 AND e.coordinator_id = $2 AND e.status = 'confirmed'
      AND NOT b.requires_reconfirmation
    ON CONFLICT (event_id) DO UPDATE SET name = excluded.name, starts_at = excluded.starts_at,
      ends_at = excluded.ends_at, venue_name = excluded.venue_name, venue_location = excluded.venue_location,
      published_at = now()
    RETURNING event_id`, [eventId, user.id]);
  if (!result.rows.length) {
    await recordPublishDenial(query, user, eventId);
    throw new AccessError(403, 'A confirmed event and venue assigned to you are required.');
  }
}

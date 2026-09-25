import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';

export type Query = <T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string, values?: unknown[],
) => Promise<{ rows: T[] }>;

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// E14-S02 Scenario 2: a wrong-role or unlinked-organisation denial has no
// specific event to attach to, so it's logged against the screen the caller
// was trying to reach rather than an entity_id. Only the 403 branch is
// logged - an unauthenticated 401 has no actor to attribute it to.
export async function requireOrganiser(query: Query, user: AuthenticatedUser | undefined, screen: string): Promise<string> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_organiser']).allowed || !user.clientOrgId) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
      VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', $2)`, [user.id, screen]);
    throw new AccessError(403, 'Access denied. Contact your administrator about your organisation access.');
  }
  return user.clientOrgId;
}

const projection = `e.id, e.event_code, e.title, e.description, e.status,
  e.status_changed_at, lower(e.event_range) AS starts_at, u.full_name AS creator_name`;

export async function listEvents(query: Query, user: AuthenticatedUser, search = '') {
  const org = await requireOrganiser(query, user, 'events');
  // Position treats search text literally, including SQL wildcard characters.
  // SCRUM-27 Scenario 1: a draft is only visible to the organiser who owns
  // it, not to colleagues browsing the same client organisation (this
  // endpoint is already unreachable for Coordinators - see requireOrganiser).
  return (await query(`SELECT ${projection} FROM events e
    JOIN users u ON u.id = e.organiser_id
    WHERE e.client_org_id = $1 AND (e.status <> 'draft' OR e.organiser_id = $2) AND
      (strpos(lower(e.title), lower($3)) > 0 OR strpos(lower(coalesce(e.event_code, '')), lower($3)) > 0)
    ORDER BY lower(e.event_range), e.id LIMIT 100`, [org, user.id, search.slice(0, 240)])).rows;
}

export async function getEvent(query: Query, user: AuthenticatedUser, identifier: string) {
  const org = await requireOrganiser(query, user, 'events');
  // Same draft-privacy rule as listEvents above.
  const result = await query(`SELECT ${projection} FROM events e
    JOIN users u ON u.id = e.organiser_id
    WHERE e.client_org_id = $1 AND (e.status <> 'draft' OR e.organiser_id = $3)
      AND (e.id::text = $2 OR e.event_code = $2)`, [org, identifier, user.id]);
  if (result.rows[0]) {
    const event = result.rows[0] as Record<string, unknown> & { id: string };
    const history = await query(`SELECT occurred_at, old_value, new_value
      FROM audit_logs
      WHERE event_id = $1 AND action = 'status_changed'
      ORDER BY occurred_at ASC, id ASC`, [event.id]);
    const comments = await listEventComments(query, event.id);
    return { ...event, statusHistory: history.rows, comments, canPostComment: user.role === 'event_organiser' };
  }
  // Separate committed write: throwing a denial must not roll back its audit entry.
  // Unknown IDs receive the same response, without revealing whether an event exists.
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, new_value)
    SELECT $1, 'event', coalesce(e.id, gen_random_uuid()), e.id, 'Access Denied', $2
    FROM (SELECT 1) anchor LEFT JOIN events e ON e.id::text = $2 OR e.event_code = $2`,
  [user.id, identifier]);
  throw new AccessError(403, 'Access denied. This event is not available to your organisation.');
}

export async function listEventComments(query: Query, eventId: string) {
  return (await query(`SELECT t.id, t.body, t.created_at, u.full_name AS author_name, u.email AS author_email
    FROM event_threads t JOIN users u ON u.id = t.author_id
    WHERE t.event_id = $1 AND t.type = 'comment'
    ORDER BY t.created_at ASC, t.id ASC`, [eventId])).rows;
}

export async function createEventComment(query: Query, user: AuthenticatedUser, identifier: string, body: unknown) {
  const comment = typeof body === 'string' ? body.trim() : '';
  if (!comment || comment.length > 2000) throw new AccessError(400, 'Comment must be between 1 and 2000 characters.');
  const org = await requireOrganiser(query, user, 'events');
  const eventResult = await query<{ id: string; coordinator_id: string | null }>(
    `SELECT e.id, e.coordinator_id FROM events e
     WHERE e.client_org_id = $1 AND (e.id::text = $2 OR e.event_code = $2)`, [org, identifier]);
  const event = eventResult.rows[0];
  if (!event) throw new AccessError(403, 'Access denied. This event is not available to your organisation.');
  const commentResult = await query(`INSERT INTO event_threads (event_id, author_id, type, body)
    VALUES ($1, $2, 'comment', $3) RETURNING id, body, created_at`, [event.id, user.id, comment]);
  if (event.coordinator_id) {
    await query(`INSERT INTO notifications (user_id, event_id, title, message, is_read)
      VALUES ($1, $2, 'New event comment', $3, false)`,
    [event.coordinator_id, event.id, `${user.email} commented on an event: ${comment}`]);
  }
  const author = await query<{ full_name: string }>('SELECT full_name FROM users WHERE id = $1', [user.id]);
  return { ...commentResult.rows[0], author_name: author.rows[0]?.full_name ?? user.email, author_email: user.email };
}

export async function listNotifications(query: Query, user: AuthenticatedUser) {
  const org = await requireOrganiser(query, user, 'notifications');
  // Eventless messages are excluded because their text cannot be attributed safely.
  return (await query(`SELECT n.id, n.title, n.message, n.event_id, n.created_at, n.is_read
    FROM notifications n JOIN events e ON e.id = n.event_id
    WHERE n.user_id = $1 AND e.client_org_id = $2
    ORDER BY n.created_at DESC, n.id LIMIT 100`, [user.id, org])).rows;
}

export async function permittedDelivery(query: Query, notificationId: string | undefined, email: string) {
  if (!notificationId) return null;
  const result = await query(`SELECT n.id,
      CASE WHEN u.role = 'attendee' THEN p.name ELSE n.title END AS title,
      CASE WHEN u.role = 'attendee' THEN concat(p.name, ' | ', p.starts_at, ' - ', p.ends_at, ' | ', p.venue_name, ' | ', p.venue_location)
        ELSE n.message END AS message FROM notifications n
    JOIN users u ON u.id = n.user_id JOIN events e ON e.id = n.event_id
    LEFT JOIN event_publications p ON p.event_id = e.id
    LEFT JOIN event_registrations r ON r.event_id = e.id AND r.attendee_id = u.id
    WHERE n.id::text = $1 AND u.email = $2 AND u.is_active
      AND u.failed_login_count < 5 AND (u.locked_until IS NULL OR u.locked_until <= now())
      AND (u.role <> 'attendee' OR (p.event_id IS NOT NULL AND r.status = 'registered'))
      AND (u.role <> 'event_organiser' OR (u.client_org_id IS NOT NULL AND u.client_org_id = e.client_org_id))`,
  [notificationId, email]);
  const notification = result.rows[0];
  if (!notification) return null;
  const escape = (value: unknown) => String(value).replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
  return { to: email, notificationId, subject: String(notification.title), html: `<p>${escape(notification.message)}</p>` };
}

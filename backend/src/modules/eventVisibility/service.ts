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
  e.status_changed_at, lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at,
  e.organiser_id, e.coordinator_id, u.full_name AS creator_name,
  c.full_name AS coordinator_name`;

// E03-S01: the assigned Coordinator's name, shown to the Organiser (NULL
// until one is assigned). Joined wherever `projection` is used.
const coordinatorJoin = 'LEFT JOIN users c ON c.id = e.coordinator_id';

export async function listEvents(query: Query, user: AuthenticatedUser, search = '') {
  const org = await requireOrganiser(query, user, 'events');
  // Position treats search text literally, including SQL wildcard characters.
  // SCRUM-27 Scenario 1: a draft is only visible to the organiser who owns
  // it, not to colleagues browsing the same client organisation (this
  // endpoint is already unreachable for Coordinators - see requireOrganiser).
  return (await query(`SELECT ${projection} FROM events e
    JOIN users u ON u.id = e.organiser_id ${coordinatorJoin}
    WHERE e.client_org_id = $1 AND (e.status <> 'draft' OR e.organiser_id = $2) AND
      (strpos(lower(e.title), lower($3)) > 0 OR strpos(lower(coalesce(e.event_code, '')), lower($3)) > 0)
    ORDER BY lower(e.event_range), e.id LIMIT 100`, [org, user.id, search.slice(0, 240)])).rows;
}

export async function getEvent(query: Query, user: AuthenticatedUser, identifier: string) {
  const org = await requireOrganiser(query, user, 'events');
  // Same draft-privacy rule as listEvents above.
  const result = await query(`SELECT ${projection} FROM events e
    JOIN users u ON u.id = e.organiser_id ${coordinatorJoin}
    WHERE e.client_org_id = $1 AND (e.status <> 'draft' OR e.organiser_id = $3)
      AND (e.id::text = $2 OR e.event_code = $2)`, [org, identifier, user.id]);
  if (result.rows[0]) {
    const event = result.rows[0] as Record<string, unknown> & { id: string };
    const history = await query(`SELECT occurred_at, old_value, new_value
      FROM audit_logs
      WHERE event_id = $1 AND action = 'status_changed'
      ORDER BY occurred_at ASC, id ASC`, [event.id]);
    const comments = await listEventComments(query, event.id);
    const approved = ['approved', 'planning', 'confirmed', 'completed'].includes(String(event.status));
    const assignedCoordinator = user.role === 'event_coordinator' && event.coordinator_id === user.id;
    const organiser = user.role === 'event_organiser';
    const canEdit = assignedCoordinator || (organiser && (!approved || event.organiser_id === user.id));
    const editableFields = assignedCoordinator || (organiser && !approved)
      ? ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference']
      : ['title', 'description', 'purpose'];
    return { ...event, statusHistory: history.rows, comments, canPostComment: organiser, canEdit, editableFields };
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

const unrestrictedAfterApproval = new Set(['title', 'description', 'purpose', 'registrationDates']);
const editableFields = new Set(['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationDates']);

export async function updateEventInformation(query: Query, user: AuthenticatedUser, identifier: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccessError(400, 'invalid_payload');
  const patch = input as Record<string, unknown>;
  const org = user.clientOrgId;
  if (user.role !== 'event_organiser' && user.role !== 'event_coordinator') throw new AccessError(403, 'Edit access denied.');
  const result = await query<{ id: string; status: string; organiser_id: string; coordinator_id: string | null; client_org_id: string }>(
    `SELECT id, status, organiser_id, coordinator_id, client_org_id FROM events
     WHERE id::text = $1 OR event_code = $1`, [identifier]);
  const event = result.rows[0];
  if (!event || (user.role === 'event_organiser' && (!org || event.client_org_id !== org || event.organiser_id !== user.id))) {
    throw new AccessError(403, 'Edit access denied.');
  }
  if (user.role === 'event_coordinator' && (event.coordinator_id !== user.id || !['approved', 'planning', 'confirmed', 'completed'].includes(event.status))) {
    throw new AccessError(403, 'Only the assigned Coordinator may edit an approved event.');
  }
  const approved = ['approved', 'planning', 'confirmed', 'completed'].includes(event.status);
  const changed = Object.keys(patch).filter(field => editableFields.has(field));
  if (!changed.length) throw new AccessError(400, 'No editable fields supplied.');
  if (user.role === 'event_organiser' && approved) {
    const restricted = changed.find(field => !unrestrictedAfterApproval.has(field));
    if (restricted) throw new AccessError(409, `Direct editing of ${restricted} is not allowed after approval. Raise a change request.`,);
  }
  const assignments: string[] = [];
  const values: unknown[] = [];
  const audit: { field: string; value: unknown }[] = [];
  const add = (sql: string, value: unknown, field: string) => { assignments.push(sql); values.push(value); audit.push({ field, value }); };
  for (const field of changed) {
    const value = patch[field];
    if (['title', 'description', 'purpose', 'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference'].includes(field)) {
      if (typeof value !== 'string' || !value.trim()) throw new AccessError(400, `${field} must be non-empty.`);
      const column = field === 'venueRequirements' ? 'venue_requirements' : field === 'accessibilityNote' ? 'accessibility_note' : field === 'equipmentRequirements' ? 'equipment_requirements' : field === 'layoutPreference' ? 'layout_preference' : field;
      add(`${column} = $${values.length + 1}`, value.trim(), field);
    } else if (field === 'expectedAttendance') {
      if (!Number.isInteger(value) || Number(value) <= 0) throw new AccessError(400, 'expectedAttendance must be a positive integer.');
      add('expected_attendance = $' + (values.length + 1), value, field);
    } else if (field === 'startAt' || field === 'endAt') {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new AccessError(400, `${field} must be a valid date.`);
      // Dates are applied together below as one range; retaining the value here
      // lets the audit identify which boundary the caller changed.
      audit.push({ field, value });
    } else if (field === 'registrationDates') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AccessError(400, 'registrationDates must include opensAt and closesAt.');
      const dates = value as { opensAt?: unknown; closesAt?: unknown };
      if (typeof dates.opensAt !== 'string' || typeof dates.closesAt !== 'string' || Number.isNaN(Date.parse(dates.opensAt)) || Number.isNaN(Date.parse(dates.closesAt)) || new Date(dates.closesAt) <= new Date(dates.opensAt)) {
        throw new AccessError(400, 'registrationDates must contain a valid opening and closing date.');
      }
      assignments.push(`registration_opens_at = $${values.length + 1}, registration_closes_at = $${values.length + 2}`);
      values.push(dates.opensAt, dates.closesAt);
      audit.push({ field: 'registrationDates', value: `${dates.opensAt} to ${dates.closesAt}` });
    }
  }
  const startAt = patch.startAt as string | undefined;
  const endAt = patch.endAt as string | undefined;
  if (startAt || endAt) {
    const current = await query<{ start_at: Date; end_at: Date }>('SELECT lower(event_range) AS start_at, upper(event_range) AS end_at FROM events WHERE id = $1', [event.id]);
    const start = startAt ?? current.rows[0]?.start_at?.toISOString();
    const end = endAt ?? current.rows[0]?.end_at?.toISOString();
    if (!start || !end || new Date(end) <= new Date(start)) throw new AccessError(400, 'Event end must be after its start.');
    assignments.push(`event_range = tstzrange($${values.length + 1}, $${values.length + 2}, '[)')`);
    values.push(start, end);
  }
  values.push(event.id);
  await query(`UPDATE events SET ${assignments.join(', ')} WHERE id = $${values.length}`, values);
  for (const change of audit) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
      VALUES ($1, 'event', $2, $2, 'Record updated', $3, $4)`, [user.id, event.id, change.field, String(change.value)]);
  }
  return { updated: true, eventId: event.id, fields: changed };
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

import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { EventStatus } from '../eventLifecycle/status.js';
import { insertNotificationDelivery } from '../notificationDispatcher/postgres.js';

// Trusted workflow adapter, never request-body recipient IDs. Venue management
// must supply the real assignment relation; decided_by is not an assignment.
export type VenueStaffResolver = (client: PoolClient, venueIds: readonly string[]) => Promise<string[]>;
export type NotificationOptions = { resolveVenueStaff?: VenueStaffResolver };
export type EventAudience = {
  eventId: string;
  title: string;
  publicName: string | null;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  organiser: string[];
  coordinator: string[];
  venueStaff: string[];
  technicalStaff: string[];
  registered: string[];
  waitlisted: string[];
  unresolvedVenueIds: string[];
};
export type EventChange =
  | { kind: 'status'; from: EventStatus; to: EventStatus }
  | { kind: 'arrangements'; fields: readonly ('date' | 'time' | 'venue')[] }
  | { kind: 'booking_requested' }
  | { kind: 'booking_decided'; decision: 'confirmed' | 'rejected' | 'released' }
  | { kind: 'equipment_changed'; venueAffected: boolean; technicalAffected: boolean }
  | { kind: 'place_released' }
  | { kind: 'description_only' };

// Capture BEFORE cancellation releases bookings/assignments/registrations.
// Capture again after a venue move and pass both snapshots to notifyEventChange.
export async function captureEventAudience(
  client: PoolClient, eventId: string, options: NotificationOptions = {},
): Promise<EventAudience> {
  const { rows } = await client.query<{
    id: string; title: string; public_name: string | null; status: EventStatus;
    starts_at: Date; ends_at: Date; organiser_id: string | null; coordinator_id: string | null;
  }>(`SELECT e.id, e.title, p.name AS public_name, e.status,
    lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at,
    o.id AS organiser_id, c.id AS coordinator_id
    FROM events e LEFT JOIN event_publications p ON p.event_id=e.id
    LEFT JOIN users o ON o.id=e.organiser_id AND o.is_active AND o.role='event_organiser' AND o.client_org_id=e.client_org_id
    LEFT JOIN users c ON c.id=e.coordinator_id AND c.is_active AND c.role='event_coordinator'
    WHERE e.id=$1`, [eventId]);
  const event = rows[0];
  if (!event) throw new Error('notification_event_not_found');
  const registrations = (await client.query<{ attendee_id: string; status: string }>(
    `SELECT r.attendee_id, r.status FROM event_registrations r JOIN users u ON u.id=r.attendee_id
     WHERE r.event_id=$1 AND r.status IN ('registered','waitlisted') AND u.is_active AND u.role='attendee'`, [eventId])).rows;
  const technicalStaff = (await client.query<{ staff_id: string }>(
    `SELECT DISTINCT a.staff_id FROM tech_staff_assignments a JOIN users u ON u.id=a.staff_id
     WHERE a.event_id=$1 AND a.status='assigned' AND u.is_active AND u.role='technical_support_staff'`, [eventId])).rows.map(r => r.staff_id);
  const venueIds = (await client.query<{ venue_id: string }>(
    `SELECT DISTINCT venue_id FROM venue_bookings WHERE event_id=$1 AND status IN ('pending','confirmed')`, [eventId])).rows.map(r => r.venue_id);
  let venueStaff: string[] = [];
  if (options.resolveVenueStaff && venueIds.length) {
    const assignedIds = await options.resolveVenueStaff(client, venueIds);
    venueStaff = (await client.query<{ id: string }>(
      `SELECT id FROM users WHERE id=ANY($1::uuid[]) AND is_active AND role='venue_staff'`, [assignedIds])).rows.map(r => r.id);
  }
  return {
    eventId, title: event.title, publicName: event.public_name, status: event.status,
    startsAt: event.starts_at.toISOString(), endsAt: event.ends_at.toISOString(),
    organiser: event.organiser_id ? [event.organiser_id] : [], coordinator: event.coordinator_id ? [event.coordinator_id] : [],
    venueStaff, technicalStaff, registered: registrations.filter(r => r.status==='registered').map(r => r.attendee_id),
    waitlisted: registrations.filter(r => r.status==='waitlisted').map(r => r.attendee_id),
    unresolvedVenueIds: options.resolveVenueStaff ? [] : venueIds,
  };
}

type Group = 'organiser' | 'coordinator' | 'venueStaff' | 'technicalStaff' | 'registered' | 'waitlisted';
const everyone: Group[] = ['organiser','coordinator','venueStaff','technicalStaff','registered','waitlisted'];
function groupsFor(change: EventChange): Group[] {
  switch (change.kind) {
    case 'status':
      if (change.from===change.to || change.to==='draft') return [];
      return ['confirmed','cancelled','completed'].includes(change.to) || (change.from==='confirmed' && change.to==='planning')
        ? everyone : ['organiser','coordinator'];
    case 'arrangements': return change.fields.length ? everyone : [];
    case 'booking_requested': return ['venueStaff'];
    case 'booking_decided': return ['coordinator'];
    case 'equipment_changed': return ['coordinator', ...(change.venueAffected ? ['venueStaff' as const] : []), ...(change.technicalAffected ? ['technicalStaff' as const] : [])];
    case 'place_released': return ['waitlisted'];
    case 'description_only': return [];
  }
}

export function selectEventRecipients(before: EventAudience, after: EventAudience, change: EventChange, actorId?: string) {
  if (before.eventId!==after.eventId) throw new Error('notification_event_mismatch');
  const groups = groupsFor(change);
  // Cancellation uses pre-release links. A venue move needs old AND new staff.
  // Ordinary changes use current registrations, so withdrawn users are excluded.
  const cancelled = change.kind==='status' && change.to==='cancelled';
  const attendees = cancelled ? before : after;
  const recipients = new Map<string, 'internal' | 'attendee'>();
  for (const group of groups) {
    const publicGroup = group==='registered' || group==='waitlisted';
    const ids = publicGroup ? (attendees.publicName ? attendees[group] : [])
      : group==='venueStaff' || group==='technicalStaff' ? [...before[group], ...after[group]] : after[group];
    for (const id of ids) {
      if (id!==actorId) {
        // Public content wins if malformed overlapping role data is ever supplied.
        if (!recipients.has(id) || publicGroup) recipients.set(id, publicGroup ? 'attendee' : 'internal');
      }
    }
  }
  return {
    recipients,
    unresolvedVenueIds: groups.includes('venueStaff') ? [...new Set([...before.unresolvedVenueIds,...after.unresolvedVenueIds])] : [],
  };
}

function description(change: EventChange): string {
  switch (change.kind) {
    case 'status': return change.from==='confirmed' && change.to==='planning' ? 'Previously confirmed arrangements are being revised.' : `Event status changed to ${change.to.replaceAll('_',' ')}.`;
    case 'arrangements': return `Event ${[...new Set(change.fields)].join(', ')} changed.`;
    case 'booking_requested': return 'A venue booking request needs a decision.';
    case 'booking_decided': return `The venue booking was ${change.decision}.`;
    case 'equipment_changed': return 'Equipment arrangements or availability changed; review the affected work.';
    case 'place_released': return 'A place is available. Apply on a first-come basis; no place has been reserved for you.';
    case 'description_only': return '';
  }
}

function notificationId(eventId: string, changeId: string, recipientId: string): string {
  const hex = createHash('sha256').update(JSON.stringify(['event-notification-v1',eventId,changeId,recipientId])).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// Shared transactional writer for recipient-matrix and targeted workflow notices.
// Reusing the same change ID means a specific assignment notice can also satisfy
// the generic status notice for that recipient without a second in-app/email row.
export async function writeEventNotification(client: PoolClient, input: {
  eventId: string; changeId: string; userId: string; occurredAt: Date; title: string; message: string;
}) {
  if (!input.changeId || !Number.isFinite(input.occurredAt.getTime())) throw new Error('invalid_notification_change');
  const id = notificationId(input.eventId, input.changeId, input.userId);
  const result = await client.query(`INSERT INTO notifications(user_id,event_id,title,message,id,created_at)
    SELECT $1,$2,$3,$4,$5,$6 FROM users WHERE id=$1 AND is_active
    ON CONFLICT(id) DO NOTHING RETURNING id`,
  [input.userId,input.eventId,input.title,input.message,id,input.occurredAt]);
  if (!result.rowCount) return null;
  await insertNotificationDelivery(client, id);
  return id;
}

// The caller owns the transaction and the business write. changeId is a durable
// server-side change/audit ID reused on retries, never a fresh ID per recipient.
// Do not catch notification failures and then commit the business transaction.
export async function notifyEventChange(client: PoolClient, input: {
  changeId: string; occurredAt: Date; actorId?: string; before: EventAudience; after: EventAudience; change: EventChange;
}) {
  if (!input.changeId || !Number.isFinite(input.occurredAt.getTime())) throw new Error('invalid_notification_change');
  const { before, after, change, actorId, changeId, occurredAt } = input;
  const { recipients, unresolvedVenueIds } = selectEventRecipients(before, after, change, actorId);
  const inserted: string[] = [];
  for (const [userId, audience] of recipients) {
    const publicName = change.kind==='status' && change.to==='cancelled' ? before.publicName : after.publicName;
    const eventName = audience==='attendee' ? publicName : after.title;
    if (!eventName) throw new Error('public_notification_name_missing');
    const message = `${eventName}: ${description(change)} Changed at ${occurredAt.toISOString()}.`;
    const id = await writeEventNotification(client, {eventId:after.eventId,changeId,userId,occurredAt,title:'Event update',message});
    if (id) inserted.push(id);
  }
  // Explicit unresolved integration signal; never infer assignments or fan out
  // to every Venue Staff user. Existing business workflows continue for known
  // recipients, but this is not full Venue Staff acceptance coverage.
  if (unresolvedVenueIds.length) console.warn('event_notification_venue_assignment_dependency', { eventId: after.eventId, venueIds: unresolvedVenueIds });
  return { notificationIds: inserted, unresolvedVenueIds };
}

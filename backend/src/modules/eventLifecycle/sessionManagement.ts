import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { canActAsRole } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from '../eventNotifications/service.js';
import { AccessError } from '../eventVisibility/service.js';

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DELETEABLE_STATUSES = ['approved', 'planning', 'safety_review', 'confirmed'];

export async function deleteEventSession(
  database: Pool,
  user: AuthenticatedUser | undefined,
  eventIdentifier: string,
  sessionId: string,
  notificationOptions: NotificationOptions = {},
) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_organiser', 'event_coordinator']).allowed) throw new AccessError(403, 'Only the Event Organiser or assigned Coordinator can delete a Session.');
  if (!eventIdentifier || eventIdentifier.length > 240 || !SESSION_ID.test(sessionId)) throw new AccessError(400, 'An Event and valid Session are required.');

  return inTransaction(database, async client => {
    const account = (await client.query<{ role: string; is_active: boolean; locked_until: Date | null; failed_login_count: number }>(
      'SELECT role,is_active,locked_until,failed_login_count FROM users WHERE id=$1 FOR SHARE', [user.id])).rows[0];
    if (!account?.is_active || account.failed_login_count >= 5 || (account.locked_until && account.locked_until > new Date())
      || account.role !== user.role) throw new AccessError(403, 'Your account cannot manage Sessions.');

    const event = (await client.query<{ id: string; status: string; organiser_id: string; coordinator_id: string | null }>(
      `SELECT id,status,organiser_id,coordinator_id FROM events WHERE id::text=$1 OR event_code=$1 FOR NO KEY UPDATE`, [eventIdentifier])).rows[0];
    if (!event) throw new AccessError(404, 'Event not found.');
    const ownsEvent = account.role === 'event_organiser' && event.organiser_id === user.id;
    const assignedCoordinator = account.role === 'event_coordinator' && event.coordinator_id === user.id;
    if (!ownsEvent && !assignedCoordinator) throw new AccessError(403, 'You are not assigned to this Event.');
    if (!DELETEABLE_STATUSES.includes(event.status)) throw new AccessError(409, 'Sessions can only be deleted while an Event is being planned.');

    const session = (await client.query<{ id: string; title: string | null }>(
      'SELECT id,title FROM sessions WHERE id=$1 AND event_id=$2 FOR UPDATE', [sessionId, event.id])).rows[0];
    if (!session) throw new AccessError(404, 'Session not found.');
    const count = (await client.query<{ count: number }>('SELECT count(*)::int AS count FROM sessions WHERE event_id=$1', [event.id])).rows[0]!.count;
    if (count <= 1) throw new AccessError(409, 'An Event must keep at least one Session.');

    const used = (await client.query<{ used: boolean }>(`SELECT
      EXISTS(SELECT 1 FROM event_registration_sessions WHERE session_id=$1) OR
      EXISTS(SELECT 1 FROM equipment_requests WHERE session_id=$1) OR
      EXISTS(SELECT 1 FROM equipment_reservations WHERE session_id=$1) AS used`, [sessionId])).rows[0]!.used;
    if (used) throw new AccessError(409, 'This Session has attendee or equipment history that must be preserved.');

    const bookings = (await client.query<{ id: string; venue_id: string }>(`SELECT id,venue_id FROM venue_bookings
      WHERE session_id=$1 AND status IN ('pending','confirmed','tentative','conflicting') FOR UPDATE`, [sessionId])).rows;
    const venueIds = [...new Set(bookings.map(booking => booking.venue_id))];
    if (bookings.length) {
      await client.query(`UPDATE venue_bookings SET status='released',is_primary=false,expires_at=NULL,decision_reason='Session deleted'
        WHERE id=ANY($1::uuid[])`, [bookings.map(booking => booking.id)]);
    }

    const next = (await client.query<{ id: string; start_at: Date; end_at: Date; expected_attendance: number; layout_id: string | null; venue_requirements: string | null; accessibility_note: string | null; equipment_requirements: string | null; layout_preference: string | null; total_attendance: number }>(
      `SELECT s.id,lower(s.session_range) AS start_at,upper(s.session_range) AS end_at,s.expected_attendance,s.layout_id,
        s.venue_requirements,s.accessibility_note,s.equipment_requirements,s.layout_preference,
        (SELECT sum(expected_attendance)::int FROM sessions WHERE event_id=s.event_id AND id<>$2) AS total_attendance
       FROM sessions s WHERE s.event_id=$1 AND s.id<>$2 ORDER BY lower(s.session_range),s.created_at,s.id LIMIT 1`, [event.id, sessionId])).rows[0];
    if (!next) throw new AccessError(409, 'An Event must keep at least one Session.');
    const envelope = (await client.query<{ start_at: Date; end_at: Date }>(
      'SELECT min(lower(session_range)) AS start_at,max(upper(session_range)) AS end_at FROM sessions WHERE event_id=$1 AND id<>$2', [event.id, sessionId])).rows[0]!;
    await client.query(`UPDATE events SET event_range=tstzrange($2,$3,'[)'),expected_attendance=$4,layout_id=$5,
      venue_requirements=$6,accessibility_note=$7,equipment_requirements=$8,layout_preference=$9 WHERE id=$1`,
    [event.id,envelope.start_at,envelope.end_at,next.total_attendance,next.layout_id,next.venue_requirements,next.accessibility_note,next.equipment_requirements,next.layout_preference]);
    await client.query('DELETE FROM event_accessibility_needs WHERE event_id=$1', [event.id]);
    await client.query(`INSERT INTO event_accessibility_needs(event_id,feature_id)
      SELECT $1,feature_id FROM session_accessibility_needs WHERE session_id=$2`, [event.id,next.id]);
    await client.query('DELETE FROM event_facility_needs WHERE event_id=$1', [event.id]);
    await client.query(`INSERT INTO event_facility_needs(event_id,facility_id)
      SELECT $1,facility_id FROM session_facility_needs WHERE session_id=$2`, [event.id,next.id]);

    const audit = await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,'event',$2,$2,'Session deleted','session',$3,$4) RETURNING id,occurred_at`,
    [user.id,event.id,session.title ?? session.id,JSON.stringify({ sessionId, releasedBookingIds: bookings.map(booking => booking.id) })]);
    if (venueIds.length) {
      const audience = await captureEventAudience(client, event.id, notificationOptions, venueIds);
      await notifyEventChange(client, { changeId:audit.rows[0]!.id, occurredAt:audit.rows[0]!.occurred_at, actorId:user.id,
        before:audience, after:audience, change:{ kind:'session_deleted', sessionTitle:session.title ?? 'Untitled' } });
    }
    await client.query('DELETE FROM sessions WHERE id=$1 AND event_id=$2', [sessionId,event.id]);
    return { deletedSessionId: sessionId, releasedBookings: bookings.length };
  });
}

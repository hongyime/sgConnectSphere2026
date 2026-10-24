// E09-S06 / SCRUM-68, C-45: attendance is Event-level and never changes registration.
// Reuse the existing append-only event_attendance history; latest row is current.
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { canActAsRole } from '../accessControl/service.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError } from '../eventVisibility/service.js';

export function requireAttendanceCoordinator(user: AuthenticatedUser | undefined, identifier: string) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed)
    throw new AccessError(403, 'Only the assigned Event Coordinator can record attendance.');
  if (!identifier || identifier.length > 240) throw new AccessError(400, 'An event id or code is required.');
  return user;
}

export function parseAttendance(body: unknown) {
  const value = body as { registrationId?: unknown; attended?: unknown } | null;
  if (!value || typeof value.registrationId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.registrationId) ||
      typeof value.attended !== 'boolean')
    throw new AccessError(400, 'Choose a registered Attendee and an attendance value.');
  return { registrationId: value.registrationId, attended: value.attended };
}

type Event = { id: string; event_code: string | null; title: string; status: string; coordinator_id: string | null };
async function assigned(client: PoolClient, actor: AuthenticatedUser, identifier: string) {
  // Same Event -> Account order as #326 registration and #324 completion.
  // Readers also lock the event so the list/counts form one coherent snapshot.
  const event = (await client.query<Event>(`SELECT id,event_code,title,status,coordinator_id FROM events
    WHERE id::text=$1 OR event_code=$1 FOR UPDATE`, [identifier])).rows[0];
  if (!event || event.coordinator_id !== actor.id || event.status === 'draft')
    throw new AccessError(403, 'This event is not assigned to you.');
  const current = (await client.query(`SELECT id FROM users WHERE id=$1 AND role='event_coordinator'
    AND is_active AND failed_login_count < 5 AND (locked_until IS NULL OR locked_until <= now())
    FOR SHARE NOWAIT`, [actor.id])).rows[0];
  if (!current) throw new AccessError(403, 'Your Coordinator account is not available.');
  return event;
}
async function transaction<T>(database: Pool, work: (client: PoolClient) => Promise<T>) {
  try { return await inTransaction(database, work); }
  catch (error) {
    if ((error as { code?: string }).code === '55P03')
      throw new AccessError(409, 'Your account is being updated. Please try again.');
    throw error;
  }
}

export async function getAttendance(database: Pool, user: AuthenticatedUser | undefined, identifier: string) {
  const actor = requireAttendanceCoordinator(user, identifier);
  return transaction(database, async client => {
    const event = await assigned(client, actor, identifier);
    const attendees = (await client.query<{ registrationId: string; name: string; email: string; attended: boolean; recordedAt: Date | null }>(`
      SELECT r.id AS "registrationId",u.full_name AS name,u.email,
        COALESCE(a.attended,false) AS attended,a.recorded_at AS "recordedAt"
      FROM event_registrations r JOIN users u ON u.id=r.attendee_id
      LEFT JOIN LATERAL (SELECT attended,recorded_at FROM event_attendance
        WHERE registration_id=r.id ORDER BY recorded_at DESC,id DESC LIMIT 1) a ON true
      WHERE r.event_id=$1 AND r.status='registered' ORDER BY u.full_name,u.email,r.id`, [event.id])).rows;
    return { eventCode: event.event_code, title: event.title, status: event.status,
      canRecord: event.status === 'completed', registeredCount: attendees.length,
      attendedCount: attendees.filter(row => row.attended).length, attendees };
  });
}

export async function recordAttendance(database: Pool, user: AuthenticatedUser | undefined, identifier: string, body: unknown) {
  const actor = requireAttendanceCoordinator(user, identifier);
  const value = parseAttendance(body);
  return transaction(database, async client => {
    const event = await assigned(client, actor, identifier);
    if (event.status !== 'completed') throw new AccessError(409, 'Attendance can only be recorded after the event is Completed.');
    const registration = (await client.query(`SELECT id FROM event_registrations
      WHERE id=$1 AND event_id=$2 AND status='registered' FOR UPDATE`, [value.registrationId, event.id])).rows[0];
    if (!registration) throw new AccessError(409, 'This Attendee does not have a registered place in this event.');
    const previous = (await client.query<{ attended: boolean }>(`SELECT attended FROM event_attendance
      WHERE registration_id=$1 ORDER BY recorded_at DESC,id DESC LIMIT 1`, [value.registrationId])).rows[0];
    // A retry is a no-op, including false for a not-yet-recorded registration.
    if ((previous?.attended ?? false) === value.attended) return { ...value, changed: false };
    const entry = (await client.query<{ id: string }>(`INSERT INTO event_attendance(registration_id,attended,recorded_by,recorded_at)
      VALUES($1,$2,$3,clock_timestamp()) RETURNING id`, [value.registrationId, value.attended, actor.id])).rows[0];
    await client.query(`INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,'event_attendance',$2,$3,'Attendance recorded','attended',$4,$5)`,
      [actor.id, entry.id, event.id, String(previous?.attended ?? false), String(value.attended)]);
    return { ...value, changed: true };
  });
}

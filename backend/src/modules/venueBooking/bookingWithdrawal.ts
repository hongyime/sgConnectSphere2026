import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError } from '../eventVisibility/service.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from '../eventNotifications/service.js';

// T-94/T-95: withdrawal is a decision on one Pending request, never cancellation.
export async function withdrawBooking(database: Pool, user: AuthenticatedUser | undefined,
  body: unknown, options: NotificationOptions = {}) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) throw new AccessError(403, 'Only the assigned Event Coordinator can withdraw a venue request.');
  const id = body && typeof body === 'object' ? (body as Record<string, unknown>).booking_id : undefined;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new AccessError(400, 'A booking id is required.');
  try { return await inTransaction(database, async client => {
    // Initial visibility check takes no lock. The authority is rechecked below.
    const event = (await client.query<{ id: string; coordinator_id: string | null }>(
      `SELECT id,coordinator_id FROM events WHERE id=(SELECT event_id FROM venue_bookings WHERE id=$1)`, [id])).rows[0];
    if (!event || event.coordinator_id !== user.id) throw new AccessError(404, 'Assigned booking request not found.');
    // Match E06-S04 and the occupancy guard: Venue, then Booking.
    await client.query('SELECT v.id FROM venues v JOIN venue_bookings b ON b.venue_id=v.id WHERE b.id=$1 FOR NO KEY UPDATE OF v', [id]);
    const booking = (await client.query<{ id: string; event_id: string; venue_id: string; status: string }>(
      'SELECT id,event_id,venue_id,status FROM venue_bookings WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!booking || booking.event_id !== event.id) throw new AccessError(404, 'Assigned booking request not found.');
    // Submission/reassignment may lock Event before Venue. Never wait for their
    // event/account locks while holding Venue: refuse a busy event and refresh.
    const assigned = (await client.query('SELECT id FROM events WHERE id=$1 AND coordinator_id=$2 FOR SHARE NOWAIT', [event.id,user.id])).rows[0];
    if (!assigned) throw new AccessError(404, 'Assigned booking request not found.');
    const account = (await client.query<{ is_active: boolean; role: string; failed_login_count: number; locked_until: Date | null }>(
      'SELECT is_active,role,failed_login_count,locked_until FROM users WHERE id=$1 FOR SHARE NOWAIT', [user.id])).rows[0];
    if (!account?.is_active || account.role !== 'event_coordinator' || account.failed_login_count >= 5 || (account.locked_until && account.locked_until > new Date()))
      throw new AccessError(403, 'Your account cannot withdraw booking requests.');
    if (booking.status !== 'pending') throw new AccessError(409, 'Only Pending venue requests can be withdrawn. Refresh the booking list to see its current status.');
    await client.query("UPDATE venue_bookings SET status='released' WHERE id=$1", [id]);
    const auditId = randomUUID();
    await client.query(`INSERT INTO audit_logs(id,actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,$2,'venue_booking',$3,$4,'Booking Withdrawn','status','pending','released')`, [auditId,user.id,id,event.id]);
    const audience = await captureEventAudience(client, event.id, options, [booking.venue_id]);
    const occurredAt = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    const notice = await notifyEventChange(client, { changeId: auditId, occurredAt, actorId: user.id,
      before: audience, after: audience, change: { kind: 'booking_withdrawn' } });
    return { status: 200, body: { booking: { ...booking, status: 'released' }, unresolved_venue_ids: notice.unresolvedVenueIds } };
  }); } catch (error) {
    if ((error as { code?: string }).code === '55P03') throw new AccessError(409, 'A Venue Staff decision or an event or account update may be in progress. Refresh the booking list and try again.');
    throw error;
  }
}

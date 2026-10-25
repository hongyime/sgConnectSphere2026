import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError } from '../eventVisibility/service.js';

// E06-S03 Scenario 3c / T-78. E06-S04 owns the automatic first primary;
// explicit selection serializes on the same event lock as decideBooking.
export async function setPrimaryBooking(database: Pool, user: AuthenticatedUser | undefined, body: unknown) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) throw new AccessError(403, 'Only the assigned Event Coordinator can select a primary venue.');
  const id = body && typeof body === 'object' ? (body as Record<string, unknown>).booking_id : undefined;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new AccessError(400, 'A booking id is required.');
  try {
    return await inTransaction(database, async client => {
      const event = (await client.query<{ id: string; coordinator_id: string | null; status: string }>(
        'SELECT id,coordinator_id,status FROM events WHERE id=(SELECT event_id FROM venue_bookings WHERE id=$1) FOR NO KEY UPDATE', [id])).rows[0];
      if (!event || event.coordinator_id !== user.id) throw new AccessError(404, 'Assigned booking request not found.');
      const account = (await client.query<{ is_active: boolean; role: string; failed_login_count: number; locked_until: Date | null }>(
        'SELECT is_active,role,failed_login_count,locked_until FROM users WHERE id=$1 FOR SHARE NOWAIT', [user.id])).rows[0];
      if (!account?.is_active || account.role !== 'event_coordinator' || account.failed_login_count >= 5 || (account.locked_until && account.locked_until > new Date()))
        throw new AccessError(403, 'Your account cannot select a primary venue.');
      if (!['approved', 'planning', 'safety_review', 'confirmed'].includes(event.status))
        throw new AccessError(409, 'The primary venue can only be changed for an active approved Event. Refresh the booking list.');
      const rows = (await client.query<{ id: string; status: string; is_primary: boolean; name: string }>(
        `SELECT b.id,b.status,b.is_primary,v.name FROM venue_bookings b JOIN venues v ON v.id=b.venue_id
         WHERE b.event_id=$1 AND (b.id=$2 OR b.is_primary) ORDER BY b.id FOR UPDATE OF b`, [event.id,id])).rows;
      const selected = rows.find(row => row.id === id);
      if (!selected) throw new AccessError(404, 'Assigned booking request not found.');
      if (selected.status !== 'confirmed') throw new AccessError(409, 'Only Confirmed bookings can be the primary venue. Refresh the booking list.');
      const booking = { id, status: selected.status, is_primary: true };
      if (selected.is_primary) return { status: 200, body: { booking, replayed: true } };
      const previous = rows.find(row => row.is_primary);
      // Clear first to preserve the immediate unique index inside the transaction.
      await client.query('UPDATE venue_bookings SET is_primary=false WHERE event_id=$1 AND is_primary', [event.id]);
      await client.query('UPDATE venue_bookings SET is_primary=true WHERE id=$1', [id]);
      await client.query(`INSERT INTO audit_logs(id,actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
        VALUES($1,$2,'venue_booking',$3,$4,'Primary Venue Changed','primary_venue',$5,$6)`,
      [randomUUID(),user.id,id,event.id,previous?.name ?? null,selected.name]);
      return { status: 200, body: { booking, replayed: false } };
    });
  } catch (error) {
    if ((error as { code?: string }).code === '55P03') throw new AccessError(409, 'Your account is being updated. Refresh the booking list and try again.');
    throw error;
  }
}

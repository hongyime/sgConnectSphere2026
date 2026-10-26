import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError } from '../eventVisibility/service.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from '../eventNotifications/service.js';

// E10-S05: E05-S06 owns loss detection/reversion. Approval is the effective
// replacement boundary; retain the original row until the Coordinator cancels it.
export async function confirmLostVenueReplacement(client: PoolClient, bookingId: string, actorId: string,
  audit: { id: string; occurred_at: Date }) {
  const pair = (await client.query<{ event_id: string; old_id: string; old_venue: string; new_venue: string; was_primary: boolean }>(
    `SELECT n.event_id,o.id AS old_id,o.venue_id AS old_venue,n.venue_id AS new_venue,o.is_primary AS was_primary
     FROM venue_bookings n JOIN venue_bookings o ON o.id=n.replaces_booking_id AND o.event_id=n.event_id
     WHERE n.id=$1 AND n.status='confirmed' AND o.status='conflicting'
       AND o.conflict_block_id IS NOT NULL AND o.status_before_conflict IN ('pending','confirmed') FOR UPDATE OF o`, [bookingId])).rows[0];
  if (!pair) return;
  const before = await captureEventAudience(client, pair.event_id, {}, [pair.old_venue]);
  if (pair.was_primary) {
    await client.query('UPDATE venue_bookings SET is_primary=false WHERE id=$1', [pair.old_id]);
    await client.query('UPDATE venue_bookings SET is_primary=true WHERE id=$1', [bookingId]);
  }
  // Keep public Event name/dates unchanged. Only an actual confirmed primary
  // replacement may refresh an existing published venue while Event is Planning.
  await client.query(`UPDATE event_publications p SET venue_name=v.name,venue_location=v.location,published_at=now()
    FROM venue_bookings n JOIN venues v ON v.id=n.venue_id
    WHERE n.id=$1 AND n.is_primary AND p.event_id=n.event_id`, [bookingId]);
  const after = await captureEventAudience(client, pair.event_id, {}, [pair.new_venue]);
  await notifyEventChange(client, { changeId:audit.id,occurredAt:audit.occurred_at,actorId,before,after,
    change:{kind:'arrangements',fields:['venue']} });
}

export async function cancelLostVenueBooking(database: Pool, user: AuthenticatedUser | undefined, body: unknown,
  options: NotificationOptions = {}) {
  if (!user) throw new AccessError(401,'Sign in to continue.');
  if (!canActAsRole(user,['event_coordinator']).allowed) throw new AccessError(403,'Only the assigned Coordinator can cancel a lost venue booking.');
  const id = body && typeof body==='object' ? (body as Record<string,unknown>).booking_id : undefined;
  if (typeof id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new AccessError(400,'A booking id is required.');
  try { return await inTransaction(database,async client=>{
    const event=(await client.query<{id:string;coordinator_id:string|null;status:string}>(
      'SELECT id,coordinator_id,status FROM events WHERE id=(SELECT event_id FROM venue_bookings WHERE id=$1) FOR NO KEY UPDATE',[id])).rows[0];
    if(!event || event.coordinator_id!==user.id)throw new AccessError(404,'Assigned booking not found.');
    const account=(await client.query(`SELECT id FROM users WHERE id=$1 AND is_active AND role='event_coordinator'
      AND failed_login_count<5 AND (locked_until IS NULL OR locked_until<=clock_timestamp()) FOR SHARE NOWAIT`,[user.id])).rows[0];
    if(!account)throw new AccessError(403,'Your account cannot cancel this booking.');
    if(!['planning','approved','safety_review','confirmed'].includes(event.status))throw new AccessError(409,'This Event no longer permits venue recovery.');
    await client.query('SELECT v.id FROM venues v JOIN venue_bookings b ON b.venue_id=v.id WHERE b.id=$1 FOR NO KEY UPDATE OF v',[id]);
    const lost=(await client.query<{id:string;venue_id:string;status:string;conflict_block_id:string|null}>(
      'SELECT id,venue_id,status,conflict_block_id FROM venue_bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!lost || !lost.conflict_block_id || !['conflicting','released'].includes(lost.status))throw new AccessError(409,'Only a lost Conflicting booking can be cancelled here.');
    const replacement=(await client.query(`SELECT id FROM venue_bookings WHERE replaces_booking_id=$1 AND event_id=$2
      AND status='confirmed' AND NOT requires_reconfirmation FOR SHARE`,[id,event.id])).rows[0];
    if(!replacement)throw new AccessError(409,'Confirm a replacement before cancelling the original booking.');
    if(lost.status==='released')return {status:200,body:{booking:{id,status:'released'},replayed:true}};
    await client.query("UPDATE venue_bookings SET status='released',is_primary=false,expires_at=NULL WHERE id=$1",[id]);
    const auditId=randomUUID();
    const audit=(await client.query<{occurred_at:Date}>(`INSERT INTO audit_logs(id,actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
      VALUES($1,$2,'venue_booking',$3,$4,'Lost Venue Booking Cancelled','status','conflicting','released') RETURNING occurred_at`,
      [auditId,user.id,id,event.id])).rows[0];
    const audience=await captureEventAudience(client,event.id,options,[lost.venue_id]);
    await notifyEventChange(client,{changeId:auditId,occurredAt:audit.occurred_at,actorId:user.id,before:audience,after:audience,change:{kind:'lost_venue_cancelled'}});
    return {status:200,body:{booking:{id,status:'released'},replayed:false}};
  }); } catch(error){
    if((error as {code?:string}).code==='55P03')throw new AccessError(409,'The Event or account is being updated. Refresh and try again.');
    throw error;
  }
}

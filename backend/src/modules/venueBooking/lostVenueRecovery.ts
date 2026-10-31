import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError } from '../eventVisibility/service.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from '../eventNotifications/service.js';
import { enterSafetyReviewIfReady } from '../eventReadiness/autoSafetyReview.js';

// The Event lock held by callers serializes this chain with submission/decisions.
// Keep rejected rows and T-96's unique predecessor slot: retries extend the chain.
const REPLACEMENT_CHAIN = `WITH RECURSIVE replacement_chain AS (
  SELECT id,event_id,status,requires_reconfirmation FROM venue_bookings WHERE id=$1 AND event_id=$2
  UNION
  SELECT b.id,b.event_id,b.status,b.requires_reconfirmation FROM venue_bookings b
  JOIN replacement_chain parent ON b.replaces_booking_id=parent.id AND b.event_id=parent.event_id
  WHERE b.status<>'released'
)`;

export async function lostVenueRetryParent(client: PoolClient, originalId: string, eventId: string) {
  const leaf = (await client.query<{ id: string; status: string }>(`${REPLACEMENT_CHAIN}
    SELECT b.id,b.status FROM venue_bookings b JOIN replacement_chain c ON c.id=b.id
    WHERE NOT EXISTS (SELECT 1 FROM venue_bookings child WHERE child.replaces_booking_id=b.id AND child.status<>'released')
    LIMIT 1 FOR UPDATE OF b`, [originalId, eventId])).rows[0];
  if (!leaf || (leaf.id !== originalId && leaf.status !== 'rejected')) {
    throw new AccessError(409, 'A replacement request already exists for this booking.');
  }
  return leaf.id;
}

// E05-S06 owns loss detection/reversion. A suggested replacement can have rejected
// ancestors; find the nearest still-Conflicting lost booking on this same Event.
export async function confirmLostVenueReplacement(client: PoolClient, bookingId: string, actorId: string) {
  const pair = (await client.query<{
    event_id: string; old_id: string; old_venue: string; new_venue: string; new_venue_name: string; was_primary: boolean; new_primary: boolean;
  }>(`WITH RECURSIVE ancestors AS (
      SELECT id,event_id,replaces_booking_id,ARRAY[id] AS path FROM venue_bookings WHERE id=$1
      UNION ALL
      SELECT p.id,p.event_id,p.replaces_booking_id,a.path||p.id FROM venue_bookings p
      JOIN ancestors a ON p.id=a.replaces_booking_id AND p.event_id=a.event_id WHERE NOT p.id=ANY(a.path)
    )
    SELECT n.event_id,o.id AS old_id,o.venue_id AS old_venue,n.venue_id AS new_venue,
      o.is_primary AS was_primary,n.is_primary AS new_primary,v.name AS new_venue_name
    FROM venue_bookings n JOIN venues v ON v.id=n.venue_id
    JOIN ancestors a ON a.event_id=n.event_id JOIN venue_bookings o ON o.id=a.id
    WHERE n.id=$1 AND n.status='confirmed' AND o.status='conflicting'
      AND o.conflict_block_id IS NOT NULL AND o.status_before_conflict IN ('pending','confirmed')
    ORDER BY cardinality(a.path) LIMIT 1 FOR UPDATE OF o`, [bookingId])).rows[0];
  if (!pair) return;

  const before = await captureEventAudience(client, pair.event_id, {}, [pair.old_venue]);
  if (pair.was_primary) {
    await client.query('UPDATE venue_bookings SET is_primary=false WHERE id=$1', [pair.old_id]);
    await client.query('UPDATE venue_bookings SET is_primary=true WHERE id=$1', [bookingId]);
  }
  // An existing public venue changes only for a confirmed primary replacement.
  const publication = await client.query(`UPDATE event_publications p
    SET venue_name=v.name,venue_location=v.location,published_at=now()
    FROM venue_bookings n JOIN venues v ON v.id=n.venue_id
    WHERE n.id=$1 AND n.is_primary AND p.event_id=n.event_id
      AND (p.venue_name IS DISTINCT FROM v.name OR p.venue_location IS DISTINCT FROM v.location)
    RETURNING p.event_id`, [bookingId]);

  // This is a separate durable business change from Booking Approved. Sharing its
  // audit ID would deduplicate away the Coordinator's decision notice (T-64).
  const audit = (await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs
    (id,actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
    VALUES($1,$2,'venue_booking',$3,$4,'Lost Venue Replaced','venue_replacement',$5,$6) RETURNING id,occurred_at`,
  [randomUUID(), actorId, bookingId, pair.event_id,
    JSON.stringify({ booking_id: pair.old_id, venue_id: pair.old_venue, is_primary: pair.was_primary }),
    JSON.stringify({ booking_id: bookingId, venue_id: pair.new_venue, is_primary: pair.was_primary || pair.new_primary,
      publication_updated: !!publication.rowCount })])).rows[0];

  const after = await captureEventAudience(client, pair.event_id, {}, [pair.new_venue]);
  // Internal arrangements can change without changing the published venue.
  // Do not tell Attendees their public venue moved when a secondary room changed.
  if (!publication.rowCount) {
    before.registered = []; before.waitlisted = [];
    after.registered = []; after.waitlisted = [];
  }
  await notifyEventChange(client, {
    changeId: audit.id, occurredAt: audit.occurred_at, actorId, before, after,
    change: { kind: 'arrangements', fields: ['venue'], venueName: pair.new_venue_name },
  });
}

export async function cancelLostVenueBooking(
  database: Pool, user: AuthenticatedUser | undefined, body: unknown, options: NotificationOptions = {},
) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    throw new AccessError(403, 'Only the assigned Coordinator can cancel a lost venue booking.');
  }
  const id = body && typeof body === 'object' ? (body as Record<string, unknown>).booking_id : undefined;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new AccessError(400, 'A booking id is required.');
  }
  try {
    return await inTransaction(database, async client => {
      const event = (await client.query<{ id: string; coordinator_id: string | null; status: string }>(
        'SELECT id,coordinator_id,status FROM events WHERE id=(SELECT event_id FROM venue_bookings WHERE id=$1) FOR NO KEY UPDATE', [id])).rows[0];
      if (!event || event.coordinator_id !== user.id) throw new AccessError(404, 'Assigned booking not found.');
      const account = (await client.query(`SELECT id FROM users WHERE id=$1 AND is_active AND role='event_coordinator'
        AND failed_login_count<5 AND (locked_until IS NULL OR locked_until<=clock_timestamp()) FOR SHARE NOWAIT`, [user.id])).rows[0];
      if (!account) throw new AccessError(403, 'Your account cannot cancel this booking.');
      if (!['planning', 'approved', 'safety_review', 'confirmed'].includes(event.status)) {
        throw new AccessError(409, 'This Event no longer permits venue recovery.');
      }
      await client.query('SELECT v.id FROM venues v JOIN venue_bookings b ON b.venue_id=v.id WHERE b.id=$1 FOR NO KEY UPDATE OF v', [id]);
      const lost = (await client.query<{ id: string; venue_id: string; status: string; conflict_block_id: string | null }>(
        'SELECT id,venue_id,status,conflict_block_id FROM venue_bookings WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!lost || !lost.conflict_block_id || !['conflicting', 'released'].includes(lost.status)) {
        throw new AccessError(409, 'Only a lost Conflicting booking can be cancelled here.');
      }
      const replacement = (await client.query(`${REPLACEMENT_CHAIN}
        SELECT b.id FROM venue_bookings b JOIN replacement_chain c ON c.id=b.id
        WHERE b.id<>$1 AND b.status='confirmed' AND NOT b.requires_reconfirmation LIMIT 1 FOR SHARE OF b`, [id, event.id])).rows[0];
      if (!replacement) throw new AccessError(409, 'Confirm a replacement before cancelling the original booking.');
      if (lost.status === 'released') return { status: 200, body: { booking: { id, status: 'released' }, replayed: true } };

      await client.query("UPDATE venue_bookings SET status='released',is_primary=false,expires_at=NULL WHERE id=$1", [id]);
      const audit = (await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs
        (id,actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
        VALUES($1,$2,'venue_booking',$3,$4,'Lost Venue Booking Cancelled','status','conflicting','released') RETURNING id,occurred_at`,
      [randomUUID(), user.id, id, event.id])).rows[0];
      const audience = await captureEventAudience(client, event.id, options, [lost.venue_id]);
      await notifyEventChange(client, {
        changeId: audit.id, occurredAt: audit.occurred_at, actorId: user.id, before: audience, after: audience,
        change: { kind: 'lost_venue_cancelled' },
      });
      // E08-S04 Scenario 4 (SCRUM-242): a replacement must already be confirmed,
      // so releasing the lost booking is the last venue step after a venue loss.
      const enteredSafetyReview = await enterSafetyReviewIfReady(client, event.id, user.id);
      return { status: 200, body: { booking: { id, status: 'released' }, replayed: false, enteredSafetyReview } };
    });
  } catch (error) {
    if ((error as { code?: string }).code === '55P03') {
      throw new AccessError(409, 'The Event or account is being updated. Refresh and try again.');
    }
    throw error;
  }
}

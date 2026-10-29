import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, updateEventInformation, type Query } from '../eventVisibility/service.js';
import { assertEditableAfterDecision } from '../eventLifecycle/decision.js';
import { eventCapacity, type EventCapacity } from '../attendeeRegistration/capacity.js';
import { assessArrangementImpact, loadArrangementSnapshot, type ArrangementImpact } from './arrangementImpact.js';

// E10-S02 Scenario 4 (T-85, C-78, B-11): approved registrations measured
// against E09-S02's eventCapacity(), so this warning and registration
// enforcement never disagree (B-05). Capacity 0 means no Confirmed booking
// yet, so there is nothing to compare. Only strictly above capacity warns:
// exactly full is not over-subscribed. Nobody is removed or waitlisted (C-05).
export type OverSubscription = { scope: 'session' | 'event'; sessionId: string | null; registered: number; capacity: number };

export function assessOverSubscription(capacity: EventCapacity): OverSubscription[] {
  const over: OverSubscription[] = capacity.sessions
    .filter(session => session.capacity > 0 && session.registered > session.capacity)
    .map(session => ({ scope: 'session', sessionId: session.sessionId, registered: session.registered, capacity: session.capacity }));
  if (capacity.capacity > 0 && capacity.registered > capacity.capacity)
    over.push({ scope: 'event', sessionId: null, registered: capacity.registered, capacity: capacity.capacity });
  return over;
}

export async function loadOverSubscription(query: Query, eventId: string): Promise<OverSubscription[]> {
  return assessOverSubscription(await eventCapacity(query, eventId));
}

export type EventChangePreview = { impact: ArrangementImpact; overSubscription: OverSubscription[] };

const reasonText = { time: 'date or time changed', capacity: 'attendance above capacity' } as const;

// Scenarios 1 and 5: flag what the saved change affected, in the edit's own
// transaction, with one activity entry per arrangement naming why. The flag
// is what readiness already shows as "needs review"; staff clear it when
// they reconfirm (E06-S04, E07-S04).
export async function applyArrangementImpact(query: Query, actorId: string, eventId: string, impact: ArrangementImpact): Promise<void> {
  if (impact.bookings.length)
    await query('UPDATE venue_bookings SET requires_reconfirmation = true WHERE id = ANY($1::uuid[])', [impact.bookings.map(booking => booking.id)]);
  if (impact.reservations.length)
    await query('UPDATE equipment_reservations SET requires_reconfirmation = true WHERE id = ANY($1::uuid[])', [impact.reservations.map(reservation => reservation.id)]);
  const entries = [
    ...impact.bookings.map(booking => ({ type: 'venue_booking', item: booking })),
    ...impact.reservations.map(reservation => ({ type: 'equipment_reservation', item: reservation })),
  ];
  for (const { type, item } of entries) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
      VALUES ($1, $2, $3, $4, $5, 'requires_reconfirmation', 'true')`,
    [actorId, type, item.id, eventId, `Reconfirmation required: ${item.reasons.map(reason => reasonText[reason]).join(', ')}`]);
  }
}

// Scenario 3: show the affected arrangements before the change takes effect.
// The edit runs for real inside a savepoint, so its validation, permissions
// and the Session sync trigger all apply, and is then rolled back: nothing a
// preview does is saved, audited or notified.
export async function previewEventChangeWith(client: PoolClient, user: AuthenticatedUser, identifier: string, input: unknown): Promise<EventChangePreview> {
  const event = (await client.query<{ id: string }>(
    'SELECT id FROM events WHERE id::text=$1 OR event_code=$1 FOR UPDATE', [identifier])).rows[0];
  if (!event) throw new AccessError(403, 'Edit access denied.');
  const query: Query = (sql, values) => client.query(sql, values);
  await assertEditableAfterDecision(query, user, event.id);
  const before = await loadArrangementSnapshot(query, event.id);
  await client.query('SAVEPOINT event_change_preview');
  try {
    await updateEventInformation(query, user, identifier, input);
    const after = await loadArrangementSnapshot(query, event.id);
    return { impact: assessArrangementImpact(before, after), overSubscription: await loadOverSubscription(query, event.id) };
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT event_change_preview');
  }
}

export async function previewEventChange(pool: Pool, user: AuthenticatedUser, identifier: string, input: unknown) {
  return inTransaction(pool, client => previewEventChangeWith(client, user, identifier, input));
}

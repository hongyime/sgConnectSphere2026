import { createHash } from 'node:crypto';
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

export type EventChangeCheck = { impact: ArrangementImpact; overSubscription: OverSubscription[] };
export type EventChangePreview = EventChangeCheck & { revision: string };

// #380 review: a fingerprint of exactly what the preview shows. The save
// passes it back and is refused when its own result differs, so nothing the
// Coordinator did not see is flagged, notified or warned about. Both sides
// build the check with the same functions and the same ORDER BY, so equal
// arrangements give equal JSON.
export function changeRevision(check: EventChangeCheck): string {
  return createHash('sha256').update(JSON.stringify([check.impact, check.overSubscription])).digest('hex').slice(0, 32);
}

// 409 with the fresh check, so the screen can show it for a new review.
export class ArrangementsChangedError extends AccessError {
  constructor(public preview: EventChangePreview) { super(409, 'arrangements_changed'); }
}

export function withRevision(check: EventChangeCheck): EventChangePreview {
  return { ...check, revision: changeRevision(check) };
}

const reasonText = { time: 'date or time changed', capacity: 'attendance above capacity', layout: 'room layout changed', accessibility: 'accessibility requirements changed' } as const;

// Scenarios 1 and 5: flag what the saved change affected, in the edit's own
// transaction, with one activity entry per arrangement naming why. The flag
// is what readiness already shows as "needs review"; Venue Staff clear it by
// reconfirming the booking (E08-S04) and Technical Support by re-reserving (E07-S04)
// or by reconfirming a support request at the new time (T-103).
export async function applyArrangementImpact(query: Query, actorId: string, eventId: string, impact: ArrangementImpact): Promise<void> {
  if (impact.bookings.length)
    await query('UPDATE venue_bookings SET requires_reconfirmation = true WHERE id = ANY($1::uuid[])', [impact.bookings.map(booking => booking.id)]);
  if (impact.reservations.length)
    await query('UPDATE equipment_reservations SET requires_reconfirmation = true WHERE id = ANY($1::uuid[])', [impact.reservations.map(reservation => reservation.id)]);
  // T-103: the time a support request moves to is kept until it is
  // reconfirmed. Moved again while still flagged, it moves on from that time.
  if (impact.supports.length)
    await query(`UPDATE tech_support_requests r SET requires_reconfirmation = true,
        reconfirm_range = (SELECT tstzrange(lower(base) + moved, upper(base) + moved, '[)') FROM (SELECT
          CASE WHEN r.requires_reconfirmation AND r.reconfirm_range IS NOT NULL THEN r.reconfirm_range ELSE r.support_range END AS base,
          s.shift_ms * interval '1 millisecond' AS moved) target)
      FROM unnest($1::uuid[], $2::float8[]) AS s(id, shift_ms)
      WHERE r.id = s.id`, [impact.supports.map(support => support.id), impact.supports.map(support => support.shiftMs)]);
  const entries = [
    ...impact.bookings.map(booking => ({ type: 'venue_booking', item: booking })),
    ...impact.reservations.map(reservation => ({ type: 'equipment_reservation', item: reservation })),
    ...impact.supports.map(support => ({ type: 'tech_support_request', item: support })),
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
export async function previewEventChangeWith(client: PoolClient, user: AuthenticatedUser, identifier: string, input: unknown,
  approvedChangeRequest = false): Promise<EventChangePreview> {
  const event = (await client.query<{ id: string }>(
    'SELECT id FROM events WHERE id::text=$1 OR event_code=$1 FOR UPDATE', [identifier])).rows[0];
  if (!event) throw new AccessError(403, 'Edit access denied.');
  const query: Query = (sql, values) => client.query(sql, values);
  await assertEditableAfterDecision(query, user, event.id);
  const before = await loadArrangementSnapshot(query, event.id);
  await client.query('SAVEPOINT event_change_preview');
  try {
    await updateEventInformation(query, user, identifier, input, approvedChangeRequest);
    const after = await loadArrangementSnapshot(query, event.id);
    return withRevision({ impact: assessArrangementImpact(before, after), overSubscription: await loadOverSubscription(query, event.id) });
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT event_change_preview');
  }
}

export async function previewEventChange(pool: Pool, user: AuthenticatedUser, identifier: string, input: unknown) {
  return inTransaction(pool, client => previewEventChangeWith(client, user, identifier, input));
}

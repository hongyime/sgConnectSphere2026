import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, updateEventInformation, type Query } from '../eventVisibility/service.js';
import { assertEditableAfterDecision } from '../eventLifecycle/decision.js';
import { assessArrangementImpact, loadArrangementSnapshot, type ArrangementImpact, type ArrangementSnapshot } from './arrangementImpact.js';

// E10-S02 Scenario 4 (T-85, C-78): approved registrations measured against
// each Session's capacity (its Confirmed bookings' layout capacity) and the
// Event's combined capacity (every Confirmed booking). A Session or Event
// with no Confirmed booking has no capacity yet, so it is not compared.
export type RegistrationCounts = { event: number; sessions: Record<string, number> };
export type OverSubscription = { scope: 'session' | 'event'; sessionId: string | null; registered: number; capacity: number };

export function assessOverSubscription(snapshot: ArrangementSnapshot, counts: RegistrationCounts): OverSubscription[] {
  const capacities = new Map<string, number>();
  for (const booking of snapshot.bookings) {
    if (booking.sessionId) capacities.set(booking.sessionId, (capacities.get(booking.sessionId) ?? 0) + booking.capacity);
  }
  const over: OverSubscription[] = [];
  for (const session of snapshot.sessions) {
    const capacity = capacities.get(session.id);
    const registered = counts.sessions[session.id] ?? 0;
    if (capacity !== undefined && registered > capacity) over.push({ scope: 'session', sessionId: session.id, registered, capacity });
  }
  const combined = snapshot.bookings.reduce((total, booking) => total + booking.capacity, 0);
  if (snapshot.bookings.length && counts.event > combined) over.push({ scope: 'event', sessionId: null, registered: counts.event, capacity: combined });
  return over;
}

// Only Registered places are approved seats; Pending ones await the
// Organiser and never hold a place (T-85), and nobody is removed here.
export async function loadRegistrationCounts(query: Query, eventId: string): Promise<RegistrationCounts> {
  const event = (await query<{ count: string }>(
    "SELECT count(*) AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'", [eventId])).rows[0];
  const sessions = (await query<{ session_id: string; count: string }>(
    `SELECT rs.session_id, count(*) AS count FROM event_registration_sessions rs
     JOIN event_registrations r ON r.id = rs.registration_id
     WHERE rs.event_id = $1 AND r.status = 'registered' GROUP BY rs.session_id`, [eventId])).rows;
  return { event: Number(event?.count ?? 0), sessions: Object.fromEntries(sessions.map(row => [row.session_id, Number(row.count)])) };
}

export type EventChangePreview = { impact: ArrangementImpact; overSubscription: OverSubscription[] };

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
    const counts = await loadRegistrationCounts(query, event.id);
    return { impact: assessArrangementImpact(before, after), overSubscription: assessOverSubscription(after, counts) };
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT event_change_preview');
  }
}

export async function previewEventChange(pool: Pool, user: AuthenticatedUser, identifier: string, input: unknown) {
  return inTransaction(pool, client => previewEventChangeWith(client, user, identifier, input));
}

import type { Query } from '../eventVisibility/service.js';

// E09-S02 capacity, shared with E10-S02 so a change warning and registration
// enforcement never disagree. A Session's capacity is the sum of its Confirmed
// bookings, each at the Session's layout capacity for that venue, falling back
// to the venue's maximum when the venue doesn't list that layout (C-78, T-85).
// The Event's capacity is the sum across its Sessions (TC_E09S02_12). Only
// 'registered' rows take a place; Pending, waitlisted, withdrawn and rejected
// rows don't (T-85).

export type SessionCapacity = { sessionId: string; capacity: number; registered: number };
export type EventCapacity = { capacity: number; registered: number; sessions: SessionCapacity[] };

export async function eventCapacity(query: Query, eventId: string): Promise<EventCapacity> {
  const sessions = ((await query(`SELECT s.id AS session_id,
      coalesce((SELECT sum(coalesce(vl.capacity, v.max_capacity)) FROM venue_bookings b
        JOIN venues v ON v.id = b.venue_id
        LEFT JOIN venue_supported_layouts vl ON vl.venue_id = b.venue_id AND vl.layout_id = s.layout_id
        WHERE b.session_id = s.id AND b.status = 'confirmed'), 0)::int AS session_capacity,
      (SELECT count(*) FROM event_registration_sessions rs JOIN event_registrations r ON r.id = rs.registration_id
        WHERE rs.session_id = s.id AND r.status = 'registered')::int AS registered
    FROM sessions s WHERE s.event_id = $1
    ORDER BY lower(s.session_range), s.id`, [eventId])).rows as { session_id: string; session_capacity: number; registered: number }[])
    .map(row => ({ sessionId: row.session_id, capacity: row.session_capacity, registered: row.registered }));
  const registered = ((await query(`SELECT count(*)::int AS registered FROM event_registrations
    WHERE event_id = $1 AND status = 'registered'`, [eventId])).rows[0] as { registered: number }).registered;
  return { capacity: sessions.reduce((sum, session) => sum + session.capacity, 0), registered, sessions };
}

// Why one more place in each chosen Session and in the Event would not fit, or
// null when it fits. Session names come from the caller's own list.
export function overCapacity(capacity: EventCapacity, sessionIds: string[], names: Map<string, string> = new Map()) {
  const full = capacity.sessions.filter(session => sessionIds.includes(session.sessionId) && session.registered >= session.capacity);
  if (full.length) {
    return full.map(session => `${names.get(session.sessionId) ?? 'A chosen Session'} is full (${session.registered} of ${session.capacity} places).`).join(' ');
  }
  if (capacity.registered >= capacity.capacity) return `The event is full (${capacity.registered} of ${capacity.capacity} places).`;
  return null;
}

export function fullSessionIds(capacity: EventCapacity) {
  return capacity.sessions.filter(session => session.registered >= session.capacity).map(session => session.sessionId);
}

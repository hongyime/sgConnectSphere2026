import type { Query } from '../eventVisibility/service.js';

// E10-S02 (SCRUM-71): which confirmed Session arrangements an Event edit
// affects. Read the Event before and after the edit in the same transaction
// and compare: the database keeps a sole Session in step with Event edits
// (migration 0014), so a single-session Event needs no special case here.

export type SessionState = { id: string; startsAt: string; endsAt: string; expectedAttendance: number };
export type BookingState = { id: string; sessionId: string | null; venueId: string; venueName: string; headcount: number | null; capacity: number };
export type ReservationState = { id: string; sessionId: string | null; equipmentId: string; equipmentName: string };
export type ArrangementSnapshot = {
  event: { startsAt: string; endsAt: string };
  sessions: SessionState[];
  bookings: BookingState[];
  reservations: ReservationState[];
};

export type ImpactReason = 'time' | 'capacity';
export type AffectedBooking = { id: string; sessionId: string | null; venueId: string; venueName: string; reasons: ImpactReason[]; governingHeadcount: number | null; capacity: number };
export type AffectedReservation = { id: string; sessionId: string | null; equipmentId: string; equipmentName: string; reasons: ImpactReason[] };
export type ArrangementImpact = { affected: boolean; bookings: AffectedBooking[]; reservations: AffectedReservation[] };

// T-78/T-79: a booking's own headcount governs; without one, its Session's
// expected attendance does. Null when the Session cannot be found.
export function governingHeadcount(booking: BookingState, session: SessionState | undefined): number | null {
  return booking.headcount ?? session?.expectedAttendance ?? null;
}

export function assessArrangementImpact(before: ArrangementSnapshot, after: ArrangementSnapshot): ArrangementImpact {
  // Scenario 5: an Event-wide date/time change flags every Session's arrangements.
  const eventMoved = before.event.startsAt !== after.event.startsAt || before.event.endsAt !== after.event.endsAt;
  const previous = new Map(before.sessions.map(session => [session.id, session]));
  const current = new Map(after.sessions.map(session => [session.id, session]));
  const moved = (sessionId: string | null) => {
    if (eventMoved) return true;
    const was = sessionId ? previous.get(sessionId) : undefined;
    const now = sessionId ? current.get(sessionId) : undefined;
    return !!was && !!now && (was.startsAt !== now.startsAt || was.endsAt !== now.endsAt);
  };
  const attendanceChanged = (sessionId: string | null) => {
    const was = sessionId ? previous.get(sessionId) : undefined;
    const now = sessionId ? current.get(sessionId) : undefined;
    return !!was && !!now && was.expectedAttendance !== now.expectedAttendance;
  };

  const bookings: AffectedBooking[] = [];
  for (const booking of after.bookings) {
    const session = booking.sessionId ? current.get(booking.sessionId) : undefined;
    const headcount = governingHeadcount(booking, session);
    const reasons: ImpactReason[] = [];
    if (moved(booking.sessionId)) reasons.push('time');
    // Scenario 1: only a booking governed by the Session attendance can be
    // pushed over capacity by an attendance change, and only strictly above
    // it; a venue holding exactly the headcount is still sufficient (E05-S01).
    if (booking.headcount === null && attendanceChanged(booking.sessionId) && headcount !== null && headcount > booking.capacity) reasons.push('capacity');
    if (reasons.length) bookings.push({ id: booking.id, sessionId: booking.sessionId, venueId: booking.venueId, venueName: booking.venueName, reasons, governingHeadcount: headcount, capacity: booking.capacity });
  }
  const reservations: AffectedReservation[] = after.reservations
    .filter(reservation => moved(reservation.sessionId))
    .map(reservation => ({ ...reservation, reasons: ['time'] }));
  return { affected: bookings.length > 0 || reservations.length > 0, bookings, reservations };
}

const iso = (value: Date | string) => new Date(value).toISOString();

// Only live arrangements can need reconfirmation: Confirmed venue bookings and
// reserved (or partly reserved) equipment. Pending requests are still to be
// decided, and released or rejected ones no longer hold anything.
export async function loadArrangementSnapshot(query: Query, eventId: string): Promise<ArrangementSnapshot> {
  const event = (await query<{ starts_at: Date; ends_at: Date }>(
    'SELECT lower(event_range) AS starts_at, upper(event_range) AS ends_at FROM events WHERE id = $1', [eventId])).rows[0];
  if (!event) throw new Error(`Event ${eventId} not found for arrangement impact.`);
  const sessions = (await query<{ id: string; starts_at: Date; ends_at: Date; expected_attendance: number }>(
    `SELECT id, lower(session_range) AS starts_at, upper(session_range) AS ends_at, expected_attendance
     FROM sessions WHERE event_id = $1 ORDER BY lower(session_range), id`, [eventId])).rows;
  // A Session layout supported by the venue sets the capacity; otherwise the
  // venue's maximum does, as in the E06 suitability assessment.
  const bookings = (await query<{ id: string; session_id: string | null; venue_id: string; venue_name: string; headcount: number | null; capacity: number }>(
    `SELECT b.id, b.session_id, b.venue_id, v.name AS venue_name, b.headcount,
       COALESCE(l.capacity, v.max_capacity) AS capacity
     FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
     LEFT JOIN sessions s ON s.id = b.session_id
     LEFT JOIN venue_supported_layouts l ON l.venue_id = b.venue_id AND l.layout_id = s.layout_id
     WHERE b.event_id = $1 AND b.status = 'confirmed' ORDER BY b.id`, [eventId])).rows;
  const reservations = (await query<{ id: string; session_id: string | null; equipment_id: string; equipment_name: string }>(
    `SELECT r.id, r.session_id, r.equipment_id, e.name AS equipment_name
     FROM equipment_reservations r JOIN equipment e ON e.id = r.equipment_id
     WHERE r.event_id = $1 AND r.status IN ('reserved', 'partial') ORDER BY r.id`, [eventId])).rows;
  return {
    event: { startsAt: iso(event.starts_at), endsAt: iso(event.ends_at) },
    sessions: sessions.map(row => ({ id: row.id, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), expectedAttendance: row.expected_attendance })),
    bookings: bookings.map(row => ({ id: row.id, sessionId: row.session_id, venueId: row.venue_id, venueName: row.venue_name, headcount: row.headcount, capacity: row.capacity })),
    reservations: reservations.map(row => ({ id: row.id, sessionId: row.session_id, equipmentId: row.equipment_id, equipmentName: row.equipment_name })),
  };
}

import type { Query } from '../eventVisibility/service.js';

// E10-S02 (SCRUM-71): which confirmed Session arrangements an Event edit
// affects. Read the Event before and after the edit in the same transaction
// and compare: the database keeps a sole Session in step with Event edits
// (migration 0014), so a single-session Event needs no special case here.

export type SessionState = { id: string; startsAt: string; endsAt: string; expectedAttendance: number };
export type BookingState = { id: string; sessionId: string | null; venueId: string; venueName: string; headcount: number | null; capacity: number };
export type ReservationState = { id: string; sessionId: string | null; equipmentId: string; equipmentName: string };
export type SupportState = { id: string; description: string; startsAt: string; endsAt: string };
export type ArrangementSnapshot = {
  event: { startsAt: string; endsAt: string; layoutId?: string | null; accessibilityFeatureIds?: string[] };
  sessions: SessionState[];
  bookings: BookingState[];
  reservations: ReservationState[];
  supports?: SupportState[];
};

export type ImpactReason = 'time' | 'capacity' | 'layout' | 'accessibility';
export type AffectedBooking = { id: string; sessionId: string | null; venueId: string; venueName: string; reasons: ImpactReason[]; governingHeadcount: number | null; capacity: number };
export type AffectedReservation = { id: string; sessionId: string | null; equipmentId: string; equipmentName: string; reasons: ImpactReason[] };
// shiftMs: how far the request moves when reconfirmed, keeping its length.
export type AffectedSupport = SupportState & { reasons: ImpactReason[]; shiftMs: number };
export type ArrangementImpact = { affected: boolean; bookings: AffectedBooking[]; reservations: AffectedReservation[]; supports: AffectedSupport[] };

// T-78/T-79: a booking's own headcount governs; without one, its Session's
// expected attendance does. Null when the Session cannot be found.
export function governingHeadcount(booking: BookingState, session: SessionState | undefined): number | null {
  return booking.headcount ?? session?.expectedAttendance ?? null;
}

export function assessArrangementImpact(before: ArrangementSnapshot, after: ArrangementSnapshot): ArrangementImpact {
  // Scenario 5: an Event-wide date/time change flags every Session's arrangements.
  const eventMoved = before.event.startsAt !== after.event.startsAt || before.event.endsAt !== after.event.endsAt;
  // T-16: changed Event requirements need venue reconfirmation even where
  // suitability remains advisory. Do not cancel or rewrite any booking.
  const layoutChanged = before.event.layoutId !== after.event.layoutId;
  const accessibilityChanged = JSON.stringify(before.event.accessibilityFeatureIds ?? []) !== JSON.stringify(after.event.accessibilityFeatureIds ?? []);
  const previousBookings = new Map(before.bookings.map(booking => [booking.id, booking]));
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
    if (layoutChanged) reasons.push('layout');
    if (accessibilityChanged) reasons.push('accessibility');
    // Scenario 1: when a Session's attendance changes, flag each of its
    // bookings whose governing headcount (its own, else the Session's) is
    // strictly above capacity, including one whose own headcount already was
    // (story owner's reading of the AC, 29 Oct). Exactly full is still
    // sufficient (E05-S01).
    if ((attendanceChanged(booking.sessionId) || previousBookings.get(booking.id)?.capacity !== booking.capacity) && headcount !== null && headcount > booking.capacity) reasons.push('capacity');
    if (reasons.length) bookings.push({ id: booking.id, sessionId: booking.sessionId, venueId: booking.venueId, venueName: booking.venueName, reasons, governingHeadcount: headcount, capacity: booking.capacity });
  }
  const reservations: AffectedReservation[] = after.reservations
    .filter(reservation => moved(reservation.sessionId))
    .map(reservation => ({ ...reservation, reasons: ['time'] }));
  // T-103: support requests keep their own window (T-79), not a Session's. An
  // Event-wide change flags every staffed request and moves it as far as the
  // Event start moved; a Session change flags those overlapping the Session's
  // previous time (touching ends do not overlap) and moves them as far as that
  // Session's start moved, the earliest such Session when several did (Le Xin,
  // 31 Oct). Sessions are read in time order.
  const shift = (from: string, to: string) => Date.parse(to) - Date.parse(from);
  const movedSessions = before.sessions.filter(session => moved(session.id));
  const supports: AffectedSupport[] = (after.supports ?? []).flatMap(support => {
    if (eventMoved) return [{ ...support, reasons: ['time'], shiftMs: shift(before.event.startsAt, after.event.startsAt) }];
    const session = movedSessions.find(was => support.startsAt < was.endsAt && was.startsAt < support.endsAt);
    return session ? [{ ...support, reasons: ['time'], shiftMs: shift(session.startsAt, current.get(session.id)!.startsAt) }] : [];
  });
  return { affected: bookings.length > 0 || reservations.length > 0 || supports.length > 0, bookings, reservations, supports };
}

const iso = (value: Date | string) => new Date(value).toISOString();

// Only live arrangements can need reconfirmation: Confirmed venue bookings,
// reserved (or partly reserved) equipment and staffed support requests.
// Pending requests are still to be decided, released or rejected ones no
// longer hold anything, and an open support request is already outstanding.
export async function loadArrangementSnapshot(query: Query, eventId: string): Promise<ArrangementSnapshot> {
  const event = (await query<{ starts_at: Date; ends_at: Date; layout_id: string | null; accessibility_feature_ids: string[] }>(
    `SELECT lower(event_range) AS starts_at, upper(event_range) AS ends_at, layout_id,
      ARRAY(SELECT feature_id::text FROM event_accessibility_needs WHERE event_id=events.id ORDER BY feature_id) AS accessibility_feature_ids
     FROM events WHERE id = $1`, [eventId])).rows[0];
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
  // The edit never moves a support request, so its window reads the same
  // before and after; the Session's previous time decides overlap.
  const supports = (await query<{ id: string; description: string; starts_at: Date; ends_at: Date }>(
    `SELECT id, coalesce(support_description, '') AS description, lower(support_range) AS starts_at, upper(support_range) AS ends_at
     FROM tech_support_requests WHERE event_id = $1 AND status = 'staffed' ORDER BY lower(support_range), id`, [eventId])).rows;
  return {
    event: { startsAt: iso(event.starts_at), endsAt: iso(event.ends_at), layoutId: event.layout_id ?? null, accessibilityFeatureIds: event.accessibility_feature_ids ?? [] },
    sessions: sessions.map(row => ({ id: row.id, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), expectedAttendance: row.expected_attendance })),
    bookings: bookings.map(row => ({ id: row.id, sessionId: row.session_id, venueId: row.venue_id, venueName: row.venue_name, headcount: row.headcount, capacity: row.capacity })),
    reservations: reservations.map(row => ({ id: row.id, sessionId: row.session_id, equipmentId: row.equipment_id, equipmentName: row.equipment_name })),
    supports: supports.map(row => ({ id: row.id, description: row.description, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at) })),
  };
}

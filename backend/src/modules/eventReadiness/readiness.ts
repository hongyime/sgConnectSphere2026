// E08-S03 (SCRUM-60) Scenarios 1 to 5: is the event ready for its
// Operational Safety Check?
//
// - Venue (Scenario 2, O-28): every booking is Confirmed or withdrawn, and at
//   least one is Confirmed. Pending and Conflicting block, and so do a live
//   tentative hold (D61), a buffer conflict (D69) and a Confirmed booking
//   flagged for reconfirmation after a capacity cut. Rejected, released and
//   expired bookings, and holds past their expiry, count as withdrawn.
// - Equipment (Scenarios 3 and 4): every E07-S02 request line has a full,
//   unflagged reservation. A partial, missing or released reservation blocks
//   with the outstanding quantity; a flagged one blocks as "needs review"
//   (D61). An event with no request lines passes, whether its equipment was
//   recorded as 'none required' or as free text (D61).
// - Support (Scenario 5): no required support request is still open, and
//   none is flagged for reconfirmation after a date change (E10-S02, T-103).
//
// The check covers the whole event, whatever Session a booking belongs to
// (D70). The rows are read by loadReadiness() and judged by the pure
// assessReadiness(), so the rules are unit-tested without a database and the
// submission re-runs the same check inside its transaction.
import { NONE_REQUIRED } from '../eventLifecycle/service.js';
import type { Query } from '../eventVisibility/service.js';
import type {
  EventReadinessSnapshot, ReadinessBlocker, ReadinessEquipmentLine, ReadinessSupportRequest,
  ReadinessVenueBooking, VenueBookingIssue,
} from './types.js';

export type ReadinessEventRow = {
  id: string; event_code: string | null; title: string; status: string;
  starts_at: Date; ends_at: Date; equipment_requirements: string | null;
};
export type ReadinessBookingRow = {
  id: string; venue_name: string; status: string; purpose: string | null; starts_at: Date; ends_at: Date;
  buffer_conflict: boolean; requires_reconfirmation: boolean; live_hold: boolean;
};
export type ReadinessEquipmentRow = {
  id: string; name: string; requested: number;
  reservation_status: string | null; reserved: number | null; requires_reconfirmation: boolean | null;
};
export type ReadinessSupportRow = {
  id: string; support_required: boolean; description: string; starts_at: Date; ends_at: Date; status: string;
  requires_reconfirmation: boolean;
};

export const NO_CONFIRMED_VENUE = 'No venue booking is Confirmed yet.';

const VENUE_ISSUE_TEXT: Record<VenueBookingIssue, string> = {
  pending: 'Pending',
  conflicting: 'Conflicting',
  buffer_conflict: 'Conflicting (setup or turnaround overlap)',
  tentative_hold: 'tentative hold; request it or let it go',
  needs_review: 'needs review: its capacity is now below the expected attendance',
};

function venueIssue(row: ReadinessBookingRow): VenueBookingIssue | 'ready' | 'withdrawn' {
  if (row.status === 'confirmed') {
    if (row.buffer_conflict) return 'buffer_conflict';
    return row.requires_reconfirmation ? 'needs_review' : 'ready';
  }
  if (row.status === 'pending') return row.buffer_conflict ? 'buffer_conflict' : 'pending';
  if (row.status === 'conflicting') return 'conflicting';
  if (row.status === 'tentative' && row.live_hold) return 'tentative_hold';
  return 'withdrawn';
}

// Long support descriptions are cut so the outstanding list stays readable.
function shortText(text: string) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 80 ? `${clean.slice(0, 79)}…` : clean;
}

export function assessReadiness(
  event: ReadinessEventRow,
  bookings: readonly ReadinessBookingRow[],
  equipmentRows: readonly ReadinessEquipmentRow[],
  supportRows: readonly ReadinessSupportRow[],
): EventReadinessSnapshot {
  const blockers: ReadinessBlocker[] = [];

  if (!bookings.some(row => row.status === 'confirmed')) {
    blockers.push({ kind: 'no-confirmed-venue', message: NO_CONFIRMED_VENUE });
  }
  const venueBookings: ReadinessVenueBooking[] = bookings.map(row => {
    const issue = venueIssue(row);
    if (issue !== 'ready' && issue !== 'withdrawn') {
      blockers.push({
        kind: 'venue-booking-outstanding', bookingId: row.id, venueName: row.venue_name, issue,
        message: `${row.venue_name} — ${VENUE_ISSUE_TEXT[issue]}`,
      });
    }
    return {
      id: row.id, venueName: row.venue_name, status: row.status, purpose: row.purpose,
      startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
      state: issue === 'ready' ? 'ready' : issue === 'withdrawn' ? 'withdrawn' : 'outstanding',
    };
  });

  const equipment: ReadinessEquipmentLine[] = equipmentRows.map(row => {
    const active = row.reservation_status === 'reserved' || row.reservation_status === 'partial';
    const reserved = active ? row.reserved ?? 0 : 0;
    const outstanding = row.requested - reserved;
    const base = { requestId: row.id, equipmentName: row.name, requiredQuantity: row.requested, reservedQuantity: reserved };
    if (active && row.requires_reconfirmation) {
      blockers.push({ kind: 'equipment-shortfall', ...base, issue: 'needs_review',
        message: `${row.name} — needs review: stock changed (${reserved} of ${row.requested} reserved)` });
    } else if (!active) {
      const released = row.reservation_status === 'released';
      blockers.push({ kind: 'equipment-shortfall', ...base, issue: released ? 'released' : 'missing',
        message: `${row.name} — ${released ? 'reservation released' : 'not reserved'}; ${outstanding} outstanding` });
    } else if (outstanding > 0) {
      blockers.push({ kind: 'equipment-shortfall', ...base, issue: 'partial',
        message: `${row.name} — ${reserved} of ${row.requested} reserved; ${outstanding} outstanding` });
    }
    const ready = active && !row.requires_reconfirmation && outstanding <= 0;
    return { id: row.id, name: row.name, requested: row.requested, reserved, state: ready ? 'ready' : 'outstanding' };
  });

  const required = supportRows.filter(row => row.support_required);
  const support: ReadinessSupportRequest[] = required.map(row => {
    const open = row.status === 'open';
    const flagged = !open && row.requires_reconfirmation;
    if (open) {
      blockers.push({ kind: 'support-unassigned', supportRequestId: row.id, description: row.description,
        message: `Technical support — no staff assigned yet: ${shortText(row.description)}` });
    } else if (flagged) {
      blockers.push({ kind: 'support-needs-review', supportRequestId: row.id, description: row.description,
        message: `Technical support — needs reconfirmation at the new time: ${shortText(row.description)}` });
    }
    return {
      id: row.id, description: row.description, status: row.status,
      startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
      state: open || flagged ? 'outstanding' : 'ready',
    };
  });

  return {
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    status: event.status,
    startsAt: event.starts_at.toISOString(),
    endsAt: event.ends_at.toISOString(),
    equipmentNoneRequired: event.equipment_requirements === NONE_REQUIRED,
    supportNoneRequired: required.length === 0 && supportRows.length > 0,
    venueBookings,
    equipment,
    support,
    blockers,
    canSubmit: event.status === 'planning' && blockers.length === 0,
  };
}

// Reads one event's arrangements. `query` is the pool for a plain read, or the
// submission's transaction client once the event row is locked.
export async function loadReadiness(query: Query, event: ReadinessEventRow): Promise<EventReadinessSnapshot> {
  const bookings = await query<ReadinessBookingRow>(
    `SELECT b.id, v.name AS venue_name, b.status::text AS status, b.purpose,
       lower(b.booking_range) AS starts_at, upper(b.booking_range) AS ends_at,
       b.buffer_conflict, b.requires_reconfirmation,
       (b.status::text = 'tentative' AND b.expires_at > now()) AS live_hold
     FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
     WHERE b.event_id = $1
     ORDER BY lower(b.booking_range), v.name, b.id`, [event.id]);
  // The line's current reservation, or its latest released one (E07-S04).
  const equipment = await query<ReadinessEquipmentRow>(
    `SELECT r.id, eq.name, r.quantity_requested AS requested,
       x.status::text AS reservation_status, x.quantity_reserved AS reserved, x.requires_reconfirmation
     FROM equipment_requests r JOIN equipment eq ON eq.id = r.equipment_id
     LEFT JOIN LATERAL (
       SELECT status, quantity_reserved, requires_reconfirmation FROM equipment_reservations x
       WHERE x.request_id = r.id ORDER BY (x.status <> 'released') DESC, x.created_at DESC, x.id LIMIT 1
     ) x ON true
     WHERE r.event_id = $1
     ORDER BY eq.name, r.id`, [event.id]);
  const support = await query<ReadinessSupportRow>(
    `SELECT id, support_required, coalesce(support_description, '') AS description,
       lower(support_range) AS starts_at, upper(support_range) AS ends_at, status::text AS status,
       requires_reconfirmation
     FROM tech_support_requests
     WHERE event_id = $1 AND status <> 'cancelled'
     ORDER BY lower(support_range), id`, [event.id]);
  return assessReadiness(event, bookings.rows, equipment.rows, support.rows);
}

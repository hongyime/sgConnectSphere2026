/**
 * SCRUM-60 (E08-S03) readiness gate: the shapes the readiness read, the
 * submission for Safety Review and the Organiser's arrangements view share.
 *
 * Sprint 3 keeps the T-71 flow: the assigned Coordinator submits a ready
 * event, and it moves Planning -> Safety Review. The automatic trigger and
 * checklist added by T-82 (C-131, C-132) are follow-up work after Sprint 3
 * closes under T-73; that follow-up reuses this check unchanged.
 *
 * Extended from Bryan's starter for the decisions settled on 2026-10-16:
 * Planning only (D58), live tentative holds and flagged reservations block
 * (D61), buffer conflicts block (D69), whole-event check (D70).
 */

// Why a venue booking blocks submission. Rejected, released and expired
// bookings and lapsed holds are "withdrawn" and never block (Scenario 1).
export type VenueBookingIssue =
  | 'pending'
  | 'conflicting'
  // D69: a booking flagged buffer_conflict, shown as Conflicting.
  | 'buffer_conflict'
  // D61: a tentative hold that hasn't expired.
  | 'tentative_hold'
  // A Confirmed booking flagged requires_reconfirmation because the venue's
  // capacity dropped below the expected attendance (E05-S01). Same reasoning
  // as D61's flagged reservations.
  | 'needs_review';

export type EquipmentIssue = 'partial' | 'missing' | 'released' | 'needs_review';

export type ReadinessBlocker =
  | { kind: 'no-confirmed-venue'; message: string }
  | {
      kind: 'venue-booking-outstanding';
      bookingId: string;
      venueName: string;
      issue: VenueBookingIssue;
      message: string;
    }
  | {
      kind: 'equipment-shortfall';
      requestId: string;
      equipmentName: string;
      requiredQuantity: number;
      reservedQuantity: number;
      issue: EquipmentIssue;
      message: string;
    }
  | {
      // E10-S02 (T-104): a staffed request flagged by a date change.
      kind: 'support-unassigned' | 'support-needs-review';
      supportRequestId: string;
      description: string;
      message: string;
    };

export type ReadinessVenueBooking = {
  id: string;
  venueName: string;
  status: string;
  purpose: string | null;
  startsAt: string;
  endsAt: string;
  // ready: Confirmed with no flag; outstanding: blocks; withdrawn: ignored.
  state: 'ready' | 'outstanding' | 'withdrawn';
};

export type ReadinessEquipmentLine = {
  id: string;
  name: string;
  requested: number;
  reserved: number;
  state: 'ready' | 'outstanding';
};

export type ReadinessSupportRequest = {
  id: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: string;
  state: 'ready' | 'outstanding';
};

export type EventReadinessSnapshot = {
  eventId: string;
  eventCode: string | null;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  // Scenario 4: the Organiser recorded equipment as 'none required'.
  equipmentNoneRequired: boolean;
  // E07-S06 Scenario 3: the Coordinator recorded that no support is needed.
  supportNoneRequired: boolean;
  venueBookings: ReadinessVenueBooking[];
  equipment: ReadinessEquipmentLine[];
  support: ReadinessSupportRequest[];
  blockers: ReadinessBlocker[];
  // True only for a Planning event with no blockers (D58).
  canSubmit: boolean;
};

export type SafetyReviewSubmission = {
  eventId: string;
  eventCode: string | null;
  status: 'safety_review';
  statusChangedAt: Date;
  notifiedSafetyOfficers: number;
};

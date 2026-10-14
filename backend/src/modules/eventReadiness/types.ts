/**
 * SCRUM-60 starter contract for the Sprint 3 readiness gate.
 * This file is type-only; query, submission, notification, audit and UI
 * behavior remain to be implemented and verified against E08-S03.
 *
 * Keep the Sprint 3 T-71 flow: a Coordinator submits a ready event for Safety
 * Review. The automatic trigger and checklist added by T-82 are follow-up work
 * after Sprint 3 closes under T-73.
 */

export type ReadinessBlocker =
  | { kind: 'no-confirmed-venue' }
  | {
      kind: 'venue-booking-outstanding';
      bookingId: string;
      venueName: string;
      status: 'pending' | 'conflicting';
    }
  | {
      kind: 'equipment-shortfall';
      requestId: string;
      equipmentName: string;
      requiredQuantity: number;
      reservedQuantity: number;
    }
  | {
      kind: 'support-unassigned';
      supportRequestId: string;
      roleName: string;
    };

export type EventReadinessSnapshot = {
  eventId: string;
  eventStatus: 'approved' | 'planning' | 'confirmed' | 'safety_review';
  confirmedVenueCount: number;
  blockers: ReadinessBlocker[];
};

export type ReadinessRepository = {
  loadForEvent(eventId: string): Promise<EventReadinessSnapshot | null>;
};

export type SafetyReviewSubmission = {
  eventId: string;
  coordinatorId: string;
  nextStatus: 'safety_review';
};

export type ReadinessPolicy = {
  assess(eventId: string): Promise<EventReadinessSnapshot>;
  submitToSafetyReview(
    submission: SafetyReviewSubmission,
  ): Promise<EventReadinessSnapshot>;
};

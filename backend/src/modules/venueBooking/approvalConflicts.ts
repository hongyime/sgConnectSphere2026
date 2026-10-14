/**
 * SCRUM-50 starter contract for checking a venue approval against active
 * bookings. This file is type-only: implement the query and transaction once
 * SCRUM-47's booking foundation (#256) and E05-S05's buffer work (#261) land.
 *
 * Sprint 3 scope follows the buffered, per-venue rules in T-66/T-68. Apply the
 * later Session and open-ended maintenance-block decisions after Sprint 3
 * closes under T-73.
 */

export type ApprovalCandidate = {
  bookingId: string;
  venueId: string;
  occupancyStart: string;
  occupancyEnd: string;
};

export type ActiveVenueBooking = {
  bookingId: string;
  venueId: string;
  occupancyStart: string;
  occupancyEnd: string;
  status: 'pending' | 'confirmed' | 'conflicting';
};

export type ApprovalConflict = {
  bookingId: string;
  venueId: string;
  occupancyStart: string;
  occupancyEnd: string;
  status: 'pending' | 'confirmed';
};

export type ApprovalConflictResult =
  | { allowed: true; conflicts: [] }
  | { allowed: false; conflicts: ApprovalConflict[] };

export type ApprovalConflictRepository = {
  findActiveBookingsForVenue(input: {
    venueId: string;
    excludeBookingId: string;
  }): Promise<ActiveVenueBooking[]>;
};

export type ApprovalConflictPolicy = {
  check(candidate: ApprovalCandidate): Promise<ApprovalConflictResult>;
};

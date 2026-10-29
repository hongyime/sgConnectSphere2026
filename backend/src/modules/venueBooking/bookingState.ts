// Decidability of a venue booking, worded for Venue Staff: why a booking that
// isn't Pending can't be decided. Replaces the former status→message table in
// decisions.ts. Conflicting bookings wait for the E05-S05/S06 resolution flow
// (PR #244). Whether a hold is still live is holds.ts's concern (isLive) with
// different wording; this type answers decidability only.

export type BookingStatus = 'pending' | 'tentative' | 'confirmed' | 'rejected' | 'released' | 'conflicting' | 'expired';

export interface BookingState {
  readonly status: BookingStatus;
  canDecide(): string | null;
}

const ALREADY_DECIDED = 'This request has already been decided, so it can no longer be changed.';

class PendingBookingState implements BookingState {
  readonly status: BookingStatus = 'pending';
  canDecide(): string | null {
    return null;
  }
}

class TentativeBookingState implements BookingState {
  readonly status: BookingStatus = 'tentative';
  canDecide(): string | null {
    return 'This is a tentative hold, not a request yet, so there is nothing to decide.';
  }
}

class ConfirmedBookingState implements BookingState {
  readonly status: BookingStatus = 'confirmed';
  canDecide(): string | null {
    return ALREADY_DECIDED;
  }
}

class RejectedBookingState implements BookingState {
  readonly status: BookingStatus = 'rejected';
  canDecide(): string | null {
    return ALREADY_DECIDED;
  }
}

class ReleasedBookingState implements BookingState {
  readonly status: BookingStatus = 'released';
  canDecide(): string | null {
    return 'The Coordinator withdrew this request, so there is nothing to decide.';
  }
}

class ConflictingBookingState implements BookingState {
  readonly status: BookingStatus = 'conflicting';
  canDecide(): string | null {
    return 'This booking now clashes with a change to the venue. It must be resolved before it can be decided.';
  }
}

class ExpiredBookingState implements BookingState {
  readonly status: BookingStatus = 'expired';
  canDecide(): string | null {
    return 'This hold has expired, so there is nothing to decide.';
  }
}

const STATES: Record<BookingStatus, BookingState> = {
  pending: new PendingBookingState(),
  tentative: new TentativeBookingState(),
  confirmed: new ConfirmedBookingState(),
  rejected: new RejectedBookingState(),
  released: new ReleasedBookingState(),
  conflicting: new ConflictingBookingState(),
  expired: new ExpiredBookingState(),
};

// Any unrecognized status (a future booking_status value or a stale row) keeps
// the previous behavior: it fell back to the already-decided message.
export function bookingState(status: string): BookingState {
  return STATES[status as BookingStatus] ?? STATES.confirmed;
}

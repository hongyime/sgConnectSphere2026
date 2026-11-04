import { apiCall, jsonRequest } from '../../shared';
import type { ReasonCategory } from './blocksApi';

export function setPrimaryVenueBooking(bookingId: string) {
  return apiCall<{ booking: { id: string; status: string; is_primary: boolean }; replayed: boolean }>('/api/venues',
    jsonRequest('POST', { action: 'set_primary', booking_id: bookingId }), 'Unable to update the primary venue.');
}

export function withdrawVenueBooking(bookingId: string) {
  return apiCall<{ booking: { id: string; status: string }; unresolved_venue_ids: string[] }>('/api/venues',
    jsonRequest('POST', { action: 'withdraw_booking', booking_id: bookingId }), 'Unable to withdraw the booking request.');
}

export type VenueBookingRequestsData = {
  event: { id: string; event_code: string | null; title: string; status: string; starts_at?: string; ends_at?: string };
  bookings: ({ id: string; venue_id: string; venue_name: string; location: string; status: string;
    starts_at: string; ends_at: string; created_at: string; decision_reason: string | null;
    suggested_venue_id?: string | null; suggested_venue_name?: string | null; replaces_booking_id?: string | null; has_replacement?: boolean;
    conflict_block_id?: string | null; conflict_category?: string | null; conflict_reason?: string | null; conflict_starts_at?: string | null; conflict_ends_at?: string | null; requires_reconfirmation?: boolean;
    purpose?: string | null; headcount?: number | null; is_primary?: boolean;
    // E04-S02 Scenario 4: the Session whose period this booking covers.
    session_id?: string | null; session_title?: string | null;
    suitability_snapshot?: { mismatches: string[] } | null } & ConflictDetails)[];
};

// E05-S06 Scenario 3 (SCRUM-152): a booking an unavailability made Conflicting
// carries its earlier status and that unavailability's category, note and
// period (no end = until lifted).
export type ConflictDetails = {
  status_before_conflict?: 'pending' | 'confirmed' | 'tentative' | null;
  conflict_reason_category?: ReasonCategory | null;
  conflict_note?: string | null;
  conflict_starts_at?: string | null;
  conflict_ends_at?: string | null;
};

export function getVenueBookingRequests(eventId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ mode: 'booking_requests', event_id: eventId });
  return apiCall<VenueBookingRequestsData>(`/api/venues?${params}`, { signal }, 'Unable to load venue booking requests.');
}

export function cancelLostVenueBooking(bookingId: string) {
  return apiCall<{ booking: { id: string; status: string }; replayed: boolean }>('/api/venues',
    jsonRequest('POST', { action: 'cancel_lost_booking', booking_id: bookingId }), 'Unable to cancel the original booking.');
}

import { apiCall, jsonRequest } from '../../shared';

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
  bookings: { id: string; venue_id: string; venue_name: string; location: string; status: string;
    starts_at: string; ends_at: string; created_at: string; decision_reason: string | null;
    suggested_venue_id?: string | null; suggested_venue_name?: string | null; replaces_booking_id?: string | null; has_replacement?: boolean;
    purpose?: string | null; headcount?: number | null; is_primary?: boolean;
    suitability_snapshot?: { mismatches: string[] } | null }[];
};

export function getVenueBookingRequests(eventId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ mode: 'booking_requests', event_id: eventId });
  return apiCall<VenueBookingRequestsData>(`/api/venues?${params}`, { signal }, 'Unable to load venue booking requests.');
}

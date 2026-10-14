import { apiCall } from '../../shared';

export type VenueBookingRequestsData = {
  event: { id: string; event_code: string | null; title: string; status: string };
  bookings: { id: string; venue_id: string; venue_name: string; location: string; status: string;
    starts_at: string; ends_at: string; created_at: string; decision_reason: string | null;
    purpose?: string | null; headcount?: number | null; is_primary?: boolean;
    suitability_snapshot?: { mismatches: string[] } | null }[];
};

export function getVenueBookingRequests(eventId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ mode: 'booking_requests', event_id: eventId });
  return apiCall<VenueBookingRequestsData>(`/api/venues?${params}`, { signal }, 'Unable to load venue booking requests.');
}

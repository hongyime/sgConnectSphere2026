// E06-S04 (SCRUM-48): Venue Staff's pending booking requests and their
// decisions, on GET/POST /api/venues (backend/src/modules/venueBooking/decisions.ts).
import { apiCall, jsonRequest } from '../../shared';

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'released' | 'conflicting' | 'tentative' | 'expired';

export type BookingRequest = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  venue: { id: string; name: string };
  event: { id: string; code: string | null; title: string; expectedAttendance: number | null; coordinatorName: string | null };
  decisionReason: string | null;
  suggestedVenue: { id: string; name: string } | null;
  decidedBy: string | null;
  decidedAt: string | null;
  requestedAt: string;
};

export type Decision =
  | { decision: 'approve' }
  | { decision: 'reject'; reason: string; suggestedVenueId?: string };

export async function listPendingBookings(signal?: AbortSignal) {
  const result = await apiCall<{ bookings: BookingRequest[] }>(
    '/api/venues?bookings=pending', { signal }, 'Unable to load booking requests.');
  return result.ok ? { ok: true as const, data: result.data.bookings } : result;
}

export async function getBooking(bookingId: string, signal?: AbortSignal) {
  const result = await apiCall<{ booking: BookingRequest }>(
    `/api/venues?booking=${encodeURIComponent(bookingId)}`, { signal }, 'Unable to load this booking request.');
  return result.ok ? { ok: true as const, data: result.data.booking } : result;
}

export async function decideBooking(bookingId: string, choice: Decision) {
  const body = choice.decision === 'approve'
    ? { action: 'decide', booking_id: bookingId, decision: 'approve' }
    : { action: 'decide', booking_id: bookingId, decision: 'reject', reason: choice.reason, suggested_venue_id: choice.suggestedVenueId || null };
  const result = await apiCall<{ booking: BookingRequest; coordinatorNotified: boolean }>(
    '/api/venues', jsonRequest('POST', body), 'Unable to save your decision.');
  return result.ok ? { ok: true as const, data: result.data } : result;
}

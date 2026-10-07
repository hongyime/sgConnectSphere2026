// Typed fetch helper for the venue availability calendar (E05-S03).
// Backend: GET /api/venues?id=<venue>&calendar=1&from=YYYY-MM-DD&to=YYYY-MM-DD
// (PR #134, backend/src/modules/venueBooking/calendar.ts). The server decides
// what each viewer may see: an event's details only reach Venue Staff and the
// event's assigned Coordinator; anyone else gets an 'unavailable' entry with
// no event attached. This client renders whatever it is given.
import { apiCall, type ApiResult } from '../../shared';

export type CalendarState = 'free' | 'tentative' | 'confirmed' | 'blocked' | 'unavailable';

export type CalendarEntry = {
  state: CalendarState;
  // 'block' is a maintenance block, never a booking (E05-S03 Scenario 3).
  kind: 'free' | 'booking' | 'block';
  // ISO UTC instants; calendar days are Singapore days.
  start: string;
  end: string;
  event?: { id: string; code: string | null; title: string };
  reason?: string;
};

export type VenueCalendar = {
  venue: { id: string; name: string; opens_at: string; closes_at: string; is_active: boolean };
  from: string;
  to: string;
  timezone: string;
  entries: CalendarEntry[];
};

// Mirrors MAX_CALENDAR_DAYS in the backend so the form can refuse an
// oversized range before a round trip.
export const MAX_CALENDAR_DAYS = 62;

export async function getVenueCalendar(venueId: string, from: string, to: string, signal?: AbortSignal): Promise<ApiResult<VenueCalendar>> {
  const params = new URLSearchParams({ id: venueId, calendar: '1', from, to });
  // The server's 400 messages describe the date input ("to must be on or
  // after from.") and contain no data, so apiCall shows them as they are.
  const result = await apiCall<Partial<VenueCalendar>>(
    `/api/venues?${params.toString()}`, { signal }, 'The calendar could not be loaded. Please try again.');
  if (!result.ok) return result;
  // Before the calendar API is deployed, the same URL returns the plain venue
  // record without entries; treat that as unavailable rather than "all free".
  if (!result.data.venue || !Array.isArray(result.data.entries)) {
    return { ok: false, status: 0, message: 'The availability calendar is not available yet.' };
  }
  return { ok: true, data: result.data as VenueCalendar };
}

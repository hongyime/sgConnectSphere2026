// Typed fetch helper for the venue availability calendar (E05-S03).
// Backend: GET /api/venues?id=<venue>&calendar=1&from=YYYY-MM-DD&to=YYYY-MM-DD
// (PR #134, backend/src/modules/venueBooking/calendar.ts). The server decides
// what each viewer may see: an event's details only reach Venue Staff and the
// event's assigned Coordinator; anyone else gets an 'unavailable' entry with
// no event attached. This client renders whatever it is given.

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

export type GetVenueCalendarResult =
  | { ok: true; calendar: VenueCalendar }
  | { ok: false; message: string };

// Mirrors MAX_CALENDAR_DAYS in the backend so the form can refuse an
// oversized range before a round trip.
export const MAX_CALENDAR_DAYS = 62;

export async function getVenueCalendar(venueId: string, from: string, to: string): Promise<GetVenueCalendarResult> {
  const params = new URLSearchParams({ id: venueId, calendar: '1', from, to });
  let response: Response;
  try {
    response = await fetch(`/api/venues?${params.toString()}`, { credentials: 'same-origin' });
  } catch {
    return { ok: false, message: 'The calendar could not be loaded. Please try again.' };
  }
  const payload = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: 'Sign in as an Event Coordinator or Venue Staff member to view venue calendars.' };
  }
  if (response.status === 404) return { ok: false, message: 'Venue not found.' };
  if (response.status === 400) {
    // The server's 400 messages describe the date input ("to must be on or
    // after from.") and contain no data, so they are safe to show.
    return { ok: false, message: typeof payload?.error === 'string' ? payload.error : 'Those dates could not be shown.' };
  }
  if (!response.ok) return { ok: false, message: 'The calendar could not be loaded. Please try again.' };

  // Before the calendar API is deployed, the same URL returns the plain venue
  // record without entries; treat that as unavailable rather than "all free".
  if (!payload?.venue || !Array.isArray(payload.entries)) {
    return { ok: false, message: 'The availability calendar is not available yet.' };
  }
  return { ok: true, calendar: payload as VenueCalendar };
}

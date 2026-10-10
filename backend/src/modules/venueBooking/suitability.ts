import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { assessVenue, type Candidate, type Criteria, type Option } from './assessment.js';
import { authorizeVenueSearch, venueSearch } from './search.js';

export const SUITABILITY_TIMEZONE = 'Asia/Singapore';
type Hours = { opens_at: string; closes_at: string };
type Options = { layouts: Option[]; accessibility: Option[]; facilities: Option[] };

// Venues have a daily, same-day opening window (catalogue validation rejects
// overnight hours). Compare instants in Singapore time, like the venue calendar.
// An interval spanning midnight includes closed time and is outside that window.
export function withinOperatingHours(start: string, end: string, hours: Hours): boolean {
  const localStart = new Date(Date.parse(start) + 8 * 60 * 60 * 1000).toISOString();
  const localEnd = new Date(Date.parse(end) + 8 * 60 * 60 * 1000).toISOString();
  const seconds = (time: string) => {
    const [h, m, s = '0'] = time.split(':');
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  };
  return localStart.slice(0, 10) === localEnd.slice(0, 10)
    && seconds(localStart.slice(11, -1)) >= seconds(hours.opens_at)
    && seconds(localEnd.slice(11, -1)) <= seconds(hours.closes_at);
}

// Read-only advisory result, reusable by E06-S03/S04. It neither authorises a
// booking nor changes booking state. Booking conflicts remain separate gates.
export function assessEventVenue(venue: Candidate & Hours, criteria: Criteria, options: Options) {
  const result = assessVenue(venue, criteria);
  const names = (ids: string[], values: Option[]) => ids.map(id => values.find(v => v.id === id)?.label ?? id);
  result.mismatches = result.mismatches.map(message => {
    for (const item of [...options.accessibility, ...options.facilities]) message = message.replace(item.id, item.label);
    return message;
  });
  const hoursPass = withinOperatingHours(criteria.start, criteria.end, venue);
  if (!hoursPass) result.mismatches.push('Event is outside operating hours.');
  const comparisons = [
    { criterion: 'Capacity', required: String(criteria.attendance), provided: result.effective_capacity === null ? 'Required layout not supported' : String(result.effective_capacity) },
    { criterion: 'Room layout', required: criteria.layout ? names([criteria.layout], options.layouts).join(', ') : 'No layout requirement', provided: venue.layouts.map(v => `${v.label} (${v.capacity})`).join(', ') || 'None' },
    { criterion: 'Accessibility', required: names(criteria.accessibility, options.accessibility).join(', ') || 'None recorded', provided: venue.accessibility.map(v => v.label).join(', ') || 'None' },
    { criterion: 'Facilities', required: names(criteria.facilities, options.facilities).join(', ') || 'None recorded', provided: venue.facilities.map(v => v.label).join(', ') || 'None' },
    { criterion: 'Operating hours (Singapore time)', required: `${criteria.start} / ${criteria.end}`, provided: `${venue.opens_at} - ${venue.closes_at}` },
    { criterion: 'Availability', required: 'Available for the event period', provided: venue.available ? 'Available' : 'Unavailable' },
  ];
  return { ...result, suitable: result.mismatches.length === 0, advisory: true as const, comparisons, operating_hours_pass: hoursPass, timezone: SUITABILITY_TIMEZONE };
}

export async function venueSuitability(query: Query, user: AuthenticatedUser | undefined, params: URLSearchParams) {
  // Reuse search's auth and authoritative event defaults. Client-supplied
  // attendance, role, facilities or dates cannot override recorded requirements.
  const eventId = params.get('event_id');
  const venueId = params.get('venue_id');
  await authorizeVenueSearch(query, user);
  if (!eventId || !venueId || eventId.length > 240 || venueId.length > 240) {
    throw new AccessError(400, 'An event and venue are required.');
  }
  const search = await venueSearch(query, user, new URLSearchParams({ event_id: eventId, search: '1' }));
  if (search.errors) throw new AccessError(400, 'The event needs valid recorded requirements before suitability can be checked.');
  const venue = search.venues!.find(v => v.id === venueId);
  if (!venue) throw new AccessError(404, 'Active venue not found.');
  const hours = (await query<Hours>('SELECT opens_at::text, closes_at::text FROM venues WHERE id::text=$1 AND is_active', [venueId])).rows[0];
  if (!hours) throw new AccessError(404, 'Active venue not found.');
  return {
    event: { id: search.defaults.id, title: search.defaults.title, start: search.criteria!.start, end: search.criteria!.end, accessibility_note: search.defaults.accessibility_note },
    assessment: assessEventVenue({ ...venue, ...hours }, search.criteria!, search.options),
  };
}

// E06-S03 read/preparation slice. No booking writes until the shared buffered
// occupancy migration and submission transaction are integrated.
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import type { Criteria } from './assessment.js';

export type BookingRequestInput = {
  event_id: string; venue_id: string; starts_at: string; ends_at: string;
  purpose: string | null; headcount: number | null;
};
type BookingEvent = Record<string, unknown> & {
  id: string; event_code: string | null; title: string; status: string;
  starts_at: Date | string; ends_at: Date | string; expected_attendance: number;
  layout_id: string | null; accessibility: string[]; facilities: string[];
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) return;
  const time = new Date(value);
  if (Number.isFinite(time.getTime()) && Number(value.slice(11, 13)) < 24) return time.toISOString();
}

export function validateBookingRequestInput(body: unknown): { input?: BookingRequestInput; errors?: Record<string, string[]> } {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const errors: Record<string, string[]> = {};
  for (const key of ['event_id', 'venue_id'] as const) {
    if (typeof data[key] !== 'string' || !uuid.test(data[key])) errors[key] = [`Choose a valid ${key === 'event_id' ? 'event' : 'venue'}.`];
  }
  const starts_at = timestamp(data.starts_at);
  const ends_at = timestamp(data.ends_at);
  if (!starts_at) errors.starts_at = ['Enter a valid start time with a timezone.'];
  if (!ends_at) errors.ends_at = ['Enter a valid end time with a timezone.'];
  else if (starts_at && ends_at <= starts_at) errors.ends_at = ['Booking must end after it starts.'];
  const purpose = typeof data.purpose === 'string' ? data.purpose.trim() || null : null;
  if (data.purpose != null && typeof data.purpose !== 'string') errors.purpose = ['Enter a purpose as text.'];
  else if (purpose && purpose.length > 80) errors.purpose = ['Purpose must be 80 characters or fewer.'];
  const headcount = data.headcount == null ? null : data.headcount;
  if (headcount !== null && (typeof headcount !== 'number' || !Number.isSafeInteger(headcount) || headcount <= 0 || headcount > 2147483647)) errors.headcount = ['Enter a whole headcount greater than zero.'];
  if (Object.keys(errors).length) return { errors };
  // Whitelist fields. Identity, status, primary flag and occupancy are never client inputs.
  return { input: { event_id: data.event_id as string, venue_id: data.venue_id as string, starts_at: starts_at!, ends_at: ends_at!, purpose, headcount: headcount as number | null } };
}

async function requireCoordinator(user: AuthenticatedUser | undefined) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) throw new AccessError(403, 'Only Event Coordinators can view or prepare venue booking requests.');
  return user;
}

async function assignedEvent(query: Query, user: AuthenticatedUser, identifier: string) {
  if (!identifier || identifier.length > 160) throw new AccessError(400, 'An event id or code is required.');
  const event = (await query<BookingEvent>(`SELECT e.id, e.event_code, e.title, e.status,
    lower(e.event_range) AS starts_at, upper(e.event_range) AS ends_at,
    e.expected_attendance, e.layout_id,
    ARRAY(SELECT feature_id FROM event_accessibility_needs WHERE event_id=e.id) AS accessibility,
    ARRAY(SELECT facility_id FROM event_facility_needs WHERE event_id=e.id) AS facilities
    FROM events e WHERE (e.id::text=$1 OR e.event_code=$1) AND e.coordinator_id=$2`, [identifier, user.id])).rows[0];
  if (!event) throw new AccessError(404, 'Event not found.');
  return event;
}

export async function listBookingRequests(query: Query, user: AuthenticatedUser | undefined, identifier: string) {
  const actor = await requireCoordinator(user);
  const event = await assignedEvent(query, actor, identifier);
  const bookings = (await query(`SELECT b.id, b.venue_id, v.name AS venue_name, v.location,
    b.status, lower(b.booking_range) AS starts_at, upper(b.booking_range) AS ends_at,
    b.created_at, b.decision_reason
    FROM venue_bookings b JOIN venues v ON v.id=b.venue_id
    JOIN events e ON e.id=b.event_id
    WHERE b.event_id=$1 AND e.coordinator_id=$2
    ORDER BY b.created_at DESC, b.id DESC`, [event.id, actor.id])).rows;
  return { event: { id: event.id, event_code: event.event_code, title: event.title, status: event.status }, bookings };
}

// Future submit/convert callers must invoke this within their transaction and
// lock/revalidate the event, venue and hold there. Preparation alone is neither
// authorization to commit nor an availability check and creates no reservation.
export async function prepareBookingRequest(query: Query, user: AuthenticatedUser | undefined, body: unknown) {
  const actor = await requireCoordinator(user);
  const valid = validateBookingRequestInput(body);
  if (!valid.input) return { errors: valid.errors };
  const input = valid.input;
  const event = await assignedEvent(query, actor, input.event_id);
  if (!['approved', 'planning'].includes(event.status)) throw new AccessError(409, 'Booking requests require an Approved or Planning event.');
  const eventStart = new Date(event.starts_at).getTime();
  const eventEnd = new Date(event.ends_at).getTime();
  if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd) || eventEnd <= eventStart) throw new AccessError(409, 'Record a valid event period first.');
  if (Date.parse(input.starts_at) < eventStart || Date.parse(input.ends_at) > eventEnd) {
    return { errors: { booking_range: ['Booking must be within the event start and end.'] } };
  }
  const attendance = input.headcount ?? event.expected_attendance;
  if (!Number.isSafeInteger(attendance) || attendance <= 0) throw new AccessError(409, 'Record a valid expected attendance or booking headcount first.');
  if (!(await query('SELECT id FROM venues WHERE id=$1 AND is_active', [input.venue_id])).rows[0]) throw new AccessError(404, 'Active venue not found.');
  const criteria: Criteria = { start: input.starts_at, end: input.ends_at, attendance, capacity: attendance,
    layout: event.layout_id ?? '', accessibility: event.accessibility, facilities: event.facilities, location: '', q: '' };
  return { input, requested_by: actor.id, criteria };
}

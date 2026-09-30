import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';

export type Criteria = { start: string; end: string; attendance: number; capacity: number; layout: string; location: string; accessibility: string[]; facilities: string[]; q: string };
export type Option = { id: string; label: string };
export type Candidate = { id: string; name: string; location: string; max_capacity: number; available: boolean; layouts: (Option & { capacity: number })[]; accessibility: Option[]; facilities: Option[] };

async function authorize(query: Query, user: AuthenticatedUser | undefined) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
      VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'venue_search')`, [user.id]);
    throw new AccessError(403, 'Only Event Coordinators can search for suitable venues.');
  }
}

export function assessVenue(venue: Candidate, criteria: Criteria) {
  const mismatches: string[] = [];
  const layout = venue.layouts.find(item => item.id === criteria.layout);
  if (criteria.layout && !layout) mismatches.push('Required room layout is not supported.');
  const capacity = criteria.layout ? layout?.capacity : venue.max_capacity;
  if (capacity !== undefined && capacity < Math.max(criteria.attendance, criteria.capacity)) mismatches.push(`Capacity ${capacity} is below the required ${Math.max(criteria.attendance, criteria.capacity)} places.`);
  if (criteria.location && !venue.location.toLowerCase().includes(criteria.location.toLowerCase())) mismatches.push('Location does not match.');
  for (const id of criteria.accessibility) if (!venue.accessibility.some(item => item.id === id)) mismatches.push(`Missing accessibility feature: ${id}`);
  for (const id of criteria.facilities) if (!venue.facilities.some(item => item.id === id)) mismatches.push(`Missing facility: ${id}`);
  if (!venue.available) mismatches.push('Unavailable during the requested period.');
  return { ...venue, effective_capacity: capacity ?? null, suitable: mismatches.length === 0, mismatches };
}

export async function venueSearch(query: Query, user: AuthenticatedUser | undefined, params: URLSearchParams) {
  await authorize(query, user);
  const layouts = (await query<Option>('SELECT id, label FROM room_layouts ORDER BY label')).rows;
  const accessibility = (await query<Option>('SELECT id, label FROM accessibility_features ORDER BY label')).rows;
  const facilities = (await query<Option>('SELECT id, label FROM facilities ORDER BY label')).rows;
  let defaults: Record<string, unknown> = {};
  const eventId = params.get('event_id');
  if (eventId) {
    const result = await query(`SELECT e.id, e.title, lower(e.event_range) AS start, upper(e.event_range) AS end,
      e.expected_attendance AS attendance, e.layout_id AS layout, e.accessibility_note,
      ARRAY(SELECT feature_id FROM event_accessibility_needs WHERE event_id=e.id) AS accessibility,
      ARRAY(SELECT facility_id FROM event_facility_needs WHERE event_id=e.id) AS facilities
      FROM events e WHERE (e.id::text=$1 OR e.event_code=$1) AND e.status <> 'draft'`, [eventId]);
    if (!result.rows[0]) throw new AccessError(404, 'Event not found.');
    defaults = result.rows[0];
  }
  const options = { layouts, accessibility, facilities };
  if (params.get('search') !== '1') return { defaults, options };
  const errors: Record<string, string[]> = {};
  const date = (key: string) => {
    const value = params.get(key) ?? defaults[key];
    const parsed = value instanceof Date ? value : new Date(String(value ?? ''));
    if (!(value instanceof Date) && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(String(value))) errors[key] = ['Enter a date and time with a timezone.'];
    if (!Number.isFinite(parsed.getTime())) { errors[key] = ['Enter a valid date and time.']; return ''; }
    return parsed.toISOString();
  };
  const integer = (key: string, fallback: unknown) => {
    const raw = params.get(key) ?? fallback;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) errors[key] = ['Enter a whole number greater than zero.'];
    return value;
  };
  const list = (key: 'accessibility' | 'facilities') => {
    const ids = params.has(key) ? (params.get(key) || '').split(',').filter(Boolean) : (defaults[key] as string[] ?? []);
    if (ids.some(id => !options[key].some(option => option.id === id))) errors[key] = ['Select values from the available list.'];
    return [...new Set(ids)];
  };
  const criteria: Criteria = { start: date('start'), end: date('end'), attendance: integer('attendance', defaults.attendance), capacity: integer('capacity', params.get('attendance') ?? defaults.attendance), layout: params.get('layout') ?? String(defaults.layout ?? ''), location: (params.get('location') || '').trim(), q: (params.get('q') || '').trim(), accessibility: list('accessibility'), facilities: list('facilities') };
  if (criteria.start && criteria.end && criteria.start >= criteria.end) errors.end = ['End must be after start.'];
  if (criteria.layout && !layouts.some(item => item.id === criteria.layout)) errors.layout = ['Select an available layout.'];
  if (criteria.location.length > 255) errors.location = ['Location must be at most 255 characters.'];
  if (criteria.q.length > 240) errors.q = ['Search must be at most 240 characters.'];
  if (Object.keys(errors).length) return { errors };
  const result = await query<Candidate>(`SELECT v.id, v.name, v.location, v.max_capacity,
    NOT EXISTS (SELECT 1 FROM venue_blocks b WHERE b.venue_id=v.id AND b.block_range && tstzrange($1::timestamptz,$2::timestamptz,'[)'))
    AND NOT EXISTS (SELECT 1 FROM venue_bookings b WHERE b.venue_id=v.id AND b.status IN ('pending','confirmed') AND b.booking_range && tstzrange($1::timestamptz,$2::timestamptz,'[)')) AS available,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'capacity',vl.capacity) ORDER BY r.label) FROM venue_supported_layouts vl JOIN room_layouts r ON r.id=vl.layout_id WHERE vl.venue_id=v.id),'[]') AS layouts,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'label',a.label) ORDER BY a.label) FROM venue_accessibility_features va JOIN accessibility_features a ON a.id=va.feature_id WHERE va.venue_id=v.id),'[]') AS accessibility,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',f.id,'label',f.label) ORDER BY f.label) FROM venue_facilities vf JOIN facilities f ON f.id=vf.facility_id WHERE vf.venue_id=v.id),'[]') AS facilities
    FROM venues v WHERE v.is_active AND strpos(lower(v.name),lower($3))>0 ORDER BY v.name,v.id`, [criteria.start, criteria.end, criteria.q]);
  const venues = result.rows.map(venue => {
    const assessed = assessVenue(venue, criteria);
    assessed.mismatches = assessed.mismatches.map(message => {
      for (const item of [...accessibility, ...facilities]) message = message.replace(item.id, item.label);
      return message;
    });
    return assessed;
  });
  return { criteria, venues, options, defaults };
}

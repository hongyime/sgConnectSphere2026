import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { inTransaction } from '../../database/pool.js';
import { insertNotificationDelivery } from '../notificationDispatcher/postgres.js';
import { accessibilityMatchCondition } from './matchAccessibility.js';

export type VenueLayoutInput = { label: string; capacity: number };
export type VenueInput = {
  name: string;
  location: string;
  max_capacity: number;
  opens_at: string;
  closes_at: string;
  facilities: string[];
  accessibility_features: string[];
  supported_layouts: VenueLayoutInput[];
};
export type VenueErrors = Record<string, string[]>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOOKUP_TABLES = ['facilities', 'accessibility_features', 'room_layouts'] as const;
type LookupTable = (typeof LOOKUP_TABLES)[number];

// The mutating entry points below only receive a Pool (they open their own
// transaction after the guard passes), whereas the guard's denial write
// needs a Query-shaped function. Pool.query already has that shape.
function poolQuery(database: Pool): Query {
  return (sql, values) => database.query(sql, values);
}

// E14-S02 Scenario 2: a role-mismatch denial has no specific venue to attach
// to, so it's logged against the screen the caller was trying to reach.
async function recordCatalogueDenial(query: Query, user: AuthenticatedUser, screen: string) {
  await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
    VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', $2)`, [user.id, screen]);
}

export async function requireVenueStaff(query: Query, user: AuthenticatedUser | undefined): Promise<AuthenticatedUser> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['venue_staff']).allowed) {
    await recordCatalogueDenial(query, user, 'venue_catalogue');
    throw new AccessError(403, 'Access denied. Only venue staff can maintain the venue catalogue.');
  }
  return user;
}

export async function requireCatalogueViewer(
  query: Query,
  user: AuthenticatedUser | undefined,
  screen = 'venue_catalogue',
): Promise<AuthenticatedUser> {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['venue_staff', 'event_coordinator']).allowed) {
    await recordCatalogueDenial(query, user, screen);
    throw new AccessError(403, 'Access denied.');
  }
  return user;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringList(data: Record<string, unknown>, errors: VenueErrors, field: string, label: string): string[] {
  const value = data[field];
  if (!Array.isArray(value) || value.length === 0 || value.some(entry => typeof entry !== 'string' || !entry.trim())) {
    errors[field] = [`${label} must be a non-empty list of names.`];
    return [];
  }
  const trimmed = value.map(entry => (entry as string).trim());
  // Two entries that normalize to the same code (slugify, defined below —
  // available here via function hoisting) collide on the venue_facilities /
  // venue_accessibility_features primary key once linkLookups() tries to
  // insert both — the same bug class as the supported_layouts duplicate
  // check just below, reported here for consistency.
  const seenCodes = new Set<string>();
  for (const entry of trimmed) {
    const code = slugify(entry);
    if (seenCodes.has(code)) {
      errors[field] = [`"${entry}" is listed more than once.`];
      return [];
    }
    seenCodes.add(code);
  }
  return trimmed;
}

export function validateVenueInput(body: unknown):
  | { input: VenueInput; errors?: never }
  | { errors: VenueErrors; input?: never } {
  if (!isPlainObject(body)) {
    return { errors: { form: ['Submit an object containing the required venue fields.'] } };
  }
  const data = body;
  const errors: VenueErrors = {};

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) errors.name = ['Venue name is required.'];
  else if (name.length > 160) errors.name = ['Venue name must be at most 160 characters.'];

  const location = typeof data.location === 'string' ? data.location.trim() : '';
  if (!location) errors.location = ['Location is required.'];
  else if (location.length > 255) errors.location = ['Location must be at most 255 characters.'];

  const maxCapacity = data.max_capacity;
  if (typeof maxCapacity !== 'number' || !Number.isInteger(maxCapacity) || maxCapacity <= 0) {
    errors.max_capacity = ['Capacity must be a whole number greater than 0.'];
  }

  const opensAt = typeof data.opens_at === 'string' ? data.opens_at.trim() : '';
  const closesAt = typeof data.closes_at === 'string' ? data.closes_at.trim() : '';
  if (!TIME_PATTERN.test(opensAt)) errors.opens_at = ['Opening time must be in HH:MM 24-hour format.'];
  if (!TIME_PATTERN.test(closesAt)) errors.closes_at = ['Closing time must be in HH:MM 24-hour format.'];
  if (!errors.opens_at && !errors.closes_at && opensAt >= closesAt) {
    errors.closes_at = ['Closing time must be after opening time.'];
  }

  const facilities = stringList(data, errors, 'facilities', 'Facilities');
  const accessibilityFeatures = stringList(data, errors, 'accessibility_features', 'Accessibility features');

  const layoutsRaw = data.supported_layouts;
  const layouts: VenueLayoutInput[] = [];
  if (!Array.isArray(layoutsRaw) || layoutsRaw.length === 0) {
    errors.supported_layouts = ['At least one supported layout is required.'];
  } else {
    // Two labels that normalize to the same code (slugify, defined below —
    // available here via function hoisting) collide on the
    // venue_supported_layouts primary key once linkLookups() tries to
    // insert both, which createVenue/updateVenue previously misreported as
    // a venue-name conflict or an unhandled 503. Reject the duplicate here
    // instead, before any query runs.
    const seenCodes = new Set<string>();
    for (const entry of layoutsRaw) {
      const label = isPlainObject(entry) && typeof entry.label === 'string' ? entry.label.trim() : '';
      const capacity = isPlainObject(entry) ? entry.capacity : undefined;
      if (!label || typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity <= 0) {
        errors.supported_layouts = ['Each layout needs a name and a whole-number capacity greater than 0.'];
        break;
      }
      const code = slugify(label);
      if (seenCodes.has(code)) {
        errors.supported_layouts = [`"${label}" is listed more than once.`];
        break;
      }
      seenCodes.add(code);
      layouts.push({ label, capacity });
    }
  }

  if (Object.keys(errors).length) return { errors };
  return { input: {
    name, location, max_capacity: maxCapacity as number, opens_at: opensAt, closes_at: closesAt,
    facilities, accessibility_features: accessibilityFeatures, supported_layouts: layouts,
  } };
}

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

// Facilities, accessibility features and layouts are free text typed by venue
// staff, so each one is upserted by a normalized code rather than picked from
// a fixed enum (see docs/decisions for the venue catalogue design choices).
async function upsertLookup(client: PoolClient, table: LookupTable, label: string): Promise<string> {
  const result = await client.query<{ id: string }>(`
    INSERT INTO ${table} (code, label) VALUES ($1, $2)
    ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label
    RETURNING id
  `, [slugify(label), label]);
  return result.rows[0]!.id;
}

async function linkLookups(client: PoolClient, venueId: string, input: VenueInput): Promise<void> {
  for (const facility of input.facilities) {
    const facilityId = await upsertLookup(client, 'facilities', facility);
    await client.query(`INSERT INTO venue_facilities (venue_id, facility_id) VALUES ($1, $2)`, [venueId, facilityId]);
  }
  for (const feature of input.accessibility_features) {
    const featureId = await upsertLookup(client, 'accessibility_features', feature);
    await client.query(`INSERT INTO venue_accessibility_features (venue_id, feature_id) VALUES ($1, $2)`, [venueId, featureId]);
  }
  for (const layout of input.supported_layouts) {
    const layoutId = await upsertLookup(client, 'room_layouts', layout.label);
    await client.query(`INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity) VALUES ($1, $2, $3)`,
      [venueId, layoutId, layout.capacity]);
  }
}

async function replaceLookupLinks(client: PoolClient, venueId: string, input: VenueInput): Promise<void> {
  await client.query(`DELETE FROM venue_facilities WHERE venue_id = $1`, [venueId]);
  await client.query(`DELETE FROM venue_accessibility_features WHERE venue_id = $1`, [venueId]);
  await client.query(`DELETE FROM venue_supported_layouts WHERE venue_id = $1`, [venueId]);
  await linkLookups(client, venueId, input);
}

const venueProjection = `v.id, v.name, v.location, v.max_capacity,
  to_char(v.opens_at, 'HH24:MI') AS opens_at, to_char(v.closes_at, 'HH24:MI') AS closes_at, v.is_active`;

export type VenueRecord = {
  id: string; name: string; location: string; max_capacity: number;
  opens_at: string; closes_at: string; is_active: boolean;
};

async function attachDetails(query: Query, venue: VenueRecord) {
  // Sequential, not Promise.all: query() may be bound to a single transaction
  // client (create/update), which cannot multiplex concurrent queries.
  const facilities = await query<{ label: string }>(`SELECT f.label FROM venue_facilities vf
    JOIN facilities f ON f.id = vf.facility_id WHERE vf.venue_id = $1 ORDER BY f.label`, [venue.id]);
  const features = await query<{ label: string }>(`SELECT a.label FROM venue_accessibility_features va
    JOIN accessibility_features a ON a.id = va.feature_id WHERE va.venue_id = $1 ORDER BY a.label`, [venue.id]);
  const layouts = await query<{ label: string; capacity: number }>(`SELECT r.label, vl.capacity FROM venue_supported_layouts vl
    JOIN room_layouts r ON r.id = vl.layout_id WHERE vl.venue_id = $1 ORDER BY r.label`, [venue.id]);
  return {
    ...venue,
    facilities: facilities.rows.map(row => row.label),
    accessibility_features: features.rows.map(row => row.label),
    supported_layouts: layouts.rows,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error) && typeof error === 'object' && (error as { code?: string }).code === '23505';
}

// Distinct from isUniqueViolation(): that one is used where any 23505 means
// "venue name taken". Here we only want the venue_supported_layouts primary
// key (venue_id, layout_id) specifically, so a name clash elsewhere in the
// same transaction is never misreported as a duplicate layout.
function isDuplicateLayoutViolation(error: unknown): boolean {
  return Boolean(error) && typeof error === 'object'
    && (error as { code?: string }).code === '23505'
    && (error as { constraint?: string }).constraint === 'venue_supported_layouts_pkey';
}

export async function searchVenues(
  query: Query,
  user: AuthenticatedUser | undefined,
  search = '',
  requiredLayout?: string,
  requiredAttendance?: number,
  requiredAccessibilityFeatureIds?: string[],
) {
  await requireCatalogueViewer(query, user);
  const hasLayoutFilter = Boolean(requiredLayout) && typeof requiredAttendance === 'number';
  const accessibilityIds = (requiredAccessibilityFeatureIds ?? []).filter(Boolean);
  const hasAccessibilityFilter = accessibilityIds.length > 0;

  // Every suitability check below runs in SQL, before LIMIT 100, not as a JS
  // filter afterward — otherwise a suitable venue ranked past the 100th
  // alphabetical name match would be cut by the LIMIT before its suitability
  // was ever checked (E05-S02 Scenario 2; the same reasoning applies to the
  // E02-S03 accessibility filter added here).
  const params: unknown[] = [search.slice(0, 240)];
  const conditions = ['v.is_active', 'strpos(lower(v.name), lower($1)) > 0'];
  let joins = '';

  if (hasLayoutFilter) {
    joins += ` JOIN venue_supported_layouts vl ON vl.venue_id = v.id JOIN room_layouts r ON r.id = vl.layout_id`;
    params.push(slugify(requiredLayout!));
    conditions.push(`r.code = $${params.length}`);
    params.push(requiredAttendance);
    conditions.push(`vl.capacity >= $${params.length}`);
  }

  if (hasAccessibilityFilter) {
    params.push(accessibilityIds);
    conditions.push(accessibilityMatchCondition(params.length));
  }

  const result = await query<VenueRecord>(`
    SELECT ${venueProjection} FROM venues v
    ${joins}
    WHERE ${conditions.join(' AND ')}
    ORDER BY v.name LIMIT 100
  `, params);

  return Promise.all(result.rows.map(venue => attachDetails(query, venue)));
}

export async function getVenue(query: Query, user: AuthenticatedUser | undefined, id: string) {
  await requireCatalogueViewer(query, user);
  const result = await query<VenueRecord>(`SELECT ${venueProjection} FROM venues v WHERE v.id = $1`, [id]);
  const venue = result.rows[0];
  if (!venue) throw new AccessError(404, 'Venue not found.');
  return attachDetails(query, venue);
}

export async function createVenue(database: Pool, user: AuthenticatedUser | undefined, body: unknown) {
  await requireVenueStaff(poolQuery(database), user);
  const validated = validateVenueInput(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { input } = validated;
  try {
    return await inTransaction(database, async client => {
      const clientQuery: Query = (sql, values) => client.query(sql, values);
      const venueResult = await client.query<{ id: string }>(`
        INSERT INTO venues (name, location, max_capacity, opens_at, closes_at)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, [input.name, input.location, input.max_capacity, input.opens_at, input.closes_at]);
      const venueId = venueResult.rows[0]!.id;
      await linkLookups(client, venueId, input);
      const venue = await attachDetails(clientQuery, {
        id: venueId, name: input.name, location: input.location, max_capacity: input.max_capacity,
        opens_at: input.opens_at, closes_at: input.closes_at, is_active: true,
      });
      return { status: 201, body: { venue } };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: 409, body: { error: 'name_in_use', errors: { name: ['A venue with this name already exists.'] } } };
    }
    throw error;
  }
}

// Only confirmed bookings are flagged, and only when the new capacity is
// strictly below the expected attendance: a venue trimmed to exactly the
// expected attendance is still sufficient, so it is not flagged (E05-S01
// Scenario 2, and the exact-capacity boundary in the story checklist).
async function flagAffectedBookings(client: PoolClient, venueId: string, newCapacity: number): Promise<void> {
  const result = await client.query<{
    event_id: string; coordinator_id: string | null; expected_attendance: number; title: string;
  }>(`
    UPDATE venue_bookings vb SET requires_reconfirmation = true
    FROM events e
    WHERE vb.venue_id = $1 AND vb.event_id = e.id AND vb.status = 'confirmed'
      AND e.expected_attendance > $2 AND vb.requires_reconfirmation = false
    RETURNING e.id AS event_id, e.coordinator_id, e.expected_attendance, e.title
  `, [venueId, newCapacity]);
  for (const booking of result.rows) {
    if (!booking.coordinator_id) continue;
    const shortfall = booking.expected_attendance - newCapacity;
    const message = `Capacity was reduced to ${newCapacity}, which is ${shortfall} below the expected ` +
      `attendance (${booking.expected_attendance}) for "${booking.title}". This booking has been flagged for review.`;
    const notification = await client.query<{ id: string }>(`
      INSERT INTO notifications (user_id, event_id, title, message) VALUES ($1, $2, $3, $4) RETURNING id
    `, [booking.coordinator_id, booking.event_id, 'Booking flagged for review', message]);
    await insertNotificationDelivery(client, notification.rows[0]!.id);
  }
}

export async function updateVenue(database: Pool, user: AuthenticatedUser | undefined, id: string, body: unknown) {
  await requireVenueStaff(poolQuery(database), user);
  return inTransaction(database, async client => {
    const clientQuery: Query = (sql, values) => client.query(sql, values);
    const existing = await client.query<VenueRecord>(`SELECT ${venueProjection} FROM venues v WHERE v.id = $1 FOR UPDATE`, [id]);
    const current = existing.rows[0];
    if (!current) throw new AccessError(404, 'Venue not found.');
    const currentDetails = await attachDetails(clientQuery, current);
    const merged = { ...currentDetails, ...(isPlainObject(body) ? body : {}) };
    const validated = validateVenueInput(merged);
    if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
    const { input } = validated;
    try {
      await client.query(`UPDATE venues SET name = $2, location = $3, max_capacity = $4, opens_at = $5, closes_at = $6
        WHERE id = $1`, [id, input.name, input.location, input.max_capacity, input.opens_at, input.closes_at]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: 409, body: { error: 'name_in_use', errors: { name: ['A venue with this name already exists.'] } } };
      }
      throw error;
    }
    await replaceLookupLinks(client, id, input);
    if (input.max_capacity < current.max_capacity) {
      await flagAffectedBookings(client, id, input.max_capacity);
    }
    const venue = await attachDetails(clientQuery, {
      id, name: input.name, location: input.location, max_capacity: input.max_capacity,
      opens_at: input.opens_at, closes_at: input.closes_at, is_active: current.is_active,
    });
    return { status: 200, body: { venue } };
  });
}

export async function retireVenue(database: Pool, user: AuthenticatedUser | undefined, id: string) {
  await requireVenueStaff(poolQuery(database), user);
  return inTransaction(database, async client => {
    const existing = await client.query<{ id: string }>(`SELECT id FROM venues WHERE id = $1 FOR UPDATE`, [id]);
    if (!existing.rows[0]) throw new AccessError(404, 'Venue not found.');
    const blocking = await client.query<{ event_code: string | null; title: string; starts_at: Date }>(`
      SELECT e.event_code, e.title, lower(vb.booking_range) AS starts_at
      FROM venue_bookings vb JOIN events e ON e.id = vb.event_id
      WHERE vb.venue_id = $1 AND vb.status IN ('pending', 'confirmed') AND lower(vb.booking_range) > now()
      ORDER BY lower(vb.booking_range)
    `, [id]);
    if (blocking.rows.length) {
      return { status: 409, body: {
        retired: false, error: 'future_bookings_exist',
        blockingBookings: blocking.rows.map(row => ({ eventCode: row.event_code, title: row.title, startsAt: row.starts_at })),
      } };
    }
    await client.query(`UPDATE venues SET is_active = false WHERE id = $1`, [id]);
    return { status: 200, body: { retired: true } };
  });
}

export type VenueLayoutMutationInput = { label: string; capacity: number };

function validateLayoutInput(body: unknown):
  | { input: VenueLayoutMutationInput; errors?: never }
  | { errors: VenueErrors; input?: never } {
  if (!isPlainObject(body)) {
    return { errors: { form: ['Submit an object containing label and capacity.'] } };
  }
  const errors: VenueErrors = {};
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) errors.label = ['Layout name is required.'];

  const capacity = body.capacity;
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity <= 0) {
    errors.capacity = ['Capacity must be a whole number greater than 0.'];
  }

  if (Object.keys(errors).length) return { errors };
  return { input: { label, capacity: capacity as number } };
}

// Adds a single layout without disturbing the venue's other layouts,
// facilities or accessibility features — unlike updateVenue, which replaces
// all lookup links wholesale (E05-S02 Scenario 1).
export async function addVenueLayout(database: Pool, user: AuthenticatedUser | undefined, venueId: string, body: unknown) {
  await requireVenueStaff(poolQuery(database), user);
  const validated = validateLayoutInput(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { input } = validated;
  const code = slugify(input.label);

  return inTransaction(database, async client => {
    const venue = await client.query<{ id: string }>(`SELECT id FROM venues WHERE id = $1 FOR UPDATE`, [venueId]);
    if (!venue.rows[0]) throw new AccessError(404, 'Venue not found.');

    // Check for a duplicate by the same normalized code used everywhere else
    // BEFORE touching room_layouts: that table is shared across every venue,
    // and upsertLookup()'s ON CONFLICT DO UPDATE renames its label globally,
    // so a rejected duplicate must never trigger that rename as a side effect.
    const existing = await client.query(`
      SELECT 1 FROM venue_supported_layouts vl JOIN room_layouts r ON r.id = vl.layout_id
      WHERE vl.venue_id = $1 AND r.code = $2
    `, [venueId, code]);
    if (existing.rows[0]) {
      return { status: 200, body: {
        warning: 'layout_already_exists',
        message: `"${input.label}" is already a supported layout for this venue.`,
      } };
    }

    const layoutId = await upsertLookup(client, 'room_layouts', input.label);
    try {
      await client.query(`INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity) VALUES ($1, $2, $3)`,
        [venueId, layoutId, input.capacity]);
    } catch (error) {
      // Belt-and-suspenders against a concurrent add of the same layout
      // racing between the SELECT above and this INSERT.
      if (isDuplicateLayoutViolation(error)) {
        return { status: 200, body: {
          warning: 'layout_already_exists',
          message: `"${input.label}" is already a supported layout for this venue.`,
        } };
      }
      throw error;
    }

    const venueRow = await client.query<VenueRecord>(`SELECT ${venueProjection} FROM venues v WHERE v.id = $1`, [venueId]);
    const clientQuery: Query = (sql, values) => client.query(sql, values);
    const venueDetails = await attachDetails(clientQuery, venueRow.rows[0]!);
    return { status: 201, body: { venue: venueDetails } };
  });
}

function validateCapacityInput(body: unknown):
  | { capacity: number; errors?: never }
  | { errors: VenueErrors; capacity?: never } {
  if (!isPlainObject(body)) {
    return { errors: { form: ['Submit an object containing capacity.'] } };
  }
  const capacity = body.capacity;
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity <= 0) {
    return { errors: { capacity: ['Capacity must be a whole number greater than 0.'] } };
  }
  return { capacity };
}

// Layouts are addressed by label (normalized to the same code used to store
// them) rather than an internal layout_id, so callers never need to know
// about the shared room_layouts lookup table.
export async function updateVenueLayout(database: Pool, user: AuthenticatedUser | undefined, venueId: string, label: string, body: unknown) {
  await requireVenueStaff(poolQuery(database), user);
  const validated = validateCapacityInput(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { capacity } = validated;
  const code = slugify(label);

  return inTransaction(database, async client => {
    const venue = await client.query<{ id: string }>(`SELECT id FROM venues WHERE id = $1 FOR UPDATE`, [venueId]);
    if (!venue.rows[0]) throw new AccessError(404, 'Venue not found.');

    const updated = await client.query(`
      UPDATE venue_supported_layouts vl SET capacity = $3
      FROM room_layouts r
      WHERE vl.venue_id = $1 AND vl.layout_id = r.id AND r.code = $2
    `, [venueId, code, capacity]);
    if (updated.rowCount === 0) throw new AccessError(404, `Layout "${label}" is not on this venue.`);

    const venueRow = await client.query<VenueRecord>(`SELECT ${venueProjection} FROM venues v WHERE v.id = $1`, [venueId]);
    const clientQuery: Query = (sql, values) => client.query(sql, values);
    const venueDetails = await attachDetails(clientQuery, venueRow.rows[0]!);
    return { status: 200, body: { venue: venueDetails } };
  });
}

export async function removeVenueLayout(database: Pool, user: AuthenticatedUser | undefined, venueId: string, label: string) {
  await requireVenueStaff(poolQuery(database), user);
  const code = slugify(label);

  return inTransaction(database, async client => {
    const venue = await client.query<{ id: string }>(`SELECT id FROM venues WHERE id = $1 FOR UPDATE`, [venueId]);
    if (!venue.rows[0]) throw new AccessError(404, 'Venue not found.');

    // validateVenueInput requires at least one supported layout on every
    // create/full-update, so this targeted delete must uphold the same
    // invariant rather than being able to drive a venue to zero layouts.
    const existingCodes = await client.query<{ code: string }>(`
      SELECT r.code FROM venue_supported_layouts vl JOIN room_layouts r ON r.id = vl.layout_id WHERE vl.venue_id = $1
    `, [venueId]);
    if (!existingCodes.rows.some(row => row.code === code)) {
      throw new AccessError(404, `Layout "${label}" is not on this venue.`);
    }
    if (existingCodes.rows.length <= 1) {
      return { status: 409, body: {
        error: 'last_layout',
        errors: { label: ['A venue must have at least one supported layout.'] },
      } };
    }

    const deleted = await client.query(`
      DELETE FROM venue_supported_layouts vl
      USING room_layouts r
      WHERE vl.venue_id = $1 AND vl.layout_id = r.id AND r.code = $2
    `, [venueId, code]);
    if (deleted.rowCount === 0) throw new AccessError(404, `Layout "${label}" is not on this venue.`);

    const venueRow = await client.query<VenueRecord>(`SELECT ${venueProjection} FROM venues v WHERE v.id = $1`, [venueId]);
    const clientQuery: Query = (sql, values) => client.query(sql, values);
    const venueDetails = await attachDetails(clientQuery, venueRow.rows[0]!);
    return { status: 200, body: { venue: venueDetails } };
  });
}

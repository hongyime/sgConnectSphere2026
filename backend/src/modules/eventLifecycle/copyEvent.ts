import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError } from '../eventVisibility/service.js';
import type { EventRecord } from './types.js';
import type { SessionRecord } from '../eventSessions/types.js';

const COPY_START = new Date(0);
const COPY_END = new Date(60 * 60 * 1000);

type SourceEventRow = {
  id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  client_org_id: string;
  organiser_id: string;
  status: EventRecord['status'];
  expected_attendance: number;
  layout_id: string | null;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
  registration_setup: string | null;
  ends_at: Date;
};

type SourceSessionRow = {
  id: string;
  title: string | null;
  expected_attendance: number;
  layout_id: string | null;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
};

type CopiedEventRow = SourceEventRow & {
  status_changed_at: Date;
  start_at: Date;
  end_at: Date;
  dates_pending: boolean;
};

type CopiedSessionRow = SourceSessionRow & {
  id: string;
  event_id: string;
  start_at: Date;
  end_at: Date;
  dates_pending: boolean;
};

type MissingReferenceRow = {
  session_id: string | null;
  reference_id: string | null;
  reference_name: string | null;
  is_active: boolean | null;
};

export type CopyEventResult = {
  event: EventRecord & { datesPending: true };
  sessions: Array<SessionRecord & { datesPending: true }>;
  warnings: string[];
};

function eventFromRow(row: CopiedEventRow): CopyEventResult['event'] {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    purpose: row.purpose ?? undefined,
    clientOrgId: row.client_org_id,
    organiserId: row.organiser_id,
    status: 'draft',
    statusChangedAt: row.status_changed_at,
    startAt: row.start_at,
    endAt: row.end_at,
    datesPending: true,
    expectedAttendance: row.expected_attendance,
    layoutId: row.layout_id ?? undefined,
    venueRequirements: row.venue_requirements ?? undefined,
    accessibilityNote: row.accessibility_note ?? undefined,
    equipmentRequirements: row.equipment_requirements ?? undefined,
    layoutPreference: row.layout_preference ?? undefined,
    registrationSetup: row.registration_setup ?? undefined,
  };
}

function sessionFromRow(row: CopiedSessionRow): SessionRecord & { datesPending: true } {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    datesPending: true,
    expectedAttendance: row.expected_attendance,
    layoutId: row.layout_id ?? undefined,
    venueRequirements: row.venue_requirements ?? undefined,
    accessibilityNote: row.accessibility_note ?? undefined,
    equipmentRequirements: row.equipment_requirements ?? undefined,
    layoutPreference: row.layout_preference ?? undefined,
  };
}

function referenceWarning(kind: string, row: MissingReferenceRow, sourceSessions: SourceSessionRow[]) {
  const session = sourceSessions.find(item => item.id === row.session_id);
  const scope = session ? `Session ${session.title || session.id}` : 'Event requirements';
  return `${scope}: ${kind} reference ${row.reference_name || row.reference_id || 'no longer available'} needs review.`;
}

// The current schema stores venue/equipment requirements as text and enforces
// existing layout/accessibility references with foreign keys. Consequently a
// missing-reference warning cannot be raised from a copied row yet; when those
// requirements gain item IDs, add the warning query here before copying.
export async function copyPreviousEvent(
  database: Pool,
  user: AuthenticatedUser,
  sourceId: string,
  now = new Date(),
): Promise<CopyEventResult> {
  if (!user.isActive || user.role !== 'event_organiser') {
    throw new AccessError(403, 'Only an active Event Organiser can copy an event.');
  }

  return inTransaction(database, async (client: PoolClient) => {
    const sourceResult = await client.query<SourceEventRow>(
      `SELECT id, title, description, purpose, client_org_id, organiser_id, status,
        expected_attendance, layout_id, venue_requirements, accessibility_note,
        equipment_requirements, layout_preference, registration_setup,
        upper(event_range) AS ends_at
       FROM events
       WHERE id = $1 AND organiser_id = $2
       FOR UPDATE`,
      [sourceId, user.id],
    );
    const source = sourceResult.rows[0];
    if (!source) throw new AccessError(404, 'Previous event not found.');
    if (source.status === 'draft' || (source.status !== 'completed' && source.ends_at > now)) {
      throw new AccessError(409, 'Only a completed or past event can be copied.');
    }

    const sourceSessions = (await client.query<SourceSessionRow>(
      `SELECT id, title, expected_attendance, layout_id, venue_requirements,
        accessibility_note, equipment_requirements, layout_preference
       FROM sessions WHERE event_id = $1 ORDER BY id`,
      [source.id],
    )).rows;
    const eventFeatures = (await client.query<{ feature_id: string }>(
      `SELECT feature_id FROM event_accessibility_needs WHERE event_id = $1 ORDER BY feature_id`, [source.id],
    )).rows;
    const eventFacilities = (await client.query<{ facility_id: string }>(
      `SELECT facility_id FROM event_facility_needs WHERE event_id = $1 ORDER BY facility_id`, [source.id],
    )).rows;
    const missingVenues = (await client.query<MissingReferenceRow>(
      `SELECT b.session_id, b.venue_id AS reference_id, v.name AS reference_name, v.is_active
       FROM venue_bookings b LEFT JOIN venues v ON v.id = b.venue_id
       WHERE b.event_id = $1 AND b.status IN ('pending', 'confirmed', 'conflicting')
         AND (v.id IS NULL OR NOT v.is_active)`, [source.id],
    )).rows;
    const missingEquipment = (await client.query<MissingReferenceRow>(
      `SELECT r.session_id, r.equipment_id AS reference_id, e.name AS reference_name, e.is_active
       FROM equipment_reservations r LEFT JOIN equipment e ON e.id = r.equipment_id
       WHERE r.event_id = $1 AND r.status IN ('reserved', 'partial')
         AND (e.id IS NULL OR NOT e.is_active)`, [source.id],
    )).rows;
    const warnings = [
      ...missingVenues.map(row => referenceWarning('Venue', row, sourceSessions)),
      ...missingEquipment.map(row => referenceWarning('Equipment', row, sourceSessions)),
    ];

    const copied = (await client.query<CopiedEventRow>(
      `INSERT INTO events (
         organiser_id, client_org_id, title, description, purpose, status,
         event_range, expected_attendance, layout_id, venue_requirements,
         accessibility_note, equipment_requirements, layout_preference,
         registration_setup, dates_pending
       ) VALUES ($1, $2, $3, $4, $5, 'draft',
         tstzrange($6::timestamptz, $7::timestamptz, '[)'), $8, $9, $10, $11,
         $12, $13, $14, true)
       RETURNING id, title, description, purpose, client_org_id, organiser_id,
         status, status_changed_at, lower(event_range) AS start_at,
         upper(event_range) AS end_at, dates_pending, expected_attendance,
         layout_id, venue_requirements, accessibility_note,
         equipment_requirements, layout_preference, registration_setup,
         upper(event_range) AS ends_at`,
      [
        user.id, source.client_org_id, source.title, source.description, source.purpose,
        COPY_START.toISOString(), COPY_END.toISOString(), source.expected_attendance,
        source.layout_id, source.venue_requirements, source.accessibility_note,
        source.equipment_requirements, source.layout_preference, source.registration_setup,
      ],
    )).rows[0];
    if (!copied) throw new Error('Copied event was not created.');

    // The migration's compatibility trigger creates one default Session for
    // every Event. Replace it so multi-Session structure is copied exactly.
    await client.query('DELETE FROM sessions WHERE event_id = $1', [copied.id]);
    const copiedSessions: CopyEventResult['sessions'] = [];
    for (const session of sourceSessions) {
      const copiedSession = (await client.query<CopiedSessionRow>(
        `INSERT INTO sessions (
           event_id, title, session_range, expected_attendance, layout_id,
           venue_requirements, accessibility_note, equipment_requirements,
           layout_preference, dates_pending
         ) VALUES ($1, $2, tstzrange($3::timestamptz, $4::timestamptz, '[)'),
           $5, $6, $7, $8, $9, $10, true)
         RETURNING id, event_id, title, expected_attendance, layout_id,
           venue_requirements, accessibility_note, equipment_requirements,
           layout_preference, lower(session_range) AS start_at,
           upper(session_range) AS end_at, dates_pending`,
        [
          copied.id, session.title, COPY_START.toISOString(), COPY_END.toISOString(),
          session.expected_attendance, session.layout_id, session.venue_requirements,
          session.accessibility_note, session.equipment_requirements, session.layout_preference,
        ],
      )).rows[0];
      if (!copiedSession) throw new Error('Copied Session was not created.');
      copiedSessions.push(sessionFromRow(copiedSession));

      const features = (await client.query<{ feature_id: string }>(
        `SELECT feature_id FROM session_accessibility_needs WHERE session_id = $1 ORDER BY feature_id`, [session.id],
      )).rows;
      for (const feature of features) {
        await client.query('INSERT INTO session_accessibility_needs (session_id, feature_id) VALUES ($1, $2)', [copiedSession.id, feature.feature_id]);
      }
      const facilities = (await client.query<{ facility_id: string }>(
        `SELECT facility_id FROM session_facility_needs WHERE session_id = $1 ORDER BY facility_id`, [session.id],
      )).rows;
      for (const facility of facilities) {
        await client.query('INSERT INTO session_facility_needs (session_id, facility_id) VALUES ($1, $2)', [copiedSession.id, facility.facility_id]);
      }
    }
    for (const feature of eventFeatures) {
      await client.query('INSERT INTO event_accessibility_needs (event_id, feature_id) VALUES ($1, $2)', [copied.id, feature.feature_id]);
    }
    for (const facility of eventFacilities) {
      await client.query('INSERT INTO event_facility_needs (event_id, facility_id) VALUES ($1, $2)', [copied.id, facility.facility_id]);
    }

    await client.query(
      `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, new_value)
       VALUES ($1, 'event', $2, $2, 'Event copied to draft', 'copy_source', $3)`,
      [user.id, copied.id, source.id],
    );

    return { event: eventFromRow(copied), sessions: copiedSessions, warnings };
  });
}

import { getDatabasePool } from '../../database/client.js';
import type { CreateEventRequest, EventRecord } from './types.js';

export type EventLifecycleRepository = {
  createEvent(request: CreateEventRequest): Promise<EventRecord>;
  findEventById(eventId: string): Promise<EventRecord | null>;
  updateEventStatus(eventId: string, status: EventRecord['status'], reason?: string): Promise<EventRecord>;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  client_org_id: string;
  organiser_id: string;
  coordinator_id: string | null;
  status: EventRecord['status'];
  status_changed_at: Date;
  start_at: Date;
  end_at: Date;
  expected_attendance: number;
  layout_id: string | null;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
  registration_setup: string | null;
};

function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    purpose: row.purpose ?? undefined,
    clientOrgId: row.client_org_id,
    organiserId: row.organiser_id,
    coordinatorId: row.coordinator_id ?? undefined,
    status: row.status,
    statusChangedAt: row.status_changed_at,
    startAt: row.start_at,
    endAt: row.end_at,
    expectedAttendance: row.expected_attendance,
    layoutId: row.layout_id ?? undefined,
    venueRequirements: row.venue_requirements ?? undefined,
    accessibilityNote: row.accessibility_note ?? undefined,
    equipmentRequirements: row.equipment_requirements ?? undefined,
    layoutPreference: row.layout_preference ?? undefined,
    registrationSetup: row.registration_setup ?? undefined,
  };
}

export class PostgresEventLifecycleRepository implements EventLifecycleRepository {
  async createEvent(request: CreateEventRequest): Promise<EventRecord> {
    const result = await getDatabasePool().query<EventRow>(
      `
        INSERT INTO events (
          organiser_id,
          client_org_id,
          title,
          description,
          purpose,
          status,
          event_range,
          expected_attendance,
          layout_id,
          venue_requirements,
          accessibility_note,
          equipment_requirements,
          layout_preference,
          registration_setup
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::event_status,
          tstzrange($7::timestamptz, $8::timestamptz, '[)'),
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15
        )
        RETURNING
          id,
          title,
          description,
          purpose,
          client_org_id,
          organiser_id,
          coordinator_id,
          status,
          status_changed_at,
          lower(event_range) AS start_at,
          upper(event_range) AS end_at,
          expected_attendance,
          layout_id,
          venue_requirements,
          accessibility_note,
          equipment_requirements,
          layout_preference,
          registration_setup
      `,
      [
        request.organiserId,
        request.clientOrgId,
        request.title,
        request.description ?? null,
        request.purpose ?? null,
        request.status ?? 'draft',
        request.startAt.toISOString(),
        request.endAt.toISOString(),
        request.expectedAttendance,
        request.layoutId ?? null,
        request.venueRequirements ?? null,
        request.accessibilityNote ?? null,
        request.equipmentRequirements ?? null,
        request.layoutPreference ?? null,
        request.registrationSetup ?? null,
      ],
    );

    return mapEvent(result.rows[0]);
  }

  async findEventById(eventId: string): Promise<EventRecord | null> {
    const result = await getDatabasePool().query<EventRow>(
      `
        SELECT
          id,
          title,
          description,
          purpose,
          client_org_id,
          organiser_id,
          coordinator_id,
          status,
          status_changed_at,
          lower(event_range) AS start_at,
          upper(event_range) AS end_at,
          expected_attendance,
          layout_id,
          venue_requirements,
          accessibility_note,
          equipment_requirements,
          layout_preference,
          registration_setup
        FROM events
        WHERE id = $1
        LIMIT 1
      `,
      [eventId],
    );

    return result.rows[0] ? mapEvent(result.rows[0]) : null;
  }

  async updateEventStatus(
    eventId: string,
    status: EventRecord['status'],
    reason?: string,
  ): Promise<EventRecord> {
    const result = await getDatabasePool().query<EventRow>(
      `
        UPDATE events
        SET status = $2::event_status,
            decision_reason = COALESCE($3, decision_reason),
            status_changed_at = now()
        WHERE id = $1
        RETURNING
          id,
          title,
          description,
          purpose,
          client_org_id,
          organiser_id,
          coordinator_id,
          status,
          status_changed_at,
          lower(event_range) AS start_at,
          upper(event_range) AS end_at,
          expected_attendance,
          layout_id,
          venue_requirements,
          accessibility_note,
          equipment_requirements,
          layout_preference,
          registration_setup
      `,
      [eventId, status, reason ?? null],
    );

    if (!result.rows[0]) {
      throw new Error(`Event not found: ${eventId}`);
    }

    return mapEvent(result.rows[0]);
  }
}

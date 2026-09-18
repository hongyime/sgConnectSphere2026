import type { Pool, PoolClient } from 'pg';
import { getDatabasePool } from '../../database/client.js';
import { inTransaction } from '../../database/pool.js';
import { validateEventStatusTransition } from './status.js';
import type { CreateEventRequest, EventRecord, EventUpdate } from './types.js';

type SqlRunner = { query: Pool['query'] };

// E02-S03: event_accessibility_needs is a pure join table (event_id,
// feature_id), same shape as venue_accessibility_features. Mirrors the
// venue catalogue's linkLookups/attachDetails pattern in catalogue.ts,
// except there is no upsert-by-label step here - an event links to
// accessibility_features ids the organiser picked from the already-existing
// vocabulary, it never creates new feature rows.
async function linkAccessibilityNeeds(client: SqlRunner, eventId: string, featureIds: string[]): Promise<void> {
  for (const featureId of featureIds) {
    await client.query(
      `INSERT INTO event_accessibility_needs (event_id, feature_id) VALUES ($1, $2)`,
      [eventId, featureId],
    );
  }
}

async function replaceAccessibilityNeeds(client: PoolClient, eventId: string, featureIds: string[]): Promise<void> {
  await client.query(`DELETE FROM event_accessibility_needs WHERE event_id = $1`, [eventId]);
  await linkAccessibilityNeeds(client, eventId, featureIds);
}

async function getAccessibilityFeatureIds(runner: SqlRunner, eventId: string): Promise<string[]> {
  const result = await runner.query<{ feature_id: string }>(
    `SELECT feature_id FROM event_accessibility_needs WHERE event_id = $1 ORDER BY feature_id`,
    [eventId],
  );
  return result.rows.map(row => row.feature_id);
}

export type EventLifecycleRepository = {
  createEvent(request: CreateEventRequest): Promise<EventRecord>;
  findEventById(eventId: string): Promise<EventRecord | null>;
  updateEventStatus(
    eventId: string,
    status: EventRecord['status'],
    actorId: string,
    reason?: string,
  ): Promise<EventRecord>;
  listEventsByOrganiser(organiserId: string, status?: EventRecord['status']): Promise<EventRecord[]>;
  updateEvent(eventId: string, update: EventUpdate): Promise<EventRecord>;
  deleteEvent(eventId: string): Promise<void>;
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
    return inTransaction(getDatabasePool(), async client => {
      const result = await client.query<EventRow>(
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

      const event = mapEvent(result.rows[0]);
      const featureIds = request.accessibilityFeatureIds ?? [];
      await linkAccessibilityNeeds(client, event.id, featureIds);
      return { ...event, accessibilityFeatureIds: featureIds };
    });
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

    if (!result.rows[0]) return null;
    const event = mapEvent(result.rows[0]);
    return { ...event, accessibilityFeatureIds: await getAccessibilityFeatureIds(getDatabasePool(), event.id) };
  }

  async updateEventStatus(
    eventId: string,
    status: EventRecord['status'],
    actorId: string,
    reason?: string,
  ): Promise<EventRecord> {
    return inTransaction(getDatabasePool(), async client => {
      // Lock the row and read its authoritative current status before trusting
      // it for the transition check or the audit entry's old_value. The
      // service layer already did this same read-then-validate before calling
      // in, but that read is not inside this transaction: a concurrent status
      // change between that read and this one must not let an now-illegal
      // transition through, and must not let the audit log record a "before"
      // state that was never actually true.
      const locked = await client.query<{ status: EventRecord['status'] }>(
        `SELECT status FROM events WHERE id = $1 FOR UPDATE`, [eventId],
      );
      const fromStatus = locked.rows[0]?.status;
      if (!fromStatus) {
        throw new Error(`Event not found: ${eventId}`);
      }
      const transition = validateEventStatusTransition(fromStatus, status);
      if (!transition.allowed) {
        throw new Error(`Illegal event status transition: ${fromStatus} -> ${status}`);
      }

      const result = await client.query<EventRow>(
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

      const updated = result.rows[0]!;

      // E14-S02 Scenario 1: the status change and its audit entry commit
      // together, so an event never carries a status the log doesn't explain.
      // Skipped when fromStatus === status (validateEventStatusTransition
      // allows a same-status call as a no-op): nothing changed, so there is
      // nothing to record.
      if (fromStatus !== status) {
        await client.query(
          `INSERT INTO audit_logs (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
           VALUES ($1, 'event', $2, $2, $3, 'status', $4, $5)`,
          [actorId, eventId, `Status changed to ${status}`, fromStatus, status],
        );
      }

      return mapEvent(updated);
    });
  }

  async listEventsByOrganiser(organiserId: string, status?: EventRecord['status']): Promise<EventRecord[]> {
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
        WHERE organiser_id = $1 AND ($2::event_status IS NULL OR status = $2::event_status)
        ORDER BY status_changed_at DESC, id
        LIMIT 100
      `,
      [organiserId, status ?? null],
    );

    return Promise.all(result.rows.map(async row => {
      const event = mapEvent(row);
      return { ...event, accessibilityFeatureIds: await getAccessibilityFeatureIds(getDatabasePool(), event.id) };
    }));
  }

  async updateEvent(eventId: string, update: EventUpdate): Promise<EventRecord> {
    return inTransaction(getDatabasePool(), async client => {
      const result = await client.query<EventRow>(
      `
        UPDATE events
        SET
          title = $2,
          description = $3,
          purpose = $4,
          status = $5::event_status,
          event_range = tstzrange($6::timestamptz, $7::timestamptz, '[)'),
          expected_attendance = $8,
          layout_id = $9,
          venue_requirements = $10,
          accessibility_note = $11,
          equipment_requirements = $12,
          layout_preference = $13,
          registration_setup = $14,
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
      [
        eventId,
        update.title,
        update.description ?? null,
        update.purpose ?? null,
        update.status ?? 'draft',
        update.startAt.toISOString(),
        update.endAt.toISOString(),
        update.expectedAttendance,
        update.layoutId ?? null,
        update.venueRequirements ?? null,
        update.accessibilityNote ?? null,
        update.equipmentRequirements ?? null,
        update.layoutPreference ?? null,
        update.registrationSetup ?? null,
      ],
      );

      if (!result.rows[0]) {
        throw new Error(`Event not found: ${eventId}`);
      }

      const event = mapEvent(result.rows[0]);
      const featureIds = update.accessibilityFeatureIds ?? [];
      await replaceAccessibilityNeeds(client, eventId, featureIds);
      return { ...event, accessibilityFeatureIds: featureIds };
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    // Defense in depth: the service layer already checks status === 'draft'
    // before calling this, but the WHERE clause keeps a submitted request
    // from ever being deleted even if a future caller skips that check.
    const result = await getDatabasePool().query(
      `DELETE FROM events WHERE id = $1 AND status = 'draft'`,
      [eventId],
    );

    if (result.rowCount === 0) {
      throw new Error(`Draft event not found: ${eventId}`);
    }
  }
}

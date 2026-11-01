import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { getDatabasePool } from '../../database/client.js';
import { inTransaction } from '../../database/pool.js';
import { assessArrangementImpact, loadArrangementSnapshot } from '../changeManagement/arrangementImpact.js';
import { applyArrangementImpact, ArrangementsChangedError, loadOverSubscription, withRevision } from '../changeManagement/eventChange.js';
import { captureEventAudience, notifyEventChange, resolveAssignedVenueStaff, writeEventNotification } from '../eventNotifications/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import type { SessionRepository } from './service.js';
import type { SessionEditScope, SessionInput, SessionOption, SessionRecord } from './types.js';

type SessionRow = {
  id: string;
  event_id: string;
  title: string | null;
  start_at: Date;
  end_at: Date;
  expected_attendance: number;
  layout_id: string | null;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
  accessibility_feature_ids?: string[];
  facility_ids?: string[];
};

const COLUMNS = `id, event_id, title, lower(session_range) AS start_at, upper(session_range) AS end_at,
  expected_attendance, layout_id, venue_requirements, accessibility_note,
  equipment_requirements, layout_preference,
  ARRAY(SELECT n.feature_id::text FROM session_accessibility_needs n WHERE n.session_id = sessions.id ORDER BY n.feature_id) AS accessibility_feature_ids,
  ARRAY(SELECT n.facility_id::text FROM session_facility_needs n WHERE n.session_id = sessions.id ORDER BY n.facility_id) AS facility_ids`;

type Client = Pick<PoolClient, 'query'>;

async function readSession(client: Client, sessionId: string): Promise<SessionRecord> {
  return toRecord((await client.query<SessionRow>(`SELECT ${COLUMNS} FROM sessions WHERE id = $1`, [sessionId])).rows[0]!);
}

// Replaces a Session's accessibility and facility needs when the request names
// them. Unknown ids are refused here rather than surfacing as a foreign-key error.
async function writeNeeds(client: Client, sessionId: string, input: SessionInput) {
  const tables = [
    { ids: input.accessibilityFeatureIds, lookup: 'accessibility_features', table: 'session_accessibility_needs', column: 'feature_id', label: 'accessibility feature' },
    { ids: input.facilityIds, lookup: 'facilities', table: 'session_facility_needs', column: 'facility_id', label: 'facility' },
  ] as const;
  for (const { ids, lookup, table, column, label } of tables) {
    if (ids === undefined) continue;
    if (ids.length) {
      const found = Number((await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${lookup} WHERE id = ANY($1::uuid[])`, [ids],
      )).rows[0]!.count);
      if (found !== ids.length) throw new AccessError(400, `A selected ${label} no longer exists.`);
    }
    await client.query(`DELETE FROM ${table} WHERE session_id = $1`, [sessionId]);
    if (ids.length) {
      await client.query(`INSERT INTO ${table} (session_id, ${column}) SELECT $1, unnest($2::uuid[])`, [sessionId, ids]);
    }
  }
}

// Until an Event has a second Session, venue search judges its sole Session by
// the Event's own needs. Copy them onto a Session that has none of its own, so
// they survive once each Session is judged on its own needs.
async function inheritEventNeeds(client: Client, eventId: string, sessionId: string) {
  await client.query(
    `INSERT INTO session_accessibility_needs (session_id, feature_id)
     SELECT $2, n.feature_id FROM event_accessibility_needs n WHERE n.event_id = $1
       AND NOT EXISTS (SELECT 1 FROM session_accessibility_needs own WHERE own.session_id = $2)`,
    [eventId, sessionId],
  );
  await client.query(
    `INSERT INTO session_facility_needs (session_id, facility_id)
     SELECT $2, n.facility_id FROM event_facility_needs n WHERE n.event_id = $1
       AND NOT EXISTS (SELECT 1 FROM session_facility_needs own WHERE own.session_id = $2)`,
    [eventId, sessionId],
  );
}

function toRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    expectedAttendance: row.expected_attendance,
    layoutId: row.layout_id ?? undefined,
    venueRequirements: row.venue_requirements ?? undefined,
    accessibilityNote: row.accessibility_note ?? undefined,
    equipmentRequirements: row.equipment_requirements ?? undefined,
    layoutPreference: row.layout_preference ?? undefined,
    accessibilityFeatureIds: row.accessibility_feature_ids ?? [],
    facilityIds: row.facility_ids ?? [],
  };
}

const VALUES = '$1, $2, tstzrange($3, $4, \'[)\'), $5, $6, $7, $8, $9, $10';
function values(eventId: string, input: SessionInput) {
  return [
    eventId, input.title ?? null, input.startAt, input.endAt, input.expectedAttendance,
    input.layoutId ?? null, input.venueRequirements ?? null, input.accessibilityNote ?? null,
    input.equipmentRequirements ?? null, input.layoutPreference ?? null,
  ];
}

const SET = `title = $3, session_range = tstzrange($4, $5, '[)'), expected_attendance = $6,
  layout_id = $7, venue_requirements = $8, accessibility_note = $9,
  equipment_requirements = $10, layout_preference = $11`;

export function createSessionRepository(db: Pool = getDatabasePool()): SessionRepository {
  return {
  async findEditScope(eventId: string): Promise<SessionEditScope | null> {
    const result = await db.query<{ organiser_id: string; status: SessionEditScope['status'] }>(
      `SELECT organiser_id, status FROM events WHERE id = $1`, [eventId],
    );
    const row = result.rows[0];
    return row ? { organiserId: row.organiser_id, status: row.status } : null;
  },

  async listSessions(eventId: string): Promise<SessionRecord[]> {
    const result = await db.query<SessionRow>(
      `SELECT ${COLUMNS} FROM sessions WHERE event_id = $1 ORDER BY lower(session_range), id`, [eventId],
    );
    return result.rows.map(toRecord);
  },

  async listOptions() {
    const list = async (table: string) => (await db.query<SessionOption>(`SELECT id, label FROM ${table} ORDER BY label, id`)).rows;
    return { layouts: await list('room_layouts'), accessibility: await list('accessibility_features'), facilities: await list('facilities') };
  },

  async insertSession(eventId: string, input: SessionInput): Promise<SessionRecord> {
    return inTransaction(db, async client => {
      await client.query(`SELECT id FROM events WHERE id = $1 FOR NO KEY UPDATE`, [eventId]);
      const existing = (await client.query<{ id: string }>(`SELECT id FROM sessions WHERE event_id = $1`, [eventId])).rows;
      if (existing.length === 1) await inheritEventNeeds(client, eventId, existing[0]!.id);
      const { id } = (await client.query<{ id: string }>(
        `INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id,
           venue_requirements, accessibility_note, equipment_requirements, layout_preference)
         VALUES (${VALUES}) RETURNING id`,
        values(eventId, input),
      )).rows[0]!;
      // A new Session starts from the Event's needs unless the request names its own.
      await inheritEventNeeds(client, eventId, id);
      await writeNeeds(client, id, input);
      return readSession(client, id);
    });
  },

  async updateSession(sessionId: string, eventId: string, input: SessionInput): Promise<SessionRecord | null> {
    return inTransaction(db, async client => {
      const updated = (await client.query<{ id: string }>(
        `UPDATE sessions SET ${SET} WHERE id = $1 AND event_id = $2 RETURNING id`,
        [sessionId, eventId, ...values(eventId, input).slice(1)],
      )).rows[0];
      if (!updated) return null;
      await writeNeeds(client, sessionId, input);
      return readSession(client, sessionId);
    });
  },

  // E10-S02 applied to a single Session: the edit runs inside a savepoint for a
  // preview, and its arrangement impact is compared against the pre-edit
  // snapshot. A stale `reviewed` revision aborts before anything is flagged.
  async updateSessionInPlanning(sessionId: string, eventId: string, actorId: string, input: SessionInput, options: { reviewed?: string; preview?: boolean }) {
    return inTransaction(db, async client => {
      const event = (await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM events WHERE id = $1 FOR NO KEY UPDATE`, [eventId],
      )).rows[0];
      if (!event) return { status: 'not_found' as const };
      if (event.status !== 'planning') return { status: 'not_editable' as const };

      const session = (await client.query<{ id: string }>(
        `SELECT id FROM sessions WHERE id = $1 AND event_id = $2 FOR UPDATE`, [sessionId, eventId],
      )).rows[0];
      if (!session) return { status: 'not_found' as const };

      const query: Query = (sql, values) => client.query(sql, values);
      const before = await loadArrangementSnapshot(query, eventId);
      if (options.preview) await client.query('SAVEPOINT session_preview');

      await client.query(
        `UPDATE sessions SET ${SET} WHERE id = $1 AND event_id = $2`,
        [sessionId, eventId, ...values(eventId, input).slice(1)],
      );
      await writeNeeds(client, sessionId, input);
      const updated = await readSession(client, sessionId);

      const after = await loadArrangementSnapshot(query, eventId);
      const impact = assessArrangementImpact(before, after);
      const overSubscription = await loadOverSubscription(query, eventId);
      const check = withRevision({ impact, overSubscription });

      if (options.preview) {
        await client.query('ROLLBACK TO SAVEPOINT session_preview');
        return { status: 'preview' as const, ...check };
      }
      if (options.reviewed !== undefined && options.reviewed !== check.revision) {
        throw new ArrangementsChangedError(check);
      }

      await applyArrangementImpact(query, actorId, eventId, impact);
      if (impact.affected) {
        const changeId = randomUUID();
        const changedAt = (await client.query<{ now: Date }>('SELECT transaction_timestamp() AS now')).rows[0]!.now;
        const staff = await captureEventAudience(
          client, eventId, {}, [...new Set(impact.bookings.map(booking => booking.venueId))],
        );
        await notifyEventChange(client, {
          changeId,
          occurredAt: changedAt,
          actorId,
          before: staff,
          after: staff,
          change: {
            kind: 'reconfirmation_required',
            venueAffected: impact.bookings.length > 0,
            technicalAffected: impact.reservations.length > 0,
            reasons: [...impact.bookings, ...impact.reservations].flatMap(item => item.reasons),
          },
        });
      }
      return { status: 'updated' as const, session: updated, ...check };
    });
  },

  // Releases the Session's arrangements, audits each one and tells the venues'
  // assigned Venue Staff, all before the Session row disappears. Locks follow the
  // Event -> Venue -> booking order the other arrangement writers use.
  async removeSession(sessionId: string, eventId: string, actorId: string) {
    return inTransaction(db, async client => {
      const event = (await client.query<{ id: string; title: string }>(
        `SELECT id, title FROM events WHERE id = $1 FOR NO KEY UPDATE`, [eventId],
      )).rows[0];
      if (!event) return { status: 'not_found' as const };

      const session = (await client.query<{ id: string; title: string | null }>(
        `SELECT id, title FROM sessions WHERE id = $1 AND event_id = $2 FOR UPDATE`, [sessionId, eventId],
      )).rows[0];
      if (!session) return { status: 'not_found' as const };

      const remaining = Number((await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM sessions WHERE event_id = $1`, [eventId],
      )).rows[0]!.count);
      if (remaining <= 1) return { status: 'last_session' as const };

      const venueIds = (await client.query<{ venue_id: string }>(
        `SELECT DISTINCT venue_id FROM venue_bookings WHERE session_id = $1 ORDER BY venue_id`, [sessionId],
      )).rows.map(row => row.venue_id);
      if (venueIds.length) {
        await client.query(
          `SELECT id FROM venues WHERE id = ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE`, [venueIds],
        );
      }

      const bookings = (await client.query<{ id: string }>(
        `UPDATE venue_bookings SET status = 'released', is_primary = false, requires_reconfirmation = false
         WHERE session_id = $1 AND status IN ('tentative','pending','confirmed','conflicting')
         RETURNING id`, [sessionId],
      )).rows;
      for (const booking of bookings) {
        await client.query(
          `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,new_value)
           VALUES($1,'venue_booking',$2,$3,'Booking Released','status','released')`,
          [actorId, booking.id, eventId],
        );
      }

      const reservations = (await client.query<{ id: string }>(
        `UPDATE equipment_reservations SET status = 'released', requires_reconfirmation = false
         WHERE session_id = $1 AND status IN ('reserved','partial')
         RETURNING id`, [sessionId],
      )).rows;
      for (const reservation of reservations) {
        await client.query(
          `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,new_value)
           VALUES($1,'equipment_reservation',$2,$3,'Equipment reservation released','status','released')`,
          [actorId, reservation.id, eventId],
        );
      }

      const staff = venueIds.length ? await resolveAssignedVenueStaff(client, venueIds) : [];
      if (staff.length) {
        const changeId = randomUUID();
        const occurredAt = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
        for (const userId of staff) {
          await writeEventNotification(client, {
            eventId,
            changeId,
            userId,
            occurredAt,
            title: 'Venue booking released',
            message: `${event.title}: a Session was deleted, so its venue booking was released.`,
          });
        }
      }

      // Scenario 5: the deletion itself is in the Event's activity log, which
      // shows 'event' rows to the Organiser and the Coordinator alike.
      await client.query(
        `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,field_changed,old_value)
         VALUES($1,'event',$2,$2,'Session Deleted','session',$3)`,
        [actorId, eventId, session.title ?? 'Untitled Session'],
      );
      await client.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
      return {
        status: 'deleted' as const,
        releasedBookings: bookings.length,
        releasedReservations: reservations.length,
        notifiedStaff: staff.length,
      };
    });
  },
  };
}

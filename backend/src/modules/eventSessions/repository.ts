import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { getDatabasePool } from '../../database/client.js';
import { inTransaction } from '../../database/pool.js';
import { assessArrangementImpact, loadArrangementSnapshot } from '../changeManagement/arrangementImpact.js';
import { applyArrangementImpact, ArrangementsChangedError, loadOverSubscription, withRevision } from '../changeManagement/eventChange.js';
import { captureEventAudience, notifyEventChange, resolveAssignedVenueStaff, writeEventNotification } from '../eventNotifications/service.js';
import type { Query } from '../eventVisibility/service.js';
import type { SessionRepository } from './service.js';
import type { SessionEditScope, SessionInput, SessionRecord } from './types.js';

type SessionRow = {
  id: string;
  event_id: string;
  title: string | null;
  start_at: Date;
  end_at: Date;
  dates_pending?: boolean;
  expected_attendance: number;
  layout_id: string | null;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
};

const COLUMNS = `id, event_id, title, lower(session_range) AS start_at, upper(session_range) AS end_at,
  dates_pending, expected_attendance, layout_id, venue_requirements, accessibility_note,
  equipment_requirements, layout_preference`;

function toRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    datesPending: row.dates_pending ?? false,
    expectedAttendance: row.expected_attendance,
    layoutId: row.layout_id ?? undefined,
    venueRequirements: row.venue_requirements ?? undefined,
    accessibilityNote: row.accessibility_note ?? undefined,
    equipmentRequirements: row.equipment_requirements ?? undefined,
    layoutPreference: row.layout_preference ?? undefined,
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
  dates_pending = false,
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

  async insertSession(eventId: string, input: SessionInput): Promise<SessionRecord> {
    const result = await db.query<SessionRow>(
      `INSERT INTO sessions (event_id, title, session_range, expected_attendance, layout_id,
         venue_requirements, accessibility_note, equipment_requirements, layout_preference)
       VALUES (${VALUES}) RETURNING ${COLUMNS}`,
      values(eventId, input),
    );
    return toRecord(result.rows[0]!);
  },

  async updateSession(sessionId: string, eventId: string, input: SessionInput): Promise<SessionRecord | null> {
    const result = await db.query<SessionRow>(
      `UPDATE sessions SET ${SET} WHERE id = $1 AND event_id = $2 RETURNING ${COLUMNS}`,
      [sessionId, eventId, ...values(eventId, input).slice(1)],
    );
    return result.rows[0] ? toRecord(result.rows[0]) : null;
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

      const updated = (await client.query<SessionRow>(
        `UPDATE sessions SET ${SET} WHERE id = $1 AND event_id = $2 RETURNING ${COLUMNS}`,
        [sessionId, eventId, ...values(eventId, input).slice(1)],
      )).rows[0]!;

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
      return { status: 'updated' as const, session: toRecord(updated), ...check };
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

      const session = (await client.query<{ id: string }>(
        `SELECT id FROM sessions WHERE id = $1 AND event_id = $2 FOR UPDATE`, [sessionId, eventId],
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

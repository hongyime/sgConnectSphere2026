// E07-S05 (SCRUM-55): Technical Support takes some or all units of an item out
// of service for a period, and returns them. Decisions D36 and D49-D54 are
// recorded in the story's run record
// (docs/plans/scrum-55-implementation-status.md). The pattern follows E05-S04's
// venue blocks (venueBooking/blocks.ts): whole Singapore days, a reason, an
// audit entry per change, and "return to service" deletes the row.
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { notifyEquipmentStaff } from './notifications.js';
import { availabilityRows, capacityFor } from './availability.js';
import { requireEquipmentAccess, type ReservationReview } from './catalogue.js';
import { eventLabel, formatEventDates } from './reservations.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUANTITY = 2147483647;
const REASON_MAX = 255;
const OFFSET = '+08:00';
const SGT_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type UnavailablePeriod = {
  id: string;
  equipmentId: string;
  quantity: number;
  reason: string;
  // Whole Singapore days, inclusive, as the form sends them.
  from: string;
  to: string;
  startsAt: string;
  endsAt: string;
};
type PeriodRow = {
  id: string;
  equipment_id: string;
  quantity: number;
  reason: string;
  starts_at: Date;
  ends_at: Date;
};
type LockedEquipment = {
  id: string;
  name: string;
  total_quantity: number;
  is_active: boolean;
};
type Result = { status: number; body: Record<string, unknown> };

function sgtDate(time: number) {
  return new Date(time + SGT_MS).toISOString().slice(0, 10);
}

// The Singapore-midnight instant for a YYYY-MM-DD string, or undefined.
function parseDay(value: unknown) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return undefined;
  const time = Date.parse(`${value}T00:00:00${OFFSET}`);
  // Date.parse rolls 2027-02-31 over, so round-trip to reject it.
  if (Number.isNaN(time) || sgtDate(time) !== value) return undefined;
  return time;
}

function toPeriod(row: PeriodRow): UnavailablePeriod {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    quantity: row.quantity,
    reason: row.reason,
    from: sgtDate(row.starts_at.getTime()),
    // The stored end is exclusive, so the last day is the one before it.
    to: sgtDate(row.ends_at.getTime() - 1),
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
  };
}

// "1 Dec 2026", the day format the screens use.
export function formatDay(day: string) {
  return new Date(`${day}T00:00:00${OFFSET}`).toLocaleDateString('en-SG', {
    timeZone: 'Asia/Singapore',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function inServiceSentence(inService: number) {
  if (inService <= 0) return 'No units are in service for these dates.';
  return `Only ${inService} ${inService === 1 ? 'unit is' : 'units are'} in service for these dates.`;
}

// D51. Pure, so the unit tests can cover every refusal without a database.
export function validateUnavailabilityInput(body: unknown, now = new Date()) {
  const data =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const errors: Record<string, string[]> = {};
  const start = parseDay(data.from);
  const last = parseDay(data.to);
  if (start === undefined) errors.from = ['Start date must be a real date.'];
  if (last === undefined) errors.to = ['End date must be a real date.'];
  else if (start !== undefined && last < start)
    errors.to = ['End date must be on or after the start date.'];
  else if (sgtDate(last) < sgtDate(now.getTime()))
    errors.to = ['The end date must be today or later.'];
  const quantity = data.quantity;
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUANTITY
  )
    errors.quantity = ['Enter a whole number greater than 0.'];
  const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
  if (!reason) errors.reason = ['Enter a reason.'];
  else if (reason.length > REASON_MAX)
    errors.reason = [`Reason must be at most ${REASON_MAX} characters.`];
  if (Object.keys(errors).length) return { errors };
  return {
    input: {
      quantity: quantity as number,
      reason,
      start: new Date(start!),
      end: new Date(last! + DAY_MS),
    },
  };
}

// The equipment row lock is the one E07-S01's stock changes and E07-S04's
// reservation writers take, so all three wait for each other.
async function lockEquipment(client: PoolClient, equipmentId: string) {
  const equipment = (
    await client.query<LockedEquipment>(
      'SELECT id,name,total_quantity,is_active FROM equipment WHERE id=$1 FOR UPDATE',
      [equipmentId],
    )
  ).rows[0];
  if (!equipment) throw new AccessError(404, 'Equipment not found.');
  if (!equipment.is_active)
    throw new AccessError(
      409,
      "This equipment has been retired, so its availability can't be changed.",
    );
  return equipment;
}

function describe(name: string, period: UnavailablePeriod) {
  return `${name} × ${period.quantity}, ${period.from} to ${period.to}: ${period.reason}`;
}

// D52: one entry per withdrawal and return, against the withdrawal row, as
// E05-S04 audits venue blocks. It is the only record of who made the change.
async function audit(
  client: PoolClient,
  actor: AuthenticatedUser,
  periodId: string,
  action: string,
  oldValue: string | null,
  newValue: string | null,
) {
  await client.query(
    `INSERT INTO audit_logs(actor_id,entity_type,entity_id,action,field_changed,old_value,new_value)
    VALUES ($1,'equipment_unavailability',$2,$3,'unavailable_range',$4,$5)`,
    [actor.id, periodId, action, oldValue, newValue],
  );
}

// Current and future periods. Past ones are history, not something staff can
// still return to service (as E05-S04 lists venue blocks).
export async function listUnavailability(query: Query, equipmentId: string) {
  const rows = (
    await query<PeriodRow>(
      `SELECT id,equipment_id,quantity,reason,lower(unavailable_range) AS starts_at,
        upper(unavailable_range) AS ends_at
      FROM equipment_unavailability WHERE equipment_id=$1 AND upper(unavailable_range)>now()
      ORDER BY lower(unavailable_range),id`,
      [equipmentId],
    )
  ).rows;
  return rows.map(toPeriod);
}

type Active = {
  id: string;
  event_id: string;
  quantity_reserved: number;
  starts_at: Date;
  ends_at: Date;
  event_code: string | null;
  title: string;
  event_starts_at: Date;
  event_ends_at: Date;
  coordinator_id: string | null;
};

// D50, D54: a reservation is affected when it no longer fits, judged with
// E07-S03's calculation over its own remaining dates, leaving the reservation
// itself out (as E07-S04's recheck does). Fit is judged on numbers only: a
// standing "Under maintenance" status is E07-S01's flag, not this one.
async function flagAffected(
  client: PoolClient,
  equipmentId: string,
  period: UnavailablePeriod,
) {
  const active = (
    await client.query<Active>(
      `SELECT r.id,r.event_id,r.quantity_reserved,lower(r.reservation_range) AS starts_at,
        upper(r.reservation_range) AS ends_at,e.event_code,e.title,
        lower(e.event_range) AS event_starts_at,upper(e.event_range) AS event_ends_at,e.coordinator_id
      FROM equipment_reservations r JOIN events e ON e.id=r.event_id
      WHERE r.equipment_id=$1 AND r.status IN ('reserved','partial')
        AND r.reservation_range && tstzrange($2::timestamptz,$3::timestamptz,'[)')
        AND upper(r.reservation_range)>now()
      ORDER BY lower(r.reservation_range),r.id FOR UPDATE OF r`,
      [equipmentId, period.startsAt, period.endsAt],
    )
  ).rows;
  const now = Date.now();
  const affected: Active[] = [];
  for (const reservation of active) {
    const [row] = await availabilityRows(
      (sql, values) => client.query(sql, values),
      new Date(Math.max(reservation.starts_at.getTime(), now)).toISOString(),
      reservation.ends_at.toISOString(),
      equipmentId,
      reservation.id,
    );
    const capacity = capacityFor({ ...row!, operationalStatus: 'available' });
    if (capacity.freeQuantity < reservation.quantity_reserved) affected.push(reservation);
  }
  if (affected.length)
    await client.query(
      'UPDATE equipment_reservations SET requires_reconfirmation=true WHERE id=ANY($1::uuid[])',
      [affected.map((reservation) => reservation.id)],
    );
  return affected;
}

// One notice per affected event to its assigned, active Coordinator, never the
// actor. The change id is fixed per withdrawal, so a retry never sends twice.
async function notifyCoordinators(
  client: PoolClient,
  actor: AuthenticatedUser,
  name: string,
  period: UnavailablePeriod,
  affected: Active[],
  occurredAt: Date,
) {
  let notified = 0;
  for (const eventId of new Set(affected.map((reservation) => reservation.event_id))) {
    const lines = affected.filter((reservation) => reservation.event_id === eventId);
    const event = lines[0]!;
    const reserved = lines.reduce((sum, line) => sum + line.quantity_reserved, 0);
    const units = `${period.quantity} ${period.quantity === 1 ? 'unit' : 'units'}`;
    const message =
      `${eventLabel({ eventCode: event.event_code, title: event.title })}, ` +
      `${formatEventDates(event.event_starts_at, event.event_ends_at)}: ${name} is unavailable from ` +
      `${formatDay(period.from)} to ${formatDay(period.to)} (${period.reason}), ${units} out of service. ` +
      `The reservation of ${reserved} needs review.`;
    await notifyEquipmentStaff(client, { eventId, actorId: actor.id,
      changeId: `equipment-unavailable:${period.id}`, occurredAt,
      title: 'Equipment reservation needs review', message });
    if (!event.coordinator_id || event.coordinator_id === actor.id) continue;
    const coordinator = (
      await client.query(
        `SELECT 1 FROM users WHERE id=$1 AND role='event_coordinator'`,
        [event.coordinator_id],
      )
    ).rows[0];
    if (!coordinator) continue;
    const id = await writeEventNotification(client, {
      eventId,
      changeId: `equipment-unavailable:${period.id}`,
      userId: event.coordinator_id,
      occurredAt,
      title: 'Equipment reservation needs review',
      message,
    });
    if (id) notified += 1;
  }
  return notified;
}

export async function markUnavailable(
  database: Pool,
  user: AuthenticatedUser | undefined,
  equipmentId: unknown,
  body: unknown,
): Promise<Result> {
  // Authorise before validating, so refused roles learn nothing from errors.
  const actor = await requireEquipmentAccess(
    (sql, values) => database.query(sql, values),
    user,
    true,
  );
  if (typeof equipmentId !== 'string' || !uuid.test(equipmentId))
    throw new AccessError(400, 'A valid equipment id is required.');
  const valid = validateUnavailabilityInput(body);
  if (!valid.input)
    return { status: 400, body: { error: 'validation_failed', errors: valid.errors } };
  const input = valid.input;
  return inTransaction(database, async (client) => {
    const equipment = await lockEquipment(client, equipmentId);
    // D51: overlapping withdrawals add up, but never past the item's stock.
    // The peak of the other withdrawals alone, with E07-S03's calculation.
    const [row] = await availabilityRows(
      (sql, values) => client.query(sql, values),
      input.start.toISOString(),
      input.end.toISOString(),
      equipment.id,
    );
    const withdrawn = capacityFor({
      ...row!,
      commitments: row!.commitments.filter((item) => item.kind === 'unavailable'),
    }).unavailableQuantity;
    const inService = equipment.total_quantity - withdrawn;
    if (input.quantity > inService) {
      const message = inServiceSentence(inService);
      return {
        status: 409,
        body: {
          error: 'not_enough_in_service',
          message,
          errors: { quantity: [message] },
          inService: Math.max(0, inService),
        },
      };
    }
    const inserted = (
      await client.query<PeriodRow & { created_at: Date }>(
        `INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason)
        VALUES ($1,$2,tstzrange($3::timestamptz,$4::timestamptz,'[)'),$5)
        RETURNING id,equipment_id,quantity,reason,lower(unavailable_range) AS starts_at,
          upper(unavailable_range) AS ends_at,created_at`,
        [equipment.id, input.quantity, input.start, input.end, input.reason],
      )
    ).rows[0]!;
    const period = toPeriod(inserted);
    await audit(
      client,
      actor,
      period.id,
      'Equipment marked unavailable',
      null,
      describe(equipment.name, period),
    );
    const affected = await flagAffected(client, equipment.id, period);
    const notified = await notifyCoordinators(
      client,
      actor,
      equipment.name,
      period,
      affected,
      inserted.created_at,
    );
    const affectedReservations: ReservationReview[] = affected.map((reservation) => ({
      id: reservation.id,
      eventId: reservation.event_id,
      eventCode: reservation.event_code,
      title: reservation.title,
      quantity: reservation.quantity_reserved,
    }));
    return {
      status: 201,
      body: { unavailability: period, affectedReservations, notified },
    };
  });
}

// D49: return to service deletes the period, as E05-S04 removes a venue block;
// the audit entry keeps what it was. D53: flags stay and nobody is notified.
export async function returnToService(
  database: Pool,
  user: AuthenticatedUser | undefined,
  body: unknown,
): Promise<Result> {
  const actor = await requireEquipmentAccess(
    (sql, values) => database.query(sql, values),
    user,
    true,
  );
  const data =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const periodId = data.unavailabilityId;
  if (typeof periodId !== 'string' || !uuid.test(periodId))
    throw new AccessError(400, 'Choose an unavailable period.');
  const missing = 'This unavailable period was not found. It may already have been returned to service.';
  return inTransaction(database, async (client) => {
    const found = (
      await client.query<{ equipment_id: string }>(
        'SELECT equipment_id FROM equipment_unavailability WHERE id=$1',
        [periodId],
      )
    ).rows[0];
    if (!found) throw new AccessError(404, missing);
    const equipment = await lockEquipment(client, found.equipment_id);
    const row = (
      await client.query<PeriodRow & { ended: boolean }>(
        `SELECT id,equipment_id,quantity,reason,lower(unavailable_range) AS starts_at,
          upper(unavailable_range) AS ends_at,upper(unavailable_range)<=now() AS ended
        FROM equipment_unavailability WHERE id=$1 FOR UPDATE`,
        [periodId],
      )
    ).rows[0];
    if (!row) throw new AccessError(404, missing);
    if (row.ended) throw new AccessError(409, 'This period has already ended.');
    const period = toPeriod(row);
    await client.query('DELETE FROM equipment_unavailability WHERE id=$1', [period.id]);
    await audit(
      client,
      actor,
      period.id,
      'Equipment returned to service',
      describe(equipment.name, period),
      null,
    );
    return {
      status: 200,
      body: { returned: true, equipment: { id: equipment.id, name: equipment.name }, unavailability: period },
    };
  });
}

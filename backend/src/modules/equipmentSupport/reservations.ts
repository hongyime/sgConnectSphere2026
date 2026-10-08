// E07-S04: Technical Support reserves, changes and releases equipment for an
// event's request lines. Decisions D39-D45 are recorded in the story's run
// record (docs/plans/scrum-54-implementation-status.md).
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { availabilityRows, capacityFor } from './availability.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUANTITY = 2147483647;
const ZONE = 'Asia/Singapore';

type Action = 'reserve' | 'change' | 'release';
type LockedEvent = {
  id: string;
  eventCode: string | null;
  title: string;
  status: string;
  coordinatorId: string | null;
  startsAt: Date;
  endsAt: Date;
};
type Reservation = {
  id: string;
  request_id: string;
  equipment_id: string;
  quantity_reserved: number;
  status: 'reserved' | 'partial' | 'released';
  requires_reconfirmation: boolean;
};
type Result = { status: number; body: Record<string, unknown> };

// D40: reserve and change while the event is approved or planning; release
// also once it is cancelled. Nothing changes once the event is confirmed.
const allowedStatuses: Record<Action, string[]> = {
  reserve: ['approved', 'planning'],
  change: ['approved', 'planning'],
  release: ['approved', 'planning', 'cancelled'],
};

export function validateReservationInput(action: Action, body: unknown) {
  const data =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const errors: Record<string, string[]> = {};
  if (action === 'reserve') {
    if (typeof data.requestId !== 'string' || !uuid.test(data.requestId))
      errors.requestId = ['Choose an equipment request to reserve.'];
  } else if (
    typeof data.reservationId !== 'string' ||
    !uuid.test(data.reservationId)
  )
    errors.reservationId = ['Choose a reservation.'];
  if (
    action !== 'release' &&
    (typeof data.quantity !== 'number' ||
      !Number.isInteger(data.quantity) ||
      data.quantity < 1 ||
      data.quantity > MAX_QUANTITY)
  )
    errors.quantity = ['Enter a whole number greater than 0.'];
  if (Object.keys(errors).length) return { errors };
  return {
    input: {
      id: (action === 'reserve' ? data.requestId : data.reservationId) as string,
      quantity: action === 'release' ? 0 : (data.quantity as number),
    },
  };
}

// "15 Oct 2026, 9:00 am – 5:00 pm", the format the screens use (design.md 8.1).
export function formatEventDates(startsAt: Date, endsAt: Date) {
  const day = (value: Date) =>
    value.toLocaleDateString('en-CA', { timeZone: ZONE });
  const start = startsAt.toLocaleString('en-SG', {
    timeZone: ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const end =
    day(startsAt) === day(endsAt)
      ? endsAt.toLocaleTimeString('en-SG', {
          timeZone: ZONE,
          hour: 'numeric',
          minute: '2-digit',
        })
      : endsAt.toLocaleString('en-SG', {
          timeZone: ZONE,
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
  return `${start} – ${end}`;
}

export function eventLabel(event: { eventCode: string | null; title: string }) {
  return event.eventCode && !event.title.startsWith(event.eventCode)
    ? `${event.eventCode} ${event.title}`
    : event.title;
}

export function freeSentence(free: number) {
  if (free <= 0) return "None are free for this event's dates.";
  return `Only ${free} ${free === 1 ? 'is' : 'are'} free for this event's dates.`;
}

async function requireTechnicalSupport(
  query: Query,
  user: AuthenticatedUser | undefined,
  identifier: string,
) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['technical_support_staff']).allowed) {
    await query(
      `INSERT INTO audit_logs(actor_id,entity_type,entity_id,action,new_value)
      VALUES ($1,'screen',gen_random_uuid(),'Access Denied',$2)`,
      [user.id, `equipment_reservations:${identifier.slice(0, 160)}`],
    );
    throw new AccessError(
      403,
      'Access denied. Only Technical Support Staff can reserve equipment.',
    );
  }
  return user;
}

async function lockEvent(client: PoolClient, identifier: string, action: Action) {
  if (!identifier || identifier.length > 160)
    throw new AccessError(400, 'An event id or code is required.');
  const event = (
    await client.query<LockedEvent>(
      `SELECT id,event_code AS "eventCode",title,status,coordinator_id AS "coordinatorId",
        lower(event_range) AS "startsAt",upper(event_range) AS "endsAt"
      FROM events WHERE id::text=$1 OR event_code=$1 FOR NO KEY UPDATE`,
      [identifier],
    )
  ).rows[0];
  if (!event) throw new AccessError(404, 'Event not found.');
  if (!allowedStatuses[action].includes(event.status))
    throw new AccessError(
      409,
      event.status === 'confirmed'
        ? "This event is confirmed, so its equipment reservations can't be changed here."
        : action === 'release'
          ? 'Reservations can only be released while the event is approved, planning or cancelled.'
          : 'Equipment can only be reserved while the event is approved or planning.',
    );
  return event;
}

// Lock order (shared with E07-S01 and E07-S02): event, request line,
// equipment, then the reservation row.
async function lockLine(client: PoolClient, eventId: string, requestId: string) {
  const request = (
    await client.query<{ id: string; equipment_id: string; quantity_requested: number }>(
      `SELECT id,equipment_id,quantity_requested FROM equipment_requests
      WHERE id=$1 AND event_id=$2 FOR NO KEY UPDATE`,
      [requestId, eventId],
    )
  ).rows[0];
  if (!request)
    throw new AccessError(404, 'Equipment request not found for this event.');
  const equipment = (
    await client.query<{
      id: string;
      name: string;
      is_active: boolean;
      operational_status: string;
    }>(
      'SELECT id,name,is_active,operational_status FROM equipment WHERE id=$1 FOR UPDATE',
      [request.equipment_id],
    )
  ).rows[0]!;
  return { request, equipment };
}

async function lockReservation(
  client: PoolClient,
  eventId: string,
  reservationId: string,
) {
  const found = (
    await client.query<{ request_id: string }>(
      'SELECT request_id FROM equipment_reservations WHERE id=$1 AND event_id=$2',
      [reservationId, eventId],
    )
  ).rows[0];
  if (!found)
    throw new AccessError(404, 'Reservation not found for this event.');
  const line = await lockLine(client, eventId, found.request_id);
  const reservation = (
    await client.query<Reservation>(
      'SELECT * FROM equipment_reservations WHERE id=$1 FOR UPDATE',
      [reservationId],
    )
  ).rows[0]!;
  return { ...line, reservation };
}

// Free units for the event's own dates (D39), excluding the reservation being
// changed. Same calculation as E07-S03's availability check. The equipment row
// is already locked and checked as active, so its availability row exists.
async function freeQuantity(
  client: PoolClient,
  event: LockedEvent,
  equipmentId: string,
  excludeReservationId: string | null,
) {
  const [row] = await availabilityRows(
    (sql, values) => client.query(sql, values),
    event.startsAt.toISOString(),
    event.endsAt.toISOString(),
    equipmentId,
    excludeReservationId,
  );
  return capacityFor(row!);
}

// D41: at most the requested quantity, and never more than is free.
function quantityRefusal(
  quantity: number,
  requested: number,
  capacity: ReturnType<typeof capacityFor>,
  name: string,
): Result | null {
  if (quantity > requested) {
    const message = `You can reserve at most the ${requested} requested.`;
    return {
      status: 400,
      body: {
        error: 'more_than_requested',
        message,
        errors: { quantity: [message] },
      },
    };
  }
  if (capacity.operationallyUnavailable) {
    const message = `${name} is not available for use, so none can be reserved.`;
    return {
      status: 409,
      body: {
        error: 'equipment_unavailable',
        message,
        errors: { quantity: [message] },
        freeQuantity: 0,
      },
    };
  }
  if (quantity > capacity.freeQuantity) {
    const message = freeSentence(capacity.freeQuantity);
    return {
      status: 409,
      body: {
        error: 'not_enough_free',
        message,
        errors: { quantity: [message] },
        freeQuantity: capacity.freeQuantity,
      },
    };
  }
  return null;
}

// D43: every reserve, change and release is an entry in the event's Activity
// log. Its id is the stable changeId for the Coordinator's notice (ADR-006).
async function recordActivity(
  client: PoolClient,
  actor: AuthenticatedUser,
  event: LockedEvent,
  action: string,
  oldValue: string | null,
  newValue: string,
) {
  return (
    await client.query<{ id: string; occurred_at: Date }>(
      `INSERT INTO audit_logs(actor_id,entity_type,entity_id,event_id,action,old_value,new_value)
      VALUES ($1,'event',$2,$2,$3,$4,$5) RETURNING id,occurred_at`,
      [actor.id, event.id, action, oldValue, newValue],
    )
  ).rows[0]!;
}

function describe(name: string, reserved: number, requested: number) {
  return reserved === requested
    ? `${name} × ${reserved}`
    : `${name} × ${reserved} of ${requested}`;
}

async function notifyCoordinator(
  client: PoolClient,
  actor: AuthenticatedUser,
  event: LockedEvent,
  change: { id: string; occurred_at: Date },
  title: string,
  name: string,
  reserved: number,
  requested: number,
) {
  if (!event.coordinatorId || event.coordinatorId === actor.id) return 0;
  const outstanding = requested - reserved;
  const what =
    outstanding > 0
      ? `${name} × ${reserved} of ${requested} reserved; ${outstanding} outstanding.`
      : `${name} × ${reserved} reserved.`;
  const id = await writeEventNotification(client, {
    eventId: event.id,
    changeId: change.id,
    userId: event.coordinatorId,
    occurredAt: change.occurred_at,
    title,
    message: `${eventLabel(event)}, ${formatEventDates(event.startsAt, event.endsAt)}: ${what}`,
  });
  return id ? 1 : 0;
}

function outcome(
  event: LockedEvent,
  name: string,
  reservation: Reservation,
  requested: number,
  changed: boolean,
  notified: number,
) {
  return {
    changed,
    notified,
    event: {
      eventCode: event.eventCode,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    },
    reservation: {
      id: reservation.id,
      requestId: reservation.request_id,
      name,
      status: reservation.status,
      quantityReserved: reservation.quantity_reserved,
      quantityRequested: requested,
      outstanding: Math.max(0, requested - reservation.quantity_reserved),
    },
  };
}

async function run(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  action: Action,
  body: unknown,
  work: (
    client: PoolClient,
    actor: AuthenticatedUser,
    input: { id: string; quantity: number },
  ) => Promise<Result>,
): Promise<Result> {
  // Authorise before validating, so refused roles learn nothing from errors.
  const actor = await requireTechnicalSupport(
    (sql, values) => database.query(sql, values),
    user,
    identifier,
  );
  const valid = validateReservationInput(action, body);
  if (!valid.input)
    return {
      status: 400,
      body: { error: 'validation_failed', errors: valid.errors },
    };
  const input = valid.input;
  return inTransaction(database, (client) => work(client, actor, input));
}

export function reserveEquipment(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
) {
  return run(database, user, identifier, 'reserve', body, async (client, actor, input) => {
    const event = await lockEvent(client, identifier, 'reserve');
    const { request, equipment } = await lockLine(client, event.id, input.id);
    if (!equipment.is_active)
      throw new AccessError(
        409,
        "This equipment has been retired, so it can't be reserved.",
      );
    const existing = (
      await client.query(
        `SELECT id FROM equipment_reservations WHERE request_id=$1 AND status IN ('reserved','partial') FOR UPDATE`,
        [request.id],
      )
    ).rows[0];
    if (existing)
      throw new AccessError(
        409,
        'This request is already reserved. Change the reservation instead.',
      );
    const refusal = quantityRefusal(
      input.quantity,
      request.quantity_requested,
      await freeQuantity(client, event, equipment.id, null),
      equipment.name,
    );
    if (refusal) return refusal;
    const status = input.quantity === request.quantity_requested ? 'reserved' : 'partial';
    const reservation = (
      await client.query<Reservation>(
        `INSERT INTO equipment_reservations(request_id,event_id,equipment_id,quantity_reserved,reservation_range,status,reserved_by)
        SELECT $1,e.id,$3,$4,e.event_range,$5,$6 FROM events e WHERE e.id=$2 RETURNING *`,
        [request.id, event.id, equipment.id, input.quantity, status, actor.id],
      )
    ).rows[0]!;
    const change = await recordActivity(
      client,
      actor,
      event,
      'Equipment reserved',
      null,
      describe(equipment.name, input.quantity, request.quantity_requested),
    );
    const notified = await notifyCoordinator(
      client,
      actor,
      event,
      change,
      status === 'reserved' ? 'Equipment reserved' : 'Equipment partly reserved',
      equipment.name,
      input.quantity,
      request.quantity_requested,
    );
    return {
      status: 201,
      body: outcome(event, equipment.name, reservation, request.quantity_requested, true, notified),
    };
  });
}

export function changeReservation(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
) {
  return run(database, user, identifier, 'change', body, async (client, actor, input) => {
    const event = await lockEvent(client, identifier, 'change');
    const { request, equipment, reservation } = await lockReservation(
      client,
      event.id,
      input.id,
    );
    if (reservation.status === 'released')
      throw new AccessError(
        409,
        'This reservation has been released. Reserve the request again instead.',
      );
    if (!equipment.is_active)
      throw new AccessError(
        409,
        "This equipment has been retired, so it can't be reserved.",
      );
    const requested = request.quantity_requested;
    // D45: saving the same quantity still clears "needs review"; otherwise an
    // unchanged reservation is not a change.
    if (
      input.quantity === reservation.quantity_reserved &&
      !reservation.requires_reconfirmation
    )
      return {
        status: 200,
        body: outcome(event, equipment.name, reservation, requested, false, 0),
      };
    const refusal = quantityRefusal(
      input.quantity,
      requested,
      await freeQuantity(client, event, equipment.id, reservation.id),
      equipment.name,
    );
    if (refusal) return refusal;
    const status = input.quantity === requested ? 'reserved' : 'partial';
    // The range follows the event's current dates, in case they moved since.
    const updated = (
      await client.query<Reservation>(
        `UPDATE equipment_reservations r SET quantity_reserved=$2,status=$3,requires_reconfirmation=false,
          reservation_range=e.event_range FROM events e WHERE r.id=$1 AND e.id=r.event_id RETURNING r.*`,
        [reservation.id, input.quantity, status],
      )
    ).rows[0]!;
    const change = await recordActivity(
      client,
      actor,
      event,
      'Equipment reservation changed',
      describe(equipment.name, reservation.quantity_reserved, requested),
      describe(equipment.name, input.quantity, requested),
    );
    const notified = await notifyCoordinator(
      client,
      actor,
      event,
      change,
      'Equipment reservation changed',
      equipment.name,
      input.quantity,
      requested,
    );
    return {
      status: 200,
      body: outcome(event, equipment.name, updated, requested, true, notified),
    };
  });
}

export function releaseReservation(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
) {
  return run(database, user, identifier, 'release', body, async (client, actor, input) => {
    const event = await lockEvent(client, identifier, 'release');
    const { request, equipment, reservation } = await lockReservation(
      client,
      event.id,
      input.id,
    );
    if (reservation.status === 'released')
      throw new AccessError(409, 'This reservation has already been released.');
    // Released rows stay as history; the units count as free again (E07-S03
    // ignores released rows). D42: no notice to the Coordinator.
    const updated = (
      await client.query<Reservation>(
        `UPDATE equipment_reservations SET status='released',requires_reconfirmation=false WHERE id=$1 RETURNING *`,
        [reservation.id],
      )
    ).rows[0]!;
    await recordActivity(
      client,
      actor,
      event,
      'Equipment reservation released',
      describe(equipment.name, reservation.quantity_reserved, request.quantity_requested),
      `${equipment.name} × ${reservation.quantity_reserved} returned to the available pool`,
    );
    return {
      status: 200,
      body: outcome(event, equipment.name, updated, request.quantity_requested, true, 0),
    };
  });
}

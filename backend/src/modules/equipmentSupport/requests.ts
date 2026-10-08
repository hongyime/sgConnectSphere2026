import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { availabilityRows, capacityFor } from './availability.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type RequestInput = { equipmentId: string; quantity: number; notes: string };
type Event = {
  id: string;
  eventCode: string | null;
  title: string;
  status: string;
  coordinatorId: string | null;
  startsAt?: string;
  endsAt?: string;
};
// E07-S04: the line's current reservation, or its latest released one.
export type LineReservation = {
  id: string;
  status: 'reserved' | 'partial' | 'released';
  quantityReserved: number;
  requiresReconfirmation: boolean;
};
export type EquipmentRequest = {
  id: string;
  equipmentId: string;
  name: string;
  quantity: number;
  notes: string;
  totalStock: number;
  operationalStatus: string;
  isActive: boolean;
  reserved: boolean;
  reservation: LineReservation | null;
  freeQuantity?: number | null;
};
export function validateRequestInput(body: unknown) {
  const data =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const errors: Record<string, string[]> = {};
  if (typeof data.equipmentId !== 'string' || !uuid.test(data.equipmentId))
    errors.equipmentId = ['Choose an equipment item.'];
  if (
    typeof data.quantity !== 'number' ||
    !Number.isInteger(data.quantity) ||
    data.quantity < 1 ||
    data.quantity > 2147483647
  )
    errors.quantity = [
      'Quantity must be a whole number between 1 and 2147483647.',
    ];
  if (
    data.notes !== undefined &&
    (typeof data.notes !== 'string' || data.notes.length > 2000)
  )
    errors.notes = ['Notes must be at most 2000 characters.'];
  return Object.keys(errors).length
    ? { errors }
    : {
        input: {
          equipmentId: data.equipmentId as string,
          quantity: data.quantity as number,
          notes: typeof data.notes === 'string' ? data.notes.trim() : '',
        } satisfies RequestInput,
      };
}
async function denied(
  query: Query,
  user: AuthenticatedUser,
  identifier: string,
) {
  await query(
    `INSERT INTO audit_logs(actor_id,entity_type,entity_id,action,new_value)
    VALUES ($1,'screen',gen_random_uuid(),'Access Denied',$2)`,
    [user.id, `equipment_requests:${identifier}`],
  );
}
async function role(
  query: Query,
  user: AuthenticatedUser | undefined,
  write = false,
) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (
    !canActAsRole(
      user,
      write
        ? ['event_coordinator']
        : ['event_coordinator', 'technical_support_staff'],
    ).allowed
  ) {
    await denied(query, user, 'screen');
    throw new AccessError(
      403,
      'Access denied. Only the assigned Coordinator may maintain equipment requests.',
    );
  }
  return user;
}
async function eventFor(
  query: Query,
  user: AuthenticatedUser,
  identifier: string,
  write = false,
  lock = false,
) {
  if (!identifier || identifier.length > 160)
    throw new AccessError(400, 'An event id or code is required.');
  const event = (
    await query<Event>(
      `SELECT id,event_code AS "eventCode",title,status,coordinator_id AS "coordinatorId",
      lower(event_range) AS "startsAt",upper(event_range) AS "endsAt"
    FROM events WHERE id::text=$1 OR event_code=$1 ${lock ? 'FOR NO KEY UPDATE' : ''}`,
      [identifier],
    )
  ).rows[0];
  if (
    !event ||
    (user.role === 'event_coordinator' && event.coordinatorId !== user.id)
  )
    throw new AccessError(
      403,
      'Access denied. This event is not assigned to you.',
    );
  if (write && !['approved', 'planning'].includes(event.status))
    throw new AccessError(
      409,
      'Equipment requests can only be changed while an approved event is being planned.',
    );
  return event;
}
async function rows(query: Query, eventId: string) {
  return (
    await query<EquipmentRequest>(
      `SELECT r.id,r.equipment_id AS "equipmentId",eq.name,r.quantity_requested AS quantity,
    coalesce(r.technical_notes,'') AS notes,eq.total_quantity AS "totalStock",eq.operational_status AS "operationalStatus",eq.is_active AS "isActive",
    EXISTS(SELECT 1 FROM equipment_reservations x WHERE x.request_id=r.id) AS reserved,
    (SELECT jsonb_build_object('id',x.id,'status',x.status,'quantityReserved',x.quantity_reserved,
        'requiresReconfirmation',x.requires_reconfirmation)
      FROM equipment_reservations x WHERE x.request_id=r.id
      ORDER BY (x.status<>'released') DESC,x.created_at DESC,x.id LIMIT 1) AS reservation
    FROM equipment_requests r JOIN equipment eq ON eq.id=r.equipment_id WHERE r.event_id=$1 ORDER BY eq.name,r.id`,
      [eventId],
    )
  ).rows;
}
export async function listEquipmentRequestEvents(
  query: Query,
  user: AuthenticatedUser | undefined,
) {
  const actor = await role(query, user);
  return {
    events: (
      await query(
        `SELECT e.id,e.event_code AS "eventCode",e.title,e.status,
    (SELECT count(*)::int FROM equipment_requests r WHERE r.event_id=e.id) AS "requestCount"
    FROM events e WHERE ($1='event_coordinator' AND e.coordinator_id=$2 AND e.status IN ('approved','planning','confirmed'))
      OR ($1='technical_support_staff' AND EXISTS(SELECT 1 FROM equipment_requests r WHERE r.event_id=e.id))
    ORDER BY lower(e.event_range),e.id`,
        [actor.role, actor.id],
      )
    ).rows,
  };
}
export async function getEquipmentRequests(
  query: Query,
  user: AuthenticatedUser | undefined,
  identifier: string,
) {
  const actor = await role(query, user);
  let event: Event;
  try {
    event = await eventFor(query, actor, identifier);
  } catch (error) {
    if (error instanceof AccessError && error.status === 403)
      await denied(query, actor, identifier);
    throw error;
  }
  const requests = await rows(query, event.id);
  const staff = actor.role === 'technical_support_staff';
  // Technical Support sees what each line could still reserve for the event's
  // dates (its own active reservation counts as free to it).
  if (staff && event.startsAt && event.endsAt)
    for (const line of requests) {
      const active =
        line.reservation && line.reservation.status !== 'released'
          ? line.reservation.id
          : null;
      const [row] = line.isActive
        ? await availabilityRows(
            query,
            new Date(event.startsAt).toISOString(),
            new Date(event.endsAt).toISOString(),
            line.equipmentId,
            active,
          )
        : [];
      line.freeQuantity = row ? capacityFor(row).freeQuantity : null;
    }
  return {
    event,
    requests,
    equipment: (
      await query(
        `SELECT id,name,category,total_quantity,operational_status FROM equipment WHERE is_active ORDER BY name`,
      )
    ).rows,
    canEdit:
      actor.role === 'event_coordinator' &&
      ['approved', 'planning'].includes(event.status),
    // E07-S04 D40: reserve or change while approved or planning; release also
    // once cancelled; nothing once confirmed.
    canReserve: staff && ['approved', 'planning'].includes(event.status),
    canRelease:
      staff && ['approved', 'planning', 'cancelled'].includes(event.status),
  };
}
async function notify(
  client: PoolClient,
  event: Event,
  action: string,
  name: string,
  quantity?: number,
) {
  // A new equipment requirement enters the shared department workload before a
  // technician is assigned. This targeted E07-S02 notice is not the E11 general
  // arrangement-change matrix, whose recipients use existing staff assignments.
  const staff = (
    await client.query<{ id: string }>(
      `SELECT id FROM users WHERE role='technical_support_staff' AND is_active ORDER BY id`,
    )
  ).rows;
  const changeId = randomUUID(),
    occurredAt = new Date();
  for (const user of staff)
    await writeEventNotification(client, {
      eventId: event.id,
      changeId,
      userId: user.id,
      occurredAt,
      title: 'Equipment request updated',
      message: `${event.eventCode ?? event.title}: ${name}${quantity === undefined ? '' : ` × ${quantity}`} ${action}. Review the event's equipment requests.`,
    });
  return staff.length;
}
async function mutate<T>(
  database: Pool,
  actor: AuthenticatedUser,
  identifier: string,
  fn: (
    client: PoolClient,
    event: Event,
    actor: AuthenticatedUser,
  ) => Promise<T>,
) {
  const query: Query = (sql, values) => database.query(sql, values);
  try {
    return await inTransaction(database, async (client) => {
      const event = await eventFor(
        (sql, values) => client.query(sql, values),
        actor,
        identifier,
        true,
        true,
      );
      return fn(client, event, actor);
    });
  } catch (error) {
    if (error instanceof AccessError && error.status === 403)
      await denied(query, actor, identifier);
    throw error;
  }
}
export async function saveEquipmentRequest(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  body: unknown,
  id?: string,
) {
  // Authorize before returning validation details or reading catalogue records.
  const actor = await role(
    (sql, values) => database.query(sql, values),
    user,
    true,
  );
  if (id !== undefined && !uuid.test(id))
    throw new AccessError(400, 'A valid request id is required.');
  const valid = validateRequestInput(body);
  if (!valid.input)
    return {
      status: 400,
      body: { error: 'validation_failed', errors: valid.errors },
    };
  const input = valid.input;
  return mutate(database, actor, identifier, async (client, event, actor) => {
    let previous:
      | {
          id: string;
          equipment_id: string;
          quantity_requested: number;
          technical_notes: string | null;
        }
      | undefined;
    if (id) {
      previous = (
        await client.query<typeof previous & Record<string, unknown>>(
          'SELECT * FROM equipment_requests WHERE id=$1 AND event_id=$2 FOR NO KEY UPDATE',
          [id, event.id],
        )
      ).rows[0];
      if (!previous)
        throw new AccessError(
          404,
          'Equipment request not found for this event.',
        );
      if (
        (
          await client.query(
            'SELECT id FROM equipment_reservations WHERE request_id=$1 LIMIT 1',
            [id],
          )
        ).rowCount
      )
        throw new AccessError(
          409,
          'This request has been reserved and cannot be amended or removed here.',
        );
    }
    // Same equipment lock used by catalogue updates/retirement. Future reservation
    // writers must additionally lock the request before checking/inserting rows.
    const equipment = (
      await client.query<{
        id: string;
        name: string;
        is_active: boolean;
        total_quantity: number;
      }>(
        'SELECT id,name,is_active,total_quantity FROM equipment WHERE id=$1 FOR UPDATE',
        [input.equipmentId],
      )
    ).rows[0];
    if (!equipment?.is_active)
      throw new AccessError(
        409,
        'This equipment is no longer active. Choose another item.',
      );
    const duplicate = (
      await client.query(
        'SELECT id FROM equipment_requests WHERE event_id=$1 AND equipment_id=$2 AND ($3::uuid IS NULL OR id<>$3)',
        [event.id, equipment.id, id ?? null],
      )
    ).rows[0];
    if (duplicate)
      return {
        status: 409,
        body: {
          error: 'equipment_already_requested',
          message:
            'This equipment is already requested for this event. Edit its existing request.',
          errors: { equipmentId: ['Edit the existing request for this item.'] },
        },
      };
    if (
      previous &&
      previous.equipment_id === input.equipmentId &&
      previous.quantity_requested === input.quantity &&
      (previous.technical_notes ?? '') === input.notes
    )
      return {
        status: 200,
        body: {
          requestId: id,
          changed: false,
          notified: 0,
          warning:
            input.quantity > equipment.total_quantity
              ? {
                  name: equipment.name,
                  requested: input.quantity,
                  totalStock: equipment.total_quantity,
                }
              : null,
        },
      };
    const saved = (
      await client.query<{ id: string }>(
        id
          ? `UPDATE equipment_requests SET equipment_id=$1,quantity_requested=$2,technical_notes=$3 WHERE id=$4 AND event_id=$5 RETURNING id`
          : `INSERT INTO equipment_requests(equipment_id,quantity_requested,technical_notes,event_id,requested_by) VALUES($1,$2,$3,$4,$5) RETURNING id`,
        id
          ? [equipment.id, input.quantity, input.notes, id, event.id]
          : [equipment.id, input.quantity, input.notes, event.id, actor.id],
      )
    ).rows[0]!;
    const notified = await notify(
      client,
      event,
      id ? 'amended' : 'requested',
      equipment.name,
      input.quantity,
    );
    return {
      status: id ? 200 : 201,
      body: {
        requestId: saved.id,
        changed: true,
        notified,
        warning:
          input.quantity > equipment.total_quantity
            ? {
                name: equipment.name,
                requested: input.quantity,
                totalStock: equipment.total_quantity,
              }
            : null,
      },
    };
  });
}
export async function removeEquipmentRequest(
  database: Pool,
  user: AuthenticatedUser | undefined,
  identifier: string,
  id: string,
) {
  const actor = await role(
    (sql, values) => database.query(sql, values),
    user,
    true,
  );
  if (!uuid.test(id))
    throw new AccessError(400, 'A valid request id is required.');
  return mutate(database, actor, identifier, async (client, event) => {
    const request = (
      await client.query<{ id: string; name: string }>(
        `SELECT r.id,eq.name FROM equipment_requests r JOIN equipment eq ON eq.id=r.equipment_id WHERE r.id=$1 AND r.event_id=$2 FOR UPDATE OF r`,
        [id, event.id],
      )
    ).rows[0];
    if (!request)
      throw new AccessError(404, 'Equipment request not found for this event.');
    if (
      (
        await client.query(
          'SELECT id FROM equipment_reservations WHERE request_id=$1 LIMIT 1',
          [id],
        )
      ).rowCount
    )
      throw new AccessError(
        409,
        'This request has been reserved and cannot be amended or removed here.',
      );
    await client.query(
      'DELETE FROM equipment_requests WHERE id=$1 AND event_id=$2',
      [id, event.id],
    );
    const notified = await notify(client, event, 'removed', request.name);
    return { status: 200, body: { removed: true, notified } };
  });
}

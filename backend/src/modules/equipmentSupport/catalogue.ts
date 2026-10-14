import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { writeEventNotification } from '../eventNotifications/service.js';

export type EquipmentInput = {
  name: string; category: string; description: string; total_quantity: number;
  home_location: string; operational_status: 'available' | 'maintenance';
};
export type EquipmentRecord = Omit<EquipmentInput, 'operational_status'> & {
  id: string; is_active: boolean; operational_status: 'available' | 'maintenance' | 'retired';
};
export type ReservationReview = { id: string; eventId: string; eventCode: string | null; title: string; quantity: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validId(id: string) { if (!uuid.test(id)) throw new AccessError(400, 'A valid equipment id is required.'); }
export async function requireEquipmentAccess(query: Query, user: AuthenticatedUser | undefined, write = false) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, write ? ['technical_support_staff'] : ['technical_support_staff', 'event_coordinator']).allowed) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
      VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'equipment_catalogue')`, [user.id]);
    throw new AccessError(403, 'Access denied. Only Technical Support Staff can maintain equipment; Coordinators can view it.');
  }
  return user;
}
export function validateEquipmentInput(body: unknown): { input?: EquipmentInput; errors?: Record<string, string[]> } {
  const data = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const errors: Record<string, string[]> = {};
  function text(key: string, label: string, max: number) {
    const value = typeof data[key] === 'string' ? (data[key] as string).trim() : '';
    if (!value || value.length > max) errors[key] = [`${label} is required and must be at most ${max} characters.`];
    return value;
  }
  const name = text('name', 'Equipment name', 160), category = text('category', 'Type', 120);
  const description = text('description', 'Description', 4000), home_location = text('home_location', 'Location', 255);
  const quantity = data.total_quantity;
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
    errors.total_quantity = ['Quantity must be a whole number between 0 and 2147483647.'];
  }
  if (typeof data.operational_status !== 'string' || !['available', 'maintenance'].includes(data.operational_status)) errors.operational_status = ['Choose Working or Under maintenance.'];
  if (Object.keys(errors).length) return { errors };
  return { input: { name, category, description, home_location, total_quantity: quantity as number,
    operational_status: data.operational_status as EquipmentInput['operational_status'] } };
}
export async function listEquipment(query: Query, user: AuthenticatedUser | undefined) {
  await requireEquipmentAccess(query, user);
  return (await query<EquipmentRecord>('SELECT * FROM equipment WHERE is_active ORDER BY name')).rows;
}
export async function getEquipment(query: Query, user: AuthenticatedUser | undefined, id: string) {
  await requireEquipmentAccess(query, user); validId(id);
  const row = (await query<EquipmentRecord>('SELECT * FROM equipment WHERE id=$1', [id])).rows[0];
  if (!row) throw new AccessError(404, 'Equipment not found.');
  const reservations = (await query<ReservationReview & {startsAt: string; endsAt: string; status: string; requiresReconfirmation: boolean}>(`
    SELECT r.id, r.event_id AS "eventId", e.event_code AS "eventCode", e.title, r.quantity_reserved AS quantity,
      lower(r.reservation_range) AS "startsAt", upper(r.reservation_range) AS "endsAt", r.status,
      r.requires_reconfirmation AS "requiresReconfirmation"
    FROM equipment_reservations r JOIN events e ON e.id=r.event_id WHERE r.equipment_id=$1
    ORDER BY lower(r.reservation_range) DESC, r.id`, [id])).rows;
  return {...row, reservations};
}
function unique(error: unknown) { return !!error && typeof error === 'object' && (error as {code?: string}).code === '23505' && (error as {constraint?: string}).constraint === 'equipment_name_key'; }
export async function saveEquipment(database: Pool, user: AuthenticatedUser | undefined, body: unknown, id?: string) {
  const actor = await requireEquipmentAccess((sql, values) => database.query(sql, values), user, true);
  if (id) validId(id);
  const validated = validateEquipmentInput(body);
  if (!validated.input) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const input = validated.input;
  try {
    return await inTransaction(database, async client => {
      let previous: EquipmentRecord | undefined;
      if (id) {
        previous = (await client.query<EquipmentRecord>('SELECT * FROM equipment WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!previous) throw new AccessError(404, 'Equipment not found.');
        if (!previous.is_active) throw new AccessError(409, 'Retired equipment cannot be edited.');
      }
      const values = [input.name, input.category, input.description, input.total_quantity, input.home_location, input.operational_status];
      const equipment = (await client.query<EquipmentRecord>(id
        ? `UPDATE equipment SET name=$1, category=$2, description=$3, total_quantity=$4, home_location=$5, operational_status=$6 WHERE id=$7 RETURNING *`
        : `INSERT INTO equipment (name,category,description,total_quantity,home_location,operational_status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, id ? [...values, id] : values)).rows[0]!;
      let affectedReservations: ReservationReview[] = [];
      if (previous && (input.total_quantity < previous.total_quantity || input.operational_status !== previous.operational_status)) {
        const capacity = input.operational_status === 'available' ? input.total_quantity : 0;
        // Compare peak simultaneous demand within each reservation, not the sum
        // across unrelated dates. Half-open ranges permit back-to-back events.
        affectedReservations = (await client.query<ReservationReview>(`
          WITH active AS (
            SELECT r.*, e.event_code, e.title FROM equipment_reservations r JOIN events e ON e.id=r.event_id
            WHERE r.equipment_id=$1 AND r.status IN ('reserved','partial') AND upper(r.reservation_range)>now()
          ), affected AS (
            SELECT a.id FROM active a WHERE EXISTS (
              SELECT 1 FROM (
                SELECT greatest(lower(a.reservation_range), now()) AS point
                UNION SELECT lower(b.reservation_range) FROM active b WHERE a.reservation_range @> lower(b.reservation_range)
              ) points WHERE (SELECT coalesce(sum(c.quantity_reserved),0) FROM active c WHERE c.reservation_range @> points.point)>$2
            )
          ), flagged AS (
            UPDATE equipment_reservations SET requires_reconfirmation=true WHERE id IN (SELECT id FROM affected) RETURNING id
          )
          SELECT a.id, a.event_id AS "eventId", a.event_code AS "eventCode", a.title, a.quantity_reserved AS quantity
          FROM active a JOIN flagged f ON f.id=a.id ORDER BY a.id`, [equipment.id, capacity])).rows;
        const changeId = randomUUID(), occurredAt = new Date();
        for (const eventId of new Set(affectedReservations.map(r => r.eventId))) {
          const coordinator = (await client.query<{id: string}>(`SELECT u.id FROM events e JOIN users u ON u.id=e.coordinator_id
            WHERE e.id=$1 AND u.is_active AND u.role='event_coordinator'`, [eventId])).rows[0];
          if (coordinator && coordinator.id !== actor.id) {
            const event = affectedReservations.find(r => r.eventId === eventId)!;
            await writeEventNotification(client, { eventId, changeId, userId: coordinator.id, occurredAt,
              title: 'Equipment reservation needs review',
              message: `${event.eventCode ?? event.title}: ${equipment.name} stock or operational status changed. Reservations need review; total stock is ${input.total_quantity}.` });
          }
        }
      }
      return { status: id ? 200 : 201, body: { equipment, affectedReservations } };
    });
  } catch (error) {
    if (unique(error)) return { status: 409, body: { error: 'name_in_use', message: 'An equipment item with this name already exists.', errors: { name: ['Choose a different equipment name.'] } } };
    throw error;
  }
}
export async function retireEquipment(database: Pool, user: AuthenticatedUser | undefined, id: string) {
  await requireEquipmentAccess((sql, values) => database.query(sql, values), user, true); validId(id);
  return inTransaction(database, async client => {
    const equipment = (await client.query<EquipmentRecord>('SELECT * FROM equipment WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!equipment) throw new AccessError(404, 'Equipment not found.');
    const blocking = (await client.query<ReservationReview>(`SELECT r.id, r.event_id AS "eventId", e.event_code AS "eventCode", e.title, r.quantity_reserved AS quantity
      FROM equipment_reservations r JOIN events e ON e.id=r.event_id
      WHERE r.equipment_id=$1 AND r.status IN ('reserved','partial') AND upper(r.reservation_range)>now() ORDER BY lower(r.reservation_range)`, [id])).rows;
    if (blocking.length) return { status: 409, body: { error: 'future_reservations_exist', message: 'Resolve active reservations before retiring this item.', blockingReservations: blocking } };
    await client.query(`UPDATE equipment SET is_active=false, operational_status='retired' WHERE id=$1`, [id]);
    return { status: 200, body: { retired: true } };
  });
}

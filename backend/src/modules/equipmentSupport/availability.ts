import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';

type Commitment = {
  startsAt: string;
  endsAt: string;
  quantity: number;
  kind: 'reserved' | 'unavailable';
};
export type AvailabilityRow = {
  id: string;
  name: string;
  totalStock: number;
  location: string | null;
  operationalStatus: string;
  commitments: Commitment[];
};

// Minimum capacity available throughout the period, not the sum of every row
// that intersects it. Simultaneous releases and starts share one boundary.
export function capacityFor(row: AvailabilityRow) {
  const changes = new Map<number, { reserved: number; unavailable: number }>();
  for (const item of row.commitments) {
    for (const [time, sign] of [
      [item.startsAt, 1],
      [item.endsAt, -1],
    ] as const) {
      const key = Date.parse(time);
      const delta = changes.get(key) ?? { reserved: 0, unavailable: 0 };
      delta[item.kind] += sign * item.quantity;
      changes.set(key, delta);
    }
  }
  let reserved = 0,
    unavailable = 0,
    peak = 0;
  let reservedQuantity = 0,
    unavailableQuantity = 0;
  for (const [, delta] of [...changes].sort(([a], [b]) => a - b)) {
    reserved += delta.reserved;
    unavailable += delta.unavailable;
    if (reserved + unavailable > peak) {
      peak = reserved + unavailable;
      reservedQuantity = reserved;
      unavailableQuantity = unavailable;
    }
  }
  const operationallyUnavailable = row.operationalStatus !== 'available';
  return {
    id: row.id,
    name: row.name,
    totalStock: row.totalStock,
    location: row.location,
    operationalStatus: row.operationalStatus,
    reservedQuantity,
    unavailableQuantity,
    freeQuantity: operationallyUnavailable
      ? 0
      : Math.max(0, row.totalStock - peak),
    operationallyUnavailable,
  };
}

export function availabilityPeriod(params: URLSearchParams) {
  const start = params.get('start') ?? '',
    end = params.get('end') ?? '';
  // Explicit offsets avoid server-local timezone interpretation.
  const timestamp =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  const validDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    const hour = Number(value.slice(11, 13)),
      minute = Number(value.slice(14, 16));
    return (
      timestamp.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
      hour < 24 &&
      minute < 60
    );
  };
  if (!validDate(start) || !validDate(end)) {
    throw new AccessError(
      400,
      'Enter a valid start and end date and time with timezone offsets.',
    );
  }
  if (Date.parse(end) <= Date.parse(start))
    throw new AccessError(400, 'End must be after start.');
  const id = params.get('id');
  if (
    id &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new AccessError(400, 'A valid equipment id is required.');
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    id,
  };
}

export async function checkEquipmentAvailability(
  query: Query,
  user: AuthenticatedUser | undefined,
  params: URLSearchParams,
) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['technical_support_staff']).allowed) {
    await query(
      `INSERT INTO audit_logs(actor_id,entity_type,entity_id,action,new_value)
      VALUES($1,'screen',gen_random_uuid(),'Access Denied','equipment_availability')`,
      [user.id],
    );
    throw new AccessError(
      403,
      'Access denied. Only Technical Support Staff can check equipment availability.',
    );
  }
  const period = availabilityPeriod(params);
  // One statement gives catalogue, reservations and withdrawals one snapshot.
  // Ranges are clipped to the selected half-open period; location is display-only.
  const rows = (
    await query<AvailabilityRow>(
      `
    SELECT eq.id,eq.name,eq.total_quantity AS "totalStock",eq.home_location AS location,
      eq.operational_status AS "operationalStatus",
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'startsAt',greatest(lower(c.slot),$1::timestamptz),
        'endsAt',least(upper(c.slot),$2::timestamptz),
        'quantity',c.quantity,'kind',c.kind)) FROM (
          SELECT reservation_range AS slot,quantity_reserved AS quantity,'reserved' AS kind
          FROM equipment_reservations WHERE equipment_id=eq.id AND status IN ('reserved','partial')
          UNION ALL
          SELECT unavailable_range,quantity,'unavailable' FROM equipment_unavailability WHERE equipment_id=eq.id
        ) c WHERE c.slot && tstzrange($1::timestamptz,$2::timestamptz,'[)')), '[]'::jsonb) AS commitments
    FROM equipment eq WHERE eq.is_active AND ($3::uuid IS NULL OR eq.id=$3::uuid)
    ORDER BY eq.name,eq.id`,
      [period.start, period.end, period.id],
    )
  ).rows;
  if (period.id && rows.length === 0)
    throw new AccessError(404, 'Active equipment not found.');
  return {
    period: { start: period.start, end: period.end },
    equipment: rows.map(capacityFor),
  };
}

// E08-S03 Scenario 6 (TC_E08S03_05): once an event is confirmed, its Organiser
// sees every confirmed venue with its purpose and period, and the equipment
// reserved and the support staffed for it (D66). Added to the Organiser's
// event read (GET /api/events?id=…) after getEvent has passed its own access
// check, so it adds no new access rule. Technician names are internal, so
// support shows only what was asked for and when.
import { NONE_REQUIRED } from '../eventLifecycle/service.js';
import type { Query } from '../eventVisibility/service.js';

export type ConfirmedArrangements = {
  venues: { venueName: string; purpose: string | null; startsAt: string; endsAt: string }[];
  equipment: { name: string; quantity: number }[];
  support: { description: string; startsAt: string; endsAt: string }[];
  equipmentNoneRequired: boolean;
};

const SHOWN_FOR = ['confirmed', 'completed'];

export async function withArrangements<T extends { id: string; status?: unknown }>(query: Query, event: T) {
  if (!SHOWN_FOR.includes(String(event.status))) return { ...event, arrangements: null };
  const venues = await query<{ venue_name: string; purpose: string | null; starts_at: Date; ends_at: Date }>(
    `SELECT v.name AS venue_name, b.purpose, lower(b.booking_range) AS starts_at, upper(b.booking_range) AS ends_at
     FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
     WHERE b.event_id = $1 AND b.status = 'confirmed'
     ORDER BY lower(b.booking_range), v.name, b.id`, [event.id]);
  const equipment = await query<{ name: string; quantity: number }>(
    `SELECT eq.name, x.quantity_reserved AS quantity
     FROM equipment_reservations x JOIN equipment eq ON eq.id = x.equipment_id
     WHERE x.event_id = $1 AND x.status IN ('reserved', 'partial')
     ORDER BY eq.name, x.id`, [event.id]);
  const support = await query<{ description: string; starts_at: Date; ends_at: Date }>(
    `SELECT coalesce(support_description, '') AS description, lower(support_range) AS starts_at, upper(support_range) AS ends_at
     FROM tech_support_requests
     WHERE event_id = $1 AND support_required AND status = 'staffed'
     ORDER BY lower(support_range), id`, [event.id]);
  const requirement = await query<{ equipment_requirements: string | null }>(
    'SELECT equipment_requirements FROM events WHERE id = $1', [event.id]);
  const arrangements: ConfirmedArrangements = {
    venues: venues.rows.map(row => ({
      venueName: row.venue_name, purpose: row.purpose,
      startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
    })),
    equipment: equipment.rows,
    support: support.rows.map(row => ({
      description: row.description, startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
    })),
    equipmentNoneRequired: requirement.rows[0]?.equipment_requirements === NONE_REQUIRED,
  };
  return { ...event, arrangements };
}

import type { Pool, PoolClient } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { inTransaction } from '../../database/pool.js';
import { writeEventNotification } from '../eventNotifications/service.js';
import { formatEventDates } from '../equipmentSupport/reservations.js';
import type { VenueErrors } from './catalogue.js';

// E06-S04 "Decide on a venue booking request" (SCRUM-48). Venue Staff approve
// or reject a Pending booking (Scenarios 1 to 3). Each decision is recorded in
// the audit log with the actor, the booking and its event, in the same
// transaction as the decision (Scenario 5, T-76), and the event's assigned
// Coordinator is notified (Scenarios 1 and 2). Approval is blocked when the
// booking's buffered window overlaps another active booking on the venue, or
// a maintenance block (Scenario 4, C-65, T-66), naming what it clashes with.
// The event's first Confirmed booking becomes its primary venue (O-30,
// docs/contracts/venue-bookings.md).
//
// The Coordinator's "amend to the suggested venue" step of Scenario 2 belongs
// with E06-S03's request flow.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const REASON_MAX = 2000;

export type BookingDecision =
  | { decision: 'approve' }
  | { decision: 'reject'; reason: string; suggestedVenueId: string | null };

type BookingRow = {
  id: string; status: string; starts_at: Date; ends_at: Date;
  venue_id: string; venue_name: string;
  event_id: string; event_code: string | null; event_title: string; expected_attendance: number | null;
  coordinator_id: string | null; coordinator_name: string | null;
  decision_reason: string | null; suggested_venue_id: string | null; suggested_venue_name: string | null;
  decided_by_name: string | null; decided_at: Date | null; created_at: Date; is_primary: boolean;
  suitability_snapshot: unknown;
  approval_conflict_booking_id: string | null; approval_conflict_status: string | null;
  approval_conflict_event_title: string | null;
};

// Why a booking that isn't Pending can't be decided, worded for Venue Staff.
const NOT_DECIDABLE: Record<string, string> = {
  confirmed: 'This request has already been decided, so it can no longer be changed.',
  rejected: 'This request has already been decided, so it can no longer be changed.',
  conflicting: 'This booking conflicts with the current venue schedule and must be resolved before it can be decided.',
  released: 'The Coordinator withdrew this request, so there is nothing to decide.',
  tentative: 'This is a tentative hold, not a request yet, so there is nothing to decide.',
  expired: 'This hold has expired, so there is nothing to decide.',
};

const BOOKING_SELECT = `SELECT vb.id, vb.status, lower(vb.booking_range) AS starts_at, upper(vb.booking_range) AS ends_at,
    v.id AS venue_id, v.name AS venue_name,
    e.id AS event_id, e.event_code, e.title AS event_title, e.expected_attendance,
    e.coordinator_id, c.full_name AS coordinator_name,
    vb.decision_reason, vb.suggested_venue_id, sv.name AS suggested_venue_name,
    d.full_name AS decided_by_name, vb.decided_at, vb.created_at, vb.is_primary, vb.suitability_snapshot,
    vb.approval_conflict_booking_id, conflict_booking.status AS approval_conflict_status,
    conflict_event.title AS approval_conflict_event_title
  FROM venue_bookings vb
  JOIN venues v ON v.id = vb.venue_id
  JOIN events e ON e.id = vb.event_id
  LEFT JOIN users c ON c.id = e.coordinator_id
  LEFT JOIN venues sv ON sv.id = vb.suggested_venue_id
  LEFT JOIN users d ON d.id = vb.decided_by
  LEFT JOIN venue_bookings conflict_booking ON conflict_booking.id = vb.approval_conflict_booking_id
  LEFT JOIN events conflict_event ON conflict_event.id = conflict_booking.event_id`;

// TC_E06S02_04: the advisory suitability result saved at submission (E06-S03),
// shown to Venue Staff when deciding. Advisory only: it never blocks approval.
// Null when no assessment was recorded, as for seeded or older requests.
function advisoryMismatches(snapshot: unknown): string[] | null {
  const mismatches = (snapshot as { mismatches?: unknown } | null)?.mismatches;
  return Array.isArray(mismatches) ? mismatches.filter((item): item is string => typeof item === 'string') : null;
}

export function toBooking(row: BookingRow) {
  return {
    id: row.id, status: row.status,
    startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(),
    venue: { id: row.venue_id, name: row.venue_name },
    event: {
      id: row.event_id, code: row.event_code, title: row.event_title, expectedAttendance: row.expected_attendance,
      coordinatorName: row.coordinator_name,
    },
    decisionReason: row.decision_reason,
    suggestedVenue: row.suggested_venue_id ? { id: row.suggested_venue_id, name: row.suggested_venue_name } : null,
    decidedBy: row.decided_by_name,
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
    requestedAt: row.created_at.toISOString(),
    isPrimary: row.is_primary,
    advisoryMismatches: advisoryMismatches(row.suitability_snapshot),
    approvalConflict: row.approval_conflict_booking_id && row.approval_conflict_status === 'confirmed'
      ? { bookingId: row.approval_conflict_booking_id, eventTitle: row.approval_conflict_event_title }
      : null,
  };
}

// Only Venue Staff decide; any other signed-in user is refused and the
// refusal is recorded (E14-S02 Scenario 2).
async function requireBookingDecider(query: Query, user: AuthenticatedUser | undefined) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['venue_staff']).allowed) {
    await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
      VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'venue_bookings')`, [user.id]);
    throw new AccessError(403, 'Access denied. Only Venue Staff can decide on booking requests.');
  }
  return user;
}

// Pure so the unit tests can cover every rejection without a database.
// Scenario 3: a rejection without a reason is refused.
export function validateDecision(body: unknown):
  | { decision: BookingDecision; errors?: never }
  | { errors: VenueErrors; decision?: never } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { form: ['Submit an object containing a decision.'] } };
  }
  const fields = body as Record<string, unknown>;
  if (fields.decision === 'approve') return { decision: { decision: 'approve' } };
  if (fields.decision !== 'reject') return { errors: { decision: ["Choose 'approve' or 'reject'."] } };

  const errors: VenueErrors = {};
  const reason = typeof fields.reason === 'string' ? fields.reason.trim() : '';
  if (!reason) errors.reason = ['Add a reason for rejecting this request.'];
  else if (reason.length > REASON_MAX) errors.reason = [`The reason must be ${REASON_MAX} characters or fewer.`];

  let suggestedVenueId: string | null = null;
  const suggested = fields.suggested_venue_id;
  if (suggested !== undefined && suggested !== null && suggested !== '') {
    if (typeof suggested !== 'string' || !UUID_PATTERN.test(suggested)) errors.suggested_venue_id = ['Choose a venue from the list.'];
    else suggestedVenueId = suggested;
  }
  if (Object.keys(errors).length) return { errors };
  return { decision: { decision: 'reject', reason, suggestedVenueId } };
}

function poolQuery(database: Pool): Query {
  return (sql, values) => database.query(sql, values);
}

export async function listPendingBookings(query: Query, user: AuthenticatedUser | undefined) {
  await requireBookingDecider(query, user);
  const result = await query<BookingRow>(`${BOOKING_SELECT}
    WHERE vb.status IN ('pending', 'conflicting')
    ORDER BY lower(vb.booking_range), vb.id
    LIMIT 200`);
  return { bookings: result.rows.map(toBooking) };
}

export async function getBooking(query: Query, user: AuthenticatedUser | undefined, bookingId: string) {
  await requireBookingDecider(query, user);
  if (!UUID_PATTERN.test(bookingId)) throw new AccessError(404, 'Booking not found.');
  const result = await query<BookingRow>(`${BOOKING_SELECT} WHERE vb.id = $1`, [bookingId]);
  if (!result.rows[0]) throw new AccessError(404, 'Booking not found.');
  return { booking: toBooking(result.rows[0]) };
}

async function lockBooking(client: PoolClient, bookingId: string) {
  // FOR UPDATE OF vb: two Venue Staff deciding the same request at once are
  // serialised, and the second sees it is no longer Pending.
  const result = await client.query<BookingRow>(`${BOOKING_SELECT} WHERE vb.id = $1 FOR UPDATE OF vb`, [bookingId]);
  return result.rows[0];
}

type Clash = { id: string; status: string; event_code: string | null; event_title: string; starts_at: Date; ends_at: Date };

// Scenario 4: setup and turnaround time count, so two bookings whose advertised
// times don't overlap can still clash. Pending competitors are marked against
// the winner in the approval transaction; only a confirmed booking or a live
// hold prevents this request from winning. The 0016 write guard remains the
// final arbiter for any competing write path.
async function approvalClash(client: PoolClient, row: BookingRow) {
  const booking = (await client.query<Clash>(`SELECT vb.id, vb.status, e.event_code, e.title AS event_title,
      lower(vb.booking_range) AS starts_at, upper(vb.booking_range) AS ends_at
    FROM venue_bookings vb JOIN events e ON e.id = vb.event_id JOIN venues v ON v.id = vb.venue_id
    WHERE vb.venue_id = $1 AND vb.id <> $2
      AND (vb.status = 'confirmed' OR (vb.status::text = 'tentative' AND vb.expires_at > clock_timestamp()))
      AND occupied_window(vb.booking_range, v.setup_time_minutes, v.turnaround_time_minutes)
        && occupied_window(tstzrange($3, $4, '[)'), v.setup_time_minutes, v.turnaround_time_minutes)
    ORDER BY vb.status = 'confirmed' DESC, lower(vb.booking_range), vb.id LIMIT 1`,
  [row.venue_id, row.id, row.starts_at, row.ends_at])).rows[0];
  if (booking) {
    const name = booking.event_code && !booking.event_title.startsWith(booking.event_code)
      ? `${booking.event_code} ${booking.event_title}` : booking.event_title;
    const state = booking.status === 'confirmed' ? 'confirmed' : 'held';
    return {
      error: `This can't be approved: with setup and turnaround time it overlaps the ${state} booking for "${name}" `
        + `(${formatEventDates(booking.starts_at, booking.ends_at)}) at ${row.venue_name}.`,
      conflict: {
        bookingId: booking.id, status: booking.status, eventCode: booking.event_code, eventTitle: booking.event_title,
        startsAt: booking.starts_at.toISOString(), endsAt: booking.ends_at.toISOString(),
      },
    };
  }
  // Maintenance blocks use the advertised times, as the 0016 guard does.
  const block = (await client.query<{ reason: string; starts_at: Date; ends_at: Date }>(`SELECT reason,
      lower(block_range) AS starts_at, upper(block_range) AS ends_at
    FROM venue_blocks WHERE venue_id = $1 AND block_range && tstzrange($2, $3, '[)')
    ORDER BY lower(block_range) LIMIT 1`, [row.venue_id, row.starts_at, row.ends_at])).rows[0];
  if (block) {
    return {
      error: `This can't be approved: ${row.venue_name} is blocked for "${block.reason}" `
        + `(${formatEventDates(block.starts_at, block.ends_at)}).`,
      conflict: { block: { reason: block.reason, startsAt: block.starts_at.toISOString(), endsAt: block.ends_at.toISOString() } },
    };
  }
  return null;
}

async function flagCompetingRequests(client: PoolClient, row: BookingRow, staffId: string) {
  const flagged = await client.query<{ id: string; event_id: string }>(`UPDATE venue_bookings competitor
    SET approval_conflict_booking_id = $2
    FROM venues v
    WHERE competitor.venue_id = $1 AND v.id = competitor.venue_id
      AND competitor.id <> $2 AND competitor.status = 'pending'
      AND occupied_window(competitor.booking_range, v.setup_time_minutes, v.turnaround_time_minutes)
        && occupied_window(tstzrange($3, $4, '[)'), v.setup_time_minutes, v.turnaround_time_minutes)
      AND competitor.approval_conflict_booking_id IS DISTINCT FROM $2
    RETURNING competitor.id, competitor.event_id`, [row.venue_id, row.id, row.starts_at, row.ends_at]);

  for (const competitor of flagged.rows) {
    await client.query(`INSERT INTO audit_logs
        (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
      VALUES ($1, 'venue_booking', $2, $3, 'Booking Conflict Flagged', 'approval_conflict_booking_id', NULL, $4)`,
    [staffId, competitor.id, competitor.event_id, row.id]);
  }
}

// Another Venue Staff member's approval that commits first is still refused
// by the 0016 guard (23P01); say so instead of failing with a server error.
const VENUE_JUST_TAKEN = 'This venue was just taken for an overlapping time. Reload the request to see what is now in the way.';

function decisionMessage(staffName: string, row: BookingRow, decision: BookingDecision, suggestedName: string | null) {
  const when = formatEventDates(row.starts_at, row.ends_at);
  const subject = `your request for ${row.venue_name} for "${row.event_title}" (${when})`;
  if (decision.decision === 'approve') {
    return { title: 'Venue booking approved', message: `${staffName} approved ${subject}. The booking is now Confirmed.` };
  }
  const alternative = suggestedName ? `\n\nSuggested alternative: ${suggestedName}` : '';
  return {
    title: 'Venue booking rejected',
    message: `${staffName} rejected ${subject}.\n\nReason: ${decision.reason}${alternative}`,
  };
}

//   POST /api/venues { action: 'decide', booking_id, decision: 'approve' }
//   POST /api/venues { action: 'decide', booking_id, decision: 'reject', reason, suggested_venue_id? }
export async function decideBooking(database: Pool, user: AuthenticatedUser | undefined, bookingId: unknown, body: unknown) {
  const staff = await requireBookingDecider(poolQuery(database), user);
  if (typeof bookingId !== 'string' || !UUID_PATTERN.test(bookingId)) {
    return { status: 400, body: { error: 'validation_failed', errors: { booking_id: ['A booking id is required.'] } } };
  }
  const validated = validateDecision(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const decision = validated.decision;

  return inTransaction(database, async client => {
    // Lock the event, then the venue, then the booking: the order hold and
    // request writes use, so concurrent writers queue rather than deadlock.
    // The event lock also serialises two approvals racing to become primary.
    const target = (await client.query<{ venue_id: string; event_id: string }>(
      'SELECT venue_id, event_id FROM venue_bookings WHERE id = $1', [bookingId])).rows[0];
    if (!target) return { status: 404, body: { error: 'Booking not found.' } };
    await client.query('SELECT id FROM events WHERE id = $1 FOR NO KEY UPDATE', [target.event_id]);
    await client.query('SELECT id FROM venues WHERE id = $1 FOR NO KEY UPDATE', [target.venue_id]);
    const row = await lockBooking(client, bookingId);
    if (!row) return { status: 404, body: { error: 'Booking not found.' } };
    if (row.status !== 'pending') {
      return { status: 409, body: { error: NOT_DECIDABLE[row.status] ?? NOT_DECIDABLE.confirmed } };
    }
    if (decision.decision === 'approve') {
      const clash = await approvalClash(client, row);
      if (clash) {
        const error = row.approval_conflict_booking_id
          ? `${VENUE_JUST_TAKEN} ${clash.error}`
          : clash.error;
        return { status: 409, body: { ...clash, error } };
      }
      // A flagged request may be approved once the former winner no longer
      // occupies this venue. The live conflict check above is authoritative.
      if (row.approval_conflict_booking_id) {
        await client.query(`UPDATE venue_bookings SET approval_conflict_booking_id = NULL
          WHERE id = $1 AND approval_conflict_booking_id = $2`, [row.id, row.approval_conflict_booking_id]);
      }
      await flagCompetingRequests(client, row, staff.id);
    }

    let suggestedName: string | null = null;
    if (decision.decision === 'reject' && decision.suggestedVenueId) {
      if (decision.suggestedVenueId === row.venue_id) {
        return { status: 400, body: { error: 'validation_failed', errors: { suggested_venue_id: ['Suggest a different venue from the one requested.'] } } };
      }
      const suggested = await client.query<{ name: string }>(
        'SELECT name FROM venues WHERE id = $1 AND is_active', [decision.suggestedVenueId]);
      if (!suggested.rows[0]) {
        return { status: 400, body: { error: 'validation_failed', errors: { suggested_venue_id: ['Choose an active venue from the list.'] } } };
      }
      suggestedName = suggested.rows[0].name;
    }

    const newStatus = decision.decision === 'approve' ? 'confirmed' : 'rejected';
    try {
      await client.query(`UPDATE venue_bookings
        SET status = $2::booking_status, decided_by = $3, decided_at = now(),
            decision_reason = $4, suggested_venue_id = $5
        WHERE id = $1`,
      [row.id, newStatus, staff.id,
        decision.decision === 'reject' ? decision.reason : null,
        decision.decision === 'reject' ? decision.suggestedVenueId : null]);
    } catch (error) {
      if ((error as { code?: string }).code === '23P01') throw new AccessError(409, VENUE_JUST_TAKEN);
      throw error;
    }
    // O-30: the first Confirmed booking becomes primary if the event has none.
    // A later one stays secondary until the Coordinator selects it.
    if (decision.decision === 'approve') {
      await client.query(`UPDATE venue_bookings SET is_primary = true
        WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM venue_bookings WHERE event_id = $2 AND is_primary)`,
      [row.id, row.event_id]);
    }

    // Scenario 5: actor, action, affected booking and event, and time.
    const audit = await client.query<{ id: string; occurred_at: Date }>(`INSERT INTO audit_logs
        (actor_id, entity_type, entity_id, event_id, action, field_changed, old_value, new_value)
      VALUES ($1, 'venue_booking', $2, $3, $4, 'status', 'pending', $5) RETURNING id, occurred_at`,
    [staff.id, row.id, row.event_id, decision.decision === 'approve' ? 'Booking Approved' : 'Booking Rejected', newStatus]);

    // The audit ID is the change ID (T-64), so a retried decision cannot send
    // the Coordinator a second notice. An event with no assigned Coordinator
    // has nobody to tell yet.
    let notified = false;
    if (row.coordinator_id) {
      const staffName = (await client.query<{ full_name: string }>(
        'SELECT full_name FROM users WHERE id = $1', [staff.id])).rows[0]?.full_name ?? 'Venue Staff';
      const notice = decisionMessage(staffName, row, decision, suggestedName);
      notified = Boolean(await writeEventNotification(client, {
        eventId: row.event_id, changeId: audit.rows[0]!.id, userId: row.coordinator_id,
        occurredAt: audit.rows[0]!.occurred_at, ...notice,
      }));
    }

    const updated = await lockBooking(client, row.id);
    return { status: 200, body: { booking: toBooking(updated!), coordinatorNotified: notified } };
  });
}

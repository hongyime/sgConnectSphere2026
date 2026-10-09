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
// Coordinator is notified (Scenarios 1 and 2).
//
// Not here yet: the buffered-window check on approval (Scenario 4) waits for
// PR #231's occupied_window() and the shared 0013 booking migration (#244,
// #245); the Coordinator's "amend to the suggested venue" step of Scenario 2
// belongs with E06-S03's request flow.

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
  decided_by_name: string | null; decided_at: Date | null; created_at: Date;
};

const BOOKING_SELECT = `SELECT vb.id, vb.status, lower(vb.booking_range) AS starts_at, upper(vb.booking_range) AS ends_at,
    v.id AS venue_id, v.name AS venue_name,
    e.id AS event_id, e.event_code, e.title AS event_title, e.expected_attendance,
    e.coordinator_id, c.full_name AS coordinator_name,
    vb.decision_reason, vb.suggested_venue_id, sv.name AS suggested_venue_name,
    d.full_name AS decided_by_name, vb.decided_at, vb.created_at
  FROM venue_bookings vb
  JOIN venues v ON v.id = vb.venue_id
  JOIN events e ON e.id = vb.event_id
  LEFT JOIN users c ON c.id = e.coordinator_id
  LEFT JOIN venues sv ON sv.id = vb.suggested_venue_id
  LEFT JOIN users d ON d.id = vb.decided_by`;

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
    WHERE vb.status = 'pending'
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
    const row = await lockBooking(client, bookingId);
    if (!row) return { status: 404, body: { error: 'Booking not found.' } };
    if (row.status !== 'pending') {
      return { status: 409, body: { error: 'This request has already been decided, so it can no longer be changed.' } };
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
    await client.query(`UPDATE venue_bookings
      SET status = $2::booking_status, decided_by = $3, decided_at = now(),
          decision_reason = $4, suggested_venue_id = $5
      WHERE id = $1`,
    [row.id, newStatus, staff.id,
      decision.decision === 'reject' ? decision.reason : null,
      decision.decision === 'reject' ? decision.suggestedVenueId : null]);

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

import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from '../eventNotifications/service.js';
import { applyEventStatusChange } from '../eventLifecycle/repository.js';
import { EXPIRED, holdsVenue, formatSgt } from './bookingShared.js';
import { venueSearch } from './search.js';
import { assessEventVenue } from './suitability.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type BookingInput = { event_id: string; venue_id: string; starts_at: string; ends_at: string; purpose: string | null; headcount: number | null; replaces_booking_id?: string };
export function validateBookingInput(body: Record<string, unknown>) {
  const errors: Record<string, string[]> = {};
  const identifier = typeof body.event_id === 'string' ? body.event_id.trim() : '';
  if (!identifier || identifier.length > 160) errors.event_id = ['An event id or code is required.'];
  const venue = typeof body.venue_id === 'string' ? body.venue_id : '';
  if (!UUID.test(venue)) errors.venue_id = ['Select a venue.'];
  const instant = (key: string) => {
    const raw = body[key];
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(raw) || !Number.isFinite(Date.parse(raw))) {
      errors[key] = ['Enter a valid date and time with a timezone.']; return '';
    }
    return new Date(raw).toISOString();
  };
  const start = instant('starts_at'), end = instant('ends_at');
  if (start && end && start >= end) errors.ends_at = ['The booking must end after it starts.'];
  let purpose: string | null = null;
  if (body.purpose !== undefined && body.purpose !== null) {
    if (typeof body.purpose !== 'string' || body.purpose.trim().length > 80) errors.purpose = ['Purpose must be at most 80 characters.'];
    else purpose = body.purpose.trim() || null;
  }
  const replacement = body.replaces_booking_id;
  if (replacement !== undefined && (typeof replacement !== 'string' || !UUID.test(replacement))) errors.replaces_booking_id = ['Select a rejected booking to replace.'];
  const headcount = body.headcount === undefined || body.headcount === null ? null : body.headcount;
  if (headcount !== null && (typeof headcount !== 'number' || !Number.isInteger(headcount) || headcount <= 0 || headcount > 2147483647)) errors.headcount = ['Enter a whole number greater than zero.'];
  return Object.keys(errors).length ? { errors } : { input: { event_id: identifier, venue_id: venue, starts_at: start, ends_at: end, purpose, headcount: headcount as number | null, ...(replacement === undefined ? {} : { replaces_booking_id: replacement as string }) } satisfies BookingInput };
}

type EventRow = { id: string; status: 'approved' | 'planning'; coordinator_id: string | null; starts_at: Date; ends_at: Date };
type HoldRow = { id: string; event_id: string; venue_id: string; status: string; expires_at: Date | null; starts_at: Date; ends_at: Date; purpose: string | null; headcount: number | null; requested_by: string | null };
async function returnedBooking(client: PoolClient, id: string) {
  return (await client.query(`SELECT id,event_id,venue_id,session_id,status,purpose,headcount,requested_by,requested_at,is_primary,replaces_booking_id,
    lower(booking_range) AS starts_at,upper(booking_range) AS ends_at,suitability_snapshot AS suitability
    FROM venue_bookings WHERE id=$1`, [id])).rows[0];
}

// Both callers share locks, validation, transaction and effects. Sprint 3 accepts
// event-based input only for an event with one Session; never guess among many.
export async function submitBooking(database: Pool, user: AuthenticatedUser | undefined, body: unknown,
  idempotencyKey?: string, options: NotificationOptions = {}) {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, ['event_coordinator']).allowed) throw new AccessError(403, 'Only the assigned Event Coordinator can request a venue.');
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const converting = data.action === 'convert_hold';
  if (converting && (typeof data.booking_id !== 'string' || !UUID.test(data.booking_id))) throw new AccessError(400, 'A booking id is required.');
  if (!converting && (!idempotencyKey || !UUID.test(idempotencyKey))) throw new AccessError(400, 'An Idempotency-Key UUID header is required.');
  const validated = converting ? undefined : validateBookingInput(data);
  if (validated?.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  try {
    return await inTransaction(database, async client => {
      const event = (await client.query<EventRow>(`SELECT id,status,coordinator_id,lower(event_range) AS starts_at,upper(event_range) AS ends_at
        FROM events WHERE ${converting ? 'id=(SELECT event_id FROM venue_bookings WHERE id=$1)' : '(id::text=$1 OR event_code=$1)'} FOR NO KEY UPDATE`,
      [converting ? data.booking_id : validated!.input!.event_id])).rows[0];
      if (!event) throw new AccessError(404, 'Assigned event not found.');
      if (event.coordinator_id !== user.id) throw new AccessError(converting ? 403 : 404, converting ? 'Access denied. This event is not assigned to you.' : 'Assigned event not found.');
      // Recheck account under lock: a request cannot outlive deactivation/locking.
      const account = (await client.query<{ is_active: boolean; role: string; locked_until: Date | null; failed_login_count: number }>(
        'SELECT is_active,role,locked_until,failed_login_count FROM users WHERE id=$1 FOR SHARE', [user.id])).rows[0];
      if (!account?.is_active || account.role !== 'event_coordinator' || account.failed_login_count >= 5 || (account.locked_until && account.locked_until > new Date())) throw new AccessError(403, 'Your account cannot submit booking requests.');
      let hold: HoldRow | undefined;
      let input = validated?.input;
      if (converting) {
        // Lock order agrees with holds/expiry: Event, Venue, Booking.
        await client.query('SELECT v.id FROM venues v JOIN venue_bookings b ON b.venue_id=v.id WHERE b.id=$1 FOR NO KEY UPDATE OF v', [data.booking_id]);
        hold = (await client.query<HoldRow>(`SELECT id,event_id,venue_id,status,expires_at,purpose,headcount,requested_by,
          lower(booking_range) AS starts_at,upper(booking_range) AS ends_at FROM venue_bookings WHERE id=$1 FOR UPDATE`, [data.booking_id])).rows[0];
        if (!hold) throw new AccessError(404, 'Tentative hold not found.');
        // Preserve the existing conversion retry behaviour for legacy Pending
        // rows and reassigned events; do not fabricate or rewrite their requester.
        if (hold.status === 'pending') {
          const booking = await returnedBooking(client, hold.id);
          return { status: 200, body: { booking, suitability: booking.suitability, event_status: event.status, replayed: true } };
        }
        const now = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
        if (hold.status !== 'tentative' || !hold.expires_at || hold.expires_at <= now) throw new AccessError(409, EXPIRED);
        input = { event_id: event.id, venue_id: hold.venue_id, starts_at: hold.starts_at.toISOString(), ends_at: hold.ends_at.toISOString(), purpose: hold.purpose, headcount: hold.headcount };
      } else {
        // Normalize the event identifier before comparing a replay payload.
        input = { ...input!, event_id: event.id };
        const previous = (await client.query<{ id: string; submission_payload: BookingInput }>(
          'SELECT id,submission_payload FROM venue_bookings WHERE requested_by=$1 AND submission_key=$2', [user.id, idempotencyKey])).rows[0];
        if (previous) {
          if (JSON.stringify(previous.submission_payload, Object.keys(previous.submission_payload).sort()) !== JSON.stringify(input, Object.keys(input).sort())) throw new AccessError(409, 'This submission key was already used for a different request.');
          const booking = await returnedBooking(client, previous.id);
          return { status: 200, body: { booking, suitability: booking.suitability, event_status: event.status, replayed: true } };
        }
      }
      if (input!.replaces_booking_id) {
        const rejected = (await client.query<{ status: string; event_id: string; suggested_venue_id: string | null; conflict_block_id: string | null; status_before_conflict: string | null }>(
          'SELECT status,event_id,suggested_venue_id,conflict_block_id,status_before_conflict FROM venue_bookings WHERE id=$1 FOR UPDATE', [input!.replaces_booking_id])).rows[0];
        const lost = rejected?.status === 'conflicting' && rejected.conflict_block_id && ['pending','confirmed'].includes(rejected.status_before_conflict ?? '');
        if (!rejected || rejected.event_id !== event.id || (!lost && (rejected.status !== 'rejected' || rejected.suggested_venue_id !== input!.venue_id)))
          throw new AccessError(409, 'This booking has no valid suggested or lost-venue replacement context.');
        if ((await client.query("SELECT id FROM venue_bookings WHERE replaces_booking_id=$1 AND status<>'released'", [input!.replaces_booking_id])).rows.length)
          throw new AccessError(409, 'A replacement request already exists for this booking.');
      }
      if (!['approved', 'planning'].includes(event.status)) throw new AccessError(409, 'Booking requests require an Approved or Planning event.');
      if (new Date(input!.starts_at) < event.starts_at || new Date(input!.ends_at) > event.ends_at) throw new AccessError(400, 'The booking period must fall within the event.');
      const sessions = (await client.query<{ id: string; starts_at: Date; ends_at: Date }>(
        'SELECT id,lower(session_range) AS starts_at,upper(session_range) AS ends_at FROM sessions WHERE event_id=$1 FOR SHARE', [event.id])).rows;
      if (sessions.length !== 1) throw new AccessError(409, 'This event requires Session selection before a booking can be requested.');
      if (new Date(input!.starts_at) < sessions[0]!.starts_at || new Date(input!.ends_at) > sessions[0]!.ends_at) throw new AccessError(400, 'The booking period must fall within its Session.');
      const venue = (await client.query<{ opens_at: string; closes_at: string }>('SELECT opens_at::text,closes_at::text FROM venues WHERE id=$1 AND is_active FOR NO KEY UPDATE', [input!.venue_id])).rows[0];
      if (!venue) throw new AccessError(404, 'Active venue not found.');
      const clash = (await client.query<{ starts_at: Date; ends_at: Date }>(`SELECT lower(occupied_window(b.booking_range,v.setup_time_minutes,v.turnaround_time_minutes)) AS starts_at,
        upper(occupied_window(b.booking_range,v.setup_time_minutes,v.turnaround_time_minutes)) AS ends_at
        FROM venue_bookings b JOIN venues v ON v.id=b.venue_id WHERE b.venue_id=$1 AND ${holdsVenue('b', 'clock_timestamp()')}
        AND ($4::uuid IS NULL OR b.id<>$4) AND occupied_window(b.booking_range,v.setup_time_minutes,v.turnaround_time_minutes)
        && occupied_window(tstzrange($2,$3,'[)'),v.setup_time_minutes,v.turnaround_time_minutes) LIMIT 1`,
      [input!.venue_id,input!.starts_at,input!.ends_at,hold?.id ?? null])).rows[0];
      if (clash) throw new AccessError(409, `This venue is unavailable from ${formatSgt(clash.starts_at)} to ${formatSgt(clash.ends_at)}, including setup and turnaround.`);
      const block = (await client.query('SELECT id FROM venue_blocks WHERE venue_id=$1 AND block_range && tstzrange($2,$3,\'[)\') LIMIT 1', [input!.venue_id,input!.starts_at,input!.ends_at])).rows[0];
      if (block) throw new AccessError(409, 'This venue is blocked during the requested period.');
      const params = new URLSearchParams({ event_id: event.id, search: '1', start: input!.starts_at, end: input!.ends_at });
      if (input!.headcount !== null) { params.set('attendance', String(input!.headcount)); params.set('capacity', String(input!.headcount)); }
      const search = await venueSearch(client.query.bind(client) as Query, user, params, true);
      if (search.errors || !search.criteria || !search.venues) throw new AccessError(400, 'The event needs valid recorded requirements.');
      const candidate = search.venues.find(v => v.id === input!.venue_id);
      if (!candidate) throw new AccessError(404, 'Active venue not found.');
      // A converting hold is its own availability reservation, already excluded
      // from the conflict gate above. Suitability must not fail on its own hold.
      const suitability = assessEventVenue({ ...candidate, ...venue, available: true }, search.criteria, search.options);
      const id = hold?.id ?? randomUUID();
      if (hold) await client.query(`UPDATE venue_bookings SET status='pending',expires_at=NULL,requested_by=$2,requested_at=clock_timestamp(),
        suitability_snapshot=$3 WHERE id=$1`, [id,user.id,JSON.stringify(suitability)]);
      else await client.query(`INSERT INTO venue_bookings(id,event_id,session_id,venue_id,booking_range,status,purpose,headcount,requested_by,requested_at,submission_key,submission_payload,suitability_snapshot,replaces_booking_id)
        VALUES($1,$2,$3,$4,tstzrange($5,$6,'[)'),'pending',$7,$8,$9,clock_timestamp(),$10,$11,$12,$13)`,
      [id,event.id,sessions[0]!.id,input!.venue_id,input!.starts_at,input!.ends_at,input!.purpose,input!.headcount,user.id,idempotencyKey,JSON.stringify(input),JSON.stringify(suitability),input!.replaces_booking_id ?? null]);
      if (event.status === 'approved') await applyEventStatusChange(client, event.id, 'planning', user.id, { notificationOptions: options });
      const auditId = randomUUID();
      await client.query(`INSERT INTO audit_logs(id,actor_id,entity_type,entity_id,event_id,action,field_changed,old_value,new_value)
        VALUES($1,$2,'event',$3,$3,$4,'venue_booking',$5,$6)`, [auditId,user.id,event.id,`Venue booking requested for ${candidate.name}`,hold ? 'tentative' : null,id]);
      const occurredAt = (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
      // Reuse the shared audience resolver, scoped to the requested venue.
      // With no injected resolver it reads venue_staff_assignments (SCRUM-189).
      const requestedAudience = await captureEventAudience(client, event.id, options, [input!.venue_id]);
      const notice = await notifyEventChange(client, { changeId: auditId, occurredAt, actorId: user.id, before: requestedAudience, after: requestedAudience, change: { kind: 'booking_requested' } });
      return { status: hold ? 200 : 201, body: { booking: await returnedBooking(client, id), event_status: 'planning', suitability, unresolved_venue_ids: notice.unresolvedVenueIds } };
    });
  } catch (error) {
    if (['23P01','23505'].includes((error as { code?: string }).code ?? '')) throw new AccessError(409, 'This venue is occupied or the request has already been submitted. Retry with the same submission key.');
    throw error;
  }
}

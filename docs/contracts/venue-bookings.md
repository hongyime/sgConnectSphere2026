# Shared venue_bookings contract

**Status:** Draft for review before E06-S03 implementation
**Scope:** Shared booking persistence, submission API, lifecycle, and coordination with tentative holds.

This contract records the PO-confirmed rules relayed on 9 October (SCRUM-47 / E06-S03, [PR #243](https://github.com/hongyime/sgConnectSphere2026/pull/243)) and proposes the shared schema/API boundary for E06-S03, E06-S04, E06-S05, and E06-S06. Items marked **Proposal** are implementation choices for reviewers to confirm.

## Confirmed rules

| Rule | Contract |
|---|---|
| O-27 — purpose and headcount | Each booking may have its own optional purpose and headcount. Suitability uses the booking headcount when present, otherwise the event expected attendance. This check is advisory; an unsuitable venue may still be requested. |
| O-29 — booking window | Each booking may cover its own interval, provided the requested interval is inside the event start/end. Setup and turnaround buffers may extend outside the event interval and still reserve the venue. |
| O-30 — primary venue | The first booking to become Confirmed for an event becomes primary if none is already primary. An assigned Coordinator may select another Confirmed booking. Pending bookings cannot be primary. |
| Submission eligibility | Only the event's assigned Event Coordinator may submit a formal request, while the event is Approved or Planning. A Confirmed event must first return to Planning through the existing event workflow. |
| O-32 — hold conversion | Submitting a formal request ends the hold expiry. A hold whose expiry has passed cannot be converted. Conversion changes the existing hold row to Pending. |

## Existing schema and migration ownership

The current table is created in backend/database/migrations/0001_connectsphere_schema.sql. It has id, venue_id, event_id, booking_range, status, decision fields, requires_reconfirmation, and created_at. Its exclusion constraint currently protects booking_range for Pending and Confirmed rows.

### Target venue_bookings row

| Column | Shape | Meaning |
|---|---|---|
| id | uuid primary key | Stable identity; hold conversion reuses this id. |
| venue_id, event_id | uuid foreign keys, required | Venue reserved and event that owns the booking. |
| booking_range | tstzrange, required | Advertised interval inside the event interval. |
| occupancy_range | tstzrange, required | Application-maintained booking_range widened by venue buffers; not a generated column because buffer values live on venues. |
| status | booking_status, required, default Pending | Pending, Tentative, Confirmed, Rejected, Released, Conflicting, or Expired; hold creation explicitly sets Tentative. |
| purpose | text, nullable, at most 80 characters | Per-booking label such as Main programme or Breakout A. |
| headcount | integer, nullable, positive when present | Per-booking suitability input; null means use event expected attendance. |
| is_primary | boolean, required, default false | True only on one Confirmed booking per event. |
| requested_by | uuid foreign key, nullable for legacy rows | Coordinator who submitted the formal request; the service requires it for every new Pending request. |
| requested_at | timestamptz, nullable for Tentative rows | Time the formal request was submitted. |
| submission_key | uuid, nullable | Direct-request idempotency key; unique with requested_by when present. |
| expires_at, reminder_sent_at | timestamptz, nullable | Hold expiry/reminder state; conversion clears both and Expired preserves expires_at. |
| requires_reconfirmation, decision_reason, suggested_venue_id, decided_by, decided_at | existing fields | Venue decision and follow-up state. |
| created_at | timestamptz, required | Row creation time; remains the hold creation time after conversion. |

Database invariants: is_primary implies status = Confirmed; at most one primary row exists per event; headcount is null or positive; the occupancy exclusion covers only Tentative, Pending, and Confirmed rows. The requester and timestamps may be null on legacy/unsubmitted records, while the application requires requester and request time on every newly submitted request.

At PR #231 head 76fd43e on 9 October ([PR #231](https://github.com/hongyime/sgConnectSphere2026/pull/231)), 0011_venue_setup_turnaround_buffers.sql adds venues.setup_time_minutes, venues.turnaround_time_minutes, and the occupied_window(range, setup, turnaround) function. That migration does **not** yet add booking columns or change the booking exclusion constraint. Keep those buffer additions in PR #231; the shared contract migration consumes them and must not recreate or overwrite them.

**Migration ownership proposal:** E06-S05 (SCRUM-49) owns the shared booking schema work. Migration 0013, `0013_tentative_venue_holds.sql` (PR #246), adds `tentative` and `expired` to `booking_status`, adds `expires_at`, and creates an expiry lookup index that does not refer to either new enum value. It must not add any constraint or index predicate that uses those new values. The transaction must commit before a later migration uses them. E06-S05 should own migration 0014, proposed as `0014_venue_bookings_contract.sql`, for the remaining shared schema changes. It depends on migrations 0011, 0012, and the committed 0013. E06-S03 owns the request service/API contract and consumes the same schema; E06-S04/S06 use its booking and conflict invariants. No parallel E06-S03 migration should add overlapping columns or constraints.

Migration 0014 should:

- Add nullable purpose text (maximum 80 characters) and headcount integer (positive when present). Store null when omitted; do not copy event attendance into the booking field.
- Add requested_by uuid REFERENCES users(id) and requested_at timestamptz. They are required by the application for every new Pending request; nullable storage preserves legacy rows that cannot be safely attributed. For a converted hold, these record the Coordinator who formally submitted it.
- Add is_primary boolean NOT NULL DEFAULT false, with a check that only Confirmed rows can be primary and a partial unique index allowing at most one primary booking per event.
- Add application-maintained occupancy_range tstzrange, backfill it with occupied_window(booking_range, setup_time_minutes, turnaround_time_minutes), and refresh it whenever the booking period, venue, or relevant buffer changes.
- Add reminder_sent_at for E06-S05. Add status-dependent constraints now that migration 0013 has committed: Tentative rows require an expiry; Pending rows have no active expiry; conversion clears expiry and reminder fields; Expired rows retain the expiry timestamp as history.
- Add submission_key uuid for direct-request retry safety, with a partial unique index on (requested_by, submission_key) when the key is present.
- Replace the current exclusion constraint with one on (venue_id, occupancy_range), where status is `tentative`, `pending`, or `confirmed`. Keep the existing constraint name if practical so the database error mapper has one stable target. This predicate uses the new `tentative` value, so create it only in migration 0014, after 0013 commits.

The occupancy exclusion is per venue, not per event: one event may reserve multiple venues at the same time. Two active reservations for the same venue may not overlap after buffers are applied. The half-open occupancy interval is [booking start − setup, booking end + turnaround).

The requested booking_range must not overlap a venue_blocks.block_range. Buffer overlap is checked between reservations; the current O-22 default does not extend buffers into maintenance blocks. If O-22 is later closed differently, update this contract before implementation.

## API shapes

Follow the repository's existing action-router convention: booking mutations are POST /api/venues actions; event details expose a venue_bookings array. All timestamps are RFC 3339 instants and intervals are half-open.

### Submit a direct booking request

POST /api/venues, authenticated cookie session, assigned Event Coordinator:

    {
      "action": "request_booking",
      "event_id": "event-uuid",
      "venue_id": "venue-uuid",
      "starts_at": "2026-11-12T09:00:00+08:00",
      "ends_at": "2026-11-12T12:00:00+08:00",
      "purpose": "Main programme",
      "headcount": 120
    }

**Proposal — direct retry safety:** Require an Idempotency-Key UUID header. The server derives requested_by from the session; clients cannot choose the requester or set status, is_primary, occupancy_range, or expires_at. Omitted purpose and headcount remain null. The new row is Pending and not primary.

Return 201 with the booking, event status, and advisory suitability result. The booking includes id, event_id, venue_id, status, purpose, nullable headcount, requested_by, requested_at, is_primary, booking_range, occupancy_range, and expires_at. Suitability reports the headcount used and failed criteria, but an unsuitable result does not reject submission. Replaying the same key and payload returns the existing booking without repeating audit or notification effects; reusing a key with a different payload returns 409.

### Convert a tentative hold

POST /api/venues:

    { "action": "convert_hold", "booking_id": "hold-uuid" }

The assigned Coordinator must still pass the submission eligibility checks. Lock and inspect the hold, then compare expires_at to the current wall clock after acquiring the lock. If still Tentative and unexpired, update that row to Pending, set requested_by/requested_at, and clear expiry/reminder fields. Preserve its id, venue, event, booking period, purpose, and headcount. Return 200 with the updated booking.

Conversion by the same hold id is idempotent: a retry after successful conversion returns the same current booking row and creates no duplicate request, audit entry, event transition, or notification. If the hold is Expired or its deadline has passed, return 409 and leave it unconverted.

### Select the primary booking

POST /api/venues:

    { "action": "set_primary", "booking_id": "confirmed-booking-uuid" }

Only the assigned Coordinator may select a booking for the event, and the target must be Confirmed. In one transaction, clear the previous primary and set the target. A Pending booking returns 409. First confirmation automatically sets primary only when the event has no primary; concurrent confirmations serialize on the event row.

GET /api/events?id=<event-id> returns venue_bookings: [...]; each item includes purpose, headcount, is_primary, and both intervals. Attendee event views use the primary Confirmed booking as the displayed venue. Other Confirmed bookings may be exposed separately according to the E09-S01 response shape.

### Errors

**Proposal — response codes:** Use 403 for an authenticated user who is not the assigned Coordinator; 409 for an event in an ineligible state, an expired/non-convertible hold, a venue block, an active occupancy conflict, or a reused idempotency key with different content; and 422 for malformed intervals, an interval outside the event, or invalid field values. Conflict responses identify the blocking booking and its buffered occupancy_range, or the overlapping venue block. Translate PostgreSQL exclusion violation SQLSTATE 23P01 to the same 409 booking-conflict response.

## State and transaction rules

- No row → Pending: direct request.
- No row → Tentative: hold created by the E06-S05 flow.
- Tentative → Pending: assigned Coordinator submits before expiry; same row is reused.
- Tentative → Expired: expiry is at or before current time.
- Tentative → Released: Coordinator releases the hold.
- Pending → Confirmed: Venue Staff approves.
- Pending → Rejected: Venue Staff rejects.
- Pending → Released: Coordinator withdraws.
- Confirmed → Released: event workflow releases the booking.
- Pending or Confirmed → Conflicting: E05-S05/E05-S06 marks a booking affected by a buffer/block change; their resolution flow restores the applicable status.

Every submission path uses one shared service and transaction. It authorizes the assigned Coordinator; locks the event and (for conversion) the hold; checks event status, range containment, venue block, suitability inputs, and expiry; writes the booking and any Approved-to-Planning transition; then persists audit and notification/outbox records. Any failure rolls the transaction back. The database exclusion constraint remains the final guard against concurrent occupancy conflicts. **Proposal:** Booking/block writes serialize on the venue so a concurrent block cannot slip past the block check. Hold creation follows the same block and occupancy checks; the event-status submission gate is checked again when a hold is converted.

An Approved event becomes Planning in the same transaction as its first formal request. An event already in Planning stays there. A Confirmed event is not silently moved; the Coordinator first uses the existing event revert action (POST /api/events?revert=1&id=<event-id>), then submits.

First-confirmed primary assignment and manual selection are separate from request creation: new Pending rows always have is_primary = false. O-30 does not define automatic promotion if a primary booking ceases to be Confirmed. **Proposal:** clear its primary flag in that transaction and require the Coordinator to select another Confirmed booking before the event safety-confirmation gate.

The expiry worker updates only rows still Tentative whose expires_at <= clock_timestamp(). Thus, if conversion wins the row lock, the worker sees Pending and skips it; if expiry wins, conversion sees Expired and fails. A converted Pending row is never expired.

## Contract checks for implementation

- Booking intervals stay within the event interval even when buffered occupancy extends outside it.
- Missing booking headcount falls back to event attendance for suitability; a failing suitability result remains advisory.
- Tentative, Pending, and Confirmed occupancy conflicts are rejected for the same venue; a venue block overlapping the requested period is also rejected.
- Only the assigned Coordinator can submit while Approved or Planning; Confirmed requires the existing revert workflow first.
- Two competing confirmations produce at most one primary booking; a Pending row cannot be primary.
- Hold conversion reuses the row, clears expiry, and races safely with expiry; repeated conversion does not duplicate effects.
- Direct submission retries with one idempotency key do not duplicate bookings or effects.

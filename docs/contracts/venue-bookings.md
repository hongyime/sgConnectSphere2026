# Shared venue_bookings contract

**Status:** Draft for review before E06-S03 implementation
**Scope:** Shared booking persistence, submission API, lifecycle, and coordination with tentative holds.

This contract records the PO-confirmed rules relayed on 9 October (SCRUM-47 / E06-S03, [PR #243](https://github.com/hongyime/sgConnectSphere2026/pull/243)) and proposes the shared schema/API boundary for E06-S03, E06-S04, E06-S05, and E06-S06. Items marked **Proposal** are implementation choices for reviewers to confirm.

## Confirmed rules

| Rule | Contract |
|---|---|
| O-27 — purpose and headcount | Each booking may have its own optional purpose and headcount. Suitability uses the booking headcount when present, otherwise the linked Session's expected attendance (T-79). This check is advisory; an unsuitable venue may still be requested. |
| O-29 — booking window | Each booking is linked to a Session and its requested interval must be inside that Session's start/end. Setup and turnaround buffers may extend outside the Session interval and still reserve the venue. |
| O-30 — primary venue | The first booking to become Confirmed for an event becomes primary if none is already primary. An assigned Coordinator may select another Confirmed booking. Pending bookings cannot be primary. |
| Submission eligibility | Only the event's assigned Event Coordinator may submit a formal request, while the event is Approved or Planning. A Confirmed event must first return to Planning through the existing event workflow. |
| O-32 — hold conversion | Submitting a formal request ends the hold expiry. A hold whose expiry has passed cannot be converted. Conversion changes the existing hold row to Pending. |

## Existing schema and migration ownership

The current table is created in backend/database/migrations/0001_connectsphere_schema.sql. It has id, venue_id, event_id, booking_range, status, decision fields, requires_reconfirmation, and created_at. Its exclusion constraint currently protects booking_range for Pending and Confirmed rows.

### Target venue_bookings row

| Column | Shape | Meaning |
|---|---|---|
| id | uuid primary key | Stable identity; hold conversion reuses this id. |
| venue_id, event_id, session_id | uuid foreign keys, required | Venue, Event and owning Session. Keep the composite `(session_id, event_id)` FK so they cannot disagree. |
| layout_id | uuid foreign key, required for a confirmed booking | Session layout for this venue; used to derive approved Session capacity. |
| booking_range | tstzrange, required | Advertised interval inside the linked Session interval. |
| occupancy_range | tstzrange, required | Application-maintained booking_range widened by venue buffers; not a generated column because buffer values live on venues. |
| status | booking_status, required, default Pending | Pending, Tentative, Confirmed, Rejected, Released, Conflicting, or Expired; hold creation explicitly sets Tentative. |
| purpose | text, nullable, at most 80 characters | Per-booking label such as Main programme or Breakout A. |
| headcount | integer, nullable, positive when present | Per-booking suitability input; null means use linked Session expected attendance. |
| is_primary | boolean, required, default false | True only on one Confirmed booking per event. |
| requested_by | uuid foreign key, nullable for legacy rows | Coordinator who submitted the formal request; the service requires it for every new Pending request. |
| requested_at | timestamptz, nullable for Tentative rows | Time the formal request was submitted. |
| submission_key | uuid, nullable | Direct-request idempotency key; unique with requested_by when present. |
| expires_at | timestamptz, nullable for legacy rows | Explicit Venue Staff setting per hold, with no system default. A new hold cannot enter the expiry worker until configured; conversion clears it and Expired preserves it. |
| warning_before | interval, nullable for legacy rows | Coordinator-configured warning interval for this hold. It replaces a fixed 24-hour warning. |
| reminder_sent_at | timestamptz, nullable | Idempotency marker for the configured warning. Reset if the expiry or warning interval is changed. |
| buffer_conflict | boolean, default false (0015) | E05-S05 reason-specific review flag. Preserve the original booking status and occupancy. |
| requires_reconfirmation, decision_reason, suggested_venue_id, decided_by, decided_at | existing fields | Venue decision and follow-up state; capacity review remains separate from the buffer flag. |
| created_at | timestamptz, required | Row creation time; remains the hold creation time after conversion. |

Database invariants: is_primary implies status = Confirmed; at most one primary row exists per event; headcount is null or positive; the occupancy exclusion covers only Tentative, Pending, and Confirmed rows. A booking's Session must belong to its Event, and its range must be within the Session period. The requester and timestamps may be null on legacy/unsubmitted records, while the application requires requester and request time on every newly submitted request.

At PR #231 head on 9 October ([PR #231](https://github.com/hongyime/sgConnectSphere2026/pull/231)), 0011_venue_setup_turnaround_buffers.sql adds venues.setup_time_minutes, venues.turnaround_time_minutes, and the occupied_window(range, setup, turnaround) function. That migration does **not** yet add booking columns or change the booking exclusion constraint. Keep those buffer additions in PR #231; the shared contract migration consumes them and must not recreate or overwrite them.

**Migration ownership:** Migration 0013, `0013_tentative_venue_holds.sql` (merged in PR #245), is holds-only: it adds `tentative` and `expired` to `booking_status`, adds `expires_at`, and creates an expiry lookup index that does not refer to either new enum value. It does not add any constraint or index predicate that uses those new values. The remaining shared booking columns and constraints belong in the next migration, proposed as `0014_venue_bookings_contract.sql`. Migration 0014 is sequenced after PR #231 merges because it depends on `occupied_window()`; it is owned by whichever story requires the shared columns first (E06-S03 or E06-S04). E06-S03 owns the request service/API contract; E06-S04/S06 use its booking and conflict invariants. No parallel migration should add overlapping columns or constraints.

Migration 0014 should:

- Add nullable purpose text (maximum 80 characters) and headcount integer (positive when present). Store null when omitted; use the linked Session's expected attendance as the suitability fallback rather than copying it into the booking field.
- Add requested_by uuid REFERENCES users(id) and requested_at timestamptz. They are required by the application for every new Pending request; nullable storage preserves legacy rows that cannot be safely attributed. For a converted hold, these record the Coordinator who formally submitted it.
- Add is_primary boolean NOT NULL DEFAULT false, with a check that only Confirmed rows can be primary and a partial unique index allowing at most one primary booking per event.
- Add application-maintained occupancy_range tstzrange, backfill it with occupied_window(booking_range, setup_time_minutes, turnaround_time_minutes), and refresh it whenever the booking period, venue, or relevant buffer changes.
- Add status-dependent constraints now that migration 0013 has committed: Tentative rows require an expiry (`expires_at IS NOT NULL`); Pending rows have no active expiry; conversion clears `expires_at`; Expired rows retain the expiry timestamp as history (T-79).
- Add submission_key uuid for direct-request retry safety, with a partial unique index on (requested_by, submission_key) when the key is present.
- Replace the current exclusion constraint with one on (venue_id, occupancy_range), where status is `tentative`, `pending`, or `confirmed`. Keep the existing constraint name if practical so the database error mapper has one stable target. This predicate uses the new `tentative` value, so create it only in migration 0014, after 0013 commits.

The occupancy exclusion is per venue, not per event: one event may reserve multiple venues at the same time. Two active reservations for the same venue may not overlap after buffers are applied. The half-open occupancy interval is [booking start − setup, booking end + turnaround).

The requested booking_range must not overlap an active venue_blocks.block_range. Maintenance blocks may have no end time; they remain active until lifted. Setup/turnaround buffers are checked between event uses and holds only, not around maintenance blocks (T-80). Editing a block stores the old and new range/reason and actor; lifting it retains history and notifies each affected Coordinator (T-91).

## API shapes

Follow the repository's existing action-router convention: booking mutations are POST /api/venues actions; event details expose a venue_bookings array. All timestamps are RFC 3339 instants and intervals are half-open.

### Submit a direct booking request

POST /api/venues, authenticated cookie session, assigned Event Coordinator:

    {
      "action": "request_booking",
      "event_id": "event-uuid",
      "session_id": "session-uuid",
      "venue_id": "venue-uuid",
      "starts_at": "2026-11-12T09:00:00+08:00",
      "ends_at": "2026-11-12T12:00:00+08:00",
      "purpose": "Main programme",
      "headcount": 120
    }

**Proposal — direct retry safety:** Require an Idempotency-Key UUID header. The server derives requested_by from the session; clients cannot choose the requester or set status, is_primary, occupancy_range, or expires_at. The service validates that `session_id` belongs to `event_id`, uses the Session's date/time, and keeps omitted purpose and headcount null. The new row is Pending and not primary.

Return 201 with the booking, event status, and advisory suitability result. The booking includes id, event_id, session_id, venue_id, status, purpose, nullable headcount, requested_by, requested_at, is_primary, booking_range, occupancy_range, and expires_at. Suitability reports the booking headcount or linked Session expected attendance and failed criteria, but an unsuitable result does not reject submission. Replaying the same key and payload returns the existing booking without repeating audit or notification effects; reusing a key with a different payload returns 409.

### Convert a tentative hold

POST /api/venues:

    { "action": "convert_hold", "booking_id": "hold-uuid" }

The assigned Coordinator must still pass the submission eligibility checks. Lock and inspect the hold, then compare expires_at to the current wall clock after acquiring the lock. Only a hold whose expiry was explicitly set by Venue Staff is eligible for conversion. If still Tentative and unexpired, update that row to Pending, set requested_by/requested_at, and clear the expiry field (`expires_at = null`). Preserve its id, venue, event, Session, booking period, purpose, and headcount. Return 200 with the updated booking.

Conversion by the same hold id is idempotent: a retry after successful conversion returns the same current booking row and creates no duplicate request, audit entry, event transition, or notification. If the hold is Expired or its deadline has passed, return 409 and leave it unconverted.

### Decide a booking request (Venue Staff)

POST /api/venues, authenticated cookie session, Venue Staff role:

    {
      "action": "decide",
      "booking_id": "booking-uuid",
      "decision": "approve" | "reject",
      "reason": "required when rejecting, max 2000 chars",
      "suggested_venue_id": "optional uuid, active venue, not the booked one"
    }

Returns 200 `{ booking, coordinatorNotified }`.
- Returns 400 `validation_failed` for malformed input, missing reject reason, or invalid suggested venue.
- Returns 403 for anyone who is not Venue Staff.
- Returns 404 for an unknown booking.
- Returns 409 when the booking is no longer Pending (e.g. already decided, released, or expired).
- A booking in `conflicting` status cannot be decided: Venue Staff must wait for the buffer conflict resolution flow (E05-S05 / E05-S06) or coordinator rescheduling, returning 409 with an explanatory message.
- If decision is `approve`, updates status from Pending to Confirmed, sets `decided_by` and `decided_at`. If the event currently has no primary Confirmed booking, this booking becomes primary (`is_primary = true`); concurrent confirmations serialize on the event row.
- If decision is `reject`, updates status from Pending to Rejected, sets `decision_reason`, optional `suggested_venue_id`, `decided_by`, and `decided_at`.
- Audit entries: `Booking Approved` or `Booking Rejected` with `entity_type = 'venue_booking'`.
- Notification sent to the assigned Coordinator.

### Select the primary booking

POST /api/venues:

    { "action": "set_primary", "booking_id": "confirmed-booking-uuid" }

Only the assigned Coordinator may select a booking for the event, and the target must be Confirmed. In one transaction, clear the previous primary and set the target. A Pending booking returns 409. First confirmation automatically sets primary only when the event has no primary; concurrent confirmations serialize on the event row.

GET /api/events?id=<event-id> returns venue_bookings: [...]; each item includes purpose, headcount, is_primary, and both intervals. Attendee event views use the primary Confirmed booking as the displayed venue. Other Confirmed bookings may be exposed separately according to the E09-S01 response shape.

### Errors

**Proposal — response codes:** Use 400 for malformed intervals, an interval outside the Session, missing required decision reason, or invalid field values (`validation_failed`, matching repo convention); 403 for an authenticated user who is not authorized (e.g. not the assigned Coordinator or not Venue Staff); 404 for an unknown booking, Session or event; and 409 for an event in an ineligible state, an expired/non-convertible hold, attempting to decide a conflicting booking, a venue block, an active occupancy conflict, or a reused idempotency key with different content. Conflict responses identify the blocking booking and its buffered occupancy_range, or the overlapping venue block. Translate PostgreSQL exclusion violation SQLSTATE 23P01 to the same 409 booking-conflict response.

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
- E05-S05 buffer change: set `buffer_conflict`, retaining Confirmed/Pending/Tentative status and occupancy. Re-evaluate after buffers change; never release bookings to resolve a buffer conflict automatically.
- Pending or Confirmed → Conflicting: E05-S06 marks a booking affected by an unavailability; its resolution flow restores the applicable status. Venue Staff cannot approve/reject a booking while it is Conflicting.

Every submission path uses one shared service and transaction. It authorizes the assigned Coordinator; locks the event and (for conversion) the hold; checks event status, range containment, venue block, suitability inputs, and expiry; writes the booking and any Approved-to-Planning transition; then persists audit and notification/outbox records. Any failure rolls the transaction back. The database exclusion constraint remains the final guard against concurrent occupancy conflicts. **Proposal:** Booking/block writes serialize on the venue so a concurrent block cannot slip past the block check. Hold creation follows the same block and occupancy checks; the event-status submission gate is checked again when a hold is converted.

An Approved event becomes Planning in the same transaction as its first formal request. An event already in Planning stays there. A Confirmed event is not silently moved; the Coordinator first uses the existing event revert action (POST /api/events?revert=1&id=<event-id>), then submits.

First-confirmed primary assignment and manual selection are separate from request creation: new Pending rows always have is_primary = false. O-30 does not define automatic promotion if a primary booking ceases to be Confirmed. **Proposal:** clear its primary flag in that transaction and require the Coordinator to select another Confirmed booking before the event safety-confirmation gate.

The expiry worker updates only rows still Tentative whose expires_at <= clock_timestamp(). Thus, if conversion wins the row lock, the worker sees Pending and skips it; if expiry wins, conversion sees Expired and fails. A converted Pending row is never expired.

## Contract checks for implementation

- Booking intervals stay within the linked Session interval even when buffered occupancy extends outside it.
- Missing booking headcount falls back to the linked Session's expected attendance for suitability; a failing suitability result remains advisory.
- Tentative, Pending, and Confirmed occupancy conflicts are rejected for the same venue; a venue block overlapping the requested period is also rejected.
- Only the assigned Coordinator can submit while Approved or Planning; Confirmed requires the existing revert workflow first.
- Two competing confirmations produce at most one primary booking; a Pending row cannot be primary.
- Hold conversion reuses the row, clears expiry, and races safely with expiry; repeated conversion does not duplicate effects.
- Direct submission retries with one idempotency key do not duplicate bookings or effects.

## Week 9 contract addendum (13 October 2026)

This addendum applies BDR T-79 to T-91. Customer answers remain C-71 to C-136;
team-selected rules and the two still-open assumptions are in the canonical BDR.
It does not claim that the proposed migrations or API changes have shipped.

| Area | Contract consequence |
|---|---|
| Session ownership | Every new booking request includes `session_id`; the API verifies that it belongs to `event_id`. Booking range and suitability use that Session. Equipment requests/reservations receive the same Session link. Technical-support assignment, Event status and registration windows remain Event-level (T-79). |
| Buffer and maintenance rules | Exclusion checks include setup/turnaround buffers between event uses and tentative holds. Active maintenance blocks are compared with the unbuffered requested interval; their own range may be open-ended until lifted (T-80). |
| Venue loss | If creating or editing a block makes a Confirmed Event's active booking unavailable, flag the booking, return the Event to Planning, and immediately notify its assigned Coordinator. Do not cancel the Event. Notify Organisers and Attendees only after replacement arrangements or formal event changes are confirmed (T-81). |
| Block edits | Venue Staff may edit an existing block. Each create/edit/lift writes an immutable history row with prior/new range, prior/new reason, actor and time. Lifting retains the block record and notifies the affected Coordinator. Venue-to-staff assignments are setup data; Release 1 has no roster-management screen (T-89, T-91). |
| Hold configuration | No system expiry or warning default is allowed. Venue Staff set each hold's expiry; the Coordinator sets its warning interval. A warning is due at `expires_at - warning_before`. An unconfigured legacy hold is not auto-expired or warned. |
| Hold extensions | Venue Staff can extend only an unexpired hold, at most twice. Require a reason and write an immutable extension-history row for each update. Changing expiry or warning resets the pending warning marker. Expiry and conversion remain serialized on the hold row. |

The API action design for the hold and block changes is:

| Action | Role | Required behavior |
|---|---|---|
| `configure_hold` | Venue Staff for expiry; assigned Coordinator for warning interval | Set only the actor's field; preserve the other value; no implicit default. |
| `extend_hold` | Venue Staff | Require a future new expiry and reason; lock the hold; reject a third extension or a hold no longer Tentative/unexpired; append history and audit. |
| `edit_block` | Venue Staff | Accept an optional end time; serialize the edit with venue booking writes; append old/new snapshots; re-evaluate affected bookings and apply T-81 if a Confirmed Event loses an active venue. |
| `lift_block` | Venue Staff | Retain and mark the block lifted; append history; clear only conflicts that C-122 permits; notify each affected Coordinator. |

Session-linked requests preserve the composite `(session_id, event_id)` ownership
check. Registration capacity, automatic Safety Review, role cardinality, and
terminal change-request state are specified in `docs/db_schema.md`, the Week 9
API addendum, and their owning backlog stories; they are not folded into the
venue-booking endpoint.

## Buffer write guard (PR #261 review follow-up)

Migration 0015 adds `buffer_conflict` and a database trigger that checks all new active bookings and changes to their venue, range, status or expiry using `occupied_window()`. The trigger locks the venue and includes Pending, Confirmed and unexpired Tentative rows. Maintenance blocks use advertised times. Pure flag edits are allowed, so changing buffers can identify existing conflicts without releasing bookings or refusing the venue edit. Shared-contract migration 0014 remains owned by the booking implementation; it must preserve this guard and allow existing flagged conflicts instead of attempting an exclusion backfill that rejects them.

For a newly conflicting pair, Confirmed has review priority over Pending, then Tentative; equal-status later bookings are flagged. Both affected events' Coordinators are notified once per buffer edit. This is an implementation choice for peer confirmation, not a new customer decision. All actual overlaps in a retained chain remain conflicts because no participant is released.

Calendar entries split setup, advertised event and turnaround into positive, clipped periods with the original booking state and a visible buffer-conflict label. Free intervals describe advertised booking windows after allowing the prospective booking's own setup/turnaround, matching search. Other Coordinators receive only Unavailable periods, without event details or conflict reasons. Buffer inputs are bounded by the existing integer storage range; timestamp/interval overflow rolls back with a 400.

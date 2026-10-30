# Shared venue_bookings contract

**Status:** Draft for review before E06-S03 implementation
**Scope:** Shared booking persistence, submission API, lifecycle, and coordination with tentative holds.

This contract records the PO-confirmed rules relayed on 9 October (SCRUM-47 / E06-S03, [PR #243](https://github.com/hongyime/sgConnectSphere2026/pull/243)) and proposes the shared schema/API boundary for E06-S03, E06-S04, E06-S05, and E06-S06. Items marked **Proposal** are implementation choices for reviewers to confirm.

## Confirmed rules

| Rule | Contract |
|---|---|
| O-27 â€” purpose and headcount | Each booking may have its own optional purpose and headcount. Suitability uses the booking headcount when present, otherwise the linked Session's expected attendance (T-79). This check is advisory; an unsuitable venue may still be requested. |
| O-29 â€” booking window | Each booking is linked to a Session and its requested interval must be inside that Session's start/end. Setup and turnaround buffers may extend outside the Session interval and still reserve the venue. |
| O-30 â€” primary venue | The first booking to become Confirmed for an event becomes primary if none is already primary. An assigned Coordinator may select another Confirmed booking. Pending bookings cannot be primary. |
| Submission eligibility | Only the event's assigned Event Coordinator may submit a formal request, while the event is Approved or Planning. A Confirmed event must first return to Planning through the existing event workflow. |
| O-32 â€” hold conversion | Submitting a formal request ends the hold expiry. A hold whose expiry has passed cannot be converted. Conversion changes the existing hold row to Pending. |

## Existing schema and migration ownership

The current table is created in backend/database/migrations/0001_connectsphere_schema.sql. It has id, venue_id, event_id, booking_range, status, decision fields, requires_reconfirmation, and created_at. Its exclusion constraint currently protects booking_range for Pending and Confirmed rows.

### Target venue_bookings row

| Column | Shape | Meaning |
|---|---|---|
| id | uuid primary key | Stable identity; hold conversion reuses this id. |
| venue_id, event_id, session_id | uuid foreign keys; Session link required for active/new bookings | Venue, Event and owning Session. Keep the composite `(session_id, event_id)` FK so they cannot disagree. When a Session is deleted, only a Rejected, Released, or Expired booking may have its `session_id` set to null. |
| layout_id | uuid foreign key, required for a confirmed booking | Session layout for this venue; used to derive approved Session capacity. |
| booking_range | tstzrange, required | Advertised interval inside the linked Session interval. |
| occupancy_range | tstzrange, required | Application-maintained booking_range widened by venue buffers; not a generated column because buffer values live on venues. |
| status | booking_status, required, default Pending | Pending, Tentative, Confirmed, Rejected, Released, Conflicting, or Expired; hold creation explicitly sets Tentative. |
| purpose | text, nullable, at most 80 characters | Per-booking label such as Main programme or Breakout A. |
| headcount | integer, nullable, positive when present | Per-booking suitability input; null means use linked Session expected attendance. |
| is_primary | boolean, required, default false | True only on one Confirmed booking per event; it stays true while an unavailability holds that booking Conflicting (E05-S06, migration 0025) and the booking is restored as primary. |
| requested_by | uuid foreign key, nullable for legacy rows | Coordinator who submitted the formal request; the service requires it for every new Pending request. |
| requested_at | timestamptz, nullable for Tentative rows | Time the formal request was submitted. |
| submission_key | uuid, nullable | Direct-request idempotency key; unique with requested_by when present. |
| expires_at | timestamptz, nullable for legacy rows | Explicit Venue Staff setting per hold, with no system default. A new hold cannot enter the expiry worker until configured; conversion clears it and Expired preserves it. |
| warning_before | interval, nullable for legacy rows | Coordinator-configured warning interval for this hold. It replaces a fixed 24-hour warning. |
| reminder_sent_at | timestamptz, nullable | Idempotency marker for the configured warning. Reset if the expiry or warning interval is changed. |
| buffer_conflict | boolean, default false (0016) | E05-S05 reason-specific review flag. Preserve the original booking status and occupancy. |
| requires_reconfirmation, decision_reason, suggested_venue_id, decided_by, decided_at | existing fields | Venue decision and follow-up state; capacity review remains separate from the buffer flag. |
| created_at | timestamptz, required | Row creation time; remains the hold creation time after conversion. |

Database invariants: is_primary implies status = Confirmed, or Conflicting while an unavailability holds it (0025); readers that display or publish the venue must still require Confirmed; at most one primary row exists per event; headcount is null or positive; the occupancy exclusion covers only Tentative, Pending, and Confirmed rows. A booking's Session must belong to its Event, and its range must be within the Session period. The requester and timestamps may be null on legacy/unsubmitted records, while the application requires requester and request time on every newly submitted request.

At PR #231 head on 9 October ([PR #231](https://github.com/hongyime/sgConnectSphere2026/pull/231)), 0011_venue_setup_turnaround_buffers.sql adds venues.setup_time_minutes, venues.turnaround_time_minutes, and the occupied_window(range, setup, turnaround) function. That migration does **not** yet add booking columns or change the booking exclusion constraint. Keep those buffer additions in PR #231; the shared contract migration consumes them and must not recreate or overwrite them.

**Migration ownership:** Migration 0013, `0013_tentative_venue_holds.sql` (merged in PR #245), is holds-only: it adds `tentative` and `expired` to `booking_status`, adds `expires_at`, and creates an expiry lookup index that does not refer to either new enum value. It does not add any constraint or index predicate that uses those new values.

The Session foundation is migration `0014_event_sessions.sql` in SCRUM-183. It creates one Session per existing Event and owns the `session_id` columns, backfills, indexes, and `(session_id, event_id)` ownership foreign keys on venue bookings and equipment requests/reservations. A venue booking must retain its Session link while active; the migration only permits the link to become null for Rejected, Released, or Expired rows when a Session is deleted. The E06 booking contract consumes these Session links and must not add them again.

The remaining shared venue booking columns and constraints belong in the next migration, proposed as `0019_venue_bookings_contract.sql`. Migration 0019 depends on migrations 0011 (`occupied_window()`), 0012, committed 0013, and the Session table and links from 0014. It is owned by whichever story requires the shared booking columns first (E06-S03 or E06-S04). E06-S03 owns the request service/API contract; E06-S04/S06 use its booking and conflict invariants. No parallel migration should add overlapping columns or constraints.

Migration 0019 should:

- Add nullable purpose text (maximum 80 characters) and headcount integer (positive when present). Store null when omitted; use the linked Session's expected attendance as the suitability fallback rather than copying it into the booking field.
- Add requested_by uuid REFERENCES users(id) and requested_at timestamptz. They are required by the application for every new Pending request; nullable storage preserves legacy rows that cannot be safely attributed. For a converted hold, these record the Coordinator who formally submitted it.
- Add is_primary boolean NOT NULL DEFAULT false, with a check that only Confirmed rows can be primary and a partial unique index allowing at most one primary booking per event.
- Add application-maintained occupancy_range tstzrange, backfill it with occupied_window(booking_range, setup_time_minutes, turnaround_time_minutes), and refresh it whenever the booking period, venue, or relevant buffer changes.
- Add status-dependent constraints now that migration 0013 has committed: Tentative rows require an expiry (`expires_at IS NOT NULL`); Pending rows have no active expiry; conversion clears `expires_at`; Expired rows retain the expiry timestamp as history (T-79).
- Add submission_key uuid for direct-request retry safety, with a partial unique index on (requested_by, submission_key) when the key is present.
- Replace the current exclusion constraint with one on (venue_id, occupancy_range), where status is `tentative`, `pending`, or `confirmed`. Keep the existing constraint name if practical so the database error mapper has one stable target. This predicate uses the new `tentative` value, so create it only in migration 0019, after 0013 commits.

The occupancy exclusion is per venue, not per event: one event may reserve multiple venues at the same time. Two active reservations for the same venue may not overlap after buffers are applied. The half-open occupancy interval is [booking start âˆ’ setup, booking end + turnaround).

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

**Proposal â€” direct retry safety:** Require an Idempotency-Key UUID header. The server derives requested_by from the session; clients cannot choose the requester or set status, is_primary, occupancy_range, or expires_at. The service validates that `session_id` belongs to `event_id`, uses the Session's date/time, and keeps omitted purpose and headcount null. The new row is Pending and not primary.

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

E06-S03 owns this explicit selection service/API and the Coordinator booking-list
control. E06-S04 owns automatic first-confirmed assignment. `set_primary` locks
the event `FOR NO KEY UPDATE` first, then rechecks account/assignment and locks
the selected/existing-primary bookings. It is permitted on assigned Confirmed
events as well as Approved, Planning and Safety Review events; it is not a new booking submission. Completed, Cancelled and pre-approval Events return 409 before flag changes or replay success, checked under the Event lock. It clears
the old flag before setting the target to preserve the immediate unique index.
Booking statuses, periods, expiry and event status are unchanged. It writes a
transactional `Primary Venue Changed` audit (`entity_type=venue_booking`,
`field_changed=primary_venue`, previous/new venue names). Re-selecting the current
primary is a successful no-op without another audit. No migration is required.
Malformed UUID is 400, inaccessible booking is 404, invalid role/account is
403, and non-Confirmed or busy-account conflict is 409. Returns 200
`{ booking: { id, status, is_primary }, replayed }`.

GET /api/events?id=<event-id> returns venue_bookings: [...]; each item includes purpose, headcount, is_primary, and both intervals. Attendee event views use the primary Confirmed booking as the displayed venue. Other Confirmed bookings may be exposed separately according to the E09-S01 response shape.

### Errors

**Proposal â€” response codes:** Use 400 for malformed intervals, an interval outside the Session, missing required decision reason, or invalid field values (`validation_failed`, matching repo convention); 403 for an authenticated user who is not authorized (e.g. not the assigned Coordinator or not Venue Staff); 404 for an unknown booking, Session or event; and 409 for an event in an ineligible state, an expired/non-convertible hold, attempting to decide a conflicting booking, a venue block, an active occupancy conflict, or a reused idempotency key with different content. Conflict responses identify the blocking booking and its buffered occupancy_range, or the overlapping venue block. Translate PostgreSQL exclusion violation SQLSTATE 23P01 to the same 409 booking-conflict response.

## State and transaction rules

- No row â†’ Pending: direct request.
- No row â†’ Tentative: hold created by the E06-S05 flow.
- Tentative â†’ Pending: assigned Coordinator submits before expiry; same row is reused.
- Tentative â†’ Expired: expiry is at or before current time.
- Tentative â†’ Released: Coordinator releases the hold.
- Pending â†’ Confirmed: Venue Staff approves.
- Pending â†’ Rejected: Venue Staff rejects.
- Pending â†’ Released: assigned Coordinator withdraws a Pending request only (T-94/T-95).
- Confirmed â†’ Released: event workflow releases the booking.
- E05-S05 buffer change: set `buffer_conflict`, retaining Confirmed/Pending/Tentative status and occupancy. Re-evaluate after buffers change; never release bookings to resolve a buffer conflict automatically.
- Pending, Confirmed or unexpired Tentative â†’ Conflicting: E05-S06 marks a booking or hold affected by an unavailability (C-111); its resolution flow restores the applicable status, and a hold whose expiry has passed meanwhile becomes Expired. Venue Staff cannot approve/reject a booking while it is Conflicting.

Every submission path uses one shared service and transaction. It authorizes the assigned Coordinator; locks the event and (for conversion) the hold; checks event status, range containment, venue block, suitability inputs, and expiry; writes the booking and any Approved-to-Planning transition; then persists audit and notification/outbox records. Any failure rolls the transaction back. The database exclusion constraint remains the final guard against concurrent occupancy conflicts. **Proposal:** Booking/block writes serialize on the venue so a concurrent block cannot slip past the block check. Hold creation follows the same block and occupancy checks; the event-status submission gate is checked again when a hold is converted.

An Approved event becomes Planning in the same transaction as its first formal request. An event already in Planning stays there. A Confirmed event is not silently moved; the Coordinator first uses the existing event revert action (POST /api/events?revert=1&id=<event-id>), then submits.

First-confirmed primary assignment and manual selection are separate from request creation: new Pending rows always have is_primary = false. T-94 records the Product Owner's future Confirmed-booking cancellation rule: clear a cancelled primary and prompt the Organiser to select another Confirmed venue; never automatically promote one. That cancellation flow is outside E06-S03/TC_E06S03_08. It does not change the current Coordinator primary-selection permission under T-78; future cancellation prompt/selection permissions must be implemented in that owning workflow.

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

Migration 0016 adds `buffer_conflict` and a database trigger that checks all new active bookings and changes to their venue, range, status or expiry using `occupied_window()`. The trigger locks the venue and includes Pending, Confirmed and unexpired Tentative rows. Maintenance blocks use advertised times. Pure flag edits are allowed, so changing buffers can identify existing conflicts without releasing bookings or refusing the venue edit. Shared-contract migration 0019 remains owned by the booking implementation; it must preserve this guard and allow existing flagged conflicts instead of attempting an exclusion backfill that rejects them.

For a newly conflicting pair, Confirmed has review priority over Pending, then Tentative; equal-status later bookings are flagged. Both affected events' Coordinators are notified once per buffer edit. This is an implementation choice for peer confirmation, not a new customer decision. All actual overlaps in a retained chain remain conflicts because no participant is released.

Calendar entries split setup, advertised event and turnaround into positive, clipped periods with the original booking state and a visible buffer-conflict label. Free intervals describe advertised booking windows after allowing the prospective booking's own setup/turnaround, matching search. Other Coordinators receive only Unavailable periods, without event details or conflict reasons. Buffer inputs are bounded by the existing integer storage range; timestamp/interval overflow rolls back with a 400.

## Sprint 3 submission increment (15 October 2026)

The E06-S03 working implementation prepares additive migration 0019 for
`purpose`, `headcount`, `requested_by`, `requested_at`, `submission_key`,
`submission_payload`, `suitability_snapshot` and confirmed-only/unique-primary
constraints. E06-S03 owns this migration by agreement with E06-S04?s owner; peer review remains pending. The older mention of 0012 is not a
dependency for these fields. The merged foundations are 0011, 0013 and 0014;
the 0016 buffer guard is required before enabling submission in deployment.

This increment preserves `occupied_window()` and the 0016 write guard rather
than introducing stored occupancy or replacing exclusion constraints. Existing
buffer-conflict rows must remain migratable. Stored occupancy/exclusion changes
above remain target proposals, not changes shipped by this increment. The saved
advisory snapshot is the assessment at submission time, not a promise of future
availability; staff decisions must recheck the current venue/booking state.

Under T-73, the Sprint 3 request body is event-based and uses event attendance
as its absent-headcount fallback. The service validates exactly one compatibility
Session and supplies its link internally; it refuses multi-Session events until
the later explicit selection flow. It does not adopt Week 9 hold-expiry defaults
or extension changes early. `convert_hold` and direct requests share a service.

Requests return 201 (new direct request) or 200 (conversion/retry), including
`booking`, `event_status` and `suitability`. An identical direct retry returns the
same saved assessment and does not repeat effects. Booking-request notifications
resolve staff for the requested venue only, from `venue_staff_assignments`
(SCRUM-189, #271/#272); a venue with no current assignment is reported explicitly.
E06-S04 owns confirmation, automatic first-confirmed primary assignment and
staff assessment presentation. E06-S03 owns explicit Coordinator selection of
another Confirmed primary on the booking list (Scenario 3c / T-78), as agreed
with E06-S04's owner on 16 October. Selection locks the event row first to
serialize with automatic assignment in `decideBooking`.


### Review coordination update (15 October 2026)

Migration ordering is now 0017 (SCRUM-184 safety review, reserved by its owner),
0018 (venue staff assignments, #271), then **0019_venue_bookings_contract.sql**
(E06-S03). The earlier 0015 reservation and 0018 booking proposal are superseded;
0019 must not overwrite the merged 0016 buffer guard. E06-S04 consumes `is_primary`.
No shared database migration has been applied by this branch.

A suggested-venue switch creates a new Pending row through the shared submission
service. It carries `replaces_booking_id`; the referenced row must be Rejected,
belong to the same assigned event and suggest the requested venue. The rejection
remains unchanged. The merged 0019 unique index currently permits one replacement
per rejection regardless of status; T-96 supersedes that target rule only for
Released replacements and requires a new migration. Identical idempotent retries
return the same row. Current eligibility, period,
Session, venue activity, buffers, blocks and advisory suitability all rerun.
The Coordinator form prefills the rejected booking?s period, purpose and headcount.

Approved ? Planning now calls `applyEventStatusChange` inside the submission
transaction, preserving its timestamp, audit and notification behaviour. Submission
uses `captureEventAudience` with a trusted requested-venue scope. This avoids a
parallel resolver and will use #272?s default `resolveAssignedVenueStaff` once
merged. Until then, production default staff routing is still unresolved; do not
claim it verified. Coordination of hold-conversion semantics with #245 remains
with the story owner.


## Agreed withdrawal follow-up (15 October 2026; T-94 to T-96)

**Requirements recorded; not implemented by this documentation change.** E06-S03
owns assigned-Coordinator withdrawal of Pending requests only. Reuse Released:
no new status or status migration. Confirmed cancellation belongs to a separate
flow, and Tentative hold release/expiry remains E06-S05.

### Transaction, races and audit

- Lock the requested venue row `FOR NO KEY UPDATE`, then the booking `FOR UPDATE`;
  recheck assignment and Pending status against current data. Align lock ordering
  with E06-S04; do not introduce a booking-before-venue acquisition.
- Change only the Pending booking to Released. Keep its history and replacement
  link; do not restore a converted hold or expiry. Remaining bookings and the
  event's status stay unchanged. Released no longer reserves venue occupancy;
  availability still reflects other bookings, buffers and venue blocks.
- Withdrawal wins: staff approval/rejection returns 409, explaining that the
  Coordinator withdrew the request. Decision wins: withdrawal returns 409 and
  the Coordinator refreshes. No stale write may overwrite the winning decision.
- Persist an audit entry with the actor, `entity_type='venue_booking'`,
  `entity_id=<booking id>`, `event_id`, `action='Booking Withdrawn'`,
  `field_changed='status'`, old `pending`, new `released`.
- Notify only this venue's currently assigned active Venue Staff. Resolve with
  the shared `captureEventAudience(client, eventId, options, [venueId])` scope;
  persist the in-app notification and email outbox atomically with withdrawal.
  Existing `booking_decided: released` targets the Coordinator and cannot serve
  as this staff notice: add a distinct withdrawal routing category or equivalent
  shared routing extension. No broadcast and no inference from `decided_by`.

### Replacement retry and rejection chain

Allow one **non-Released** replacement per source rejection. A Released
replacement stays as history and no longer blocks a fresh request referencing
that same rejection. The fresh request uses a new submission key and reruns
authorisation, eligibility, venue activity, period/Session, buffers, blocks and
advisory suitability. A retry of an already successful submission keeps returning
that existing request rather than creating another one.

A Rejected replacement still blocks reuse of its source rejection. If it has its
own suggested venue, a next request links to that immediately preceding Rejected
row. Thus A rejected with suggestion B, then B rejected with suggestion C, permits
a new request for C linked to B's rejection, not a second B from A's rejection.
There is no fixed maximum of two attempts. Without a new suggestion, that chain
ends; this does not forbid the separate ordinary venue-search/request journey.

Migration 0019's all-status `venue_booking_replacement_idx` is unchanged and
still blocks retry after withdrawal today. Coordinate a **new migration** that
excludes Released rows only, keeping Rejected and all other non-Released rows
protected. An active-only predicate would incorrectly reopen rejected attempts.
Update duplicate checks, list `has_replacement`/switch controls and concurrency
tests to match the new predicate. Do not rewrite 0019 or claim the new index has
already shipped. No migration number is reserved by this documentation change.

Source: Product Owner clarification relayed by the story owner, E06-S04 owner
agreement, and the story owner's notification/retry/chain confirmations in the
15 October working conversation. See T-94/T-95/T-96 for attribution. The code,
database migration, staff-routing verification and human manual run remain pending.

## E06-S06 rule B: first accepted claim and approval recheck (T-100, 22 October 2026)

The Product Owner approved this interpretation of C-01, C-16, C-46, C-60 and
C-65. It is a PO interpretation, not a new customer quote. It applies to
E06-S06 and does not change E06-S03's multiple-venue semantics.

- A claim is active while its booking is Pending, Confirmed, or Tentative with
  an expiry in the future. Converting an unexpired Tentative hold to a Pending
  request changes the same claim; it does not create a second reservation.
- The first successfully accepted hold or request reserves that venue's current
  buffered window. A later overlapping hold or request is refused while the
  first claim remains active. Concurrent overlapping new claims serialize: one
  is accepted, and the losing request returns 409 without a new row or effects.
- Approval rechecks live availability, concurrency and current buffer values.
  If a later buffer edit creates a conflict, apply C-109 and the existing
  `buffer_conflict` flag: save the edit, retain the affected bookings and flag
  them for review. Refuse approval while the conflict remains. Do not silently
  release a claim or treat the first approval as the winner. An explicit
  rejection by Venue Staff or Coordinator withdrawal/replan must resolve the
  conflict before later approval succeeds.
- Occupancy uses half-open buffered intervals, so exact adjacency is allowed.
  Conflict checks remain per venue: the same event may hold or confirm
  overlapping bookings at different venues (C-67, T-68).
- A refused hold or request gets the same Coordinator message, naming only the
  other booking's occupied buffered window: "This venue is unavailable from
  <start> to <end>, including setup and turnaround." It never names the other
  event (T-102, 30 October 2026). Venue Staff approval refusals still identify
  the conflicting booking.
- `buffer_conflict` is not cleared when a rejection or withdrawal resolves the
  conflict; it changes only at the next buffer edit. The Venue Staff decision
  screen therefore blocks Approve only on a current buffered overlap, not on
  the flag alone, and the server rechecks on approval (SCRUM-50).

This decision creates no queue, status, schema or migration change. It does not
rewrite migration 0016 or adopt migration 0021. The open-choice snapshot in #338
is superseded prospectively; the proposal associated with #308 is not adopted
and remains untouched. This contract note does not assert that #308 has merged.
### Withdrawal implementation branch (16 October 2026)

The E06-S03 withdrawal branch implements the preceding contract with
`POST /api/venues`, `action: withdraw_booking`, UUID `booking_id`. The server
rechecks assigned Coordinator/account authority and Pending status. Success
returns the Released booking and `unresolved_venue_ids`; non-Pending/busy
event or account returns 409, and inaccessible requests return 404.

Venue is locked before Booking. Afterwards Event and account use
`FOR SHARE NOWAIT` to protect authority without waiting on an event-first
submission/reassignment transaction while holding Venue. A lock conflict rolls
back and asks the caller to refresh/retry. No event status change occurs.
The new `booking_withdrawn` category targets only the requested venue's current
active staff, distinct from Coordinator-facing `booking_decided: released`.
Audit, inbox and email outbox persistence share the withdrawal transaction.

Migration `0020_released_booking_replacement_retry.sql` supersedes 0019's
all-status replacement index with a non-Released predicate, retaining every
historical row and the other constraints. Service/list predicates match it.
This is local branch implementation, not a production migration, human
acceptance result or whole-story Done claim. Full E06-S04 decision integration
and human manual verification must still be observed against the merged flow.

Activity log visibility: PR #298 is merged (9c8a37f, 24 October); its Coordinator read query now includes `entity_type=venue_booking`. PR #299 integration preserves the primary-specific formatter before generic booking status formatting. The eight actual-service combined race cases now run in the existing CI booking command; they no longer skip for a missing dependency. Fresh human combined-flow/Activity checks remain separate from automated evidence.


### E06-S03 attendee primary publication follow-up (#299)

Explicit publication selects only the primary Confirmed booking, excluding rows requiring reconfirmation. Missing eligible primary is refused rather than selecting an arbitrary booking. Several Confirmed bookings therefore still produce one publication.

Changing primary updates only the venue name/location and publication timestamp of an existing publication when the Event is Confirmed, in the same transaction as both primary flags and the audit. It never creates a publication or exposes Planning/Approved/Safety Review arrangements. A primary requiring reconfirmation cannot be selected on a Confirmed Event. Attendees continue to read only the published snapshot and must remain registered. Other published fields, booking statuses and periods stay unchanged. The dedicated CI booking selector also runs the attendee publication integration test.


Effective primary venue changes on an existing Confirmed publication use the shared T-64 arrangement notification hook in that same transaction. Capture scoped old/new venue staff plus current assigned technical staff, organiser and Coordinator; registered/waitlisted Attendees receive public-name wording. Exclude the actor, inactive/unrelated/withdrawn users and duplicate memberships. The primary audit ID is the durable notification change ID. A replay or another booking at the same venue emits no venue-change notice. Outbox failure rolls back primary flags, publication, audit and inbox/outbox together. Planning/unpublished selections remain internal and emit no effective-public-venue notice. This implements a caller, not proof of provider or actual mailbox receipt.


### E10-S05 lost-venue recovery (SCRUM-74)

E05-S06 owns unavailability detection, Conflicting status, Coordinator notification and Confirmed-to-Planning. Recovery consumes its migration-0025 `conflict_block_id` / `status_before_conflict` contract; it does not duplicate the trigger. The assigned Coordinator's booking list includes the block category, reason and unavailable range, plus `requires_reconfirmation`.

`request_booking` accepts `replaces_booking_id` for a same-event Conflicting source caused by loss of a Pending/Confirmed booking. Search and suitability carry this link and prefill the original period, purpose and headcount. Rejected attempts retain their status and predecessor slot under T-96. Retrying from a lost original links the new request to the terminal Rejected attempt; following a staff suggestion links to that Rejected attempt as usual. Approval and cancellation follow the same-event chain back to the lost original, so recovery continues after rejection without deleting history or changing the non-Released unique index. Search remains available while the chain contains only Rejected attempts; active Pending/Confirmed descendants prevent duplicate recovery requests. Existing single-Session submission restrictions still apply; this increment does not add multi-Session booking selection.

When Venue Staff approves the replacement, the transaction transfers an original primary designation to the replacement and refreshes only the venue in an existing publication. The Event remains Planning; recovery does not reconfirm it. A separate Lost Venue Replaced audit records the selected booking, primary designation and whether publication changed. Its ID is distinct from the Booking Approved audit so the Coordinator receives both the decision notice and the internal arrangement notice. E11 routing captures old/new venue audiences and excludes the actor. Recovery notices name the confirmed replacement venue using the authoritative venue row; the same message is prepared for email. Registered/waitlisted Attendees receive a venue-change notice only when the published venue actually changes; a secondary-room replacement stays internal. Original booking, audit, publication and inbox/outbox effects roll back together on failure. An unlinked approval is unchanged.

The original remains Conflicting. `POST /api/venues` with `action: cancel_lost_booking` and `booking_id` explicitly releases it only for its current assigned active Coordinator and only with a same-event linked Confirmed replacement not requiring reconfirmation. It audits the cancellation and notifies the original venue's assigned staff. Released retries do not duplicate effects. Closed Events refuse recovery. The existing same-origin/session handler is reused; no new serverless function or migration is needed.

The Coordinator's Venue bookings page links to `/coordinator/events/:eventCode/venue-recovery`. Lifting or shortening unavailability follows same-event replacement descendants through rejected attempts. An active descendant prevents restoring the original; a Released attempt ends that path. This preserves explicit original cancellation after a successful retry. Database integration tests exercise real E05-S06 loss, recovery approval, publication/notification timing and block lifting/editing. Human manual acceptance remains required.

## API changes for the Week 7 and Week 9 Customer Changes

Version 3 · 30 October 2026

The Week 7 "Managing Changes" guide asks that a requirement change be traced through to
the interfaces it touches. This file records the Week 7 baseline, its Week 9
reconciliation and implementation notes for the owning story, shared-skeleton frontend
and test-case authors. The Week 9 addendum is authoritative where it supersedes Week 7
assumptions. Target rows name the story and cases that prove the change; dated
implementation notes record what shipped. The shared booking contract controls the
venue API details.

Conventions carried over from the existing routes (ADR-014, `api/` is at the Hobby-plan
function cap): new Coordinator, Lead and Safety Officer actions are query-parameter
branches on `/api/events`; new venue and booking actions are `action` values in the
`POST /api/venues` body; the cron job is a new branch of `GET /api/cron/outbox-relay`
rather than a new function. Every mutating call carries the cookie session (ADR-015)
and writes its audit row and notification rows inside the same transaction (ADR-006,
ADR-009).

### Change 1 — venue setup and turnaround time (C-65, E05-S05)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: create` / `update` | Venue Staff | Body accepts `setup_minutes` and `turnaround_minutes` (0 to 480, integers); both default to 0. A change to either re-evaluates existing Pending and Confirmed bookings on that venue and returns `conflicts: [{booking_id, event_title, occupancy_range}]` for any newly overlapping pair, which the server has already marked Conflicting. | E05-S05 | TC_E05S05_01, _03, _06 |
| `GET /api/venues?id=<id>` | all internal | Response gains `setup_minutes`, `turnaround_minutes`. | E05-S05 | TC_E05S05_01 |
| `GET /api/venues?availability=1&id=<id>&from=&to=` | Venue Staff, Coordinator | Calendar rows return both `booking_range` and `occupancy_range`; the UI shades the buffer differently (E05-S05 Scenario 3). | E05-S05, E06-S04 | TC_E05S05_02, TC_E06S04_04 |
| `GET /api/venues?search=1&...` | Coordinator | Suitability and free-slot checks use the occupancy window; a venue whose buffer overlaps the requested period is excluded. | E05-S05 (E06-S01 is Done, T-74), E06-S03 | TC_E05S05_07, TC_E06S03_06, TC_E05S05_04, _05 |

### Change 2 — venue unavailability over existing bookings (C-66, E05-S06, E10-S05)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: block` | Venue Staff | Body gains mandatory `reason_category` (`maintenance`, `equipment_failure`, `renovation`, `safety_concern`, `other`) alongside the free-text `reason`. The call no longer refuses when the range overlaps Pending or Confirmed bookings: it records the block, marks each overlapping booking Conflicting and returns `affected_bookings: [...]` with Coordinator and event details. An open-ended range is allowed and remains active until lifted (T-80). | E05-S06 | TC_E05S06_01, _02, _03, _04 |
| `POST /api/venues` `action: edit_block` / `lift_block` | Venue Staff | Edits retain prior/new range and reason, actor and time. Lifting retains history and notifies affected Coordinators; conflict restoration follows C-122. If a block makes a Confirmed Event's active booking unavailable, return the Event to Planning and notify its Coordinator immediately (T-81/T-91). | E05-S06, E08-S04 | TC_E05S06_05, _06 |
| `GET /api/events?id=<id>` | Coordinator, Organiser | Event detail lists each booking with `status`, and for `conflicting` the block's `reason_category` and `block_range`. | E05-S06, E10-S05 | TC_E10S05_01, _02 |
| `GET /api/venues?blocks=1&id=<id>` | Venue Staff, Coordinator | Block rows return `reason_category`. | E05-S06 | TC_E05S06_01 |

### Change 3 — several venues for one event (C-67, E06-S03, E06-S06)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: request_booking` | Assigned Coordinator | Allows several bookings per event and carries `session_id`. Optional `purpose` and `headcount` remain null when omitted; suitability uses booking headcount or linked Session expected attendance as fallback and is advisory. The server validates Session ownership/range, checks venue blocks and buffered occupancy, and moves Approved to Planning atomically. | E06-S03 | TC_E06S03_07, _08 |
| `POST /api/venues` `action: set_primary` | Assigned Coordinator | The first booking to become Confirmed is made primary when none is primary. The Coordinator may select another Confirmed booking; Pending bookings cannot be primary. | E06-S03 | TC_E06S03_07 |
| `GET /api/events?id=<id>` | Coordinator, Organiser | `venue_bookings: [...]` replaces the single `venue_booking` object; each entry carries `purpose`, `headcount`, `is_primary`, `occupancy_range`. | E06-S03, E10-S02 | TC_E10S02_05 |
| `GET /api/attendee/events` and `?id=` | Attendee | Public event shows the primary venue; secondary venues appear under `other_venues` with their purpose (O-30). | E09-S01 | TC_E09S01_06 |
| `POST /api/venues` `action: decide` | Venue Staff | Decision is per booking; approving one of an event's bookings does not touch the others. The exclusion constraint keys on `venue_id`, so two venues for one event over the same period never conflict. | E06-S06 | TC_E06S06_07 |

### Change 4 — tentative holds expire (C-68, E06-S05)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: hold` | Coordinator | Creates a Session-linked booking with `status: tentative`. Venue Staff explicitly configures expiry per hold; there is no default or fixed 1-hour/14-day range. Refused with 409 when the occupancy window overlaps any Pending, Tentative or Confirmed booking. | E06-S05 | TC_E06S05_01, _02, _03 |
| `POST /api/venues` `action: convert_hold` | Assigned Coordinator | Calls the shared submission service and changes the existing Tentative row to Pending for the same range. Submission clears expiry; expired holds cannot convert. Repeating conversion for the same booking id returns the existing Pending booking without duplicate effects. | E06-S05 | TC_E06S05_04 |
| `POST /api/venues` `action: extend_hold` | Venue Staff | Requires a reason; allows at most two extensions of an unexpired hold and appends extension history. The Coordinator sets the per-hold warning interval; the relay warns at the configured threshold rather than a fixed 24 hours (T-84). | E06-S05 | TC_E06S05_03, _07 |
| `POST /api/venues` `action: release` | Coordinator | Existing release now also accepts a Tentative booking. | E06-S05 | E06-S05 Scenario 4 (no dedicated case) |
| `GET /api/cron/outbox-relay` | scheduler (Vercel cron, bearer secret) | Each run expires configured holds whose `expires_at <= now()` (status `expired`, audit `hold_expired`, notification to the Coordinator) and sends the configured warning; no default expiry or warning interval is used (T-84). | E06-S05 | TC_E06S05_05 |

**Sprint 3 implementation (SCRUM-49).** The rows above are the T-84 target, planned
for Sprint 4. What #245 and #252 shipped follows T-92, as the E06-S05 backlog story
does:

- `action: hold` defaults to an expiry 48 hours ahead, or takes a chosen expiry from
  1 hour to 14 days ahead.
- `action: extend_hold` moves an unexpired hold's expiry later. It needs no reason, has
  no limit on how many times, and logs each extension with who made it.
- There is no warning before expiry. The Coordinator gets one in-app and email notice
  when the hold expires.
- The expiry run is `GET /api/cron/outbox-relay?task=holds` (`expireHolds`). The audit
  action is "Tentative hold on <venue> expired", not `hold_expired`. A hold stops
  holding its venue the moment `expires_at` passes, whether or not the run has
  happened.
- `action: convert_hold` changes the same row to Pending and clears its expiry. Moving
  conversion onto the shared submission service is E06-S03 work (#274).

### Change 5 — Event Coordinator Lead and the unassigned queue (C-69, E03-S08 to E03-S10, E01-S12, E01-S13)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/events` | Organiser | Submission no longer calls `assignCoordinator`; the event stays `submitted` with `coordinator_id` null and appears in the queue. Response field `coordinator` is null until assigned. | E03-S08 | TC_E03S08_01 |
| `GET /api/events?unassigned=1` | Lead | Lists `submitted` Events with no Coordinator, oldest first, with the overall planning attendance and a Session summary of dates, attendance and venue requirements. | E03-S08 | TC_E03S08_02; T-79 |
| `GET /api/events?coordinators=1&workload=1` | Lead | Existing colleague list extended for the Lead with `active_events` per Coordinator. | E03-S08 | TC_E03S08_03 |
| `POST /api/events?assign=1&id=<id>` | Lead | New branch. Body `{coordinator_id}`. Sets `coordinator_id`, `coordinator_assigned_at`, `assigned_by`; status `submitted` to `under_review`; audit `lead_assigned`; notifies Coordinator and Organiser. 409 if the event is no longer unassigned. | E03-S08 | TC_E03S08_03, _04, _05 |
| `POST /api/events?reassign=1&id=<id>&by_lead=1` | Lead | Direct replacement at any event stage without colleague acceptance; audit `lead_reassigned`; notify affected Coordinators and Organiser (T-83). | E03-S09 | TC_E03S09_01 |
| `POST /api/events?reassign=1&id=<id>` | Coordinator | Removed by T-83. Coordinators cannot request reassignment through the system or initiate peer reassignment; the Lead manages all reassignment. Historical request records are not treated as active work. | E03-S09 | No active request case; preserve any retired historical IDs |
| `GET /api/events?reassignments=1&to_lead=1` | Lead | Removed by T-83. The Lead's direct assignment/reassignment action takes effect immediately; there is no request queue, accept or decline step. | E03-S09 | No active request case; preserve any retired historical IDs |
| `GET /api/events?oversight=1[&status=][&coordinator=]` | Lead | New branch. Every active event with its Coordinator or `Unassigned`, filterable. | E03-S10 | TC_E03S10_01, _02 |
| `GET /api/events?assigned=1` and `?id=<id>` | Coordinator | Scoped to the caller's own assignments (E01-S12): the unassigned queue is excluded, a colleague's event returns 403 with nothing revealed and the attempt is audited; venue availability states stay visible with other events' details withheld. | E01-S12 | TC_E01S12_01 to _04 |
| `GET /api/auth/session` | Lead | The response exposes `roles: [event_coordinator_lead, ...]`; the shared skeleton shows only routes granted to this account. | E01-S13 | TC_E01S13_01, _02 |

### Change 6 — Safety Officer and the Operational Safety Check (C-70, E08-S03, E08-S04, E08-S06)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| Automatic arrangement-complete transition | System | No Coordinator submit endpoint. When all required Session-linked venue/equipment arrangements and Event-level technical support are confirmed, automatically create a pending `safety_checks` row with `created_at`, set status `planning` to `safety_review`, audit the transition and notify Safety Officers and Organiser (C-132/T-82). | E08-S03 | TC_E08S03_08, _09 |
| `GET /api/events?safety=queue` | Safety Officer | Events in `safety_review`, oldest first, with every input the seven factors need by Session (venue, capacity, layout, Session attendance, accessibility and equipment), plus the overall Event attendance for planning context. | E08-S06 | TC_E08S06_01, _06; T-79 |
| `GET /api/events?id=<id>` | Safety Officer | Read access to an event in `safety_review` (and its history afterwards); otherwise 403. | E08-S06 | TC_E08S06_05 |
| `POST /api/events?safety=decide&id=<id>` | Safety Officer | Body `{decision: approved \| changes_requested \| rejected, comments, factors: [{factor, satisfactory, comment}]}`. Persist decision and comments (C-134); comments carry the explanation for changes/rejection (C-133), with no separate reason field. The system checklist for each factor is the T-82 workflow aid. `approved` moves to `confirmed`; the other decisions return to `planning`. Both outcomes notify the Coordinator and Organiser; a safety decision never cancels the Event. | E08-S06 | TC_E08S06_02 to _05 |
| `POST /api/events?revert=1&id=<id>` | Coordinator | Existing revert from Confirmed to Planning now also clears the approved safety check so a later resubmission is reviewed again (E08-S04 Scenario 4). | E08-S04 | TC_E08S04_05 |
| `GET /api/auth/session` | Safety Officer | The response exposes `roles: [safety_officer, ...]`; authorization checks the account's granted role set. | E01-S13 | TC_E01S13_01, _02 |

### Status vocabulary exposed to clients

| Enum | Values after Week 9 | Added |
| --- | --- | --- |
| `event_status` | draft, submitted, under_review, awaiting_clarification, rejected, approved, planning, **safety_review**, confirmed, cancelled, completed | safety_review (T-71) |
| `booking_status` | pending, **tentative**, confirmed, rejected, released, conflicting, **expired** | tentative, expired (T-69) |
| `user_role` | event_organiser, event_coordinator, **event_coordinator_lead**, venue_staff, technical_support_staff, **safety_officer**, attendee | two roles (T-72) |
| `unavailability_reason` | maintenance, equipment_failure, renovation, safety_concern, other | new enum (T-67) |
| `registration_status` | **pending**, registered, waitlisted, withdrawn | pending for Organiser review of over-capacity submissions (T-85) |
| `change_status` | pending, approved, declined, applied, **obsolete** | obsolete when Event becomes Completed or Cancelled (T-88) |

Frontend status pills, filters and the `roles.ts` route table (see `docs/frontend-guide.md`)
must be extended for every bold value before the owning story's UI ships. An
authenticated account may have multiple `user_role` memberships; the session
contract exposes the granted roles, while seed data starts with one (T-86).

### Week 9 reconciliation — sessions, registration and lifecycle (C-71 to C-136; T-79 to T-91)

The shapes below are interface requirements for story refinement, not customer
wording. The owning story and API implementation PR must finalize endpoint details.

| Interface | Role | Week 9 requirement | Trace |
|---|---|---|---|
| Event create/update and `GET /api/events?id=<id>` | Organiser, Coordinator | Preserve the Event's overall expected-attendance planning total and represent one or more child Sessions, each with separate date/time, expected attendance, layout, venue/accessibility requirements and equipment requirements. Only Session attendance is the fallback for that Session's booking suitability. Event lifecycle, registration window and technical support remain Event-level. Event dates more than two years ahead are rejected; no fixed minimum lead time is imposed. | E02-S01/S02/S05/S07, E04-S02; T-79/T-87; O-51 |
| `POST /api/venues` `action: request_booking` / `hold` | Assigned Coordinator | Include and validate `session_id`; booking period lies within that Session. Per-booking headcount falls back to Session expected attendance. Multiple bookings for an Event, including repeat bookings of one venue across separate Sessions, remain supported. | E06; C-107/T-79 |
| Equipment request/reservation endpoints | Coordinator, Technical Support Staff | Include Session ownership on each request/reservation; available periods use the linked Session. Keep technical-support assignment Event-level. | E07-S08; C-107/T-79 |
| `GET /api/attendee/events` and registration submission | Attendee | Show Session choices and accept one Event registration selecting one or more Sessions. Enforce each selected Session's confirmed layout capacity and combined Event capacity derived from confirmed Session layouts. A submission over either limit becomes Pending for Organiser decision and is not an approved seat. The Event-level waiting list applies only when combined Event capacity is full and the Event list is enabled; a full selected Session follows the Pending path (T-98). | E04-S02, E09-S01/S02/S03/S04/S05; T-85, T-98 |
| `GET /api/attendee/events?open=1`, `GET` and `POST /api/attendee/events?registration=1&id=<event id or code>`, `POST /api/attendee/events?waitlist=1&id=<event id or code>` | Attendee | Implemented for E09-S01/S04 (SCRUM-207/66). `?open=1` lists published, Confirmed events that take registrations and have not closed, each with `registrationState` (`open`, `not_yet_open`, `closed`), the primary venue and the caller's own active `myRegistrationStatus`. The registration form (`GET ?registration=1`) returns the event, its Sessions with their own Confirmed venues, the account's name, email and contact number (T-32, O-05), any `missingDetails`, the caller's active registration, and `capacity: { eventFull, waitlistEnabled, fullSessionIds }`. A registration `POST` with `{ "sessionIds": [...], "claimWaitlist": true? }` returns the registration and selected Sessions; a claim converts the caller's waitlisted row only when combined Event capacity remains, with the Event lock making competing claims first-come; a lost claim stays waitlisted. A `POST` with `?waitlist=1` adds an Event-level row only when registration is open, the list is enabled and combined capacity is full. No queue position or automatic promotion is used; every waitlisted Attendee is notified when a registered place is released (T-46). A registration over a Session/Event limit follows the Pending path (T-85/T-98). | E09-S01/S02/S03/S04/S05; TC_E09S01_01, _03 to _07; TC_E09S02_08 to _10; TC_E09S04_01 to _05; T-32, T-46, T-85, T-98 |
| Organiser registration review | Organiser | List Pending over-capacity registrations and recheck both capacity limits when approving. Reject approval if either limit would be exceeded. Preserve one active registration per account/Event; withdrawing releases the attendee's places in the Event and all selected Sessions. | E09-S01/S02/S05; T-85 |
| `GET` and `POST /api/events?registrations=1&id=<event id or code>` | Event Organiser of that event | Implemented for E09-S02 (SCRUM-210). Capacity comes from one shared function (`attendeeRegistration/capacity.ts`, for E10-S02 too): a Session's places are the sum of its Confirmed bookings, each at the Session's layout capacity for that venue or the venue maximum when the layout isn't listed; the Event's places are the sum across its Sessions; only `registered` rows take a place. `GET` returns the event, `capacity { capacity, registered }`, each Session with its `capacity` and `registered`, and the Pending requests with the attendee's name and email, chosen Sessions and `overCapacity` (why approval would pass a limit, or null). `POST { action: "approve" \| "reject", registrationId }` decides a Pending request; approval rechecks both limits (409 while either is full). `POST { action: "add", email, sessionIds }` adds an attendee as a `manually_added` registration, ignoring the registration window, and is refused (409) at either limit. Writes lock the event row like Attendee registration, need an allowed `Origin` (403 otherwise), and need the event to be Confirmed (409). Successful writes return the refreshed `GET` shape plus the `registration`. Since E09-S07 (SCRUM-216), `GET` is open to every Organiser of the event's client organisation (E01-S02 Scenario 3) and also returns `capacity.remaining`, `event.canManage` (true only for the event's own Organiser), `registered` (name, email, contact number, Sessions, `registeredAt`, `manuallyAdded`) and `waitlisted` (name, email, contact number, Sessions, `joinedAt`, in joining order), with no other personal data (T-32). Writes stay with the event's own Organiser (403 for a colleague). Another organisation's or an unknown event gets 403 "Access denied. This event is not available to your organisation.", and the attempt is recorded as `Access Denied` / `registrations` (E01-S02 Scenario 2). | E09-S02 (SCRUM-210/211), E09-S07 (SCRUM-216/217); TC_E09S02_03, _06, _07, _11, _12; TC_E09S07_01 to _04; C-58, T-32, T-50, T-85 |
| `PATCH /api/events?edit=1&id=<event id or code>` (E03-S07 edit route) | Event Organiser of that event | Extended for E09-S03 (SCRUM-213). Besides `registrationDates { opensAt, closesAt }`, the Organiser may set `withdrawalDeadline` (ISO date, or `null` to clear) and `waitlistEnabled` (boolean), before and after approval (T-16, C-24, C-44); each change is audited. A closing date after the event's start (or after a `startAt` in the same patch) returns **428** with the start date in the message, and is saved only when resent with `confirmLateClose: true` (Scenario 3). 428 is used so it isn't mistaken for the 409s that offer a change request. The `GET ?registrations=1` read now also returns `startsAt`, `endsAt`, `registrationEnabled`, `opensAt`, `closesAt` and `withdrawalDeadline`. The window is Event-level and applies to every Session (T-42, T-79); Attendee enforcement is E09-S01's. | E09-S03 (SCRUM-213/214); TC_E09S03_01 to _06, _09; T-16, T-42, C-24, C-44 |
| `PATCH /api/events?edit=1&id=<event id or code>` (Coordinator save) and `&preview=1` | Assigned Event Coordinator | Implemented for E10-S02 (SCRUM-236). `&preview=1` runs the same edit inside a savepoint and rolls it back, returning `{ impact, overSubscription, revision }` without saving, flagging, auditing or notifying (Scenario 3); it refuses exactly what the save refuses. `revision` fingerprints that `impact` and `overSubscription`; the save accepts it as `&reviewed=<revision>` and, when the arrangements changed since the preview, refuses with 409 `{ error: 'arrangements_changed', message, impact, overSubscription, revision }` (the fresh list, no `changeRequestUrl`) before anything is saved, flagged, audited or notified. Without `reviewed` the save is unchanged (PR #380 review). `impact` is `{ affected, bookings: [{ id, sessionId, venueId, venueName, reasons, governingHeadcount, capacity }], reservations: [{ id, sessionId, equipmentId, equipmentName, reasons }] }`, with `reasons` drawn from `time` and `capacity`. Only Confirmed bookings and reserved/partial reservations count. A Session or Event-wide date/time change flags that Session's or every Session's arrangements; an attendance change flags a booking whose governing headcount (its own, else the Session's) is strictly above capacity. The save sets `requires_reconfirmation`, writes one audit row per arrangement and sends one reconfirmation notice to the flagged venues' Venue Staff and the assigned Technical Support Staff, all in the edit's transaction; its response adds the same `impact`, `overSubscription` and `revision`. `overSubscription` lists `{ scope: 'session' | 'event', sessionId, registered, capacity }` where Registered places exceed E09-S02's capacity; nobody is removed or waitlisted (C-05). Approved E10-S01 change requests do not call this check yet. | E10-S02 (SCRUM-71/236); TC_E10S02_01 to _09; T-16, T-78, T-79, T-85, C-05, B-05, B-11 |
| Automatic readiness transition | System | On confirmation of all required Session venue/equipment arrangements and Event-level technical support, create the safety review and move Planning to Safety Review. Do not expose a Coordinator `safety=submit` action. | E08-S03; C-132/T-82 |
| Safety decision | Safety Officer | Persist overall decision and comments, plus the team-added checklist for each safety factor. Approval moves to Confirmed; changes/rejection return to Planning. | E08-S06; C-134/T-82 |
| Event block / lifecycle transaction | System, Venue Staff | If block creation/edit makes a Confirmed Event's active venue unavailable, flag it, return it to Planning and notify its Coordinator immediately. Do not cancel; Organiser/Attendee messages follow confirmed replacement arrangements or formal changes. | E05-S06, E08-S04, E10-S05; C-120/C-121/T-81 |
| Change request lifecycle | System | When Event status becomes Completed or Cancelled, atomically move its Pending change requests to Obsolete, preserve history and emit audit events. | E10-S01/S03/S04; C-77/T-88 |
| Venue block and hold lifecycle | Venue Staff, Coordinator | Permit open-ended blocks; retain edit/lift history; notify the affected Coordinator on lift. Configure each hold expiry/warning without a default; require a reason for at most two extensions. | E05-S06, E06-S05; T-80/T-84/T-91 |
| Venue-to-staff routing | Setup only | Store venue-to-staff assignment for notification routing; add no roster-management screen to Release 1. | T-89; O-49 |

O-50 (Session waitlist) was closed by T-98: Release 1 has no per-Session
waitlist. O-51 (exact copy-forward scope) remains a team assumption. The Session
copy route must copy only the scope accepted under O-51 and must not copy
transactional records by default.

### Implementation note — Event date horizon (E02-S07 / SCRUM-180)

On Event submission through `POST /api/events` or draft submission through
`PATCH /api/events?id=<id>`, `startAt` and `endAt` must fall on or before the
date two calendar years after the current Singapore-local date. There is no
minimum lead time. A later Event date returns HTTP 400 with
`{ error: "event_date_outside_horizon", field: "startAt" | "endAt",
maximumDate: "YYYY-MM-DD" }`; the Organiser form names the offending field and
the accepted Singapore-local boundary. Draft saves may retain a farther date,
but submitting the draft rechecks it. PATCH uses `respondWithResult` so a refused
submission emits exactly one HTTP 400, retaining its field and boundary details;
the draft and its sole Session remain unchanged. The existing past-date error is unchanged.

The database creates one default Session from the Event date range, so it inherits
the checked Event dates. No API currently creates or edits additional Session date
ranges; E02-S07's multi-Session date acceptance remains open until E04 adds that
write path and applies the same rule.

### Out of scope here

The Week 9 architecture PR updates contracts and target schema only. These API
changes are implementation follow-ups; existing migrations and routes are not
claimed to implement them. Code changes need story-sized PRs, coverage and the
Definition of Done after the requirements/design changes merge.

## E10-S01 arrangement application continuation

Change-request decisions accept `decision: "preview"` without deciding or
persisting the proposed edit. Supported results include `preview.token`, the
shared E10-S02 revision, along with impacts and capacity warnings. Approval
(or `decision: "apply"` for an older Approved request) sends `previewToken`
and, when needed, `confirmLateClose: true`. Stale previews return 409; missing
late-close consent returns 428. Registration enablement and nullable window
boundaries are supported only in trusted approved-request application context.
Layout/accessibility fields now apply atomically with mixed requests; venue
review reasons include layout/accessibility. Individual Session edits remain separate. Terminal Event, stale-field and assigned-Coordinator checks remain.

Layout/accessibility continuation: changed Event requirements flag confirmed venue
bookings for review (T-16), with explicit reasons. Equipment is unaffected by
these requirements alone. The existing sole-Session layout trigger is retained;
no individual multi-Session requirements are overwritten. Layout capacity uses
the shared E09 warning calculation and never removes registered attendees.

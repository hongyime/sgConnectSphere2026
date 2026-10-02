## API changes for the Week 7 Customer Changes

Version 1 · 3 October 2026

The Week 7 "Managing Changes" guide asks that a requirement change be traced through to
the interfaces it touches. This file lists every REST endpoint the six Customer Changes
add or alter, so that the owning story's developer, the frontend author on the shared
skeleton (ADR-017) and the test-case author start from one list. Nothing here is
implemented yet; each row names the story that will implement it and the test cases
that will prove it. Update this file in the story's PR when the shape changes.

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
| `GET /api/venues?search=1&...` | Coordinator | Suitability and free-slot checks use the occupancy window; a venue whose buffer overlaps the requested period is excluded. | E06-S01, E06-S03 | TC_E06S01_05, TC_E06S03_06, TC_E05S05_04, _05 |

### Change 2 — venue unavailability over existing bookings (C-66, E05-S06, E10-S05)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: block` | Venue Staff | Body gains mandatory `reason_category` (`maintenance`, `equipment_failure`, `renovation`, `safety_concern`, `other`) alongside the free-text `reason`. The call no longer refuses when the range overlaps Pending or Confirmed bookings: it records the block, marks each overlapping booking Conflicting and returns `affected_bookings: [...]` with Coordinator and event details. A range without an end is refused. | E05-S06 | TC_E05S06_01, _02, _03, _04 |
| `POST /api/venues` `action: shorten_block` / `remove_block` | Venue Staff | Removing or shortening a block clears Conflicting back to the prior status for bookings no longer overlapped. | E05-S06 | TC_E05S06_05, _06 |
| `GET /api/events?id=<id>` | Coordinator, Organiser | Event detail lists each booking with `status`, and for `conflicting` the block's `reason_category` and `block_range`. | E05-S06, E10-S05 | TC_E10S05_01, _02 |
| `GET /api/venues?blocks=1&id=<id>` | Venue Staff, Coordinator | Block rows return `reason_category`. | E05-S06 | TC_E05S06_01 |

### Change 3 — several venues for one event (C-67, E06-S03, E06-S06)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: request_booking` | Coordinator | No longer refused when the event already has a Pending or Confirmed booking. Body gains optional `purpose` (text, 80 chars), `headcount` (int, defaults to the event's `expected_attendance`), `is_primary` (bool). Suitability checks compare the venue against `headcount`, not the event total. | E06-S03 | TC_E06S03_07, _08 |
| `POST /api/venues` `action: set_primary` | Coordinator | Marks one booking of the event primary and clears the flag on the others. Exactly one Confirmed booking must be primary before submission for the safety check. | E06-S03 | TC_E06S03_07 |
| `GET /api/events?id=<id>` | Coordinator, Organiser | `venue_bookings: [...]` replaces the single `venue_booking` object; each entry carries `purpose`, `headcount`, `is_primary`, `occupancy_range`. | E06-S03, E10-S02 | TC_E10S02_05 |
| `GET /api/attendee/events` and `?id=` | Attendee | Public event shows the primary venue; secondary venues appear under `other_venues` with their purpose (O-30). | E09-S01 | TC_E09S01_06 |
| `POST /api/venues` `action: decide` | Venue Staff | Decision is per booking; approving one of an event's bookings does not touch the others. The exclusion constraint keys on `venue_id`, so two venues for one event over the same period never conflict. | E06-S06 | TC_E06S06_07 |

### Change 4 — tentative holds expire (C-68, E06-S05)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/venues` `action: hold` | Coordinator | New action. Creates a booking with `status: tentative`, `expires_at` defaulting to `now() + 48h` (O-31) and an explicit `expires_at` accepted within 1 hour to 14 days. Refused with 409 when the occupancy window overlaps any Pending, Tentative or Confirmed booking. | E06-S05 | TC_E06S05_01, _02, _03 |
| `POST /api/venues` `action: convert_hold` | Coordinator | Turns a Tentative booking into a Pending request for the same range; `expires_at` is cleared. | E06-S05 | TC_E06S05_04 |
| `POST /api/venues` `action: extend_hold` | Venue Staff | Sets a later `expires_at`; audit action `hold_extended`. Refused on a hold that has already expired. | E06-S05 | TC_E06S05_03, _07 |
| `POST /api/venues` `action: release` | Coordinator | Existing release now also accepts a Tentative booking. | E06-S05 | E06-S05 Scenario 4 (no dedicated case) |
| `GET /api/cron/outbox-relay` | scheduler (Vercel cron, bearer secret) | Each run additionally expires holds whose `expires_at <= now()` (status `expired`, audit `hold_expired`, notifications to the Coordinator) and sends the 24-hour reminder once (`reminder_sent_at` guard). Response gains `holds_expired` and `reminders_sent` counts. | E06-S05 | TC_E06S05_05, _06 |

### Change 5 — Event Coordinator Lead and the unassigned queue (C-69, E03-S08 to E03-S10, E01-S12, E01-S13)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/events` | Organiser | Submission no longer calls `assignCoordinator`; the event stays `submitted` with `coordinator_id` null and appears in the queue. Response field `coordinator` is null until assigned. | E03-S08 | TC_E03S08_01 |
| `GET /api/events?unassigned=1` | Lead | New branch. Lists `submitted` events with no Coordinator, oldest first, with organiser, requested date, expected attendance and venue requirements. | E03-S08 | TC_E03S08_02 |
| `GET /api/events?coordinators=1&workload=1` | Lead | Existing colleague list extended for the Lead with `active_events` per Coordinator. | E03-S08 | TC_E03S08_03 |
| `POST /api/events?assign=1&id=<id>` | Lead | New branch. Body `{coordinator_id}`. Sets `coordinator_id`, `coordinator_assigned_at`, `assigned_by`; status `submitted` to `under_review`; audit `lead_assigned`; notifies Coordinator and Organiser. 409 if the event is no longer unassigned. | E03-S08 | TC_E03S08_03, _04, _05 |
| `POST /api/events?reassign=1&id=<id>&by_lead=1` | Lead | New branch. Body `{coordinator_id, note}`. Direct replacement without the colleague's acceptance (O-36); audit `lead_reassigned`; notifies outgoing, incoming and Organiser. | E03-S09 | TC_E03S09_01 |
| `POST /api/events?reassign=1&id=<id>` | Coordinator | Existing request gains body `to_lead: true` as an alternative to `colleague_id` (O-37); creates a reassignment row with `addressed_to_lead`. | E03-S09 | TC_E03S09_02, _03 |
| `GET /api/events?reassignments=1&to_lead=1` | Lead | Lists reassignment requests addressed to the Lead. `POST /api/events?reassignment=<id>` with `decision: assign` + `coordinator_id`, or `decision: decline` + `note`. | E03-S09 | TC_E03S09_03 |
| `GET /api/events?oversight=1[&status=][&coordinator=]` | Lead | New branch. Every active event with its Coordinator or `Unassigned`, filterable. | E03-S10 | TC_E03S10_01, _02 |
| `GET /api/events?assigned=1` and `?id=<id>` | Coordinator | Scoped to the caller's own assignments (E01-S12): the unassigned queue is excluded, a colleague's event returns 403 with nothing revealed and the attempt is audited; venue availability states stay visible with other events' details withheld. | E01-S12 | TC_E01S12_01 to _04 |
| `GET /api/auth/session` | Lead | `role: event_coordinator_lead` is a valid session role; the shared skeleton routes it to the Lead landing page. | E01-S13 | TC_E01S13_01, _02 |

### Change 6 — Safety Officer and the Operational Safety Check (C-70, E08-S03, E08-S04, E08-S06)

| Method and path | Role | Change | Story | Cases |
| --- | --- | --- | --- | --- |
| `POST /api/events?safety=submit&id=<id>` | Coordinator | New branch replacing the direct confirm step. Readiness check: every booking Confirmed or Released and at least one Confirmed and primary; equipment fully reserved; support assigned. On failure 409 with `outstanding: [{kind, venue_or_item, status}]`. On success status `planning` to `safety_review`, insert `safety_checks` row with `submitted_at`, audit `safety_check_submitted`, notifies Safety Officers and Organiser. | E08-S03 | TC_E08S03_08, _09 |
| `GET /api/events?safety=queue` | Safety Officer | New branch. Events in `safety_review`, oldest first, with every input the seven factors need (venues with capacity, layout and restrictions; expected attendance; accessibility needs; equipment list). | E08-S06 | TC_E08S06_01, _06 |
| `GET /api/events?id=<id>` | Safety Officer | Read access to an event in `safety_review` (and its history afterwards); otherwise 403. | E08-S06 | TC_E08S06_05 |
| `POST /api/events?safety=decide&id=<id>` | Safety Officer | New branch. Body `{decision: approved \| changes_requested \| rejected, reason, factors: [{factor, satisfactory, comment}]}`; all seven factors required; `reason` mandatory unless `approved`. `approved` moves to `confirmed` and notifies Organiser and Coordinator with the confirmed details; the other two return to `planning`, flag the arrangements named in the comments and notify the Coordinator and Organiser. Never cancels (O-41). Audit `safety_check_approved` / `_changes_requested` / `_rejected`. | E08-S06 | TC_E08S06_02 to _05 |
| `POST /api/events?revert=1&id=<id>` | Coordinator | Existing revert from Confirmed to Planning now also clears the approved safety check so a later resubmission is reviewed again (E08-S04 Scenario 4). | E08-S04 | TC_E08S04_05 |
| `GET /api/auth/session` | Safety Officer | `role: safety_officer` is a valid session role with its own landing page. | E01-S13 | TC_E01S13_01, _02 |

### Status vocabulary exposed to clients

| Enum | Values after Week 7 | Added |
| --- | --- | --- |
| `event_status` | draft, submitted, under_review, awaiting_clarification, rejected, approved, planning, **safety_review**, confirmed, cancelled, completed | safety_review (T-71, interim pending O-39) |
| `booking_status` | pending, **tentative**, confirmed, rejected, released, conflicting, **expired** | tentative, expired (T-69) |
| `user_role` | event_organiser, event_coordinator, **event_coordinator_lead**, venue_staff, technical_support_staff, **safety_officer**, attendee | two roles (T-72) |
| `unavailability_reason` | maintenance, equipment_failure, renovation, safety_concern, other | new enum (T-67) |

Frontend status pills, filters and the `roles.ts` route table (see `docs/frontend-guide.md`)
must be extended for every bold value before the owning story's UI ships.

### Out of scope here

Attendee-facing registration, equipment and notification-inbox endpoints are unchanged
by Week 7 except where listed. The migration that backs these endpoints is described
under "Pending migration for the Week 7 Customer Changes" in `docs/db_schema.md`.

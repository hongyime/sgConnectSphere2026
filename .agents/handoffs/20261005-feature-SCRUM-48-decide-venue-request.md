# feature/SCRUM-48-decide-venue-request

Goal: E06-S04 Decide on a venue booking request (Jira SCRUM-48, owner Le Xin).
Venue Staff approve or reject a pending venue booking with a recorded reason,
optionally suggesting another venue; the Coordinator is notified; approval is
blocked when buffered occupancy windows clash; every decision is written to the
audit log. Scope follows `docs/backlog/release-1/E06-venue-search-booking.md`
(5 scenarios); the Jira description is an older copy with only Scenarios 1-3.

- Jira: SCRUM-48 (Sprint 3, 3 points), parent SCRUM-7
- Branch pre-created by @bryanseah234 on 2026-10-05; merged `origin/main` on 2026-10-08
- Progress on 2026-10-09: backend steps 1.1-1.5 and screen steps 2.1-2.3 done (see below)

## Done so far

- `8e8777d` backend: `backend/src/modules/venueBooking/decisions.ts`;
  `GET /api/venues?bookings=pending`, `GET /api/venues?booking=<id>`,
  `POST /api/venues { action: 'decide', booking_id, decision, reason?, suggested_venue_id? }`.
  Audit rows are `entity_type = 'venue_booking'` with `event_id` set, actions
  `Booking Approved` / `Booking Rejected`; the Coordinator notice uses the audit id
  as change id. Unit tests 100% (17), real-DB tests 12/12 (`venueBookingDecisions*.test.ts`).
- `8a691eb` frontend: `/venue/bookings` (queue), `/venue/bookings/:id` (detail),
  `/venue/bookings/:id/decide` (ConfirmPanel; reason required; optional suggested
  venue). `BookingRequests.test.tsx` 20 tests, 100% coverage; `venue.spec.ts`
  booking test rewritten (desktop + mobile pass). Mock detail, `findBooking` and
  its venue.css rules removed; screen inventory row updated.

## Still to do

- Scenario 4 buffered-window check: after #231 (occupied_window) and #245 (shared
  0013 migration, #244 contract) merge. #244 also says the first Confirmed booking
  becomes primary when the event has none; `is_primary` arrives with 0013.
- Scenario 2 Coordinator "amend to suggested venue": with Ji Ning's E06-S03.
- TC_E06S04_05/_06 Coordinator Activity log: after #240 merges, add
  `venue_booking` rows to `listEventActivity()`.
- TC_E06S04_04 seed fixture, manual run of TC_01-_06 (TC_07 blocked on E10-S04),
  T-65 records, PR.
- Running locally: export only `DATABASE_URL` (the venues API prefers
  `DATABASE_POOLER_URL`, the shared Supabase).


## What already exists

- `venue_bookings` already has `decision_reason`, `suggested_venue_id`,
  `decided_by`, `decided_at` (`backend/database/migrations/0001_connectsphere_schema.sql`),
  so no migration is expected.
- Audit helper: `backend/src/modules/auditHistory/service.ts` (`appendAuditEntry`), ADR-009.
- Notification helper: `backend/src/modules/eventNotifications/service.ts`.
- Planned API: `POST /api/venues` `action: decide` (`docs/api-changes-week7.md`), dispatched in `api/venues/index.ts`.
- Mock screens: `/venue/bookings/:bookingId` and `/venue/bookings/:bookingId/decide`
  (`frontend/src/features/venue/Venue.tsx`, `frontend/src/app/routes.tsx`).
- Seed has two pending bookings: Orchid Hall / EVT-3003 and Lotus Room / EVT-2003.

## Dependencies

- E06-S03 Request a venue booking (SCRUM-47, Ji Ning, To Do) creates the bookings
  this story decides on. Agree with Ji Ning who builds the Coordinator
  "amend to suggested venue" part of Scenario 2.
- PR #231 (SCRUM-44, setup/turnaround buffers, open) adds `occupied_window()`;
  Scenario 4 reuses it. Migration numbers 0011-0013 are already taken.
- TC_E06S04_07 (release logging) depends on E10-S04 event cancellation; record it as blocked.
- PR #230 renames test-case accounts to seeded names (`venue_staff_1` -> `venue_a`,
  `coordinator_1` -> `coord_a`); until it merges, note substitutions in run records.

## Plan

Write unit tests alongside each step (DoD: 100% coverage of changed code).

1. Backend
   1. List pending bookings for Venue Staff and fetch one booking's detail.
   2. Approve: status -> confirmed, notify Coordinator, audit entry, same transaction.
   3. Reject: reason required, optional suggested venue, notify Coordinator, audit entry.
   4. Reject without reason -> 400 with a clear message.
   5. Buffered-window clash check on approve (after #231 merges); name the conflicting booking.
   6. Only Venue Staff may decide; only pending bookings can be decided.
2. Frontend
   1. Replace mock pending-bookings list and detail with real data.
   2. Decision screen: Approve; Reject with required reason and optional suggested venue.
   3. Error states: reason required, clash with booking X.
3. Coordinator side (after agreeing with Ji Ning): show reason + suggested venue, amend in one step.
4. Verification
   1. Seed a buffered-clash fixture for TC_E06S04_04.
   2. Run unit, integration and coverage; record T-65 runs.
   3. Manual run of TC_E06S04_01 to _06 with actual results in Remarks; _07 blocked.
   4. Open PR (four template sections; cite SCRUM-48 / E06-S04).

# SCRUM-152 — E05-S06 backend: venue unavailability over existing bookings

Goal: the application code for E05-S06 "Mark a venue temporarily unavailable over existing bookings" (Jira SCRUM-152): create, edit and lift an unavailability that flags overlapping bookings and holds Conflicting, returns Confirmed events to Planning, tells only the affected Coordinators, restores bookings when it ends and keeps a history. Stacked on the migration-only PR #345 (`chore/e05-s06-unavailability-schema`, migration 0025); the story text was aligned in #344.

## Done

- `blocks.ts`:
  - `validateUnavailabilityInput`: `starts_at`, optional `ends_at` (open-ended, T-80), required `reason_category`, optional note in `reason`; a body without `starts_at` is E05-S04's whole-day form, read as maintenance.
  - `createVenueBlock`: no longer refuses a block over a confirmed booking (T-67). Pending/Confirmed bookings and unexpired holds overlapping on advertised times become Conflicting with `status_before_conflict` / `conflict_block_id` (C-111); a Confirmed event returns to Planning through `applyEventStatusChange(..., { skipNotices: true })` (T-81); only each affected Coordinator gets an in-app + email notice (C-121); history `created`.
  - `editVenueBlock` (`edit_block`): new period/category/note; newly covered bookings flagged; no-longer-covered ones restored (expired hold → Expired; booking with an active `replaces_booking_id` replacement stays Conflicting; a 23P01 clash on restore leaves that booking Conflicting via a savepoint); history `edited`. E05-S04 `shortenVenueBlock` uses the same path.
  - `liftVenueBlock` (`lift_block`): sets `lifted_at`/`lifted_by`, restores everything it flagged, notifies every affected Coordinator once (same change ID for restore and lift notices); history `lifted`. E05-S04 `removeVenueBlock` now lifts and keeps its `removed` reply.
  - Lock order: affected events → venue → block, matching submission, holds and decisions; an event that appears after the first read is locked `NOWAIT` or the request returns 409 "try again".
- Every block reader skips lifted blocks: `bookingSubmission.ts`, `holds.ts`, `decisions.ts` (open-ended message "until lifted"), `search.ts`, `calendar.ts`, block list (open-ended stays current).
- `calendar.ts`: Conflicting bookings stay visible inside the Blocked period as state `conflicting` with `reasonCategory`; blocks carry `reasonCategory`.
- `bookingRequests.ts`: each booking carries `status_before_conflict` and the flagging unavailability's category, note and period (Scenario 3 flag, E10-S05 Scenario 2).
- `eventLifecycle/repository.ts`: `skipNotices` option; skips the audience read too.
- `api/venues/index.ts`: `edit_block`, `lift_block`.
- Tests: `venueUnavailability.test.ts` (unit, 11), `venueUnavailability.integration.test.ts` (TC_E05S06_01–08 + Scenario 5–7 cases), updates in `venueBlocks*.test.ts`, `venueBookingDecisions.test.ts`, `venueCalendar.test.ts`; 0025 added to the hand-picked migration lists in `venueCalendar`, `venueSearch`, `venueAccessibility`, `venueBookingRequests` integration tests. Both E05-S06 database files run in CI through `test:venue-booking-requests:db` (CI does not run `test:db`).
- T-65: `docs/testing/runs/20261024-212233-lexinphun2024-debug-backend-unit.md`, `docs/testing/runs/20261024-212240-lexinphun2024-debug-backend-db.md`.
- 24 Oct: `main` merged into #345 (package.json test-list conflict) and then into this branch. `bookingRequests.ts` conflict: kept `main`'s `replacement.status<>'released'` filter plus this branch's conflict columns. Re-run at `fdd1ab9`: unit 490/490, booking selector 68/68, `test:db` 221/222 (same `registration.db.test.ts` failure). Records `20261024-213916-lexinphun2024-debug-backend-unit.md`, `20261024-213807-lexinphun2024-debug-backend-db.md`. #348 marked ready for review.

## Release order

1. #345 merges; the deploy owner applies `0025_venue_unavailability.sql` to production and records it.
2. Retarget this PR to `main`, then merge.
3. PR 3 (frontend) soon after.

## Known gaps / decisions for the reviewer

- Until PR 3, the current block screen saves a block over bookings and shows only "Block saved. … notified for N events", not the affected-events list (Scenario 2's list is in the API reply).
- With the old whole-day form a notice reads "… to 26 Jan 2027, 12:00 am" for a block through 25 Jan (exclusive midnight end); timed input in PR 3 avoids this.
- Safety Review edge case (option A): an event in Safety Review whose venue is lost keeps its status, as the story and T-81 cover Confirmed only; the Safety Officer can return it to Planning (C-133). Ask the PO if automatic reversion is wanted.
- A restored booking's event stays in Planning (E08-S04 Scenario 4), as flagged in #344.
- For SCRUM-74 / E10-S05: a replacement request should set `replaces_booking_id` to the lost booking so a later lift does not restore it.

## Learnings

- Application Checks runs database suites from an explicit list; a new `*.integration.test.ts` must be added to a selector it runs, not only to `test:db`.
- Several integration tests load a hand-picked migration list; a new migration used by shared code must be added to each.

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
- Progress on 2026-10-14: merged `main` (Week 9 docs, holds #245); booking decisions now in the Coordinator Activity log

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

- 2026-10-14: merged `origin/main`. Conflicts were additive: the venues API
  action list now ends `'extend_hold', or 'decide'`; `backend/package.json`
  keeps both the hold and decision test files; `tc-coverage.md` regenerated.
- 2026-10-14: TC_E06S04_05/_06 Coordinator view. `listEventActivity()` takes
  `{ includeBookings: true }` from `getAssignedEvent()` only, adding
  `entity_type = 'venue_booking'` rows with the venue name. The Organiser view
  is unchanged. `ActivityLog` shows them as "Booking approved" / "Booking
  rejected" and "Small Room: Pending → Confirmed" in words, not event
  StatusPills. Holds (#245) already log as `entity_type = 'event'`, so they were
  visible before this change.
- Local evidence on 2026-10-14 (exploratory, no T-65 record yet): backend unit
  386/386; Vitest 377/377; `ActivityLog.tsx` 100%; decision + activity-log DB
  tests 19/19 on the local `connectsphere-db` container. Full `test:db` 87/89:
  `eventVisibility.integration` and `registration.db` fail identically on clean
  `main` 03e7644 (missing `venue_requirements` / `public.users`), unrelated.

- 2026-10-15: merged `origin/main` again (#256, #261, #263, holds Activity
  log display). Conflicts additive: test lists, screen-inventory row (main's
  E06-S03 row kept, E06-S04 now `live`), both Activity log test sets.
- 2026-10-15 Scenario 4 (TC_E06S04_04). Merged 0016 guard refuses any
  overlapping active booking incl. buffers, so a clash at approval only arises
  after Venue Staff lengthen buffers (`buffer_conflict`). `decideBooking` now
  locks the venue before the booking (hold/request/buffer lock order), checks
  buffered clashes and maintenance blocks, returns 409 naming the booking or
  block (`conflict` object), and maps a guard `23P01` race to "venue was just
  taken". Unit tests 23/23, `decisions.ts` 100%. Three new real-DB tests
  (buffer clash then OK after shortening, block, simultaneous approvals) are
  written but NOT yet run: Docker was closed.
- 2026-10-15 browser: `tests/e2e/venueBookingDecisions.spec.ts` covers
  TC_E06S04_01-_06 live (desktop + mobile 12/12, intercepted API); the e06.spec
  placeholders were replaced by a pointer, TC_07 kept. Decide screen already
  shows the 409 message; Vitest test added. `tc-coverage.md` regenerated.

- 2026-10-16: merged `origin/main` (27 commits incl. #274 booking submission,
  #272 staff routing). Conflicts: `backend/package.json` test lists (kept both
  sides) and generated `tc-coverage.md` (regenerated). Unit 422/422, Vitest
  431/431, both typechecks clean.
- 2026-10-16 primary venue (O-30, contract "Decide a booking request"): an
  approval sets `is_primary` when the event has none. `decideBooking` now locks
  event -> venue -> booking, the order submission and holds use, so racing
  approvals for one event serialise. Unit 26/26, `decisions.ts` 100%. Real-DB
  `venueBookingDecisions.integration.test.ts` 18/18 on local loopback
  PostgreSQL (`TEST_DATABASE_URL` only), incl. the three Scenario 4 tests
  first run today and three primary tests (first wins, rejection then
  approval, simultaneous approvals leave exactly one primary). Exploratory;
  T-65 records come with the PR runs.

## PO decision on TC_07 (Bryan, 17 Oct 2026)

Question: should TC_E06S04_07 (a released booking is logged) move to E10-S04
Cancel an event, since its steps need cancellation (SCRUM-73, Sprint 4, not
built)? Answer: **No**. TC_07 stays in E06-S04, so E06-S04 carries to
Sprint 4 and closes only after E10-S04 is built and TC_07 passes. Scenario 5
is not met before then, and Done cannot be undone, so SCRUM-48 must not be
marked Done in Sprint 3.

- 2026-10-16 manual run by Le Xin: TC_01 to _06 PASS, TC_07 N/A
  (`20261016-185304-lexinphun2024-debug-frontend-e2e.md`, 18 screenshots).
  PR evidence at `7a9f13c`: backend unit 425/425 (`decisions.ts` 100%),
  Vitest 431/431 (changed files 100%), `test:db` 136/138 (2 failures also on
  clean `main` 37cbb77), Playwright 12/12. PR opened; see its body.

- 2026-10-17: Ji Ning's E06-S02 review on #298 (TC_E06S02_04): the staff API
  now returns `advisoryMismatches` from E06-S03's `suitability_snapshot`
  (null when none was recorded) and both staff pages show "Advisory unmet
  requirements at submission", never blocking approval (contract line 236
  gives staff assessment presentation to E06-S04). `f097571`: unit 431/431,
  Vitest 436/436 (one intermittent unrelated VenueBlockout failure, then two
  clean runs), test:db 138/140, Playwright 12/12. Ji Ning owns the E06-S02
  manual run and the `test.fixme` TC_E06S02_04 in `tests/e2e/e06.spec.ts`.
- Agreed on #298 with Ji Ning: explicit primary reselection (`set_primary`)
  and the withdrawal-vs-decision race test belong to her #299.
- Local env note: `python` on PATH may resolve to the Windows Store stub; run
  hooks and `check.py` with `.venv-tools/Scripts` first on PATH.

## Still to do

- TC_07 waits for E10-S04 (Sprint 4); see the PO decision above. The branch
  name carries SCRUM-48, so `jira-sync` moves SCRUM-48 to Done when #298
  merges. Agree with the team before merging whether #298 waits for E10-S04
  or SCRUM-48 is kept open by hand after merge.
- Ji Ning's #299 reviewed (comment review, 16 Oct).
- Follow-up candidate: the rejection notice's line breaks show as spaces in
  the notifications page.
- Scenario 2 Coordinator switch: DONE 2026-10-16. Real-DB test drives
  `decideBooking` reject -> `submitBooking` with `replaces_booking_id` ->
  approve (original stays Rejected, replacement becomes primary); 19/19.
  The Coordinator UI is Ji Ning's ("Request suggested venue" in
  `VenueBookingRequests.tsx`); the manual TC_02 run should click through it.
- Manual run of TC_01-_06 on the seeded stack by Le Xin (TC_04: raise a venue's
  turnaround so a pending request clashes): DONE 16 Oct. TC_07 in Sprint 4 after E10-S04.
- Then T-65 records, PR, human review of code and test cases.
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

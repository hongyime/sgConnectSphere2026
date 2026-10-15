# feature/SCRUM-189-venue-staff-assignments

Goal: give Venue Staff notifications real recipients. Add the venue-to-staff
assignment relation (T-64, T-89) so booking and venue-change notices reach the
Venue Staff responsible for each venue, unblocking E11-S01 (SCRUM-75). Jira
subtask SCRUM-189 under SCRUM-75, owner Le Xin; approach confirmed with the PO
at Sprint 4 planning.

## Plan

Two PRs, per `docs/ops/production-migrations.md`:

1. Migration-only PR (branch `feature/SCRUM-189-venue-staff-migration`):
   `0018_venue_staff_assignments.sql` creates `venue_staff_assignments`
   (venue_id, staff_id, active_from, active_until). New table only, so the
   deployed application is unaffected. Apply it in production after merge.
2. Code PR (this branch, stacked on 1): seed assignments, a table-backed
   default resolver in `captureEventAudience`, tests. Merge only after the
   production ledger check for 0018 passes.

## Decisions

- No roster screen (T-89). Rows are setup data.
- Never infer assignment from `decided_by` (T-64); TC_E11S01_13 keeps proving it.
- Resolved IDs are still filtered to active `venue_staff` users, as before.
- Migration number 0018 (renamed from 0016 on 15 Oct): 0016 is #261's write
  guard, 0017 is reserved for SCRUM-184 (Bl0oper), 0019 is the booking
  contract. Agreed in the #271 review comments and `docs/db_schema.md`.

## Done

- `6373955` migration (then 0016, renamed 0018 in `2f0e8e4`). `0dfcd68` default resolver in
  `captureEventAudience`, seed assignments (Venue Staff A: Orchid Hall, Lotus
  Room, Maple Room; Venue Staff B: Jasmine Hall, Cedar Auditorium), two new
  real-database tests. `tc-coverage.md` regenerated.
- Evidence at `3dcc5b6`: backend unit 373/373; notification DB tests 10/10;
  every changed line of `eventNotifications/service.ts` covered. Full
  `test:db` 76/78, the two failures identical on `main`. Records
  `docs/testing/runs/20261014-135516-*` and `20261014-135525-*`.

- 15 Oct: merged the updated migration branch (latest `main`, 0018). #274
  (E06-S03 booking requests) now on `main` passes a requested-venue scope to
  `captureEventAudience`; it combines cleanly with the default resolver. New
  DB test in `bookingSubmission.integration.test.ts`: a request with no
  injected resolver notifies only the requested venue's assigned staff, and an
  unassigned venue is returned in `unresolved_venue_ids`. Docs updated:
  `e11-notification-hooks.md`, `testing/event-notifications.md`,
  `testing/venue-booking-requests.md`, `contracts/venue-bookings.md`,
  `testing/manual/E06-S03-click-through.md`. Backend unit 397/397; full
  `test:db` 116/118 before the new test (the two `main` failures), booking
  submission DB 10/10 with it. Not yet recorded under T-65.

- 15 Oct (later): #271 squash-merged by Ji Ning; this PR now targets `main`
  (handoff conflict resolved, migration identical to `main`). Jira sync had
  moved SCRUM-189 to Done on #271's merge; moved back to In Progress with a
  comment. Seed assignments added to the scaffold `SEED_DATA.md`.

- 16 Oct: Le Xin's manual run, record
  `docs/testing/runs/20261016-001813-lexinphun2024-debug-frontend-e2e.md` with
  12 hand-taken screenshots (T-93): TC_E11S01_02 PASS (date/time; venue move
  SKIP), TC_E11S01_03 PASS, TC_E06S03_01 Venue Staff part PASS. Findings
  outside SCRUM-189: raw UTC times in the Activity log and notification text.

## Gaps

- TC_E11S01_02 expects a venue move to notify old and new venue staff. No
  venue-move workflow exists yet (E10-S05), so the manual run covers a
  date/time change only; record the venue-move part as blocked.
- TC_E11S01_13 pre-condition still says "no assignment adapter"; with #272 it
  means "no assignment rows". The test still proves it.

## Next

- Done 16 Oct (see above): manual run of TC_E11S01_02 on the seeded local stack. As `coord_a`
  change the end time of EVT-3003 (Orchid Hall, Venue Staff A) and EVT-3001
  (Jasmine Hall, Venue Staff B); the venue's own staff get an "Event update",
  the other Venue Staff do not. Record seed substitutions
  (`venue_staff_1` -> `venue_a`/`venue_b`, `coordinator_1` -> `coord_a`).
- Fresh T-65 records for backend unit and DB at the new head (the 14 Oct ones
  predate the merge).
- #271 merged. Deploy owner applies 0018 (#278 plans a separate ledger check),
  then review and merge this PR.
- Tell Ji Ning so TC_E06S03_01 "responsible staff receipt" can stop being SKIP.

## Open

- Production has no assignment rows after the migration. Who loads the real
  venue-to-staff list, and from where, is for the PO and deploy owner.

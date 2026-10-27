---
date: 2026-10-26T21:22:40+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: fdeb8fe
pr: 348
---

SCRUM-152 / E05-S06 backend after merging `origin/main` (with #345's migration
0025 now merged) into #348. The conflicts were the backend test lists in
`package.json`, resolved by keeping `main`'s lists (including the new
`venueClaimPolicy` tests) and adding this branch's `venueUnavailability` tests,
and the generated `tc-coverage.md`, regenerated. No migration came from `main`;
0025 is still the newest. Native PostgreSQL on 127.0.0.1:5432 (no Docker
Desktop), database `connectsphere_notification_test`, with only
`TEST_DATABASE_URL` in the environment; each suite builds its own disposable
schema. No shared Supabase database, reset, seeding or production migration.
Before this run, at the same tree, `npm run typecheck` passed and the backend
unit suite passed 516/516. The `date` is when the first command started.

1. `npm run test:venue-booking-requests:db --workspace backend` (the E06-S03 Application Checks step; includes both E05-S06 database files and `venueClaimPolicy`).
2. `npx tsx --test tests/venueCalendar.integration.test.ts` (the SCRUM-42 step).
3. `npx tsx --test tests/venueBufferConflicts.integration.test.ts tests/venueSearch.integration.test.ts` (the SCRUM-161 step).
4. `npx tsx --test tests/venueAccessibility.integration.test.ts tests/venueBlocks.integration.test.ts tests/venueHolds.integration.test.ts`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Command 1, booking selector: E06-S03/E06-S04 bookings, E05-S06 unavailability (TC_E05S06_01–08) and first-accepted venue claims (#340) | PASS | 80/80, zero skipped |
| MULTIPLE | Command 2, E05-S03 TC_E05S03_01 to TC_E05S03_05 venue availability calendar | PASS | 1/1 |
| MULTIPLE | Command 3, venue buffer regressions and TC_E06S01 / TC_E06S02 venue search | PASS | 12/12, zero skipped |
| MULTIPLE | Command 4, E02-S03 accessibility search, E05-S04 venue blocks (SCRUM-43), tentative venue holds (SCRUM-49) | PASS | 12/12, zero skipped |

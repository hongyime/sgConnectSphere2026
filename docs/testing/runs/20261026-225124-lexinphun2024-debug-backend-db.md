---
date: 2026-10-26T22:51:24+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: a2010db
pr: 348
---

SCRUM-152 / E05-S06 backend after fixing the #348 review finding (jininggg):
a booking covered by two separate unavailabilities stayed Conflicting for
good when the one it pointed at was lifted or shortened first. Before the
fix, two of the three new tests failed with the booking still pointing at
the first block; the lift-the-second-first order already passed. Native
PostgreSQL on 127.0.0.1:5432 (no Docker Desktop), database
`connectsphere_notification_test`, with only `TEST_DATABASE_URL` in the
environment; each suite builds its own disposable schema. No shared Supabase
database, reset, seeding or production migration. The tests ran on the
working tree committed unchanged as `a2010db`. The `date` is when the first
command started.

1. `npm run test:venue-booking-requests:db --workspace backend` (the E06-S03 Application Checks step; includes both E05-S06 database files and `venueClaimPolicy`).
2. `npx tsx --test tests/venueCalendar.integration.test.ts` (the SCRUM-42 step).
3. `npx tsx --test tests/venueBufferConflicts.integration.test.ts tests/venueSearch.integration.test.ts` (the SCRUM-161 step).
4. `npx tsx --test tests/venueAccessibility.integration.test.ts tests/venueBlocks.integration.test.ts tests/venueHolds.integration.test.ts`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | #348 review: lifting the first of two unavailabilities over a booking keeps it Conflicting under the second, and lifting the second restores it | PASS | New; failed before the fix (booking kept the first block's id) |
| N/A | #348 review: lifting the second of two unavailabilities over a booking leaves it Conflicting, and lifting the first restores it | PASS | New; this order already worked |
| N/A | #348 review: shortening the first of two unavailabilities off a booking hands it to the second | PASS | New; failed before the fix |
| MULTIPLE | Command 1, booking selector: E06-S03/E06-S04 bookings, E05-S06 unavailability (TC_E05S06_01–08) and first-accepted venue claims (#340) | PASS | 83/83, zero skipped (80 before plus the 3 new) |
| MULTIPLE | Command 2, E05-S03 TC_E05S03_01 to TC_E05S03_05 venue availability calendar | PASS | 1/1 |
| MULTIPLE | Command 3, venue buffer regressions and TC_E06S01 / TC_E06S02 venue search | PASS | 12/12, zero skipped |
| MULTIPLE | Command 4, E02-S03 accessibility search, E05-S04 venue blocks (SCRUM-43), tentative venue holds (SCRUM-49) | PASS | 12/12, zero skipped |

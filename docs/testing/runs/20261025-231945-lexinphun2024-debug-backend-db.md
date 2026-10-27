---
date: 2026-10-25T23:19:45+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: a25a3dc
pr: 349
---

SCRUM-152 / E05-S06 after the venue calendar, accessibility and search
database tests were changed to apply migration 0019 before 0025. Since #345's
primary-booking change, 0025 drops and re-adds `venue_bookings_primary_confirmed`,
which 0019 creates; CI on #349 had failed the calendar test with
"constraint does not exist". Native PostgreSQL on 127.0.0.1:5432 (no Docker
Desktop), database `connectsphere_notification_test`, with only
`TEST_DATABASE_URL` in the environment; each suite builds its own disposable
schema. No shared Supabase database, reset, seeding or production migration.
The `date` is when the first command started.

1. `npx tsx --test tests/venueCalendar.integration.test.ts` (the SCRUM-42 Application Checks step).
2. `npx tsx --test tests/venueBufferConflicts.integration.test.ts tests/venueSearch.integration.test.ts` (the SCRUM-161 Application Checks step).
3. `npx tsx --test tests/venueAccessibility.integration.test.ts`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Command 1, E05-S03 TC_E05S03_01 to TC_E05S03_05 venue availability calendar against real PostgreSQL | PASS | 1/1; had failed in CI before the fix |
| MULTIPLE | Command 2, venue buffer regressions and TC_E06S01 / TC_E06S02 venue search | PASS | 12/12, zero skipped |
| MULTIPLE | Command 3, E02-S03 Scenario 3 venue search excludes venues missing an accessibility requirement | PASS | 1/1 |

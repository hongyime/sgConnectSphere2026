---
date: 2026-10-24T22:26:02+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 0203699
---

SCRUM-152 / E05-S06 run after adding the Venue Staff reads for an
unavailability's history and for lifted blocks (T-91, Scenario 7). Native
PostgreSQL on 127.0.0.1:5432 (no Docker Desktop), database
`connectsphere_notification_test`, with only `TEST_DATABASE_URL` in the
environment; suites build fresh disposable schemas with every migration, 0025
included. No shared Supabase database, reset, seeding or production migration.
The `date` is when the command started.

1. `npm run test:venue-booking-requests:db --workspace backend`, the booking selector the Application Checks workflow runs; it includes both E05-S06 database files.

The full `test:db` suite was not re-run; the change touches only
`blocks.ts` reads, which this selector covers.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Marking a free period unavailable with a reason category saves it and shows the period as Blocked | PASS | |
| TC_E05S06_02 | An unavailability over a Pending request and a Confirmed booking flags both, lists both, releases neither and returns the Confirmed event to Planning | PASS | |
| TC_E05S06_03 | Each affected Coordinator gets one in-app notice and one email naming the venue, period, reason and event | PASS | |
| TC_E05S06_04 | An unavailability with no end is saved as open-ended and stays in force until lifted | PASS | |
| TC_E05S06_05 | Extending by one minute flags a booking; ending at its start again restores it | PASS | |
| TC_E05S06_06 | E05-S04 block, shorten and remove still work for periods with no bookings | PASS | |
| TC_E05S06_07 | Editing and lifting keep a history and the lifted block; its Coordinator is told on lift | PASS | Now also reads the history (created, edited, lifted with earlier and new period, note and staff name) and the list with the lifted block marked lifted |
| TC_E05S06_08 | An unexpired hold is flagged without release, its Coordinator told, and restored on lift | PASS | |
| MULTIPLE | Command 1, all other booking selector tests | PASS | 68/68, zero skipped |

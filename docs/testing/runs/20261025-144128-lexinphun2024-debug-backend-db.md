---
date: 2026-10-25T14:41:28+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 049c389
pr: 345
---

SCRUM-152 / E05-S06 migration-only PR #345 after widening
`venue_bookings_primary_confirmed` in 0025 so a primary booking may be
Confirmed or Conflicting. A real local run of TC_E05S06_02 had failed because
the seeded-style Confirmed booking was primary. Native PostgreSQL on
127.0.0.1:5432 (no Docker Desktop), database `connectsphere_notification_test`,
with only `TEST_DATABASE_URL` in the environment; suites build fresh disposable
schemas with every migration, 0025 included. No shared Supabase database,
reset, seeding or production migration. The `date` is when the command started.

1. `npm run test:venue-booking-requests:db --workspace backend`, the booking selector the Application Checks workflow runs (on this branch it includes the 0025 schema test and the existing booking suites).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `venueUnavailabilitySchema.integration.test.ts` | PASS | 6/6, including the new "primary booking stays primary while Conflicting and when restored, but no other status may be primary" |
| MULTIPLE | Existing venue booking, submission and decision suites against the migrated schema | PASS | 58/58 in total, zero skipped |

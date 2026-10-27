---
date: 2026-10-25T14:46:14+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 47a268c
pr: 348
---

SCRUM-152 / E05-S06 backend after merging #345's 0025 change (a primary
booking may be Confirmed or Conflicting) and adding primary-booking cases. A
real local run of TC_E05S06_02 had failed because the Confirmed booking was the
event's primary. Native PostgreSQL on 127.0.0.1:5432 (no Docker Desktop),
database `connectsphere_notification_test`, with only `TEST_DATABASE_URL` in
the environment; suites build fresh disposable schemas with every migration,
0025 included. No shared Supabase database, reset, seeding or production
migration. The backend unit suite at the same commit passed 492/492 (no
application code changed). The `date` is when the command started.

1. `npm run test:venue-booking-requests:db --workspace backend`, the booking selector the Application Checks workflow runs; it includes both E05-S06 database files.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_02 | An unavailability over a Pending request and a primary Confirmed booking flags both, lists both, releases neither and returns the Confirmed event to Planning | PASS | The primary booking keeps its primary mark while Conflicting |
| MULTIPLE | Scenario 6 with a primary booking: editing over it and lifting restore it Confirmed and still primary | PASS | New case |
| TC_E05S06_01 | Free period saved with a reason category and shown as Blocked | PASS | |
| TC_E05S06_03 | Each affected Coordinator gets one in-app notice and one email | PASS | |
| TC_E05S06_04 | Open-ended unavailability in force until lifted | PASS | |
| TC_E05S06_05 | Extending flags, shortening restores | PASS | |
| TC_E05S06_06 | E05-S04 block, shorten and remove on free periods | PASS | |
| TC_E05S06_07 | Edits and lifts keep history; Coordinator told on lift | PASS | |
| TC_E05S06_08 | Unexpired hold flagged, not released, restored on lift | PASS | |
| MULTIPLE | Command 1, all booking selector tests | PASS | 70/70, zero skipped |

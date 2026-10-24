---
date: 2026-10-24T21:38:07+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: fdd1ab9
---

SCRUM-152 / E05-S06 re-run after merging `main` (through #345) into the
application branch at `fdd1ab9`; the merge combined `main`'s
released-replacement filter with this branch's unavailability columns in
`bookingRequests.ts`. Native PostgreSQL on 127.0.0.1:5432 (no Docker
Desktop), database `connectsphere_notification_test`, with only
`TEST_DATABASE_URL` in the environment; suites build fresh disposable schemas
with every migration, 0025 included. No shared Supabase database, reset,
seeding or production migration. The `date` is when the first command started.

1. `npm run test:venue-booking-requests:db --workspace backend`, the booking selector the Application Checks workflow runs.
2. `npm run test:db --workspace backend`, the full database suite.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Marking a free period unavailable with a reason category saves it and shows the period as Blocked | PASS | |
| TC_E05S06_02 | An unavailability over a Pending request and a Confirmed booking flags both, lists both, releases neither and returns the Confirmed event to Planning | PASS | |
| TC_E05S06_03 | Each affected Coordinator gets one in-app notice and one email naming the venue, period, reason and event | PASS | |
| TC_E05S06_04 | An unavailability with no end is saved as open-ended and stays in force until lifted | PASS | |
| TC_E05S06_05 | Extending by one minute flags a booking; ending at its start again restores it | PASS | |
| TC_E05S06_06 | E05-S04 block, shorten and remove still work for periods with no bookings | PASS | |
| TC_E05S06_07 | Editing and lifting keep a history and the lifted block; its Coordinator is told on lift | PASS | |
| TC_E05S06_08 | An unexpired hold is flagged without release, its Coordinator told, and restored on lift | PASS | |
| MULTIPLE | Command 1 (booking selector, now also with `main`'s `bookingDecisionIntegration` and the 0025 schema test) | PASS | 68/68, zero skipped |
| MULTIPLE | Command 2, all suites except one | PASS | 221/222 |
| MULTIPLE | `registration.db.test.ts` | FAIL | `relation "public.users" does not exist`: the same known failure as in `20261024-212240-lexinphun2024-debug-backend-db.md`, which fails identically on clean `origin/main`; not caused by this change |

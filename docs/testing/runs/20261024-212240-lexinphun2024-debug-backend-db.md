---
date: 2026-10-24T21:22:40+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 0a5900e
---

SCRUM-152 / E05-S06 application PR evidence at `0a5900e`. Native PostgreSQL
on 127.0.0.1:5432 (no Docker Desktop), database
`connectsphere_notification_test`, with only `TEST_DATABASE_URL` in the
environment; suites build fresh disposable schemas with every migration,
0025 included. No shared Supabase database, reset, seeding or production
migration. The `date` is when the first command started.

1. `npm run test:venue-booking-requests:db --workspace backend`, the booking selector the Application Checks workflow runs, which now includes both E05-S06 database files.
2. `npm run test:db --workspace backend`, the full database suite.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S06_01 | Marking a free period unavailable with a reason category saves it and shows the period as Blocked | PASS | Category, note and recorder stored; calendar Blocked 08:00-18:00 |
| TC_E05S06_02 | An unavailability over a Pending request and a Confirmed booking flags both, lists both, releases neither and returns the Confirmed event to Planning | PASS | Both Conflicting with earlier status kept; Charity Run Planning, its second venue still Confirmed; booking list carries category and note; calendar shows both as Conflicting |
| TC_E05S06_03 | Each affected Coordinator gets one in-app notice and one email naming the venue, period, reason and event | PASS | One notice plus delivery per Coordinator; Organiser and a registered Attendee get none |
| TC_E05S06_04 | An unavailability with no end is saved as open-ended and stays in force until lifted | PASS | Unbounded end stored; still Blocked on 20 Mar 2027; listed as current |
| TC_E05S06_05 | Extending by one minute flags a booking; ending at its start again restores it | PASS | 12:01 flags and returns the event to Planning; 12:00 restores the booking as Confirmed, event stays Planning |
| TC_E05S06_06 | E05-S04 block, shorten and remove still work for periods with no bookings | PASS | Whole-day form read as maintenance; shorten and remove free the days |
| TC_E05S06_07 | Editing and lifting keep a history and the lifted block; its Coordinator is told on lift | PASS | created/edited/lifted history with actor; lifted_by kept; booking Pending again |
| TC_E05S06_08 | An unexpired hold is flagged without release, its Coordinator told, and restored on lift | PASS | Tentative again with its original expiry |
| MULTIPLE | Scenario 5-7 extra cases in `venueUnavailability.integration.test.ts` | PASS | Open-ended edit flags a far-future booking; expired hold restored as Expired; replaced and cancelled bookings not restored; lift notice to a replaced booking's Coordinator |
| MULTIPLE | Command 1 (booking selector) | PASS | 50/50, zero skipped |
| MULTIPLE | Command 2, all suites except one | PASS | 199/200 |
| MULTIPLE | `registration.db.test.ts` | FAIL | `relation "public.users" does not exist`: the test expects the shared `public` schema; it fails identically on clean `origin/main` in the same database, so it is not caused by this change |

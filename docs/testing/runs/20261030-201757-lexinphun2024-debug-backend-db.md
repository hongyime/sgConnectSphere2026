---
date: 2026-10-30T20:17:57+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "301026"
database: real
commit: cad7bd7
---

From `backend/`, `npx tsx --test` over the E06-S06 claim suite, the hold and
buffer-conflict suites, and every file in the `test:venue-booking-requests:db`
selector, at `cad7bd7`, against isolated schemas in the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker). 114 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_01 | approval rechecks a confirmed booking after buffer growth and keeps both bookings | PASS | |
| TC_E06S06_02 | an accepted pending request refuses its competitor without disclosure or side effects | PASS | |
| TC_E06S06_02 | a hold blocks a later request, and a pending request blocks a later hold | PASS | |
| TC_E06S06_03 | concurrent overlapping requests leave exactly one accepted claim | PASS | |
| TC_E06S06_04 | a pending request exactly adjacent to a confirmed booking can be approved | PASS | |
| TC_E06S06_05 | a one-minute overlap is refused at submission without disclosure or a new row | PASS | |
| TC_E06S06_06 | buffer growth blocks both approvals until Venue Staff rejects one request | PASS | |
| TC_E06S06_06 | a Coordinator withdrawal and replan resolves the conflict so both can be approved | PASS | |
| TC_E06S06_07 | one event can confirm overlapping requests at different venues | PASS | |
| MULTIPLE | Remaining claim, hold, buffer-conflict and booking-request integration tests | PASS | 105 further tests in the same run, including TC_E06S05_01 under T-102 |

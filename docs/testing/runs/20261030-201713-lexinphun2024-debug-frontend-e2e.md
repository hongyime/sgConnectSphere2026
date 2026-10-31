---
date: 2026-10-30T20:17:13+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "301026"
database: real
commit: cad7bd7
---

`npx playwright test --config playwright.auth.config.ts tests/auth-e2e/venueClaimPolicy.spec.ts tests/auth-e2e/venueHolds.spec.ts`
at `cad7bd7`: real sessions, the local API and an isolated schema in the
loopback `connectsphere_notification_test` database (`TEST_DATABASE_URL`; no
Supabase, no Docker), desktop and mobile projects. 14 passed, 0 failed,
0 skipped, 1.5 minutes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S06_01 | after Venue Staff lengthen the buffers, the Pending request is flagged and cannot be approved | PASS | desktop and mobile |
| TC_E06S06_02 | a later overlapping request is refused with the buffered window and no other event name | PASS | desktop and mobile |
| TC_E06S06_04 | a request exactly adjacent to a confirmed booking shows no conflict and is approved | PASS | desktop and mobile |
| TC_E06S06_05 | a one-minute overlap is refused at submission without a new row | PASS | desktop and mobile |
| TC_E06S06_06 | both conflicting requests are blocked until Venue Staff reject one; the other is then approved | PASS | desktop and mobile |
| TC_E06S06_07 | one event confirms overlapping bookings at two different venues | PASS | desktop and mobile |
| MULTIPLE | TC_E06S05_01 TC_E06S05_03 TC_E06S05_04 TC_E06S05_07 tentative holds on the real stack | PASS | desktop and mobile; TC_E06S05_01 now expects the T-102 window-only refusal |

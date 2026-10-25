---
date: 2026-10-16T19:32:26+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "161026"
database: mocked
commit: 7a9f13c
---

SCRUM-48 / E06-S04, PR evidence. `npx playwright test
tests/e2e/venueBookingDecisions.spec.ts` at `7a9f13c` (desktop Chrome and
Pixel 7, API intercepted): 12 passed. The hand-run evidence on a real database
is `20261016-185304-lexinphun2024-debug-frontend-e2e.md`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S04_01 | approving confirms the request and notifies the Coordinator | PASS | desktop and mobile |
| TC_E06S04_02 | rejecting records the reason and a suggested venue | PASS | desktop and mobile |
| TC_E06S04_03 | a rejection without a reason is blocked | PASS | desktop and mobile |
| TC_E06S04_04 | a buffered clash is refused and names the booking | PASS | desktop and mobile |
| TC_E06S04_05 | the Coordinator sees an approval in the Activity log | PASS | desktop and mobile |
| TC_E06S04_06 | the Coordinator sees a rejection in the Activity log | PASS | desktop and mobile |

---
date: 2026-10-30T18:21:55+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: 281026
database: real
commit: 770d24c
---

Command (from `backend/`): `npx tsx --test tests/arrangementImpact.integration.test.ts
tests/eventChangeRevisionRoute.integration.test.ts tests/decision.integration.test.ts
tests/eventCancellation.integration.test.ts tests/eventNotifications.integration.test.ts
tests/registrationPeriod.integration.test.ts` against native loopback PostgreSQL 17 on
port 5432 (`connectsphere_notification_test`, a fresh schema per test via
`loginDatabase()`, all migrations applied), with a clean working tree at the commit. 52 tests,
52 passed, 0 failed, 0 skipped. Not run against Supabase. E10-S02 / SCRUM-71, fix for
the PR #380 review point 2; the last four files are the other suites that save through
`updateEventInformationWithNotifications`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 TC_E10S02_02 TC_E10S02_03 TC_E10S02_04 TC_E10S02_05 TC_E10S02_06 TC_E10S02_07 TC_E10S02_08 TC_E10S02_09 | Existing E10-S02 PostgreSQL suite | PASS | 15 tests, unchanged |
| MULTIPLE | A stale preview is refused (#380 review point 2) | PASS | Hall A previewed, Hall B confirmed meanwhile: the save with the old revision is refused and Event dates, flags, audit and notification counts are unchanged; saving with the fresh revision flags both. 201 Registered added meanwhile: refused and the description rolled back. An unchanged preview still saves |
| MULTIPLE | Save route with reviewed revision (#380 review point 2) | PASS | Real handler and cookie session: 409 arrangements_changed with the fresh list and message, no changeRequestUrl, nothing flagged; the current revision saves with 200; a save without a revision saves as before |
| MULTIPLE | Other suites using the same save | PASS | decision, eventCancellation, eventNotifications, registrationPeriod: 33/33 |

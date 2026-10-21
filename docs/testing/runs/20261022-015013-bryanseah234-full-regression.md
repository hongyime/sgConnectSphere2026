---
date: 2026-10-22T01:50:13+08:00
runner: bryanseah234
scope: full-regression
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 56d7117
pr: 331
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | combined-typecheck | PASS | npm run typecheck; exit=0; 2026-10-21T17:28:49.724Z to 2026-10-21T17:28:57.580Z |
| MULTIPLE | combined-build | PASS | npm run build; exit=0; 2026-10-21T17:28:57.583Z to 2026-10-21T17:29:04.777Z |
| MULTIPLE | combined-backend-unit | PASS | npm test --workspace backend; tests=460, pass=460, fail=0, skipped=0; 2026-10-21T17:29:04.777Z to 2026-10-21T17:29:38.894Z |
| MULTIPLE | combined-frontend-unit | FAIL | npm test --workspace frontend -- --maxWorkers=2 --no-file-parallelism; exit=null; 2026-10-21T17:29:38.895Z to 2026-10-21T17:33:38.936Z; run aborted at the runner time limit; no final suite result, not an assertion-failure claim |
| MULTIPLE | combined-default-db | FAIL | npm run test:db --workspace backend; tests=188, pass=187, fail=1, skipped=0; 2026-10-21T17:28:40.799Z to 2026-10-21T17:29:48.964Z; 187 passed/1 failed: registration fixture requires migrated public.users |
| MULTIPLE | combined-ci-booking | PASS | npm run test:venue-booking-requests:db --workspace backend; tests=55, pass=55, fail=0, skipped=0; 2026-10-21T17:29:49.038Z to 2026-10-21T17:30:09.513Z |
| MULTIPLE | combined-cancellation-db | PASS | node --import tsx --test backend/tests/eventCancellation.integration.test.ts backend/tests/cancellationRecovery.integration.test.ts backend/tests/cancellationRace.integration.test.ts backend/tests/activityLog.integration.test.ts backend/tests/eventVisibility.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/attendeeVisibility.integration.test.ts; tests=28, pass=28, fail=0, skipped=0; 2026-10-21T17:30:09.595Z to 2026-10-21T17:30:25.033Z |
| MULTIPLE | combined-confirmed-cancellation-auth | PASS | npm run test:e2e:auth -- tests/auth-e2e/cancellationReleaseAudit.spec.ts --reporter=line --output=<repository>/.omo/evidence/sprint-3-recovery/task-20-auth-focused-results; 2 passed (1.3m); 2026-10-21T17:34:16.196Z to 2026-10-21T17:35:39.056Z |
| MULTIPLE | combined-full-auth | FAIL | npm run test:e2e:auth -- --reporter=line --output=<repository>/.omo/evidence/sprint-3-recovery/task-20-auth-full-results; exit=null; 2026-10-21T17:35:39.175Z to 2026-10-21T17:40:39.243Z; run aborted at the runner time limit; no final suite result, not an assertion-failure claim |
| MULTIPLE | combined-frontend-retry | PASS | npm test --workspace frontend -- --maxWorkers=2 --no-file-parallelism; Tests  495 passed (495); 2026-10-21T17:42:38.969Z to 2026-10-21T17:47:02.438Z |
| MULTIPLE | combined-migrated-default-db | FAIL | npm run test:db --workspace backend; tests=188, pass=187, fail=1, skipped=0; 2026-10-21T17:42:41.200Z to 2026-10-21T17:43:46.263Z; 187 passed/1 failed: 0001-only fixture lacks normalized-email unique index |
| MULTIPLE | combined-full-auth_retry | PASS | npm run test:e2e:auth -- --reporter=line --output=<repository>/.omo/evidence/sprint-3-recovery/task-20-auth_retry-full-results; 22 passed (5.3m); 2026-10-21T17:42:41.086Z to 2026-10-21T17:48:03.185Z |
| MULTIPLE | combined-db_fixture-default-db | PASS | npm run test:db --workspace backend; tests=188, pass=188, fail=0, skipped=0; 2026-10-21T17:49:21.518Z to 2026-10-21T17:50:13.529Z; fresh disposable fixture applied repository 0001 and 0002_users_email_case_insensitive SQL; 188/188 passed, no product/test changes |

## Provenance And Limits

Actual branch HEAD is main `56d7117`; this dirty local-only composition has content tree `50c97483fb7aa75d1174e309e6c578204440349b`, not main adoption or a published integration commit.
Inputs: task-14 package `63a47fdb3c4ebdd8c56106960d05d322397e8cf8` plus #328 `ad9c433b73bb1b3dcd6951458aae11e48c3ea1b6`; only generated TC inventory conflict resolved using its existing generator. Exact 1,802-file blob/SHA-256 manifest remains in task-20 local evidence.
Full task-12/14 recovery/wiring/formatter/cancellation/race/auth/guard remainder is locally preserved and UNPUBLISHED. Narrow #334/#335 are not delivery of this larger tree. No #308/0021 exception; main 0016 guard retained.
Each DB group used its own fresh owned native PostgreSQL 17 cluster and separate disposable databases. The two failed DB attempts and time-limited frontend/auth runs remain FAIL rows; later successful runs do not erase them. Counts overlap between suites, so do not sum them as unique acceptance cases.
Focused browser run was the default-bootstrap real Confirmed cancellation/Booking Released spec on desktop and mobile. Full retry completed 22 tests. Playwright CLI did not receive --preserve-symlinks. No run was skipped or substituted with Pending withdrawal/mocked audit rows.
All child environments were allowlisted; root .env was never copied/exported into suites. Notification delivery remained disabled. Owned clusters stopped/removed and auth ports released; local source composition retained for independent review. No 100% changed-code coverage claim.

This is agent-executed automation, not human manual/T-93 evidence or PO acceptance. No shared-database suite, provider call or operational migration/reset/seed. Existing records are unchanged.

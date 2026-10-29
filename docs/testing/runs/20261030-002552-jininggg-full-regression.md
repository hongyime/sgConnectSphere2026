---
date: 2026-10-30T00:25:52+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 281026
database: real
commit: 8f29774
pr: 375
---

Exact committed source 8f29774 combines the PR #375 review fixes with merged E10-S02 backend #376 (main eab9f898). Only the generated coverage inventory conflicted; it was regenerated, not hand-edited. No application/test sources were changed during these runs.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 TC_E10S01_02 TC_E10S01_03 TC_E10S01_05 TC_E10S01_06 TC_E10S01_07 | Combined real-stack desktop/mobile regression | PASS | node --env-file=<temporary test env> node_modules/@playwright/test/cli.js test --config=playwright.auth.config.ts tests/auth-e2e/changeRequests.spec.ts: 12 passed, zero failed/skipped. Real browser sessions/API and fresh disposable native PostgreSQL. Literal terminal registrations preserve both cases in the inventory. No mocked API responses, human manual or provider/mailbox claim. |
| TC_E10S01_04 | Safe approval subset only | PASS | Same browser run verifies a name-only approved request updates the Event/publication. Arrangement waiting is a separate untagged dependency regression; neither establishes full arrangement-application acceptance. |
| MULTIPLE | Backend regressions and both typechecks | PASS | tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts backend/tests/eventCompletion.integration.test.ts backend/tests/eventCancellation.integration.test.ts: 32 passed, zero failed/skipped; mixed mocked units and real PostgreSQL. npm.cmd run typecheck passed both workspaces. |
| MULTIPLE | Repository and regenerated inventory | PASS | python scripts/check.py passed. Explicit scan_test_files assertion finds both terminal TC IDs in the browser spec. tc_coverage_audit.py regenerated the combined inventory; no audit-script change. Previous f43d161 frontend timing failures and 676-pass bounded-worker rerun are preserved in their separate record. |

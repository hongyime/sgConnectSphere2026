---
date: 2026-10-22T21:30:43+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: a287668
---

Post-main-merge focused verification. No product source changed after these runs.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 | Submit/validation and snapshot | PASS | node --env-file=<fresh-temporary-loopback-test-env> --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts:20/20,15 real native PostgreSQL and5 unit/handler tests,0 skips. Initial sandbox run could not spawn workers (EPERM); permitted rerun passed. |
| TC_E10S01_02 | Comparison/form | PASS | npm.cmd run test --workspace frontend -- src/features/events/ChangeRequests.test.tsx:17/17 intercepted-API component tests. |
| TC_E10S01_04 | Safe application and delayed arrangement path | PASS | Same focused backend/frontend suites; safe application, stale guards, terminal refusal and explicit waiting state. Actual arrangement apply remains unimplemented; this is not full Scenario4 completion. |
| TC_E10S01_05 | Decline unchanged Event | PASS | Same focused suites. |
| N/A | Types/build | PASS | npm.cmd run typecheck and npm.cmd run build:both workspaces pass; existing Vite chunk-size advisory. |
| N/A | Generated inventory | PASS | python scripts/tc_coverage_audit.py regenerated206/376 after merging main; only merge conflict was this generated file. |
| N/A | Review artifact | PASS | python scripts/check_postplan_html.py artifacts/e10-change-request-foundation.html passed after accessible SVG association fix. Playwright rendered local HTML, agent visually inspected PNG; not human product acceptance evidence. |

Pre-merge full-suite development results and coverage exceptions are preserved
in20261022-211022. This session reran focused suites/types/build after main,
not the full frontend/backend suites. Windows repository-tooling failures and
sandbox retries are recorded in20261022-212834-jininggg-tooling.md.
Formal screenshots, actual email receipt, E10-S02 and other-owner integrations
remain outstanding. All incomplete Jira items remain open.

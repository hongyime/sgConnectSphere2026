---
date: 2026-10-29T19:37:04+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 281026
database: real
commit: 901d69b
---

Recorded main base plus integration-test working diff; application source is unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Change-request and terminal-event backend regressions | PASS | tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts backend/tests/eventCompletion.integration.test.ts backend/tests/eventCancellation.integration.test.ts: 32 passed, zero failed/skipped. Includes mocked unit tests and real disposable native PostgreSQL transactions. No live email/provider claim. |
| MULTIPLE | Both workspace typechecks | PASS | npm.cmd run typecheck passed for frontend and backend. Tests-only increment; no new product-code unit-coverage claim. |
| MULTIPLE | Generated inventory | PASS | tc_coverage_audit.py regenerated docs/testing/tc-coverage.md from combined sources. No test.fixme declarations relabelled as completed arrangement application. |

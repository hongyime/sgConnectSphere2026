---
date: 2026-10-30T00:19:43+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 281026
database: real
commit: f43d161
pr: 375
---

Exact committed source f43d161 contains the revised spec and regenerated inventory. All application/test sources stayed unchanged during these runs. This supplements the historical base-plus-diff records without editing them.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 TC_E10S01_02 TC_E10S01_03 TC_E10S01_05 TC_E10S01_06 TC_E10S01_07 | Real-stack desktop/mobile regression | PASS | node --env-file=<temporary test env> node_modules/@playwright/test/cli.js test --config=playwright.auth.config.ts tests/auth-e2e/changeRequests.spec.ts: 12 passed, zero failed/skipped. Real browser sessions, API and fresh disposable native loopback PostgreSQL. Includes both terminal cases registered with literal titles. No response fixtures, manual screenshots or mailbox/provider receipt claimed. |
| TC_E10S01_04 | Safe-field application subset only | PASS | The same browser run approves a name-only request and checks publication. This is the safe-field subset, not arrangement-affecting acceptance. |
| MULTIPLE | Dependency-only arrangement guard | PASS | Untagged Dependency regression test verifies arrangement approval stays Approved/unapplied and explicit apply refuses. No TC_ID in this test title; not counted as TC_E10S01_04 acceptance. |
| MULTIPLE | Frontend default-parallel run | FAIL | npm.cmd test --workspace frontend: 668 passed, 8 failed across timing/asynchronous assertions in several files. No test source or assertion was changed to address this run. Both workspace typechecks passed afterwards. |
| MULTIPLE | Frontend bounded-worker rerun | PASS | npm.cmd test --workspace frontend -- --maxWorkers=2: 676 passed in 65 files, zero failed. Same committed source, assertions and timeouts; only worker count limited. Component tests use intercepted/mocked data rather than the real-database browser fixture. |
| MULTIPLE | Types, repository checks and audit discovery | PASS | npm.cmd run typecheck: both workspaces passed. python scripts/check.py passed. scan_test_files confirms both TC_E10S01_06/_07 reference tests/auth-e2e/changeRequests.spec.ts and the dependency guard is in active_no_tc. tc_coverage_audit.py regenerated the committed inventory; broader last-file category behavior unchanged. |

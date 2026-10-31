---
date: 2026-10-31T18:59:39+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 301026
database: real
commit: 428100f
pr: 391
---

Clean exact-head rerun on reviewed PR #391 commit 428100f, before applying Le
Xin's helper/comment/spacing follow-up. git status --porcelain was empty before
and after this run. Preserve the earlier working-diff record; no historical
record is rewritten as a clean-commit run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 TC_E11S01_03 TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 TC_E11S01_14 | Current-flow privacy/routing and organiser unit slice | PASS | 26 passed, zero failed/skipped: attendeeCapacity.test.ts and e11CurrentFlows.integration.test.ts. Scripted units plus real native disposable PostgreSQL service tests, including all three actions with/without publication and rollback. No human/provider/production evidence. |

Command: Node with local disposable test environment, `--import tsx --test
backend/tests/attendeeCapacity.test.ts backend/tests/e11CurrentFlows.integration.test.ts`.
This record covers 428100f itself, not the later helper-signature refactor.

---
date: 2026-10-28T14:47:27+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: 09aa27a
pr: 365
---

SCRUM-205 conflict resolution. Recorded HEAD plus the uncommitted merge of
main 7deec73 and the regenerated inventory. Tested code is the combined tree,
not clean HEAD. Only .gitignore and generated coverage conflicted. Both artifact
exceptions were retained, coverage regenerated, existing evidence unchanged.
No feature code changed during resolution; no new manual or database run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full frontend suite on combined tree | PASS | TZ=UTC npm test --workspace frontend; 671/671 across 65 files. |
| TC_E10S01_06 | Shared terminal request helper regressions | PASS | node --import tsx --test backend/tests/obsoleteChangeRequests.test.ts; 6/6 mocked unit tests. Real database was not used. |
| MULTIPLE | Frontend and backend typechecks | PASS | npm run typecheck; both workspaces. |
| MULTIPLE | Repository checks | PASS | python3 scripts/check.py; hygiene and 182 tooling tests. |
| MULTIPLE | Generated coverage inventory | PASS | .venv-tools/bin/python scripts/tc_coverage_audit.py; 267/379 active, 83 scaffold, 29 without a test. Inventory is not an execution report. |

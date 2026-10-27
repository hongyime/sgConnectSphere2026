---
date: 2026-10-24T18:34:39+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 241026
database: none
commit: 42a04d7
pr: 299
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Merged frontend/backend typechecks | PASS | npm.cmd run typecheck --workspace frontend and --workspace backend passed on 42a04d7 plus pending merge of main8cdc2a5. |
| MULTIPLE | Generated inventory | PASS | scripts/tc_coverage_audit.py regenerated the sole conflict from combined sources: 229/378 automated, 114 scaffold, 35 without tests. git diff --check passed. No application logic conflict. |
| MULTIPLE | Repository checks | FAIL | python scripts/check.py hygiene/env passed; 163 Windows tooling tests retained 3 failures and 11 errors in worktree fixtures. No whole-repository green claim. |

Main updates requirements, contracts, exports and scaffold case declarations. Preserved both source sets; no fresh browser/database/manual rerun claimed for this generated-file resolution.

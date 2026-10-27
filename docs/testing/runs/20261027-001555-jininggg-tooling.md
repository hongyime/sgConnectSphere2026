---
date: 2026-10-27T00:15:55+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 261026
database: none
commit: 51224ae
pr: 355
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Repository checks for resolved main merge | FAIL | `python scripts/check.py`: record validation, hygiene, secret scan and environment-template checks passed. The 163 tooling tests had 3 failures and 11 errors in Windows worktree fixtures/path handling. |

## Remarks

Observed on the working merge of origin/main fe9c5484 into recorded HEAD. `git diff --cached --check` passed and no unmerged paths remained. Coverage inventory regenerated from combined tests: 246 automated of 378 cases. Backend/database/frontend merge regressions are in the 20261027-001457 records. Linux CI must establish its result after push. No manual acceptance or whole-story completion is claimed.

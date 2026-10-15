---
date: 2026-10-15T02:15:00+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 141026
database: none
commit: 3481702
---

Verification while merging origin/main at 961bf53 into the E06-S03 branch.
HEAD identifies the submission commit; the merge resolution was uncommitted.
Both equipment-unavailability and booking-submission test commands were retained;
the coverage document was regenerated from the combined sources.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Typecheck | PASS | npm run typecheck passed for frontend and backend after resolution. No database or provider calls. |
| MULTIPLE | Generated coverage audit | PASS | .venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py regenerated combined coverage: 183/354 automated. This measures TC tracing, not code coverage. |
| MULTIPLE | Diff whitespace | PASS | git diff --check passed. |
| MULTIPLE | Repository check | FAIL | python scripts/check.py retained the existing Windows tooling result: 128 tests, 3 failures and 11 errors. No hook bypass. |

Earlier application results remain recorded against the pre-merge implementation;
this record does not claim a complete application rerun of the merged tree.

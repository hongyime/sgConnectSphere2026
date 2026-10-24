---
date: 2026-10-17T00:50:12+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 216b66b
pr: 299
---

Targeted merge verification for E06-S03 / SCRUM-47 PR #299. HEAD plus
uncommitted merge of origin/main; only conflict was generated tc-coverage.md.
Regenerated with `.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py`:
190 active of 364 cases. No application conflict or hand-edited generated row.
Runner is the authenticated GitHub identity established in this session.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Primary activity and merged event-edit regressions | PASS | npm exec --workspace frontend -- vitest run src/features/events/ActivityLog.test.tsx src/features/events/EventEditForm.test.tsx: 30 tests passed across two files, mocked requests. |
| MULTIPLE | Event visibility changes brought in from main | PASS | node --import tsx --test backend/tests/eventVisibility.test.ts: 22 tests passed, no skips, mocked queries. |
| MULTIPLE | Repository hygiene and tooling | FAIL | python scripts/check.py: hygiene and env-template checks passed; 153 tooling tests ran with the same existing Windows worktree path/symlink issues: 3 failures, 11 errors. Not bypassed. python scripts/check_test_run_records.py separately validated 398 existing records before this record was added. git diff --cached --check passed and no unresolved files remained. |

This is a targeted merge regression, not a rerun of every application suite,
real-database integration, browser interaction or manual acceptance test.

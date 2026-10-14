---
date: 2026-10-14T13:11:55+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 131026
database: mocked
commit: e410cb4
pr: 256
---

HEAD plus merge of main 03e7644. Conflict in backend/package.json resolved by
retaining both migrationSelection and venueBookingRequests test entries. Coverage
inventory regenerated from combined sources. No booking logic changed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Migration selection and booking read regression | PASS | node --import tsx --test backend/tests/migrationSelection.test.ts backend/tests/venueBookingRequests.test.ts: 15 passed. |
| MULTIPLE | Coverage regeneration and whitespace | PASS | tc_coverage_audit.py regenerated 351 cases, 164 active; git diff --check passed. |
| MULTIPLE | Repository hygiene/tooling | FAIL | python scripts/check.py: hygiene hooks passed; 128 tooling tests ran with 3 failures and 11 errors in newly merged worktree-hygiene tests on Windows, including POSIX versus Windows path expectations. No worktrees removed or unrelated tooling fixes attempted. |

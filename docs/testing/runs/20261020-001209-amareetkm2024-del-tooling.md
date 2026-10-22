---
date: 2026-10-20T00:12:09+08:00
runner: amareetkm2024-del
scope: tooling
environment: local
run_type: automated
test_case_version: 171026
database: none
commit: c17c243
---

`python scripts/check.py` on branch `chore/e09-registration-schema` (E09
migrations 0023-0024, uncommitted changes staged on base `c17c243`), run by the
coding agent on Amareet's behalf on Windows 11. Also run with those changes
stashed, i.e. unchanged `main` at `c17c243`, for comparison.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Repository hygiene and tooling check | FAIL | Exit 1 on the branch and on unchanged main, with the identical 14 failures (3 FAIL, 11 ERROR), all in `test_worktree_hygiene` (symlink and junction handling, and `/repo/scratch` vs `\repo\scratch` path separators on Windows). Other stages passed: test-run records validated (420 on the branch including the new backend/db record, 419 on main), and `.env.template` matched the generator. GitHub Actions runs the same check on Linux for the PR. |

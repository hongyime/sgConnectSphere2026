---
date: 2026-10-22T19:55:46+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 2c5ac1d
pr: 299
---

PR299 conflict-resolution verification: 2c5ac1d plus uncommitted merge of
origin/main 56d7117. The SHA alone does not contain the resolved merge.
Isolated disposable worktree; local SCRUM-202/203 branches and uncommitted UI
work were left untouched. No production operation or migration reapplication.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Backend unit regression | PASS | npm.cmd run test --workspace backend:426 passed, zero failures/skips. Script retains main's equipment notification tests and this branch's withdrawal/primary/combined-decision test lists. Mocked units, not the dependency-gated real database races. |
| N/A | Frontend regression | PASS | npm.cmd run test --workspace frontend:447 passed across48 files, intercepted/component scope. Initial isolated-worktree launch failed to resolve the existing React plugin before assertions; existing root/frontend dependency folders linked and rerun passed. No source fix or dependency installation was needed. |
| N/A | Types | PASS | npm.cmd run typecheck: frontend/backend passed after successful frontend run. |
| N/A | Coverage inventory | PASS | Regenerated from merged sources,207/376 automated. No manual merge of generated content. |
| N/A | Repository hygiene/env | PASS | python scripts/check.py: hygiene and env-template pass;471 pre-existing run records validated before this new record. Intentional secondary worktrees left intact. |
| N/A | Repository tooling | FAIL |158 tests:3 failures and11 errors in Windows worktree path/symlink fixtures. Not bypassed; no fresh baseline rerun or all-green claim. |

Only backend/package.json conflicted. Both sides' test entries retained; other
main changes merged normally. No #298 code was merged or copied, and no current
combined PostgreSQL run was performed: Ji Ning explicitly chose to wait for
#298 before that work. Live #298 head at inspection was a0f18b8 (still open).
Historical combined evidence keeps its own tested heads. No human manual run,
fresh review, email-provider delivery or whole-story completion claimed.

Migration0020 application and run-record gate is already complete (#306/#314).
Remaining gates: #298, fresh combined database evidence after integration,
manual paths listed in the PR and independent code/test review of the new head.

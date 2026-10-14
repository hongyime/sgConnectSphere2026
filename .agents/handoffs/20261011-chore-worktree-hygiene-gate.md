Safely report and clean disposable Git worktrees without deleting uncommitted or unpushed team work, and make the check available to repository tooling without blocking intentional stacked or review worktrees.

## Current state

- `origin/main` is `8f246ae`; this branch contains the current `chore/worktree-hygiene-gate` PR #248.
- SCRUM-177 is In Review, assigned to Bryan. Keep it In Review until #248 merges.
- Implementation commit `30d2e0a` addresses Amareet's five requested changes: dirty or unpushed worktrees are skipped unless `--force` is explicit; dependency symlinks and junctions are unlinked without traversing targets; shell interpolation was removed; `scripts/check.py` warns instead of blocking intentional worktrees; and tests cover dirty worktrees and junction targets.
- A disposable Git probe found a further data-loss case: `git worktree remove` deletes ignored files even when `git status --porcelain --untracked-files=all` is empty. This follow-up makes `--clean` refuse worktrees containing ignored files other than ignored symlinks/junctions that the cleaner removes itself. It keeps the existing `--force` override explicit.
- Focused worktree-hygiene suite: 40 tests passed with 100% line and branch coverage. `PATH=.venv-tools/bin:$PATH .venv-tools/bin/python scripts/check.py` passed repository hygiene and 127 tooling tests. T-65 record: `docs/testing/runs/20261014-081919-bryanseah234-tooling.md` (run at base `63cfa4c`).
- Required checks gate the updated PR head; use the live GitHub status for the current result. Amareet's change request is on `ebe04df`; its requested changes are addressed, but she has not re-reviewed the updated branch. Required peer approval remains the merge gate.
- The PR author's auto-merge request is enabled. It will merge only after the current checks and required approval clear. Review artifact: https://tj43uk5kx0bi.postplan.dev.

## Remaining work

- Push the ignored-file safety follow-up and wait for checks on the new head.
- Wait for a teammate to re-review the complete updated diff; do not self-approve or send a reviewer message without authorization.
- After approval and passing checks, allow the existing auto-merge request to finish; then reconcile SCRUM-177 through the Jira workflow.

## Decisions without team sign-off

- The warning-only check preserves intentional stacked and review worktrees; the explicit `--clean` command is limited to worktrees proven clean, pushed, and free of ignored user files beyond known removable dependency links.
- `--clean --force` remains an explicit destructive override.

## Learnings

- Git's ordinary status output omits ignored files, and `git worktree remove` can delete those files from a worktree that appears clean. A cleanup preflight must inspect ignored paths as well as tracked, untracked, upstream, and ahead/behind state.

Do not force-push. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md` in this PR.

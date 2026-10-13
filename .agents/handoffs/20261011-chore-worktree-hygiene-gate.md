Safely report and clean disposable Git worktrees without deleting uncommitted or unpushed team work, and make the check available to repository tooling without blocking intentional stacked or review worktrees.

## Current state

- Fetched `origin` and merged `origin/main` (`8f246ae`) into `chore/worktree-hygiene-gate`.
- Created technical enabler `SCRUM-177` under `SCRUM-127` (E00 Platform, Tooling & Delivery); Jira status is In Progress because PR #248 still needs peer review and passing PR-head checks.
- Implementation is `30d2e0a`: the checker warns when secondary worktrees exist; `--clean` removes only clean, fully pushed branches with an upstream; `--clean --force` is explicit and documented as destructive.
- The cleaner removes ignored dependency symlinks/junctions themselves, using `os.rmdir` for Windows directory junctions; the shell command was removed. `AGENTS.md` distinguishes disposable task worktrees from intentional review and stacked-branch worktrees.
- Targeted tests: 34 passed with 100% line and branch coverage for `scripts/check_worktrees.py`. The full check passed with 121 tooling tests at `30d2e0a`.
- T-65 records: `docs/testing/runs/20261014-003200-bryanseah234-tooling.md` (full check and coverage) and `docs/testing/runs/20261014-003523-bryanseah234-tooling.md` (isolated CLI smoke check).
- PR #248 description and PostPlan comment are updated. Current pushed head is `b53dec4`; review artifact: https://tj43uk5kx0bi.postplan.dev. The auto-merge request remains enabled by the PR author and will wait on approval/checks.

## Remaining work

- Watch PR-head checks and wait for a teammate to re-review the requested changes. Do not self-approve. If checks pass and approval clears, the existing auto-merge can finish the PR.
- Keep SCRUM-177 In Progress until merge; then reconcile it to Done using the repository Jira workflow.

Do not force-push. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md` in this PR.

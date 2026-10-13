Safely report and clean disposable Git worktrees without deleting uncommitted or unpushed team work, and make the check available to repository tooling without blocking intentional stacked or review worktrees.

## Current state

- Fetched `origin` and merged the latest `origin/main` (`8f246ae`) into `chore/worktree-hygiene-gate`.
- Created technical enabler `SCRUM-177` under `SCRUM-127` (E00 Platform, Tooling & Delivery); Jira status is In Progress because PR #248 has an outstanding requested change.
- Committed the implementation as `30d2e0a`: the checker warns when secondary worktrees exist; `--clean` removes only clean, fully pushed branches with an upstream; `--clean --force` is explicit and documented as destructive.
- The cleaner removes ignored dependency symlinks/junctions themselves, with Windows junction handling through `os.rmdir`; the shell command was removed.
- `AGENTS.md` distinguishes disposable task worktrees from intentional review and stacked-branch worktrees.
- Targeted tests: 34 passed, with 100% line and branch coverage for `scripts/check_worktrees.py`. The full repository check passed with 121 tooling tests at `30d2e0a`. The T-65 session record is being added in the follow-up commit.

## Remaining work

- Add the T-65 run record and commit it.
- Update PR #248 with the four required sections, `Closes SCRUM-177`, verification results, and a PostPlan artifact/comment.
- Fetch latest `origin` before pushing. Leave the PR open until PR-head checks pass and a teammate re-reviews the fixes.

Do not force-push. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md` in this PR.

# chore/precommit-protected-file-guard

Goal: add a fast local pre-commit check for edits to `.agents/STATE.md` and
`.agents/JOURNAL.md` under decision 0014, while keeping the CI PR-title check
as the authoritative guard.

## Done so far

- Checked decision 0014, the existing `check_changed_files` implementation,
  the `pr-conventions` workflow, and current pre-commit configuration.
- Confirmed no other open PR implements this follow-up.
- Added a pre-commit command that checks staged path names and allows the
  `chore/agents-consolidate-` branch prefix as a local proxy for the CI title
  exception.
- Added unit and CLI coverage for ordinary and consolidation branches.

## Decisions without team sign-off

- Local hooks cannot see the eventual PR title. The hook uses the owner
  consolidation branch prefix for early feedback; `pr-conventions` still
  enforces the actual `chore(agents):` PR title in CI.
- The hook runs on every commit and inspects the staged diff so deletions and
  renames receive the same path check as additions and edits. Rename detection
  is disabled so Git reports the protected source path as well as the target.

## Not done / next

- Draft PR #218 is open. Required checks are pending; once they pass and GitHub
  reports no conflicts, update the PR checklist and mark it ready for teammate
  review. Do not merge without review approval.
- No changes to `.agents/STATE.md` or `.agents/JOURNAL.md`.

## Verification

- `python scripts/check.py` passed repository hygiene and all 80 tooling tests
  on HEAD `7424b70`; the T-65 run record is in `docs/testing/runs/`.
- The `protected-continuity-files` hook passed its repository pre-commit run.
  The CLI regression stages `.agents/STATE.md` in an ordinary temporary branch
  and confirms the command rejects it, including when the file is renamed;
  helper coverage confirms the allowed local consolidation branch and ordinary
  non-protected edits.
- `git diff --cached --check` passed. No protected continuity file was modified.

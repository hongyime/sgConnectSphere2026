# Submission-folder setup handoff

Create the tracked `submission/` folder skeleton, assign its seven owners, and
make its binary/large-file exception narrow without weakening repository-wide
guards.

## Decisions

- The existing 1 MB large-file guard remains in force outside `submission/`.
- A second submission-only hook rejects files over 50 MB; those files need Git
  LFS before they are added.
- The LFS pointer workflow ignores only `submission/`; it remains active for
  every other path.
- `submission/` is export-ignored so source-code archives exclude the package.
- Submission-only changes do not consume PR-size budgets. Renames from another
  path into `submission/` still do; open-PR and reference-binary safeguards
  remain universal.

## Completed

- Added the seven owned subfolders with `.gitkeep` files and a concise
  ownership README.
- Added the narrow large-file and LFS-pointer exceptions; the surrounding
  repository guards retain their existing scope and threshold.
- `pre_commit validate-config` passed. The submission-specific large-file hook
  passed for the tracked skeleton, and `git archive` omits `submission/`.
- Committed the skeleton and guard changes as `9fd8bccf`.
- `python scripts/check.py` passed repository hygiene and 197 tooling tests.
- `python scripts/doc_guard.py` passed with 160 existing front-matter warnings
  after the documented `Docs-Impact: none` waiver.
- Added the submission-only PR-size-budget exception, including rename-safe
  unit coverage. `python scripts/check.py` passed repository hygiene and 199
  tooling tests; the corresponding automated T-65 run record is committed.

## Remaining steps

- PR #444 is open as a draft with its required PostPlan comment. The PostPlan
  structural check passed; browser visual inspection was unavailable locally.
- The `pr-guardrails` check blocks #444 because its author has three open PRs
  (#436, #442 and #444), above the per-author limit of two. Do not close or
  merge the other two PRs from this branch. After one is merged or closed,
  rerun the failed guardrail check and confirm all required checks before
  marking #444 ready for review.
- As of 6 November, the author has four open PRs (#436, #442, #444 and #445).
  The updated count remains above the per-author limit.
- The user approved a narrow 6 November exception: `submission/` changes are
  excluded from the 40-file/1,800-addition/1,500-deletion budgets, with an
  old-and-new-path check to prevent evasion by rename. The exception does not
  solve #437 by itself: its non-submission duplicate setup/configuration paths
  still need to be removed by rebasing onto #444 after #444 merges.

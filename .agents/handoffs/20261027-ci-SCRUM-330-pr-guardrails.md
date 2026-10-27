# PR #357 guardrail review fixes

Goal: resolve Lexin's review findings on the accepted PR guardrails and leave PR #357 ready for re-review without editing the protected state or journal files.

## Done so far

- Confirmed the current PR head is mergeable; Lexin's comment is a changes-requested review, not a Git merge conflict.
- Identified the PyYAML failure path: the new system-language pre-commit hooks run outside the repository tooling environment in CI.
- Updated the two test-record hooks to use a Python hook environment with pinned PyYAML.
- Added Dependabot exclusion from human WIP counts and a unit test.
- Added a manual `workflow_dispatch` path for backfilling required checks on existing PRs without pushing and dismissing approvals.
- Recorded the accepted guardrail limits as BDR decision T-101; T-100 was already used by the venue-claim decision on `main`.
- Changed PR comparisons to use the Git merge base, with regressions for unrelated files added only on newer `main`.
- Added a `push: main` path so required guardrail checks report on the current `main` commit before ruleset activation.
- Manual backfill now publishes explicit `pr-guardrails` and `test-evidence` check runs on the requested PR head.

## Next step

Run the focused tooling tests and repository checks, commit the review fixes, push to `ci/SCRUM-330-pr-guardrails`, verify one manual backfill check appears on a PR head, then ask the reviewers to review the new head.

## Review context

The original PR head was `b2d2a71`. Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`; the owner consolidates merged handoffs later.

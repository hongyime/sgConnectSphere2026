# Handoff — docs/sprint-1-evidence-reconciliation

Merge current `origin/main` into PR #233 while preserving the Sprint 1 evidence reconciliation and resolving overlapping documentation with current repository guidance.

## Done so far

- Merged `origin/main` at `2a3c6ec`, then incorporated the newer `origin/main`
  tip `1ad3820` into `docs/sprint-1-evidence-reconciliation`.
- Preserved the branch's reconciled Sprint 1 retrospective and delivery ledger. Added the later E14-S02 follow-up from main with PR #192's verified 3 October merge state.
- Kept main's current source-of-truth map, Jira hygiene-sweep guidance, `.shellignore` attribution rules, and merged testing traceability/execution-record guidance.
- The later merge added PR #228's technician staffing files without conflicts;
  no code files conflicted.

## Next

- Push the completed merge to origin and confirm PR #233 points to the pushed head.

## Verification

- `python scripts/check.py` passed after the latest merge: repository hygiene,
  generated environment template, 87 tooling tests, and 149 test-run records.
  This is repository/tooling verification, not application test coverage.
- No application tests were run because no code files conflicted.

## Conflict decisions

- The retrospective is the branch's reconciled rewrite; main's older retrospective text was not restored.
- The delivery ledger keeps the branch's Sprint 1 cutoff and adds main's later E14-S02 progress with the stale “waiting for PR #192” line corrected because GitHub reports PR #192 merged on 3 October.
- The source-of-truth map follows main's current dated sources and accepted Markdown authority.
- Added one exact, pre-existing main handoff path to `.shellignore` after the local identity hook flagged its public GitHub attribution. The repository secret scanner still checks that file.
- The first merge-commit hook attempt on the earlier merge stopped on that attribution; `.shellignore` now has the required exact exception and the latest repository check passes.

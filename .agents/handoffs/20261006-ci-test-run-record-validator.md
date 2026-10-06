# ci/test-run-record-validator

Add a repository check for the T-65 test-run record frontmatter and result-table format, following the outstanding validator action recorded with the Sprint 2 evidence changes in PR #204.

## Done so far

- Read the repository workflow, T-65 run-record schema, current checker, source-of-truth guidance, and the prior retrospective handoff.
- Audited all 73 existing session records. Their required frontmatter and table outcomes are structurally consistent; three historical rows use non-catalogue TC_ID labels, so the checker will not impose a new TC_ID pattern on immutable records.
- Confirmed two historical filenames have timestamp seconds that differ from their frontmatter date. The checker will validate filename shape and its date/runner/scope fields without requiring an exact timestamp match.
- Confirmed `database` was introduced by PR #204, merged at `2026-10-03T04:19:39Z` (`2026-10-03T12:19:39+08:00`), so earlier records may omit it.
- Added `scripts/check_test_run_records.py`, integrated it into `scripts/check.py`, and documented the database compatibility cutoff and checker behavior.
- The post-commit `python scripts/check.py` run on `ef417c5` passed: 73 records validated and 77 repository tooling tests passed; a later run on `74a2780` passed with 74 records and 82 tooling tests. Both T-65 evidence records are in `docs/testing/runs/`.
- Added focused tooling tests for the historical cutoff, duplicate and unknown fields, and invalid outcomes. The required pre-commit check passed with 82 tooling tests on the working tree, and the post-commit check is recorded separately.

## Not done / next step

Commit the latest T-65 run record and handoff update after a fresh pre-commit check. Update PR #221 to cite the latest local evidence, wait for CI, then mark it ready for teammate review. Do not merge without teammate approval.

## Decisions for review

- Use PyYAML's string-preserving `BaseLoader` so test-case versions such as `011026` are not coerced as YAML octal values.
- Enforce required and allowed frontmatter keys, field enums/formats, and table column/outcome structure. Do not rewrite historical records or validate TC_ID semantics.
- Keep the checker compatible with records written before the database-field rollout timestamp.

## Source

- `docs/bdr/B-team-decisions.md` (T-65)
- `docs/testing/runs/README.md`
- Sprint 2 evidence changes, PR #204

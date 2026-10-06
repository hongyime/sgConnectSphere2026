# ci/test-run-record-validator

Add a repository check for the T-65 test-run record frontmatter and result-table format, following the outstanding validator action recorded with the Sprint 2 evidence changes in PR #204.

## Done so far

- Read the repository workflow, T-65 run-record schema, current checker, source-of-truth guidance, and the prior retrospective handoff.
- Audited all 73 existing session records. Their required frontmatter and table outcomes are structurally consistent; three historical rows use non-catalogue TC_ID labels, so the checker will not impose a new TC_ID pattern on immutable records.
- Confirmed two historical filenames have timestamp seconds that differ from their frontmatter date. The checker will validate filename shape and its date/runner/scope fields without requiring an exact timestamp match.
- Confirmed `database` was introduced by PR #204, merged at `2026-10-03T04:19:39Z` (`2026-10-03T12:19:39+08:00`), so earlier records may omit it.
- Added `scripts/check_test_run_records.py`, integrated it into `scripts/check.py`, and documented the database compatibility cutoff and checker behavior.
- Provisioned the tooling environment and ran a pre-commit `python scripts/check.py` check. It passed on the working tree; a fresh post-commit run will be recorded as PR verification evidence.

## Not done / next step

Rerun the repository check after the final edit, then commit the checker and handoff. After that, rerun the check on the commit and add a T-65 session record for the PR verification evidence.

## Decisions for review

- Use PyYAML's string-preserving `BaseLoader` so test-case versions such as `011026` are not coerced as YAML octal values.
- Enforce required and allowed frontmatter keys, field enums/formats, and table column/outcome structure. Do not rewrite historical records or validate TC_ID semantics.
- Keep the checker compatible with records written before the database-field rollout timestamp.

## Source

- `docs/bdr/B-team-decisions.md` (T-65)
- `docs/testing/runs/README.md`
- Sprint 2 evidence changes, PR #204

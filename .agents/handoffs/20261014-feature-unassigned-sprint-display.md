# Handoff: Unassigned Sprint Display

PR #268 updates the test-case workbook's display for blank Sprint metadata to `Unassigned`, without changing canonical Markdown assignments or other workbook values. This follow-up removes brittle live-catalogue assertions, records cited verification under T-65, and updates this branch's handoff.

## Done so far

- Read the implementation plan and the repository's contributor, source-of-truth, state, and handoff guidance.
- Fetched `origin/main`; the task branch is based on `ea46909`.
- Confirmed the current dated workbook contains 354 cases and 21 blank Sprint cells: E02-S05 (3), E02-S07 (5), E04-S02 (5), E07-S08 (4), and E10-S03 (4). The corresponding canonical backlog Sprint fields are still blank.
- Implemented display normalization, the testing README convention, seven focused exporter tests, and regenerated the `CAA 141026` workbook.
- Verified the workbook retains 354 cases, its single `TEST CASES` sheet and ten columns, all case IDs, all non-Sprint values, and numeric Sprint types. The 21 blank Sprint values display as `Unassigned` in the expected stories; column A is 14 characters wide.
- `python3 scripts/check.py` passed all 135 repository tooling tests. The initial invocation needed the existing ignored `.venv-tools` environment linked into this worktree.
- The targeted exporter suite passed all seven tests. `docs/testing/tc-coverage.md` is unchanged.
- PR #268 is open on `feature/unassigned-sprint-display`; GitHub showed head `0ffe551` when this follow-up began. Teammate comments requested catalogue-growth-safe expectations and a corrected handoff name/status.
- On 2026-10-16 at `0ffe551`, the focused exporter suite passed all 7 tests and `python scripts/check.py` validated 321 run records, passed all 147 tooling tests, and passed repository hygiene. T-65 record: `docs/testing/runs/20261016-074644-bryanseah234-tooling.md` (runner `bryanseah234`, Singapore time `2026-10-16T07:46:44+08:00`, test-case version `141026`).

## Next step

Review and commit the three scoped updates, then push normally to `feature/unassigned-sprint-display`. PR #268 already exists; do not open a duplicate or bypass hooks.

## Decisions and evidence

- `Unassigned` is an export-only display value; canonical case and backlog Sprint metadata remain blank until the team assigns a sprint.
- The catalogue regression should derive expected rows and blank-Sprint distribution from parsed Markdown rather than pinning live counts; controlled parse tests continue to lock the blank, whitespace-only and missing-field display contract.
- T-65 evidence for the successful focused suite and full repository check is recorded in `docs/testing/runs/20261016-074644-bryanseah234-tooling.md`; no generated derivatives were edited.

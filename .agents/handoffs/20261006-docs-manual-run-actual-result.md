# Record the actual result in manual test runs

Goal: make manual T-65 run records carry the actual result on every row, as
the IS212 Week 4 test-case template requires ("Actual Result" alongside
"Pass/Fail"). Docs only: `docs/testing/runs/README.md` (Results table section
and agent block) and `TEMPLATE.md`. Owner: Amareet.

## Done

- Rule added: for `run_type: manual`, `Remarks` holds what was actually seen
  on every row, passing rows included. Automated runs may leave it blank.
- No column added, so the frozen exporter column order is unchanged.
- Existing records are not edited (they are immutable); the rule applies to
  new runs.

## Notes for the next session

- PR #221 (Bryan) edits other sections of the same README; this PR avoids
  those lines. If #221 merges first, merge `main` in; no conflict expected.
- Possible follow-up for the #221 checker: warn when a manual record has an
  empty `Remarks` cell. Not done here; the team should agree first.

# docs/release-1-test-cases-submission

Goal: prepare the Release 1 "4. TEST CASES" submission (Aaron, Bl0oper):
reconcile `docs/testing/cases/` with the Release 1 acceptance criteria and
the IS212 Week 4 template, execute every suite locally and the browser suite
against the deployed site, record the runs (T-65) and export the workbook.
Stacked on `test/release-1-test-automation` (the new automated tests); merge
that PR first.

## Done

- Case corrections: E01 (T-75 audit reading, E01-S01 generic sign-in error,
  E05-S03 "Unavailable"), E03 (TC_E03S01_01/_02 retired, C-69), E08 (E08-S03
  sends events to Safety Review, T-107), E10 and E11 references; empty drift
  allowlist.
- `run-record-corrections.md`: ledger for wrong historical records (never
  edited, T-65). `defects.md`: SCRUM-256 to SCRUM-259.
- `scripts/export_test_submission_xlsx.py`: the course workbook.
- Playwright: per-environment report folders and screenshots for evidence
  runs; `tests/deployed/` read-only demo sign-ins; e2e fixme stubs replaced.

## Decisions taken without team sign-off

- DB suites ran only against a loopback PostgreSQL, never production.
- Against the deployed site only the API-stubbed suite and read-only sign-ins
  ran; no data was created there.
- Jira Bugs (not in the ticket classification's three types) because the
  task asked for Bugs linked to the stories; listed for Bryan.

## Not done / next

- E03-S08/S09/S10 case rewrites are in Bryan's #436; not duplicated here.

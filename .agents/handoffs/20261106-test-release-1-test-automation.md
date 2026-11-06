# test/release-1-test-automation

Goal: give every active Release 1 test case a live automated test whose title
carries its TC ID (IS212 Week 4 traceability), for the "4. TEST CASES"
submission (Aaron, Bl0oper). Companion PR: `docs/release-1-test-cases-submission`
(case text, records, workbook), stacked on this branch.

## Done

- 45 previously unautomated cases now have live tests (real PostgreSQL where
  the case is about persistence; Playwright or unit otherwise). Where an
  existing test already asserted the expected result, only its title gained
  the TC ID.
- Tests that fail because the application is wrong are committed as expected
  failures (node:test `todo`, Playwright `test.fail`) and linked to Jira Bugs
  SCRUM-256 to SCRUM-259 (E03-S08, E03-S09, E03-S10, E02-S05 code not on
  `main`), so CI stays green while the defect stays visible.
- `test.fixme` scaffold stubs replaced by live tests were removed.
- Bryan's review: `scripts/tc_coverage_audit.py` counted those expected
  failures as automated. It now reports them as a separate "known defect"
  status, and reads a title up to its own closing quote (a double-quoted
  title with an apostrophe hid the `todo` option before).
- Playwright configs read `PW_SCREENSHOT`, `PW_HTML_REPORT`, `PW_JSON` and
  `PW_OUTPUT_DIR` for evidence runs; unset, CI behaviour is unchanged. The main
  config starts no dev server when `BASE_URL` points elsewhere.
- `playwright.deployed.config.ts` + `tests/deployed/signin.spec.ts`: read-only
  demo sign-ins against a deployed site (`BASE_URL` required).

## Decisions taken without team sign-off

- Expected-failure tests for missing features instead of skipping them.
- DB suites ran only against a loopback PostgreSQL, never production.

## Not done

- Case-text corrections, run records and the workbook are in the companion PR.

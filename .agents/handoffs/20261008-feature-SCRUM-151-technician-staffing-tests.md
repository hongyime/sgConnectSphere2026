# E07-S06 and E07-S07 Playwright tests and the E07-S07 manual script (SCRUM-151)

Goal: the remaining test work for E07-S07 (story SCRUM-57, subtask
SCRUM-151): live Playwright acceptance tests replacing the `test.fixme`
placeholders, a real-database browser journey, and the manual click-through
script that Amareet runs by hand. E07-S06's Playwright placeholders are
covered here too: SCRUM-147 (#226) delivered only its manual run, and adding
tests there would have dismissed its approval. Owner: Amareet.

## Done

- `tests/e2e/technicalSupport.spec.ts`: 10 tests against a stateful fake API
  (TC_E07S06_01 to _03, form validation, TC_E07S07_01 to _06), desktop and
  Pixel 7.
- `tests/auth-e2e/technicalSupport.spec.ts`: one journey on real sessions,
  the real API and PostgreSQL, run in CI by `npm run test:e2e:auth`.
- `tests/e2e/e07.spec.ts`: the nine E07-S06/S07 placeholders are removed,
  with a pointer to the live files, as #216 and #229 did.
- `docs/testing/manual/E07-S07-click-through.md`: 16 steps checked against
  the screens on `e244681`. Its results table uses the four run-record
  columns and passes `check_test_run_records.py`.

## Next

- Done: Amareet ran the E07-S07 script by hand on 9 October 2026, recorded in
  `docs/testing/runs/20261009-021140-amareetkm2024-del-frontend-e2e.md` (7/7
  rows PASS, each backed by a database check).
- After merge: move SCRUM-57 (E07-S07) to Done by hand; jira-sync closes only
  SCRUM-151.

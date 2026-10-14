---
date: 2026-10-11T23:07:07+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 091026
database: mocked
commit: d6c298f
pr: 237
---

The full mocked Playwright suite after `main` was merged into this branch
(`d6c298f`, Bryan's merge on 10 October 2026), as Bryan asked for on review.
Desktop and Pixel 7 projects, mocked API, on Windows. Run by Claude for
Amareet.

1. `npx playwright test --reporter=line`: 205 passed, 108 skipped; the other
   5 did not pass. My capture cut off the summary line naming them as failed or
   flaky; the visible names were TC_E05S03_02 (`e05.spec.ts`),
   TC_E07S01_01 (`equipmentCatalogue.spec.ts`), TC_E07S02_02
   (`equipmentRequests.spec.ts`) and TC_E07S04_02
   (`equipmentReservations.spec.ts`). None are in files this PR changes.
2. Immediately rerun, same command and commit: **210 passed, 108 skipped,
   0 failed**.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | tests/e2e/technicalSupport.spec.ts (TC_E07S06_01 to _03, TC_E07S07_01 to _06) | PASS | Passed in both runs |
| MULTIPLE | Full mocked suite, first run | FAIL | 205 passed; 5 did not pass, all in E05/E07 equipment specs this PR does not touch |
| MULTIPLE | Full mocked suite, rerun | PASS | 210 passed, 108 skipped, 0 failed |

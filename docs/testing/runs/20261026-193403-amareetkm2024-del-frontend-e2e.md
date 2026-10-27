---
date: 2026-10-26T19:34:03+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 261026
database: mocked
commit: b1220d0
---

Branch `feature/SCRUM-213-e09-registration-period` (E09-S03, stacked on #353), run by the coding agent on Amareet's behalf on Windows 11 on 26 Oct 2026, on the tree committed as `b1220d0`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Playwright suite (`npx playwright test`), desktop and mobile | PASS | 333 passed, 1 failed, 284 skipped in 3.6 min. The failure was TC_E09S02_11 (desktop): the Casey Tan row wasn't found within 5 s on first load. It passed on `--last-failed --workers=1` (1/1), and `--repeat-each=10` gave 20/20 on desktop and mobile. |
| TC_E09S03_01 | Organiser sets opening and closing dates | PASS | `tests/e2e/e09.spec.ts`, both projects. |
| TC_E09S03_02 | Organiser sets a withdrawal deadline | PASS | Same, both projects. |
| TC_E09S03_03 | Before opening, not yet open with the date stated | PASS | Same, both projects. |
| TC_E09S03_04 | After closing, registration refused | PASS | Same, both projects. |
| TC_E09S03_05 | Late closing date warned and confirmed | PASS | Same, both projects. |
| TC_E09S03_06 | Waiting list enabled, then offered when full | PASS | Same, both projects. |
| TC_E09S03_07 | Exact opening instant | SKIP | `test.fixme`: the database clock decides; covered by the `registrationState` unit test. |
| TC_E09S03_08 | Exact closing instant | SKIP | Same reason. |
| TC_E09S03_09 | One window for all Sessions | PASS | Same, both projects. |

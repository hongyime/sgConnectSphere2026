---
date: 2026-10-26T18:43:22+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 261026
database: mocked
commit: a06f9b7
---

Branch `feature/SCRUM-210-SCRUM-211-e09-capacity` (E09-S02, stacked on #327), run by the coding agent on Amareet's behalf on Windows 11 on 26 Oct 2026, on the working tree later committed unchanged as `a06f9b7`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Playwright suite (`npx playwright test`), desktop and mobile | PASS | First full run: 301 passed, 19 failed, 296 skipped, taking 1.6 h on a heavily loaded machine. All 19 failures were outside E09-S02 (equipment, venue, E03, E05 specs and Xiang Ying's attendance spec), and all 19 passed when rerun with `npx playwright test --last-failed --workers=1` (19/19). |
| TC_E09S02_03 | Concurrent submissions | SKIP | Kept as `test.fixme`: a faked backend can't race. Covered by `backend/tests/attendeeCapacity.integration.test.ts` in CI. |
| TC_E09S02_04 | Full Event offers the waiting list | PASS | `tests/e2e/e09.spec.ts`, both projects. |
| TC_E09S02_06 | Manual addition | PASS | Same, both projects. |
| TC_E09S02_07 | Manual addition blocked | PASS | Same, both projects. |
| TC_E09S02_08 | Registration confirmed at the last place | PASS | Same, both projects. |
| TC_E09S02_09 | Over a Session's capacity stays Pending | PASS | Same, both projects. |
| TC_E09S02_10 | Over the Event's capacity stays Pending | PASS | Same, both projects. |
| TC_E09S02_11 | Approval only while both limits allow | PASS | Same, both projects. |
| TC_E09S02_12 | Places add up from Session layouts | PASS | Same, both projects. |

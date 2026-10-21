---
date: 2026-10-21T15:34:59+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 171026
database: mocked
commit: daedab4
---

Branch `feature/SCRUM-208-e09-registration-frontend` (E09-S01 frontend, stacked on #326), uncommitted changes on base `daedab4`, run by the coding agent on Amareet's behalf on Windows 11.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Playwright suite (`npx playwright test`), desktop and mobile | PASS | 280 passed, 0 failed, 314 skipped (scaffolds), with the API faked per test. A run at 15:31:30 had 2 failures (desktop and mobile) in `layout-and-focus.spec.ts`, which still pointed at the old mock register URL; it now checks the live register page's centred card. |
| TC_E09S01_01 | Discover, open the event, register for Sessions A and B | PASS | `tests/e2e/attendee-registration.spec.ts`, both projects. |
| TC_E09S01_03 | Already registered | PASS | `tests/e2e/e09.spec.ts`, both projects. |
| TC_E09S01_04 | Missing contact number blocks registration | PASS | `tests/e2e/e09.spec.ts`, both projects; no POST sent. |
| TC_E09S01_05 | Unconfirmed event refused | PASS | `tests/e2e/e09.spec.ts`, both projects. |
| TC_E09S01_06 | Primary venue and Session venues | PASS | `tests/e2e/e09.spec.ts`, both projects. |
| TC_E09S01_07 | One submission, one registration with both Sessions | PASS | `tests/e2e/attendee-registration.spec.ts`, both projects. |

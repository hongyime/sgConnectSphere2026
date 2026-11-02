---
date: 2026-11-02T14:09:00+08:00
runner: amareetkm2024-del
scope: full-regression
environment: ci
run_type: regression
test_case_version: 311026
database: real
commit: 82ba4aa
pr: 408
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Application Checks run 41397898047 at 82ba4aa | PASS | Backend unit 691 passed, 1 skipped, 0 failed. Frontend 794/794. Playwright 450 passed, 230 skipped (scaffolds), 0 failed. The separately listed PostgreSQL suites in the workflow passed. This is not the whole of `npm run test:db`: CI runs its own list of suites. |
| TC_E04S02_03 | Each Session is judged on its own accessibility needs | PASS | First time this file ran in CI: `eventSessionsRoutes.integration.test.ts` was in `test:db` but not in the workflow's list, so this PR adds the step. 5/5 in the file, on CI's managed PostgreSQL. |
| TC_E04S02_04 | One Event books the same venue for two Sessions | PASS | Same run. |
| TC_E04S02_05 | Deleting a Session releases its booking, audits it and notifies Venue Staff | PASS | Same run. |
| TC_E04S02_03 | Review fix: a requirement-only planning edit flags only that Session's bookings | PASS | Accessibility, facility and layout edits with times, attendance and capacity unchanged: preview saves nothing, the save flags the edited Session's booking and audits it, the other Session's booking stays unflagged. |
| TC_E04S02_05 | Review fix: a surviving Session keeps its needs when deleting leaves one | PASS | A deliberately empty list stays empty, own needs stay, and they carry over when a Session is added again. |

Not run locally: this machine has no native PostgreSQL and Docker Desktop is not part of the workflow, so these database cases have CI evidence only. Locally at a18b6b2, before the last two commits (a CI step and moved records, no application code): backend unit 691 passed, 1 skipped, 0 failed; Vitest 794/794; Playwright 396 passed, 212 skipped, 0 failed. The T-93 manual run in #409 is against 1f2f149, before the review fixes; its five cases do not exercise the changed paths (no requirement-only planning edit; the surviving Session had no needs).

---
date: 2026-11-02T00:43:00+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 311026
database: real
commit: c7e59e7
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full backend database suite (`npm run test:db --workspace backend`) | FAIL | 333 tests: 332 passed, 1 failed. Real PostgreSQL in the local Docker container, database `connectsphere_notification_test_e04` created empty for this run; `DATABASE_URL` and `DATABASE_POOLER_URL` were unset so nothing could reach the shared Supabase project. The one failure is `PostgreSQL persists defaults, enforces concurrent uniqueness and prevents internal roles` (`registration.db.test.ts`), which needs its own database setup; the same test failed the same way on PR #399's run and does not touch Sessions or venue booking. |
| TC_E04S02_03 | Venue suitability uses each Session's own attendance | PASS | `eventSessionsRoutes.integration.test.ts`, rolled back. |
| TC_E04S02_03 | Each Session is judged on its own accessibility needs (new) | PASS | A sole Session follows the Event's needs; after a second Session is added the first keeps them, the second is judged on its own, an edit changes the result, and an unknown facility id is refused with 400. First attempt failed on a fixture bug in the test (one value used as both uuid and code); fixed and re-run 4/4. |
| TC_E04S02_04 | One Event books the same venue for two Sessions | PASS | Rolled back. |
| TC_E04S02_05 | Deleting a Session releases its booking, audits it and notifies Venue Staff | PASS | Now also asserts the new `Session Deleted` row on the Event. Rolled back. |

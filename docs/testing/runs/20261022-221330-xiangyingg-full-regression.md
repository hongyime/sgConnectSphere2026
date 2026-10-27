---
date: 2026-10-22T22:13:30+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 966f329
pr: 320
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S04_01 | Cancellation releases arrangements under concurrent staffing | PASS | Real PostgreSQL regression observes cancellation waiting on a held support-request lock, commits a newly active assignment, then confirms release, support cancellation and technician notification. Audit entity, actor and terminal values checked. |
| TC_E10S04_05 | Request permission, ownership and safe duplicates | PASS | API hides unassigned/pending action; organisation event response denies colleague action. Same-reason replay succeeds; changed-reason duplicate is 409. UI hides pending form and follows server ownership flag. |
| TC_E10S04_04 | Cancelled event read-only | PASS | Assigned Coordinator edit returns 409; existing unauthorised caller checks retained. |
| MULTIPLE | Application regression | PASS | npm test --workspace backend; npm test --workspace frontend (463 tests); npm run typecheck; npm run build; npm run test:runtime (17 tests). Focused node --import tsx --test cancellation unit/DB, staffing DB and visibility DB: 10 passed, zero skips. Tests run against HEAD plus current-main merge and review changes. |

Initial attempts: database tests failed because local Docker was stopped; restarted the existing disposable database and reran successfully. The old component fixture incorrectly seeded a pending request while expecting an active form; corrected fixture and added a separate pending-form regression. A first concurrency probe blocked on the event foreign-key lock rather than the intended request lock; revised it to exercise a status activation under the held request lock. An API projection type error was corrected before final typecheck/build passed.

Coverage exception: SQL lock ordering and audit/notification persistence are verified through real PostgreSQL integration, not claimed as 100% unit coverage of SQL orchestration. Existing API/UI mapping changes have regression coverage; no fresh 100% aggregate changed-code coverage claim. No human screenshots or production migration verification performed.

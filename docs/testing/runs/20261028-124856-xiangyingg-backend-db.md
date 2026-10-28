---
date: 2026-10-28T12:48:56+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: automated
test_case_version: 281026
database: real
commit: f3df479
---

SCRUM-206; base HEAD plus the uncommitted implementation/test diff in this
branch's first commit. Source HEAD is recorded honestly; this was not a clean
checkout run. These are automated tests, not the human TC_E10S01_06 run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_06 | Completed Event obsoletes Pending requests with history | PASS | Coordinator/System actors, timestamps, non-Pending statuses unchanged, retry deduplication and transaction rollback. |
| MULTIPLE | Completion and cancellation database regressions | PASS | 10 tests; disposable local PostgreSQL 16; no application database used. |

Commands: `tsx --test backend/tests/eventCompletion.integration.test.ts
backend/tests/eventCancellation.integration.test.ts` with TEST_DATABASE_URL
pointing to the disposable database.

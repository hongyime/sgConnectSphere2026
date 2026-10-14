---
date: 2026-10-08T18:24:56+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "081026"
database: real
commit: c2ba65a
---

`npx tsx --test tests/activityLog.integration.test.ts tests/auditLogImmutability.integration.test.ts`
in `backend/`, against a disposable local PostgreSQL 17 database
(`connectsphere_notification_test`, Docker, loopback), a fresh schema with
every migration per test. Only the activity-log files were run, not the whole
`test:db` list.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E14S02_01 | a status change is recorded and the assigned Coordinator reads it in the event Activity log | PASS | |
| TC_E14S02_01 | a Coordinator not assigned to the event cannot read its Activity log | PASS | |
| TC_E14S02_02 | a refused event read is recorded with the user, the target and the time | PASS | |
| TC_E14S02_04 | an account deactivation is recorded with the actor and the time | PASS | |
| TC_E14S02_08 | access-denial entries and the refused users are not shown in the Coordinator Activity log | PASS | |
| TC_E14S02_05 | an activity log entry cannot be edited or deleted, even by the server connection | PASS | |
| MULTIPLE | Deleting a draft event or a user keeps their activity log entries | PASS | 2/2 passed |

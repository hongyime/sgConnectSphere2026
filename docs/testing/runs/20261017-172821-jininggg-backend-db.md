---
date: 2026-10-17T17:28:21+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: automated
test_case_version: 161026
database: real
commit: ea9d5e0
---

E11-S01 / SCRUM-75 self-action notification integration, HEAD plus working
changes. Runner uses the authenticated GitHub identity established for Ji Ning.

Command: node --import tsx --test backend/tests/staffAssignments.integration.test.ts
backend/tests/eventNotifications.integration.test.ts.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Initial local database availability | FAIL | Initial command could not connect to127.0.0.1:55439 (ECONNREFUSED):3 top-level tests failed before business assertions. Restarted only the existing disposable native PostgreSQL instance; no website/API started, no shared Supabase used. |
| TC_E11S01_11 TC_E11S01_09 | Self-action silence, colleague notices and transactional outbox | PASS | Rerun:12 tests passed, zero skips. Dedicated random schemas in guarded loopback test database; self-assignment/removal retained status/history and persisted no event notices/deliveries. Colleague assignment/removal produced exactly2 notices, each with1 delivery. Injected delivery-trigger failure rolled back assignment, request state and notification. Existing assignment concurrency test passed25 rounds. |
| TC_E11S01_01 TC_E11S01_02 TC_E11S01_10 TC_E11S01_12 TC_E11S01_13 TC_E11S01_14 TC_E11S01_15 TC_E11S01_16 | Shared routing, rollback, deduplication and visibility regression | PASS | Same12-test rerun includes the eventNotifications suite's real status/date writes, publication/attendee boundary, before/after recipients, default venue assignments, unresolved staff, retry deduplication and uncommitted-row isolation. Existing hook tests do not prove missing future business workflows. |

The helper created/dropped isolated test schemas; existing manual data was not
reset/seeded. No provider request, actual mailbox receipt or production evidence.

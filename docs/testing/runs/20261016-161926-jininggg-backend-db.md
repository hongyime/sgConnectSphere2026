---
date: 2026-10-16T16:19:26+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 8599ad2
---

E06-S03 / SCRUM-47, T-94/T-95/T-96. Tested branch
`feature/e06-s03-pending-withdrawal`: HEAD `8599ad2` plus uncommitted
withdrawal/replacement implementation and tests. The SHA alone does not contain
this work. Runner derived from authenticated GitHub login. Agent-driven tests;
no fresh human manual execution, whole-story Done claim or Jira change.

Command: `node --import tsx --test backend/tests/bookingSubmission.integration.test.ts backend/tests/venueBookingRequests.integration.test.ts backend/tests/venueHolds.integration.test.ts backend/tests/venueBufferConflicts.integration.test.ts backend/tests/eventNotifications.integration.test.ts`.
Final run: 44 tests passed, zero failures (35 top-level tests including nested tests).
Native disposable loopback PostgreSQL only, using TEST_DATABASE_URL and random
per-fixture schemas created/migrated and dropped by loginDatabase. No Docker,
Supabase, public schema reset or production migration. Migration 0020 was applied
locally, including a populated 0019-index upgrade fixture preserving every row.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_08 | Withdraw one Pending booking independently | PASS | Released only the selected booking; other full booking row unchanged, event Planning unchanged and occupancy became requestable again. |
| TC_E06S03_09 | Foreign Coordinator and Confirmed primary refusal | PASS | Foreign withdrawal 404; Confirmed withdrawal 409; primary flag retained. |
| TC_E06S03_10 | Withdrawal/decision serialization and event contention | PASS | Deterministic pg_blocking_pids checks observed the waiting writer in both lock-win orders; approval/rejection winner retained, withdrawal winner exposed Released to a conditional decision writer. Event-first concurrent lock caused 409 instead of deadlock. Decision writers simulate E06-S04's database contract, not its unmerged service/UI. |
| TC_E06S03_11 | Default staff routing, converted history and rollback | PASS | Default assigned-staff inbox plus delivery persisted; exact booking audit, null expiry, no hold resurrection. Injected outbox trigger failure rolled back status/audit/notification. Queued delivery is not provider receipt. |
| TC_E06S03_12 | Released replacement retry and index upgrade | PASS | Old key returned its Released row; new concurrent attempts admitted one new Pending row, preserving history. Old 0019 index upgraded without row changes; Rejected uniqueness retained. |
| TC_E06S03_13 | Follow latest rejection suggestion | PASS | Three further links succeeded without a two-attempt cap; consumed source remained blocked, and missing suggestion refused chain continuation. |
| MULTIPLE | Submission/list/hold/buffer/notification regression | PASS | 44 total passed; default new-request routing included. No full staff decision UI or human manual acceptance claimed. |

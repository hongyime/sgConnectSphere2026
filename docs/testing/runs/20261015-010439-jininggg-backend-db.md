---
date: 2026-10-15T01:04:39+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: 5c22e26
---

Final focused verification session after restarting the same disposable native
loopback PostgreSQL server. Agent-run on behalf of the authenticated GitHub user;
HEAD is the baseline plus uncommitted E06-S03 changes. No shared Supabase,
production migration, seed or external email-provider call.

Command: Node `--import tsx --test backend/tests/bookingSubmission.integration.test.ts`,
with a temporary local `TEST_DATABASE_URL`. Eight tests passed; none skipped.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_01 | Pending, advisory assessment, inbox and transactional email outbox | PASS | Request and saved failures persisted; injected responsible staff deduplicated, actor excluded; same-key retry returns original assessment and effects. Actual production staff resolver remains SCRUM-189. |
| TC_E06S03_02 | Approved-to-Planning | PASS | First submission changes event status with request/audit/notification writes. |
| TC_E06S03_04 | Buffer, maintenance and period refusal | PASS | Overlap and block refusals leave no extra request; an outside-hours advisory failure still permits an otherwise free booking. |
| MULTIPLE | Notification/outbox rollback | PASS | Synthetic delivery trigger failure restores Approved and leaves booking, notification, delivery and audit tables empty. |
| MULTIPLE | Concurrent direct submissions and retries | PASS | One same-key row/effect set; changed payload refused; overlapping different-key submissions produce one success and one 409. |
| MULTIPLE | Request versus hold across different events | PASS | Two independent event locks still serialize on the same venue; exactly one active request/hold persists and the other is refused. |
| MULTIPLE | Stale login and ambiguous Session data | PASS | Persisted inactive account or failed-login lock refuses a stale active DTO. A multi-Session event is refused without selecting an arbitrary Session; no booking rows saved. |
| TC_E06S05_04 | Hold conversion, retries and expiry | PASS | Same row becomes Pending, expiry clears and worker cannot expire it; expired conversion refused. |
| MULTIPLE | Migration and primary invariants | PASS | Legacy request attribution remains null on retry; nonpositive headcount and primary Pending rejected; a second Confirmed primary for one event rejected with 23505. This does not implement the staff confirmation/primary-selection workflow. |

This eight-test focused success does not change the broader full-database
regression's FAIL outcome (102/103) recorded in the earlier session. The two
additional concurrency/security tests were added after that broader run.

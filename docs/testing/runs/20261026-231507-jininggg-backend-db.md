---
date: 2026-10-26T23:15:07+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 261026
database: real
commit: 23794b8
pr: 355
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_03 | Rejected retries and suggested replacements | PASS | Same-Event chain retains Rejected rows and T-96 predecessor slots, permits a fresh retry, preserves idempotent retry, refuses an active duplicate, and lets a Confirmed descendant support explicit original cancellation. |
| TC_E10S05_04 | Coordinator decision notice and distinct recovery audit | PASS | coordinatorNotified is true; one Venue booking approved and one internal Event update are persisted for the Coordinator under distinct audit IDs. Recovery audit records primary/publication changes. |
| TC_E10S05_04 | Secondary venue and notification atomicity | PASS | Secondary recovery leaves publication unchanged and sends no Attendee venue-change notice. Failure of the later approval-notice outbox insert rolls back primary transfer, publication, both audits and prior in-transaction notices. |
| TC_E06S03_01 | Full booking acceptance regression | PASS | Exact CI command passed all 74 tests across eight files, with no failures or skips. |

## Remarks

Command: `npm.cmd run test:venue-booking-requests:db --workspace backend`, with TEST_DATABASE_URL loaded from a local-only disposable test environment. Native loopback PostgreSQL; random schemas/rollback with current migrations. E05-S06 loss is a fixture precondition, not a tested trigger or combined lift interaction. No provider delivery or manual acceptance is claimed.

Run used the working changes on the recorded HEAD. This addresses Le Xin's review: https://github.com/hongyime/sgConnectSphere2026/pull/355#pullrequestreview-5653949411 . It does not complete the parent story or its deferred integration/manual acceptance.

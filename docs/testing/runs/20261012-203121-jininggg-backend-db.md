---
date: 2026-10-12T20:31:21+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: 01ad35b
---

E06-S03 / SCRUM-47 foundation on this HEAD plus working-tree changes. Fresh
disposable local Postgres 17 container; no shared database used. The test creates
an isolated schema from migration 0001 within a rolled-back transaction. This
does not test future buffer/hold migrations or full booking submission.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_05 | PostgreSQL request list isolates assigned events and preserves every booking status | PASS | Assigned UUID/code return five base-schema statuses newest first. Other/unassigned Coordinator receives 404; unrelated decision reason absent. Retired venue history remains readable; retired venue preparation refused. Preparation creates no booking and leaves event Approved. |
| MULTIPLE | Existing venue search PostgreSQL regression | PASS | Existing real-database search matching test passed alongside the new request-list test. |

Command: `node --import tsx --test backend/tests/venueBookingRequests.integration.test.ts backend/tests/venueSearch.integration.test.ts` with TEST_DATABASE_URL set only in the process. Two passed, zero skipped.

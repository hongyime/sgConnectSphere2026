---
date: 2026-10-31T17:55:17+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "311026"
scope: backend/db
database: real
commit: d0ddd36
---

From `backend/`, `npm run test:db` at `d0ddd36` against isolated schemas in the
loopback `connectsphere_notification_test` database (native PostgreSQL 17; no
Supabase, no Docker). This record is the second full run, whose log was kept:
310 tests, 308 passed, 2 failed. Neither failure is in code this branch
touches:

- `registration.db.test.ts` needs a migrated public schema that this local test
  database does not have; CI runs it against one.
- `coordinatorAssignment.integration.test.ts` stopped with "Connection
  terminated due to connection timeout". Run on its own straight after, it
  passed twice.

The first full run a few minutes earlier (log not kept) had 309 passed and the
same one `registration.db.test.ts` failure.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_01 | TC_E08S03_08, TC_E08S03_09, TC_E08S04_01, TC_E08S04_02 and TC_E08S04_04: the readiness, submission, confirm and revert routes answer with the right status and body | PASS | |
| TC_E08S04_03 | TC_E08S04_03: a Technical Support equipment failure on a Confirmed event is flagged and the event stays Confirmed | PASS | |
| TC_E08S04_05 | TC_E08S04_05: reconfirming the last booking of a reverted event puts it in Safety Review and tells the Safety Officer | PASS | |
| TC_E08S04_06 | TC_E08S04_06: a venue block over a Confirmed booking returns the event to Planning, tells its Coordinator and does not cancel it | PASS | |
| MULTIPLE | E08-S04 reconfirm and automatic Safety Review integration tests | PASS | 12 more: reconfirm moves, refusals (block, clash), concurrent reconfirm, route, approval, re-reservation, venue-loss chain, earlier approval not reused |
| MULTIPLE | Remaining backend database suite | FAIL | 308/310: `registration.db.test.ts` (local schema, not this branch) and a connection timeout in `coordinatorAssignment.integration.test.ts` (passed twice alone) |

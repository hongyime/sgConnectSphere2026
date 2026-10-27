---
date: 2026-10-26T21:31:16+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 261026
database: real
commit: b0145df
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S05_02 | Lost booking details | PASS | Real list returns the unavailable reason. |
| TC_E10S05_03 | Same-event replacement and explicit cancellation | PASS | Pending replacement links to original; early cancellation refused; confirmed replacement permits explicit cancellation and idempotent retry. |
| TC_E10S05_04 | Effective replacement notices | PASS | No Organiser/Attendee notice on request; approval updates primary/publication and persists inbox/outbox. Outbox failure rolls back approval and cancellation. |
| TC_E06S03_01 | Existing submission/decision regression | PASS | 56 tests passed across all four selected database files, including three new recovery tests. |

## Remarks

Command: `node --env-file=<local disposable test environment> --import tsx --test backend/tests/lostVenueRecovery.integration.test.ts backend/tests/bookingSubmission.integration.test.ts backend/tests/venueBookingDecisions.integration.test.ts backend/tests/bookingDecisionIntegration.integration.test.ts`.

Used a fresh native loopback PostgreSQL database and random schemas with all migrations. E05-S06 loss detection and Confirmed-to-Planning are fixture preconditions, not tested production triggers here. Provider delivery/mailbox receipt is not claimed.

The run used the working changes on the recorded HEAD. This is automated evidence, not a human manual acceptance run.

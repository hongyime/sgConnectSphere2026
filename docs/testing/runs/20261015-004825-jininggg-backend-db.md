---
date: 2026-10-15T00:48:25+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: 5c22e26
---

Agent-executed disposable native loopback PostgreSQL run for the uncommitted
E06-S03 submission increment. HEAD is its baseline. No production migration or
provider delivery was performed. The full-regression record reports the broader
suite and its independent event-visibility fixture failure.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_01 | Pending request, advisory snapshot and atomic notices | PASS | Real row saved with requester/time/Session link; one deduplicated injected-resolver staff notice and one Organiser status notice, with email outbox rows. No actor notice. Production resolver is still pending. |
| TC_E06S03_02 | Approved becomes Planning | PASS | Transition, request, audit and notices share the transaction. Injected outbox trigger failure restores Approved and leaves all four write tables empty. |
| TC_E06S03_07 | Multiple bookings and optional fields | PASS | Second venue request retained alongside first; purpose/headcount persisted; absent headcount falls back to event attendance. Requests/list have independent identity and newest-first ordering. |
| TC_E06S03_04 | Active occupancy and maintenance conflicts | PASS | Requests conflicting with active occupancy or an advertised maintenance block refused; no extra booking saved. |
| TC_E06S03_06 | Setup/turnaround buffered conflict | PASS | Adjacent advertised period refused because buffered windows overlap; refusal exposes the unavailable window without another event's title. |
| TC_E06S02_04 | Unsuitable booking remains advisory | PASS | Capacity and outside-operating-hours failures are saved with an accepted Pending request. This row covers submission/persistence only; staff-screen half remains E06-S04. |
| TC_E06S03_05 | Assigned-event booking list and legacy migration | PASS | Own list ordered correctly; other Coordinator refused; retired-venue history retained. 0015 applied after existing legacy rows without fabricating requester metadata. |
| TC_E06S05_04 | Shared hold conversion and retry/expiry races | PASS | Same id becomes Pending, expiry clears; simultaneous retries have one audit/effect set. Expiry does not change converted Pending; already-expired conversion is refused. Existing lock-wait expiry regressions pass. Legacy Pending retries do not fabricate requester or snapshot. |
| MULTIPLE | Concurrent direct submissions | PASS | Same-key calls return one row/effect set; changed payload rejected; competing different-key overlapping calls produce one success and one 409. |
| MULTIPLE | Primary/headcount storage invariants | PASS | Nonpositive headcount and primary Pending writes rejected; legacy terminal rows remain readable. Confirmation/primary-selection workflow is not implemented here. |
| MULTIPLE | Affected database regression aggregate | PASS | Final combined run: 24/24 across bookingSubmission, venueBookingRequests, venueHolds, venueBufferConflicts and venueSearch integration files. Subsequent final submission assertions: 6/6. |

Commands: Node `--import tsx --test` with the files above and a temporary local
`TEST_DATABASE_URL`. Each suite uses its guarded disposable-schema fixture.
The broader 103-case suite is FAIL overall (102 passes), as recorded separately;
this focused record does not turn that failure into a success.

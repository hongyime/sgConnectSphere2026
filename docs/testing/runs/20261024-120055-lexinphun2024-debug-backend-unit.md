---
date: 2026-10-24T12:00:55+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "171026"
database: mocked
commit: c035dc5
pr: 298
---

SCRUM-48 / E06-S04, evidence for the fixes to Ji Ning's #298 review.
`npm test --workspace backend` from the repository root at `c035dc5`, on
Windows. The decision tests use a scripted fake database. The `date` is when
the run started; it finished within a minute.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | a pending request on a Completed or Cancelled event cannot be decided, and nothing is written | PASS | New regression for review point 1: approve and reject both return 409 for Completed and Cancelled; no booking update, audit, notice or venue lock; a Planning event still decides (200) |
| MULTIPLE | decision rechecks the current staff account and rolls back stale or busy authority | PASS | Review point 2, from #334 (Bryan): missing account 403, busy account 409, other errors rethrown, all rolled back |
| MULTIPLE | `venueBookingDecisions.test.ts` (31 tests) | PASS | 31/31 |
| MULTIPLE | rest of the backend unit suite | PASS | 453/453 overall; c8 reports 100% statements, branches, functions and lines for `src/modules/venueBooking/decisions.ts` |

---
date: 2026-10-24T21:39:16+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: fdd1ab9
---

SCRUM-152 / E05-S06 re-run after merging `main` (through #345) into the
application branch at `fdd1ab9`. `npm test --workspace backend` from the
repository root, on Windows. The real database runs at the same commit are in
`20261024-213807-lexinphun2024-debug-backend-db.md`. The `date` is when the
run started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `venueUnavailability.test.ts`, `venueBlocks.test.ts`, `venueBookingDecisions.test.ts`, `venueCalendar.test.ts` (E05-S06 tests) | PASS | Same tests as `20261024-212233-lexinphun2024-debug-backend-unit.md` |
| MULTIPLE | rest of the backend unit suite, including tests from `main` (`bookingWithdrawal`, `bookingPrimary`, `eventAttendance`) | PASS | 490/490, zero skipped. c8: 100% statements, branches, functions and lines for `blocks.ts`, `decisions.ts`, `bookingRequests.ts`, `bookingSubmission.ts`; `calendar.ts`, `holds.ts`, `search.ts` at 100% lines with only branches that predate this change uncovered |

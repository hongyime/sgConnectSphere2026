---
date: 2026-10-30T20:18:21+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "301026"
database: mocked
commit: cad7bd7
---

From `backend/`, `npm test` under c8 at `cad7bd7`: 622 passed, 1 skipped
(`PostgresEventLifecycleRepository satisfies the shared contract`, which runs
only when `TEST_DATABASE_URL` is set), 0 failed. Changed production file
`src/modules/venueBooking/holds.ts`: 100% statements, functions and lines;
branches 98.56%, the two uncovered branches (lines 82 and 196) being unchanged
by this branch and uncovered on main as well.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_01 | an overlapping hold, request, booking or block is refused without naming the other event | PASS | |
| TC_E06S05_06 | an expiry notice does not repeat an event code the title already starts with | PASS | |
| MULTIPLE | Backend unit suite | PASS | 622/623, 1 skipped as above |

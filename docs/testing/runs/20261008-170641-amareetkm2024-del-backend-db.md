---
date: 2026-10-08T17:06:41+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 031026
database: real
commit: c39772d
pr: 239
---

`npx tsx --test tests/staffAssignments.integration.test.ts
tests/supportRequests.integration.test.ts` in `backend/`, with
`TEST_DATABASE_URL` pointing at a disposable local PostgreSQL 17 container on
the loopback interface (random schema per run, never the application
database): 3/3 passed. The new race test was then run on its own 2 more times
on `c39772d`: passed both times.

Before committing, the race test was run 3 times with main's (unfixed)
`staffAssignments.ts` swapped in: it failed all 3 with `deadlock detected`
(40P01). With the fix it passed 3/3. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_03 | Simultaneous assignments of one colleague never deadlock (25 rounds) | PASS | Every round: one 201 and one 409 "Tech X is already assigned to EVT-R… at an overlapping time."; 25 assigned rows for Tech X; no 40P01 |
| MULTIPLE | Existing E07-S07 journey (TC_E07S07_01 to _06) | PASS | Unchanged behaviour, including its own simultaneous-assignment check |
| MULTIPLE | supportRequests.integration.test.ts (E07-S06) | PASS | 1/1 |

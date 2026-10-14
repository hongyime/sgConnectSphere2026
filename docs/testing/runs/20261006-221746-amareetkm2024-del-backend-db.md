---
date: 2026-10-06T22:17:46+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 031026
database: real
commit: 7a190d3
pr: 227
---

E07-S07 (SCRUM-148, SCRUM-149) against real PostgreSQL:
`npx tsx --test tests/staffAssignments.integration.test.ts
tests/supportRequests.integration.test.ts` in `backend/`. `TEST_DATABASE_URL`
pointed at a disposable local PostgreSQL 17 container on the loopback
interface: a random schema per run, every migration applied by the test
helper, never the application database. 2/2 passed. The staffing test was
also run three times before this recorded run, passing each time. Run by
Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_01 | A colleague with no conflicting assignment is assigned | PASS | Tech C assigned to EVT-TC (09:00–12:00); request staffed; notified. Tech C on EVT-LT (13:00–15:00) is also allowed, since the ranges only touch |
| TC_E07S07_02 | The assignment shows on the assigned staff member's schedule | PASS | mySchedule for Tech C lists EVT-TC Tech Conference 2026 starting 2026-11-12T01:00:00Z, then EVT-LT |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | PASS | Tech B, on EVT-CR Charity Run 10:00–13:00, refused for EVT-TC: "Tech B is already assigned to EVT-CR Charity Run at an overlapping time."; no row written; request detail lists Charity Run against Tech B and nothing against Tech C |
| TC_E07S07_04 | Removing an assignment frees the slot | PASS | Tech C's EVT-TC assignment released; request back to open; schedule shows only EVT-LT; second removal 409 |
| TC_E07S07_05 | A replacement goes through the same conflict check | PASS | After the removal, Tech B is still refused for EVT-TC; Tech A is assigned |
| TC_E07S07_06 | The staff member is notified when assigned and when removed | PASS | Tech C has "Technical support assignment" and "Technical support assignment removed" for Tech Conference 2026 |
| MULTIPLE | Race, refusals and removal after cancellation | PASS | Two simultaneous assignments of Tech C to overlapping requests: one 201, one 409, one assigned row. Cancelled-event request 409; inactive colleague 400; Coordinator 403 and audited; removal still works after the event is cancelled |
| MULTIPLE | supportRequests.integration.test.ts (E07-S06) | PASS | 1/1, unchanged |

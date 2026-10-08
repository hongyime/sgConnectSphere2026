---
date: 2026-10-09T02:11:40+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 031026
database: real
commit: 714b8fc
pr: 237
---

SCRUM-151, the manual end-to-end check for E07-S07 (SCRUM-57). Amareet ran
`docs/testing/manual/E07-S07-click-through.md` by hand in a real browser,
using a normal window (`coord_a`) and a private window (`tech_a`, `tech_b`),
signing in through the login page. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`), never the shared database

The code under test is `main` at `1086940`, merged into `714b8fc`. Claude set
up the stack and checked the database afterwards; the database facts below
come from that check. Run by Amareet.

**How the run went:** the first "all good" report was checked against the
database, which held only part A's two support requests (the other parts
had not reached this local app). Amareet then continued from step 5 on
127.0.0.1:5173 (02:07–02:09 SGT), and did step 4 last (02:11:30) after the
database showed no refusal entry for it. Every row below is backed by the
database.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_01 | A colleague with no conflicting assignment is assigned | PASS | Steps 5–7: tech_a assigned Technical Support B to EVT-3001 after the confirm panel; "…is assigned and has been notified". Database: an `assigned` row for tech_b on EVT-3001 at 02:07:38 |
| TC_E07S07_02 | The assignment shows on the assigned staff member's schedule | PASS | Step 8: tech_b's My schedule listed EVT-3001 Approved Annual Conference, 25 Oct 2026, 7:00 pm – 11:00 pm; step 16 then showed only EVT-3003 |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | PASS | Steps 10–11: on EVT-3003 (6–10 pm) Technical Support B showed Busy for EVT-3001 (7–11 pm), and assigning was refused naming EVT-3001 Approved Annual Conference. Database: no assignment was written for that attempt |
| TC_E07S07_04 | Removing an assignment frees the slot | PASS | Steps 12–13: removal after the confirm panel; "…no longer assigned and has been notified". Database: the EVT-3001 row is `released`, and the EVT-3001 request is back to `open` |
| TC_E07S07_05 | A replacement goes through the same conflict check | PASS | Steps 14–15: on EVT-3003, Technical Support B now showed "Free for these times" and was assigned. Database: an `assigned` row at 02:09:39; the EVT-3003 request is `staffed`. The "replacement also blocked" variant needs a third technician and is covered by `tests/auth-e2e/technicalSupport.spec.ts` |
| TC_E07S07_06 | The staff member is notified when assigned and when removed | PASS | Steps 9 and 16: tech_b's notices "Technical support assignment" (EVT-3001, 02:07:38), "Technical support assignment removed" (EVT-3001, 02:09:20) and "Technical support assignment" (EVT-3003, 02:09:39), all read |
| MULTIPLE | A Coordinator cannot open technician staffing | PASS | Step 4: coord_a got "Access refused" / "Access denied. Only Technical Support Staff can assign technicians."; an Access Denied audit row for coord_a on `tech_staff_assignments` at 02:11:30 |

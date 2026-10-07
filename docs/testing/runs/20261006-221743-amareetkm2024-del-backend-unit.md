---
date: 2026-10-06T22:17:43+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 031026
database: mocked
commit: 7a190d3
pr: 227
---

E07-S07 technician assignment backend (SCRUM-148, SCRUM-149). Two runs on
Windows against a scripted fake database:

1. `npx c8 --include 'src/modules/equipmentSupport/staff*.ts' tsx --test
   tests/staffAssignments.test.ts` in `backend/`: 17/17 passed; 100%
   statements (242/242), branches (94/94), functions (14/14), lines
   (242/242).
2. The full `npm test --workspace backend` file list via `npx c8`: 300/300
   passed.

Before the runs, four deliberate bugs were each caught by this suite or the
database suite. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_01 | A colleague with no conflicting assignment is assigned | PASS | Mocked: the assignment covers the request's support range; the request is set to staffed; the colleague gets "Technical support assignment" / "You're assigned to EVT-TC Tech Conference 2026: 1 AV technician" |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | PASS | Mocked: 409 "Tech B is already assigned to EVT-CR Charity Run at an overlapping time.", nothing written; the simultaneous double assignment refused by the database gives the same sentence |
| TC_E07S07_04 | Removing an assignment frees the slot | PASS | Mocked: released; the request goes back to open when it was the last; the colleague gets "Technical support assignment removed"; removing twice gives 409 |
| MULTIPLE | Other staffAssignments.test.ts cases (access and audit, id checks, queue, request detail, schedule, refusals, handler) | PASS | 14/14 |
| MULTIPLE | Full backend unit suite | PASS | 300/300 |

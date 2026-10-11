---
date: 2026-10-08T17:06:33+08:00
runner: amareetkm2024-del
scope: backend/unit
environment: local
run_type: automated
test_case_version: 031026
database: mocked
commit: c39772d
pr: 239
---

Technician-assignment deadlock fix (follow-up to #227). Two runs on Windows
against a scripted fake database:

1. `npx c8 --include 'src/modules/equipmentSupport/staff*.ts' tsx --test
   tests/staffAssignments.test.ts`: 19/19 passed; 100% statements (252/252),
   branches (97/97), functions and lines.
2. The full backend unit list via `npx c8`: 314/314 passed.

Before the run, the lock-order test failed with the colleague lock removed.
Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S07_03 | Assigning a colleague with an overlapping assignment is blocked, conflicting event identified | PASS | New: the colleague row is locked (`FOR NO KEY UPDATE`) after the request lock and before the clash check; a 40P01 deadlock gives "Tech B is already assigned to EVT-CR Charity Run at an overlapping time." with status 409 |
| MULTIPLE | Rest of staffAssignments.test.ts | PASS | 17/17 |
| MULTIPLE | Full backend unit suite | PASS | 314/314 |

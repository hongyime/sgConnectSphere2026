---
date: 2026-10-28T13:19:24+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: 17743c4
pr: 365
---

SCRUM-205 follow-up. HEAD above plus the staged date-test fix committed with
this record; explicitly not a clean-HEAD execution. Production code unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_03 | Original date-transfer test under UTC | FAIL | Reproduced CI failure locally: fixed local 09:30 is after the Event end 04:00 on UTC, so validation correctly blocks PATCH. 6 other tests passed. |
| MULTIPLE | Full frontend suite under UTC after fixture correction | PASS | TZ=UTC npm test --workspace frontend; 671/671, 65 files. |
| TC_E10S01_03 | Date transfer in Singapore and Los Angeles | PASS | TZ=Asia/Singapore and TZ=America/Los_Angeles vitest run src/features/events/RefusedEdit.navigation.test.tsx; 7/7 in each timezone. |
| MULTIPLE | Frontend typecheck | PASS | npm run typecheck --workspace frontend. |
| MULTIPLE | Repository checks | PASS | python3 scripts/check.py; hygiene and 182 tooling tests, not full application acceptance. |

UTC pre-fix reproduction used the same focused Vitest command. The correction
chooses the fixed in-range instant 2027-03-01T01:30:00.000Z, converts it to the
edit form's local input representation, then asserts the exact PATCH instant
and fixed Singapore request input 2027-03-01T09:30. No validation, timeout,
workflow timezone, or application logic changed. API data is intercepted; no
real-database run or human manual acceptance is claimed by this session.

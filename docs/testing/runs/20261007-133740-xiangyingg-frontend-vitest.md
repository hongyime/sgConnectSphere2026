---
date: 2026-10-07T13:37:40+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 0691e79
---

Command: `npm test --workspace frontend -- --coverage --coverage.include=src/features/support/EquipmentAvailability.tsx --coverage.include=src/features/support/equipmentAvailabilityApi.ts --coverage.reporter=text --coverage.reporter=json --coverage.reportsDirectory=../artifacts/scrum53-review-frontend src/features/support/EquipmentAvailability.test.tsx`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
0691e79; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
-------------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 100% ( 35/35 )
Branches     : 100% ( 23/23 )
Functions    : 100% ( 18/18 )
Lines        : 100% ( 34/34 )
================================================================================
```

---
date: 2026-10-07T10:58:45+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 83754ab
pr: 216
---

Command: `npm test --workspace frontend -- --coverage --coverage.include=src/features/support/EquipmentRequests.tsx --coverage.include=src/features/support/equipmentRequestApi.ts --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=../artifacts/scrum52-frontend-coverage src/features/support/EquipmentRequests.test.tsx`. Timestamp captured at command completion.
Executed on the uncommitted coverage-review working tree merging latest main
into branch HEAD 83754ab; the commit field identifies HEAD, not the unstaged changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 coverage review regression | PASS | Observed exit code 0; command and coverage scope above. |

Final output:

```text
      Coverage enabled with v8


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  10:58:43
   Duration  1.26s (tests 39%, environment 38%, import 8%, setup 7%, transform 7%, worker 1%)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   98.19 |    98.48 |     100 |     100 |
 ...ntRequests.tsx |   98.01 |    98.46 |     100 |     100 | 120,371
-------------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 98.19% ( 109/111 )
Branches     : 98.48% ( 130/132 )
Functions    : 100% ( 45/45 )
Lines        : 100% ( 106/106 )
================================================================================
```

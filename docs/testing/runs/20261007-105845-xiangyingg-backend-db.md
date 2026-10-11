---
date: 2026-10-07T10:58:45+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: '031026'
database: real
commit: 83754ab
pr: 216
---

Command: `node_modules/.bin/c8 --reports-dir artifacts/scrum52-combined-coverage --temp-directory artifacts/scrum52-combined-coverage/tmp --include backend/src/modules/equipmentSupport/request*.ts --reporter=json --reporter=text node --import tsx --test backend/tests/equipmentRequests.test.ts backend/tests/equipmentRequests.integration.test.ts`. Timestamp captured at command completion.
Executed on the uncommitted coverage-review working tree merging latest main
into branch HEAD 83754ab; the commit field identifies HEAD, not the unstaged changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 coverage review regression | PASS | Observed exit code 0; command and coverage scope above. |

Final output:

```text
# Subtest: handler reads list/detail and rejects malformed save/remove actions
ok 6 - handler reads list/detail and rejects malformed save/remove actions
  ---
  duration_ms: 0.413375
  type: 'test'
  ...
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 359.343875
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |
 requestHandler.ts |     100 |      100 |     100 |     100 |
 requests.ts       |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
```

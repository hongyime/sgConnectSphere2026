---
date: 2026-10-07T10:58:57+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 83754ab
pr: 216
---

Command: `node_modules/.bin/c8 --reports-dir artifacts/scrum52-unit-coverage --temp-directory artifacts/scrum52-unit-coverage/tmp --include backend/src/modules/equipmentSupport/request*.ts --reporter=json --reporter=text node --import tsx --test backend/tests/equipmentRequests.test.ts`. Timestamp captured at command completion.
Executed on the uncommitted coverage-review working tree merging latest main
into branch HEAD 83754ab; the commit field identifies HEAD, not the unstaged changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 coverage review regression | PASS | Observed exit code 0; command and coverage scope above. |

Final output:

```text
# Subtest: handler reads list/detail and rejects malformed save/remove actions
ok 5 - handler reads list/detail and rejects malformed save/remove actions
  ---
  duration_ms: 0.353958
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 130.841334
-------------------|---------|----------|---------|---------|---------------------------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|---------------------------------------
All files          |   56.96 |    91.13 |   85.71 |   56.96 |
 requestHandler.ts |     100 |      100 |     100 |     100 |
 requests.ts       |   49.88 |    87.27 |   83.33 |   49.88 | ...17,120-122,181-236,259-382,398-424
-------------------|---------|----------|---------|---------|---------------------------------------
```

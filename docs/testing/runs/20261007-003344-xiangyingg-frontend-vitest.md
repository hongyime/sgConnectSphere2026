---
date: 2026-10-07T00:33:44+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: ccb32b6
---

Command: `npm test --workspace frontend`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
ccb32b6; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
 RUN  v5.0.1 <repository>/frontend


 Test Files  33 passed (33)
      Tests  277 passed (277)
   Start at  00:33:39
   Duration  5.22s (environment 41%, tests 37%, import 10%, setup 6%, transform 6%)

Environment  jsdom was created 33 times · 18.72s total, 41% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

```

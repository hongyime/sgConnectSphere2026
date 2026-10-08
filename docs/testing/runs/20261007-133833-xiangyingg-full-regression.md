---
date: 2026-10-07T13:38:33+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 0691e79
---

Command: `npm test --workspace frontend`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
0691e79; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
 RUN  v5.0.1 <repository>/frontend


 Test Files  34 passed (34)
      Tests  301 passed (301)
   Start at  13:38:27
   Duration  6.15s (environment 43%, tests 36%, import 9%, setup 6%, transform 6%)

Environment  jsdom was created 34 times · 23.70s total, 43% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

```

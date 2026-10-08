---
date: 2026-10-07T10:59:29+08:00
runner: xiangyingg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 83754ab
pr: 216
---

Command: `npm test --workspace frontend`. Timestamp captured at command completion.
Executed on the uncommitted coverage-review working tree merging latest main
into branch HEAD 83754ab; the commit field identifies HEAD, not the unstaged changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 coverage review regression | PASS | Observed exit code 0; command and coverage scope above. |

Final output:

```text

> @connectsphere/frontend@0.1.0 test
> vitest run


 RUN  v5.0.1 <repository>/frontend


 Test Files  33 passed (33)
      Tests  294 passed (294)
   Start at  10:59:23
   Duration  5.30s (environment 40%, tests 38%, import 9%, transform 6%, setup 6%)

Environment  jsdom was created 33 times · 19.26s total, 40% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

```

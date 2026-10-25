---
date: 2026-10-23T01:56:30+08:00
runner: xiangyingg
scope: full-regression
environment: ci
run_type: regression
test_case_version: 171026
database: real
commit: 15abcf6
pr: 343
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Required application checks on attendance head | PASS | Full application-checks (not the skip job) completed successfully: https://github.com/hongyime/sgConnectSphere2026/actions/runs/39823030934/job/119978984416 . Workflow uses disposable PostgreSQL and Redis. |
| MULTIPLE | Required repository and PR checks on same head | PASS | repository-checks and pr-conventions: https://github.com/hongyime/sgConnectSphere2026/actions/runs/39823030600 ; lfs-guard: https://github.com/hongyime/sgConnectSphere2026/actions/runs/39823030953 . Read GitHub check rollup: all completed success except intentionally skipped draft deployment. New evidence pushes require fresh CI. |

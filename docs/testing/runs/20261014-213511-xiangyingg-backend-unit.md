---
date: 2026-10-14T21:35:11+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 141026
database: mocked
commit: 6967fbd
pr: 261
---

Run on the resolved merge working tree with main ea46909 before the merge commit.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit rerun | PASS | # tests 380; # pass 380; # fail 0; # skipped 0. Unit initial invocation was blocked before tests by sandbox IPC EPERM; elevated rerun shown here. Database uses isolated schemas in disposable local PostgreSQL. Both application typechecks also passed. |

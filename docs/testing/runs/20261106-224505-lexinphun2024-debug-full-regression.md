---
date: 2026-11-06T22:45:05+08:00
runner: lexinphun2024-debug
scope: full-regression
environment: ci
run_type: automated
test_case_version: 061126
database: real
commit: a8f2d87
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Main full Application Checks | PASS | Observed https://github.com/hongyime/sgConnectSphere2026/actions/runs/42233620112 after completion. Backend unit 726 passes plus 6 separate pretest checks and 1 skip; frontend 841; 27 PostgreSQL-labelled steps total 390 passes; auth 58; browser 476 successful runner outcomes including six expected-failure outcomes, 14 skipped. No unexpected failure. |

CI logs inspected as evidence; no database or production suite was rerun locally.

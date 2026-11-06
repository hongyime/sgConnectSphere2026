---
date: 2026-11-06T20:44:24+08:00
runner: lexinphun2024-debug
scope: full-regression
environment: ci
run_type: automated
test_case_version: 061126
database: real
commit: bf63fde
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Main Application Checks | PASS | Observed Actions run https://github.com/hongyime/sgConnectSphere2026/actions/runs/42211312372 on bf63fdea. Unit/backend 738 pass, 1 skip; frontend 852 pass; 27 PostgreSQL-labelled steps total 378 passes plus 6 todo expected failures; auth Playwright 58 pass; browser suite 480 successful runner outcomes (includes 8 expected-failure outcomes), 10 skips. Known defects are not claimed as ordinary passing cases. |

CI result inspected for slide evidence; not rerun locally. CI uses managed PostgreSQL; runtime/Redis steps are excluded from the PostgreSQL count.

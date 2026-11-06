---
date: 2026-11-06T17:06:38+08:00
runner: bryanseah234
scope: backend/unit
environment: local
run_type: regression
test_case_version: 051126
database: mocked
commit: a1a6c8c
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S08_01, TC_E03S08_03, TC_E03S08_04 | Lead queue submission, assignment and refusal guards | PASS | `npm test --workspace backend`: the Lead recovery pretest reported 9/9 passing; the backend unit suite also passed. |
| TC_E03S09_01, TC_E03S09_03 | Lead reassignment and Coordinator escalation | PASS | `npm test --workspace backend`: immediate reassignment, Lead escalation and decline assertions passed against mocked persistence. |
| TC_E03S10_01, TC_E03S10_02 | Lead oversight, filtering and access control | PASS | `npm test --workspace backend`: active-event/workload filters and non-Lead refusal assertions passed against mocked persistence. |

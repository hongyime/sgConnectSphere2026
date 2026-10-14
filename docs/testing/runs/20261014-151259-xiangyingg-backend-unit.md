---
date: 2026-10-14T15:12:59+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 141026
database: mocked
commit: 979cc08
---

Follow-up E07-S09 / issue #264 working tree based on 979cc08, before the implementation commit. Completion timestamps come from the final log writes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Withdrawal-aware catalogue regression | PASS | `npm test --workspace backend`. 373/373 backend unit tests passed; backend typecheck also passed separately. |

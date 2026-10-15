---
date: 2026-10-14T16:06:41+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 141026
database: mocked
commit: ecc0d7d
---

Issue #264 / E07-S09 working tree combining ecc0d7d with main f68ee66 before the merge commit. Completion time is the final log write.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Latest-main stock/withdrawal follow-up verification | PASS | `npm test --workspace backend`. 373/373 passed; backend typecheck passed separately. No manual or deployment claim. |

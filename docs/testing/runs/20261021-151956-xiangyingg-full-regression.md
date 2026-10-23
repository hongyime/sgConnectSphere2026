---
date: 2026-10-21T15:19:56+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: e36a289
pr: 320
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | PR review follow-up verification | PASS | 420 backend unit tests, 4 real-PostgreSQL cancellation tests, backend typecheck and 17 compiled runtime tests passed. Repository hygiene/tooling: 158 tests passed. Initial database attempt failed because Docker was stopped; rerun passed after starting existing disposable container. No new human evidence or production verification. API organisation-scoped lock change is typechecked and covered by existing access tests; exact lock-contention behaviour still needs independent review. Tested HEAD plus uncommitted main integration and review fixes, before merge commit. |

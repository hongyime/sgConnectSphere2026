---
date: 2026-10-08T18:31:40+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: automated
test_case_version: "081026"
database: mocked
commit: 8ac817e
---

`npm test --workspace backend` (c8 + tsx, scripted fake database), after the
Coordinator-name fix in the Activity log read.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E14S02_01 | the assigned Coordinator reads the event Activity log without access denials | PASS | |
| MULTIPLE | Backend unit suite | PASS | 313/313 passed |

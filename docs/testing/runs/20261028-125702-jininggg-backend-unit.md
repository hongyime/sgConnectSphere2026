---
date: 2026-10-28T12:57:02+08:00
runner: jininggg
scope: backend/unit
environment: local
run_type: regression
test_case_version: 261026
database: mocked
commit: f3df479
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Backend unit regression and typecheck | PASS | npm.cmd test --workspace backend: 545 passed, zero failed. npm.cmd run typecheck --workspace backend passed. Changed SQL orchestration is verified against real PostgreSQL rather than 100 percent mocked unit coverage. Working tree includes integration changes on the recorded base commit; no manual acceptance claimed. |

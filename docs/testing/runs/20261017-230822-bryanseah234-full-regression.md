---
date: 2026-10-17T23:08:22+08:00
runner: bryanseah234
scope: full-regression
environment: ci
run_type: automated
test_case_version: 161026
database: none
commit: 59bdd74
pr: 308
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Current-head GitHub Application Checks | FAIL | Typecheck and backend unit tests passed; frontend component suite failed with 441/442 passing because TC_E03S12_01 in the pre-existing `frontend/src/features/organiser/ClientEvents.saveAlert.test.tsx` expected `.ui-alert-success` but found null. The workflow stopped before subsequent PostgreSQL acceptance, build, runtime, Redis and browser steps. Run: https://github.com/hongyime/sgConnectSphere2026/actions/runs/39043612484 |

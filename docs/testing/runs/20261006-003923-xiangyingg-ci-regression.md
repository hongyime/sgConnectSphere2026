---
date: 2026-10-06T00:39:23+08:00
runner: xiangyingg
scope: full-regression
environment: ci
run_type: automated
test_case_version: 031026
database: real
commit: 38b4f5f
pr: 214
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Application Checks | PASS | Observed completed SUCCESS: https://github.com/hongyime/sgConnectSphere2026/actions/runs/37341698467 . Typecheck, backend unit tests, PostgreSQL acceptance suites, build, compiled runtime, notification/Redis regression, authenticated desktop/mobile browser tests and browser scaffold all passed. Disposable real PostgreSQL/Redis services; unit and scaffold browser tests use mocked dependencies/data. Live email provider delivery and production deployment excluded. |

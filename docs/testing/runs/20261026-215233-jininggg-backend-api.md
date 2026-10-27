---
date: 2026-10-26T21:52:33+08:00
runner: jininggg
scope: backend/api
environment: ci
run_type: automated
test_case_version: 261026
database: real
commit: b0f0dc6
pr: 355
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_05 | E06-S03 booking submission and status PostgreSQL acceptance | FAIL | application-checks failed because column b.conflict_block_id was absent from the legacy request-list test schema. Log inspection identifies fixture applying only0001+0019while the live query consumes0025columns. |

## Remarks

Observed failure at https://github.com/hongyime/sgConnectSphere2026/actions/runs/40331728045/job/121602594018 on the recorded commit. Native local rerun after fixture repair is recorded separately; no successful CI result is claimed here.

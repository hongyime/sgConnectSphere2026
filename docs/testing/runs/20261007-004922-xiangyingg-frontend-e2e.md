---
date: 2026-10-07T00:49:22+08:00
runner: xiangyingg
scope: frontend/e2e
environment: ci
run_type: regression
test_case_version: '031026'
database: mocked
commit: 884dc52
pr: 229
---

Observed Actions failure log: [run 37497954598](https://github.com/hongyime/sgConnectSphere2026/actions/runs/37497954598/job/112387252540).
Timestamp is the final failure-summary time in the CI log, converted to Singapore.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Playwright scaffold | FAIL | 236 passed, 342 skipped, 2 failed (desktop/mobile legacy conflict-state fixture assertions in tests/e2e/support.spec.ts). npm run test:e2e:scaffold exited 1. |

The old test expected the retired Conflict state heading and mock event at the
route now serving live E07-S03 availability. Updated to verify the live legacy
route opens the availability form; dedicated suites cover calculations.

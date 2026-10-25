---
date: 2026-10-23T00:18:01+08:00
runner: xiangyingg
scope: full-regression
environment: ci
run_type: automated
test_case_version: 171026
database: real
commit: 18dcd7b
pr: 320
---

# Successful application CI after the job-budget correction

[Application Checks run 39811412550](https://github.com/hongyime/sgConnectSphere2026/actions/runs/39811412550), application/workflow head `18dcd7b`.
Date is actual job completion time from Actions, not the filing time. Commit
matches git rev-parse --short HEAD in the clean application checkout.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Complete Application Checks workflow | PASS | Every application step succeeded: typecheck, backend units, frontend components, all PostgreSQL acceptance steps including cancellation, build, compiled runtime, outbox/Redis regressions, authenticated desktop/mobile browser tests, full scaffold and final T-72 reset/seed/new-role sign-ins. Total application job duration 9m22s, within the retained 25-minute deadline. |

The old run 39794534880 remains Cancelled history; its separately recorded
partial results are not rewritten. This successful run verifies the workflow
correction in PR #320. It does not imply teammate approval, production migration
0022 verification, human evidence acceptance or story Done. The CI record is
filed with the evidence PR #321 so adding evidence does not change #320's
successfully tested application head or trigger another full application run.

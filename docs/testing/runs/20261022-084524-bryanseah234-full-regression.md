---
date: 2026-10-22T08:45:24+08:00
runner: bryanseah234
scope: full-regression
environment: ci
run_type: automated
test_case_version: 161026
database: real
commit: 1f7304d
pr: 337
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Unchanged hosted application-checks retry | PASS | 1/1 application-checks job completed successfully. Typecheck, backend/frontend units, selected PostgreSQL suites, build, compiled API runtime, intercepted-provider/outbox, Redis, auth browser, scaffold and disposable CI role-sign-in steps succeeded. No source or test changes were made between attempts. |

Source: [application workflow attempt 2](https://github.com/hongyime/sgConnectSphere2026/actions/runs/39699469662/attempts/2).
PR head remained `45905635feea95af44e354c4e825af8d0d78060f` on base
`52d0ec4ff42b349db51cfec44e10626ae1c0a1bb`. Checkout again logged
`1f7304d68671c7f0d5b0c0e4164a189687e5ac6f`, exactly the first attempt's tested
merge HEAD. Preserve the separate `20261022-082536-bryanseah234-frontend-vitest.md`
FAIL record; a retry does not erase the intermittent saved-Alert failure or prove
its root cause fixed. The existing scaffold/conditional cases retain their skip
semantics. This workflow on the older booking-owner base does not supply the
unpublished cancellation/real-decision integration, human T-93 evidence, main
adoption or production acceptance. Managed CI database/Redis services are disposable.

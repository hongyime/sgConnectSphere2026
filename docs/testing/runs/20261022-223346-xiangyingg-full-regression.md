---
date: 2026-10-22T22:33:46+08:00
runner: xiangyingg
scope: full-regression
environment: ci
run_type: automated
test_case_version: 171026
database: real
commit: 4b37591
pr: 320
---

# PR #320 application job cancelled at the total job limit

Actions run [39794534880, job 119878439335](https://github.com/hongyime/sgConnectSphere2026/actions/runs/39794534880/job/119878439335?pr=320).
The timestamp is the actual job completion time from Actions (14:33:46 UTC,
22:33:46 Singapore), not the later investigation time. Source HEAD from Actions
matches the application worktree's git rev-parse --short HEAD: 4b37591.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Application checks completed before browser setup | PASS | Typechecks, backend units, frontend components, all listed PostgreSQL acceptance steps including SCRUM-73 cancellation, build, compiled runtime, outbox and Redis steps completed successfully in the Actions log. This does not mean the overall job passed. |
| MULTIPLE | Authenticated desktop/mobile browser suite | PASS | npm run test:e2e:auth completed 20 tests in 1.9 minutes, real isolated CI PostgreSQL. |
| MULTIPLE | Complete scaffold suite and final role-seed verification | SKIP | npm run test:e2e:scaffold was still running passing desktop/mobile cases when the 15-minute job deadline cancelled it; final T-72 role-seed step was skipped. Install Playwright browsers consumed 8m26s, with Ubuntu package fetch reporting 8m6s. No complete scaffold or overall CI PASS is claimed. |

Fix: retain all checks, allow a 25-minute total job budget for cold browser
system dependencies plus both suites/final seed verification, and install only
the headless Chromium shell used by these projects. Unmocked scaffold session
requests log absent-port-3001 warnings, but passing tests continued; those warnings
are not identified as the timeout's root cause. No test skips or weakened assertions
are introduced by the workflow correction.

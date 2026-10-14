---
date: 2026-10-06T14:35:57+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: '031026'
database: none
commit: 157995d
pr: 216
---

Command: `npx playwright test --config playwright.auth.config.ts equipmentRequests.spec.ts`.
The initial sandbox attempt could not bind the frontend port. The rerun outside the sandbox started Playwright, then both projects failed in beforeAll because TEST_DATABASE_URL was unset. No database connection or feature assertion executed. This is an environment/setup failure, not an observed application defect.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | E07-S02 authenticated desktop/mobile acceptance journey | FAIL | 2 failed in setup; run aborted before TC_E07S02_01–04 assertions. Set TEST_DATABASE_URL to a disposable loopback PostgreSQL database to rerun. |

---
date: 2026-11-03T22:46:28+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 021126
database: mocked
commit: 8858e4e
pr: 415
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Playwright suite, desktop and mobile | PASS | 396 passed, 212 skipped, 0 failed, `npx playwright test --workers=2`. An earlier full run at the default worker count on this commit had 392 passed and 4 failed (`attendee-registration.spec.ts:42`, `e08.spec.ts:568`, `e10.spec.ts:69`, `support.spec.ts:42`, desktop). All 4 passed when rerun alone, and this run is clean. |

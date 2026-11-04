---
date: 2026-11-04T01:43:38+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 031126
database: mocked
commit: 429407b
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Full Playwright suite, desktop and mobile, faked replies | FAIL | 395 passed, 1 failed, 212 skipped, `npx playwright test --workers=2`. The failure is mobile `e09.spec.ts:105` (TC_E09S01_05), a registration screen this change does not touch. |
| TC_E09S01_05 | The same test rerun after the full suite | PASS | 5 of 5 passed alone, and all of `e09.spec.ts` on mobile passed (23 passed, 4 skipped). |

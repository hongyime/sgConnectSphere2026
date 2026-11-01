---
date: 2026-10-31T23:45:00+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "311026"
scope: frontend/e2e
database: mocked
commit: 8cc4317
---

From the repository root, `npx playwright test tests/e2e/e10.spec.ts
tests/e2e/support.spec.ts tests/e2e/technicalSupport.spec.ts tests/e2e/e08.spec.ts`
(faked API replies) at `8cc4317`: 66 passed, 62 skipped. The skipped ones are
`test.fixme` scaffolds for cases proven by database tests or not built yet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_03, TC_E10S02_06, TC_E10S02_10, TC_E10S02_11, TC_E10S02_12, TC_E10S02_13 | Technical Support in the change preview, readiness and reconfirmation (`e10.spec.ts`) | PASS | desktop and mobile |
| MULTIPLE | Staffing queue and E08 screens (`support.spec.ts`, `technicalSupport.spec.ts`, `e08.spec.ts`) | PASS | |
| MULTIPLE | `test.fixme` scaffolds in these files | SKIP | 62 skipped |

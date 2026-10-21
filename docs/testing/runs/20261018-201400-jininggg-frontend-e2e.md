---
date: 2026-10-18T20:14:00+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 161026
database: real
commit: 3ef0386
pr: 313
---

HEAD plus CI follow-up. No product code or notification guard changed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_11 TC_E07S06_01 TC_E07S06_03 TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 | Real staffing browser regression | PASS | `node --env-file=<temporary-loopback-test-env> node_modules/@playwright/test/cli.js test --config playwright.auth.config.ts tests/auth-e2e/technicalSupport.spec.ts`: 2 passed, desktop and mobile. Real sessions/API/PostgreSQL isolated schemas; test-owned API3006/frontend5176 cleaned up. Self assignment/removal uses truthful wording and asserts zero matching inbox/outbox rows; colleague notices, schedule, conflict and access assertions retained. |

CI failed because the prior test expected the removed self-notification claim.
These are automated tests, not additional human screenshots. Existing manual
servers/data were left intact; no production/provider operation.

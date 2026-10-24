---
date: 2026-10-24T17:21:26+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 211026
database: mocked
commit: da6c66c
pr: 299
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Booking submission browser regression | PASS | npx.cmd playwright test tests/e2e/venue-booking-submission.spec.ts --workers=1: 16/16 passed, desktop and mobile. Intercepted APIs with local frontend; not a live database or human run. Tested da6c66c plus browser assertion correction. |

CI job120833459812 failed only the two desktop/mobile replacement tests: they expected the removed intermediate submission heading and View click after the automatic list refresh fix. Updated them to assert the success message and automatically visible Pending card, retained Rejected history, consumed action and submitted metadata checks. No assertion skipped or timeout enlarged. Inventory regenerated with no drift. No new manual screenshot evidence claimed.

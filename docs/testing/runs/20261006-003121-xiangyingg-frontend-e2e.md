---
date: 2026-10-06T00:31:21+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 031026
database: mocked
commit: 1cff5c5
pr: 214
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Catalogue and support browser regression | PASS | `npx playwright test tests/e2e/support.spec.ts tests/e2e/equipmentCatalogue.spec.ts --reporter=list`: 20 desktop/mobile tests passed in 5.0s. Working-tree correction to the old fixture-only smoke test; API interception and fake sessions, no real database. |

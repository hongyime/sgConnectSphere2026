---
date: 2026-10-06T01:13:02+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 031026
database: mocked
commit: 13a87aa
pr: 214
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 | Equipment catalogue desktop/mobile regression | PASS | `npx playwright test tests/e2e/equipmentCatalogue.spec.ts --reporter=list`: 8 passed (3.8s), intercepted APIs. Added assertions for the visible Reservation history heading, empty-state message and populated history. Working-tree UI follow-up to PR #214 on recorded base commit. Desktop/mobile screenshots visually inspected. `npm run typecheck` also passed (no database). |

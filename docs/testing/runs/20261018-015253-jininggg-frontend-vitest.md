---
date: 2026-10-18T01:52:53+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: e5a313a
pr: 306
---

HEAD plus pending merge of main 1b06812. Resolved the sole conflict by keeping
main's reviewed Organiser save-alert test; no frontend difference from main
remains in this migration PR. Migration 0020 is unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S12_01 TC_E03S12_02 TC_E03S12_03 TC_E03S12_04 TC_E03S12_05 | Organiser save-alert regression | PASS | `npm.cmd run test --workspace frontend -- src/features/organiser/ClientEvents.saveAlert.test.tsx`: 5 passed, one file. Mocked API; no browser/database/manual claim. |

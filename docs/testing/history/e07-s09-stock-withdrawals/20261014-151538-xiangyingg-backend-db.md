---
date: 2026-10-14T15:15:38+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: 979cc08
---

Follow-up E07-S09 / issue #264 working tree based on 979cc08, before the implementation commit. Completion timestamps come from the final log writes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Withdrawal-aware catalogue regression | FAIL | `node --import tsx --test --test-name-pattern "TC_E07S09_01|withdrawal starts during|overlapping withdrawals combine" backend/tests/equipmentCatalogue.integration.test.ts`. Deliberately restored original catalogue query from main to test regression sensitivity: three selected cases failed. Fixed code restored immediately afterward. |

---
date: 2026-10-14T15:24:17+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: ac284ec
---

Deliberate original-query reproduction for E07-S09 / #264. Working tree based on ac284ec temporarily uses origin/main's catalogue query; fixed code restored in finally. Three new selected cases fail as expected.

Command: `node --import tsx --test --test-name-pattern 'TC_E07S09_01|withdrawal starts during|overlapping withdrawals combine' backend/tests/equipmentCatalogue.integration.test.ts`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Original query regression sensitivity | FAIL | Three cases fail with the original query, demonstrating the missing withdrawal check. Fixed code is restored; its separate 21-test database run passed. |

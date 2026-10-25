---
date: 2026-10-21T16:58:24+08:00
runner: bryanseah234
scope: backend/unit
environment: local
run_type: automated
test_case_version: 171026
database: mocked
commit: 18ccdb6
pr: 315
---

`npm exec --workspace backend -- tsx --test tests/productionMigrationGuard.test.ts tests/migrationSelection.test.ts tests/equipmentNotifications.test.ts` after merging current `main` into the PR branch.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Migration selector/guard and equipment notification unit tests | PASS | 19/19 passed: 17 migration selector/guard assertions plus 2 notification tests. All database interactions were mocked; no production or local database was used. |

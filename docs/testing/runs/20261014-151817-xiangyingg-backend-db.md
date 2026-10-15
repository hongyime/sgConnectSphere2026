---
date: 2026-10-14T15:18:17+08:00
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
| MULTIPLE | Withdrawal-aware catalogue regression | PASS | `node --import tsx --test backend/tests/equipmentCatalogue.integration.test.ts backend/tests/equipmentAvailability.integration.test.ts backend/tests/equipmentReservations.integration.test.ts`. 21/21 PostgreSQL tests passed, including ten catalogue cases. Disposable loopback test database and fresh schemas only. |

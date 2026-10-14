---
date: 2026-10-14T16:06:37+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: ecc0d7d
---

Issue #264 / E07-S09 working tree combining ecc0d7d with main f68ee66 before the merge commit. Completion time is the final log write.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Latest-main stock/withdrawal follow-up verification | PASS | `node --import tsx --test backend/tests/equipmentCatalogue.integration.test.ts backend/tests/equipmentAvailability.integration.test.ts backend/tests/equipmentReservations.integration.test.ts`. 21/21 passed. No manual or deployment claim. |

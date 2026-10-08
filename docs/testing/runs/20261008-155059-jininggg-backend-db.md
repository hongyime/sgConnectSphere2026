---
date: 2026-10-08T15:50:59+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 081026
database: real
commit: e244681
---

E06-S02 / SCRUM-46 verification session on this HEAD plus working-tree changes.
No commit or push. Exploratory sandbox execution initially failed with EPERM;
the permitted rerun passed. No human manual E2E completion is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04 TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05 | PostgreSQL event requirements, suitability and range boundaries | PASS | node --env-file=.env --import tsx --test backend/tests/venueSearch.integration.test.ts: 1 integration test passed, covering persisted event criteria, capacity/layout/features, overlap, inactive venues and early/late/overnight hours. E06-S01 hours results unchanged; booking count unchanged. Unique rollback-only schema on configured PostgreSQL; no public application data written. |

TC_E06S02_04 real booking submission/staff decision remains pending E06-S03/S04.

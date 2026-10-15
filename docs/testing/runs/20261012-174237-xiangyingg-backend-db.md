---
date: 2026-10-12T17:42:37+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: 4413fbe
pr: 231
---

Resolved working tree combining 4413fbe with main 01ad35b, including the merged fixture-count assertion fix. Disposable local PostgreSQL and unique test schemas.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Buffer persistence, conflict notifications, maintenance and combined search/suitability boundaries | PASS | `node --import tsx --test backend/tests/venueBufferConflicts.integration.test.ts backend/tests/venueSearch.integration.test.ts`; exit 0. Four tests; full suite output inspected. Read-only assertion compares booking count before/after advisory checks instead of a stale hardcoded fixture total. |

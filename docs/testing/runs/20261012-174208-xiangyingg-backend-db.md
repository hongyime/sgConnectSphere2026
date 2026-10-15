---
date: 2026-10-12T17:42:08+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: 4413fbe
pr: 231
---

Conflict-resolved working tree combining 4413fbe with main 01ad35b, before the merge commit. Disposable loopback-only PostgreSQL; unique schemas, no shared database reset.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Buffer conflict and search/suitability PostgreSQL regression suites | FAIL | `node --import tsx --test backend/tests/venueBufferConflicts.integration.test.ts backend/tests/venueSearch.integration.test.ts`; exit 1. See task handoff for counts and any failure detail. |

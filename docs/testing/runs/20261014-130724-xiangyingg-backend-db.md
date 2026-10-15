---
date: 2026-10-14T13:07:24+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: d18acba
pr: 261
---

Resolved working tree combining d18acba with main 367b279, before merge commit. Local disposable PostgreSQL only for database tests.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Venue buffer and tentative hold integration verification | PASS | `node --import tsx --test backend/tests/venueBufferConflicts.integration.test.ts backend/tests/venueSearch.integration.test.ts backend/tests/venueCalendar.integration.test.ts backend/tests/venueCatalogue.integration.test.ts backend/tests/venueAccessibility.integration.test.ts backend/tests/venueHolds.integration.test.ts`; exit 0. Counts and failure details are in the task handoff. |

---
date: 2026-10-14T14:31:14+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: 091026
database: real
commit: e4c5e89
pr: 261
---

Run on the uncommitted PR #261 review-fix working tree based on e4c5e89; not a claim that base commit contains the fixes. Completion time is from final run log write.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Venue buffer review-fix regression | PASS | `node --import tsx --test backend/tests/venueBufferConflicts.integration.test.ts backend/tests/venueHolds.integration.test.ts backend/tests/venueCalendar.integration.test.ts backend/tests/venueSearch.integration.test.ts backend/tests/venueCatalogue.integration.test.ts backend/tests/venueAccessibility.integration.test.ts`. 20/20 focused tests passed. |

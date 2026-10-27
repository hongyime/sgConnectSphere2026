---
date: 2026-10-26T21:52:33+08:00
runner: jininggg
scope: backend/db
environment: local
run_type: regression
test_case_version: 261026
database: real
commit: b0f0dc6
pr: 355
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_05 | PostgreSQL request list isolates assigned events and preserves every booking status | PASS | Previously failing reader fixture now applies all migrations after inserting legacy rows; requested_by backfill, status isolation and retired-venue assertions remain intact. Focused run1/1passed. |
| TC_E06S03_01 | Complete CI booking acceptance selection | PASS | Exact `npm.cmd run test:venue-booking-requests:db --workspace backend` command:71tests passed,0failed,0skipped across all8files including recovery, claim policy, publication and schema checks. |

## Remarks

Used working changes on recorded HEAD, a fresh native disposable loopback PostgreSQL instance and isolated test schemas/rollback. Environment loaded from a local-only test file; no shared Supabase, production or provider sends. Inventory regenerated with no content drift. Fix changes only test schema preparation, not production behavior. This automated run is not human manual acceptance.

---
date: 2026-10-11T00:37:17+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 091026
database: mocked
commit: b577fe1
pr: 242
---

PR #242: Bryan's assigned-Coordinator assessment review fix, tested on HEAD plus
uncommitted changes. No real-database or human manual execution is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend venue regressions | PASS | `node --import tsx --test backend/tests/venueSearch.test.ts backend/tests/venueSuitability.test.ts`: 28 passed, including other-Coordinator and unassigned refusals by ID/code. Initial sandbox invocation blocked by EPERM; authorised rerun passed. |
| MULTIPLE | Frontend regressions | PASS | `npm.cmd test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueSuitability.test.tsx src/features/venue/VenueSearch.navigation.test.tsx`: 8 passed. |
| MULTIPLE | Browser regressions | PASS | `npx.cmd playwright test tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1`: 14 passed, mocked API, desktop/mobile. |
| MULTIPLE | Typecheck and build | PASS | `npm.cmd run typecheck` and `npm.cmd run build` passed; existing bundle-size warning. |
| MULTIPLE | Real PostgreSQL regression | SKIP | Added ID/code assignment isolation and unassigned-event assertions to venueSearch.integration.test.ts; Docker engine unavailable, not run. |

Coverage inventory regenerated with `scripts/tc_coverage_audit.py`; no content
change. No new coverage-percentage measurement or full E01-S12 delivery claim.

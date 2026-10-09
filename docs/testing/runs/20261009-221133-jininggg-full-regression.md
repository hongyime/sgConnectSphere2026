---
date: 2026-10-09T22:11:33+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 091026
database: mocked
commit: f8faa57
pr: 242
---

PR #242 conflict resolution against origin/main 4563a52, with the uncommitted
merge working tree. Documentation-only merge; application code unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Venue backend regression | PASS | `node --import tsx --test backend/tests/venueSearch.test.ts backend/tests/venueSuitability.test.ts`: 26 passed. |
| MULTIPLE | Venue frontend regression | PASS | `npm.cmd test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueSuitability.test.tsx src/features/venue/VenueSearch.navigation.test.tsx`: 8 passed. |
| MULTIPLE | Venue browser regression | PASS | `npx.cmd playwright test tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1`: 14 passed, desktop/mobile, mocked API. |
| MULTIPLE | Typecheck | PASS | `npm.cmd run typecheck`: frontend and backend passed. |
| MULTIPLE | Build | PASS | `npm.cmd run build`: passed; existing bundle-size warning. |
| MULTIPLE | Repository checks | PASS | `python scripts/check.py`: hygiene passed and 87 tooling tests passed. |
| MULTIPLE | Real database and human manual rerun | SKIP | Not rerun for documentation-only merge. Existing evidence remains historical; no new real-database or manual claim. |

Initial sandbox attempts for backend/frontend tests and build were blocked by
process-creation EPERM; the authorised reruns outside the sandbox passed above.
Regenerated backlog, BDR and test-case exports from combined T-77/T-78 Markdown;
315 test cases, refreshed compatibility workbook and coverage inventory.

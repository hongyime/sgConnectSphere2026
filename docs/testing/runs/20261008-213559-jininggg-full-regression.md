---
date: 2026-10-08T21:35:59+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 081026
database: mocked
commit: 1086940
---

Focused pre-PR regression on HEAD 1086940 plus the uncommitted E06-S02 work,
after incorporating the latest main changes. The branch was renamed from
feature/SCRUM-46-venue-suitability to feature/e06-s02-advisory-suitability so
the partial PR does not automatically close SCRUM-46. Scope names follow T-65;
this was not the entire application suite. Tests below use pure fixtures or
mocked APIs, not a real database. Real browser/database manual evidence is in
20261008-212539-jininggg-frontend-e2e.md; earlier SQL evidence remains separate.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend search and suitability regression | PASS | `node --import tsx --test backend/tests/venueSearch.test.ts backend/tests/venueSuitability.test.ts`: 26 passed. |
| MULTIPLE | Frontend assessment and search navigation | PASS | `npm.cmd test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueSuitability.test.tsx src/features/venue/VenueSearch.navigation.test.tsx`: 8 passed. |
| MULTIPLE | Desktop/mobile search and assessment | PASS | `npx.cmd playwright test tests/e2e/venue-search.spec.ts tests/e2e/venue-suitability.spec.ts --workers=1`: 14 passed, API-intercepted browser tests. |
| MULTIPLE | Typecheck and build | PASS | `npm.cmd run typecheck` and `npm.cmd run build` passed. Existing Vite bundle-size warning remains. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/check.py`: 87 tooling tests passed and hygiene passed. |

Initial sandbox invocations could not spawn test/build subprocesses or write
the pre-commit cache. Authorized unrestricted reruns above passed. No database
reset or real-database automated rerun was performed in this session. Booking
acceptance and Venue Staff presentation remain dependent on E06-S03/S04.

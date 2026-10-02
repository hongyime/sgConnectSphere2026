---
date: 2026-10-02T21:40:56+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 021026
commit: 7aab544
pr: 184
---

Tests ran on the recorded HEAD plus the uncommitted PR #184 status-pill review fix.
Only the focused frontend checks and build/tooling checks below were run;
backend/database suites were not rerun for this presentation-only change.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 | Combined filters and near-match failures | PASS | Desktop/mobile; near-match label retained, no per-card alert, one summary warning. |
| TC_E06S01_04 | Unavailable result is not presented as suitable | PASS | Desktop/mobile; no per-card alert. |
| MULTIPLE | Venue browser regression suite | PASS | `npx playwright test tests/e2e/venue-search.spec.ts --workers=1`: 8 passed, including access denial, suitable results, validation, empty states and 320px overflow. Mocked API, not a live database test. |
| MULTIPLE | Venue navigation component tests | PASS | `npm test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueSearch.navigation.test.tsx`: 4 passed. |
| MULTIPLE | Application build and TypeScript checks | PASS | `npm run build`: frontend and backend passed; existing Vite chunk-size warning remains. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/check.py`: hygiene passed, 76 tooling tests passed. |

Desktop and mobile screenshots from the browser suite were visually inspected.
The result status uses the shared Card heading and StatusPill. Search filters,
request parameters, matching, capacity details and browser-local times are unchanged.

---
date: 2026-10-15T00:48:25+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: 5c22e26
---

Agent-executed E06-S03 working-tree checks on behalf of the authenticated
GitHub user. HEAD identifies the merged baseline, not the uncommitted submission
implementation. Branch: `feature/e06-s03-booking-submission`. No manual run,
production deployment, real staff-assignment routing or provider receipt is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit regression | PASS | `npm test --workspace backend`: 387/387. Later submission/hold checks after final retry/authentication changes: 33/33. |
| MULTIPLE | Frontend unit regression | PASS | `npm test --workspace frontend -- --no-file-parallelism`: 388/388. Later focused component/coverage run after adding status/presentation cases: 15/15. |
| MULTIPLE | Changed-module unit coverage | PASS | c8: bookingSubmission.ts and bookingSubmissionHandler.ts 100% lines/statements/functions/branches. V8: VenueBookingForm, VenueBookingRequests and VenueSuitability 100% in all four metrics. This is not whole-repository 100% coverage. |
| MULTIPLE | Affected PostgreSQL regressions | PASS | 24/24 on disposable native loopback PostgreSQL 18.4, including submission, holds, buffer guard and search/suitability. Final submission-only run: 6/6, including legacy retry assertions. |
| MULTIPLE | Full backend database regression | FAIL | 102/103. Unchanged eventVisibility.integration.test.ts fixture omits venue_requirements; getEvent raises 42703. Disposable public schema was migrated for the registration fixture. No shared Supabase connection. |
| MULTIPLE | Desktop/mobile browser regressions | PASS | 24/24 across venue submission/list/search/assessment. APIs intercepted; synthetic data. Screenshots visually inspected for shared-component consistency and responsive controls. |
| MULTIPLE | Typecheck and build | PASS | `npm run typecheck`; `npm run build`. Existing Vite chunk-size warning retained. |
| MULTIPLE | Compiled API runtime checks | PASS | `npm run test:runtime`: final 17/17, including request dispatch, origin refusal and anonymous 401 before database access. No provider credentials. |
| MULTIPLE | Repository hygiene | PASS | `python scripts/check.py`: pre-commit hygiene gates passed for tracked files; new-file validation is repeated before completion. |
| MULTIPLE | Repository tooling tests | FAIL | Same check: 128 tests, 3 failures and 11 errors in existing Windows worktree-hygiene path fixtures. No unrelated tooling edits or worktree removal. |
| TC_E06S03_01 | Responsible Venue Staff production routing | SKIP | SCRUM-189 / #271/#272 remain open. Resolver injection is tested; production wiring is not implemented here. |
| TC_E06S02_04 | Staff decision presentation of advisory failures | SKIP | Submission/persistence half passes on PostgreSQL; E06-S04 decision screen remains pending. |
| MULTIPLE | Human manual E2E | SKIP | Script prepared at docs/testing/manual/E06-S03-click-through.md; no human run has been observed. |

## Commands and evidence boundaries

Database suites loaded only a temporary local `TEST_DATABASE_URL`. They used
`loginDatabase()` disposable schemas; no Docker Desktop, shared reset or seed.
Full DB ran every file from backend/package.json's `test:db` command via Node
`--import tsx --test`; its unit-coverage wrapper was not used for that run.

Frontend coverage used `npm run test:coverage --workspace frontend` with the
three changed component test files and a matching include glob. Backend coverage
used c8 with explicit include paths for the new service and handler. SQL triggers
and migration invariants are evidenced by real PostgreSQL tests, not a claim of
100% unit-only database coverage. Shared router behaviour is additionally checked
by compiled runtime tests; other pre-existing router branches are outside scope.

Exploratory failures were corrected before focused verification: calendar fixture
needed YYYY-MM-DD arguments; conversion conflict now uses the shared service's
AccessError rejection internally while the HTTP status remains 409. Earlier
failed runs are not represented as passing. No claim that E06-S03 is Done.

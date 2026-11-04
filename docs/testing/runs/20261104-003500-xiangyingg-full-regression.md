---
date: 2026-11-04T00:35:00+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: "021126"
database: real
commit: 41c1656
---

Tested latest main 41c1656 (#415) plus the uncommitted SCRUM-180 working diff.
Database slices used an isolated native loopback PostgreSQL database; unit and
component slices used their existing mocks. This is automated evidence, not a
human acceptance run. Earlier failed setup attempts remain in the separate records.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit regression | PASS | npm test --workspace backend: 723 passed, 1 existing optional database-contract skip, 0 failed. New Session validator statement/branch coverage was verified in c8; repository lock behavior is covered by real PostgreSQL rather than SQL mocks. |
| MULTIPLE | Frontend component regression | PASS | npm test --workspace frontend -- --run: 812 passed, 0 failed. |
| TC_E02S07_01 / TC_E02S07_02 / TC_E02S07_03 / TC_E02S07_04 / TC_E02S07_05 | API, Session and lifecycle persistence | PASS | From backend: TEST_DATABASE_URL=<isolated native loopback PostgreSQL> node --import tsx --test --test-concurrency=1 tests/eventDateHorizon.integration.test.ts tests/eventSessionsRoutes.integration.test.ts tests/eventLifecycle.integration.test.ts: 22 passed. Includes multiple Sessions, unchanged draft on refusal, correction/resubmission, inclusive boundary and next-day acceptance, and queued writers blocked after submission. |
| TC_E02S07_01 / TC_E02S07_05 | Real browser correction and resubmission | PASS | TEST_DATABASE_URL=<isolated native loopback PostgreSQL> npx playwright test --config playwright.auth.config.ts tests/auth-e2e/eventDateHorizon.spec.ts: 4 passed across desktop/mobile, without API interception. |
| MULTIPLE | Types, production build and runtime | PASS | npm run typecheck; npm run build; npm run test:runtime: both workspace types and builds passed, runtime 26 passed. |
| MULTIPLE | Human acceptance | SKIP | No human tester run or hand-taken screenshots supplied. Follow docs/testing/manual/E02-S07-click-through.md and create a separate immutable manual record before claiming story acceptance. |

---
date: 2026-10-15T15:37:58+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: 34c1174
---

Agent-run verification of the E06-S05 owner's PR #274 review findings.
HEAD is the baseline plus uncommitted denial-audit, named activity and helper
refactor changes. No human manual run, production staff-routing verification,
provider receipt or whole-story completion is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend unit regression | PASS | npm test --workspace backend: 395/395. |
| TC_E06S05_04 | Conversion denial audit survives rollback | PASS | Real PostgreSQL: unassigned Coordinator receives 403, one Access Denied screen audit persists with no event_id, and the original hold stays Tentative. Direct unassigned requests still return 404; missing conversions remain 404. |
| MULTIPLE | Affected database regression | PASS | Node --import tsx --test over bookingSubmission.integration.test.ts, venueHolds.integration.test.ts, venueBufferConflicts.integration.test.ts and venueSearch.integration.test.ts: final 26/26 against disposable native loopback PostgreSQL. Conversion retains one venue-named audit on retry and uses the shared expired message. |
| MULTIPLE | Submission/shared-helper coverage | PASS | npx c8 with bookingSubmission.ts and bookingShared.ts includes, running bookingSubmission.test.ts and venueHolds.test.ts: 35/35; both modules 100% statements/branches/functions/lines. Not whole-repository coverage. |
| MULTIPLE | Activity-log presentation | PASS | npm run test:coverage --workspace frontend with ActivityLog.test.tsx and ActivityLog.tsx include: 9/9 and 100% all four metrics. Expiry dates retained; other booking entries show Venue booking without internal IDs; requested venue remains in the action. |
| MULTIPLE | Typecheck and build | PASS | npm run typecheck and npm run build passed. Existing Vite chunk-size warning retained. |
| MULTIPLE | Compiled API runtime | PASS | npm run test:runtime: 17/17. |
| MULTIPLE | TC inventory regeneration | PASS | scripts/tc_coverage_audit.py regenerated docs/testing/tc-coverage.md after the activity test title changed. |
| MULTIPLE | Repository check | FAIL | python scripts/check.py: hygiene and env checks passed; existing Windows worktree fixtures produced 3 failures and 11 errors among 128 tooling tests. No hooks bypassed. |
| MULTIPLE | Human manual verification | SKIP | Previous screenshots predate this review. No new human execution observed. |

An exploratory database run was 25/26 because the old hold integration assertion
still required the former generic audit action. It was updated to require the
exact venue-named action, then all four suites passed 26/26. The tests use only
the explicit temporary local TEST_DATABASE_URL and per-test disposable schemas;
no shared Supabase reset, seed or migration, and no Docker Desktop. Native server
was restarted for testing and sent shutdown afterward.

The E06-S05 owner's review confirms the ownership split and Approved-to-Planning
conversion semantics; that coordination is resolved. Production default Venue
Staff lookup remains dependent on #272. Broader database-suite results from prior
records are not superseded by these affected-suite successes.

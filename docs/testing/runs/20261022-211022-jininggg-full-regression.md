---
date: 2026-10-22T21:10:22+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 5470919
---

SCRUM-202/203 E10-S01 structured-field continuation on the local UI branch.
Runtime: 5470919 plus uncommitted backend/frontend changes, not that SHA alone.
No push, production mutation, real email delivery or formal human acceptance.
Earlier user-confirmed three exploratory checks are not reclassified as a
screenshotted acceptance run and were not repeated here.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 | Structured request validation | PASS | Final backend focused20/20:15 real PostgreSQL cases and5 units/handler cases, zero skips. UUID/reference validation; canonical feature sets; strict boolean false; explicit null clears; ordered nullable registration windows; current values untouched. |
| TC_E10S01_02 | Snapshot and labelled comparison | PASS | Private read returns catalogue labels; frontend select/window controls and comparison17/17 focused pass with intercepted API. Real DB asserts current values, references and changed-field snapshots. |
| TC_E10S01_04 | Staleness, reference deletion and delayed apply | PASS | Window and accessibility changes invalidate pending snapshots. Missing/deleted layout/feature refused at submission/approval; decline still possible. Arrangement changes remain Approved/unapplied; explicit apply refuses. No full Scenario4 arrangement-application claim. |
| TC_E10S01_05 | Existing decline regression | PASS | Covered in focused frontend/backend regressions without Event mutation. |
| N/A | Full frontend regression | PASS | Standalone npm.cmd run test --workspace frontend:457/457 across49 files, unchanged code/configuration from preceding failing parallel run. Initial parallel full run451pass/6fail across5 files (async/timing failures, including registration/clarification/template/calendar tests) retained as failure, not hidden or weakened. |
| N/A | Full backend unit regression | PASS | npm.cmd run test --workspace backend:423/423, zero skips. |
| N/A | Types/build/env inventory | PASS | npm.cmd run typecheck and npm.cmd run build: both workspaces pass; existing Vite chunk advisory. Environment template matches generator; no project dependency/environment-variable changes. Coverage inventory regenerated205/376. |
| N/A | Original database instance failure | FAIL | A repeat coverage run failed15 database cases during schema preparation with58P01 missing global/2964;5 units passed. An attempted fresh cluster on the old native bundle failed initdb because postgres.bki was absent. Existing cluster/manual data not reset or deleted. |
| N/A | Fresh isolated database verification | PASS | Restored the same embedded-postgres18.4.0-beta.17 helper into a new temporary prefix, started a new native loopback server on63250 and disposable connectsphere_notification_test_e10audit. Final focused20/20 passes there. No Docker/shared Supabase or production fallback. |

Final focused commands:

```text
node --env-file=<fresh-temporary-loopback-test-env> node_modules/c8/bin/c8.js --include=backend/src/modules/changeManagement/requests.ts --reporter=text node --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts
npm.cmd run test:coverage --workspace frontend -- src/features/events/ChangeRequests.test.tsx --coverage.include=src/features/events/ChangeRequests.tsx --coverage.include=src/features/events/changeRequestsApi.ts --coverage.reporter=text
```

## Coverage exceptions and limits

Backend request service combined unit/DB:99.65% statements/lines,100% functions,
99.49% branches. Unexpected account-lock database-error rethrow remains uncovered.
Unit-only SQL coverage is not claimed: native constraints, locking and rollback
are evidenced against real PostgreSQL.

New frontend modules:97.71% statements,91.98% branches,100% functions,99.24% lines.
The new uncovered line is an invalid-date guard behind the native datetime input;
other gaps are defensive fallbacks and disabled-control guards, disclosed for
human review. No100% whole-module statement/branch or whole-story Done claim.

Session request/apply shape remains to coordinate with E04/E10-S02. Registration
capacity is derived from confirmed Session layouts, not invented as a writable
Event scalar. E10-S02 still owns actual arrangement application, affected-resource
preview/flags, late-registration-close confirmation and staff notices. Other
owners' prefilling/terminal work and SCRUM-204 evidence remain separate gates.

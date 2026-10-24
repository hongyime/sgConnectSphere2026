---
date: 2026-10-23T13:49:42+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 171026
database: real
commit: 8f2d866
pr: 341
---

Merge verification at8f2d866 plus staged main38ffa99 integration/resolution.
Not an unchanged checkout of that SHA alone. No production/manual/email claim.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Backend units | PASS | npm.cmd test --workspace backend:427/427,0 skips. Both cancellation and change-request suites retained in command union. |
| N/A | Frontend regression | PASS | npm.cmd test --workspace frontend -- --maxWorkers=2 --reporter=json --outputFile=../artifacts/pr341-merge-frontend.json:480/480. Two workers limit local resource contention; no source/config/assertion changes to obtain this result. Intercepted API component tests, not real persistence. |
| TC_E10S01_01 | Change request database regression | PASS | node --env-file=<temporary-fresh-loopback-env> --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts:20/20,15 real PostgreSQL and5 unit/HTTP tests,0 skips. |
| N/A | Prior local database unavailable | FAIL | Initial same focused command:5 units passed,15 DB cases failed ECONNREFUSED on stopped old loopback server. Fresh disposable native cluster started with existing helper; no old data reset/deleted and no shared Supabase/Docker fallback. Final rerun passed20/20. |
| TC_E03S07_04 | Restricted edit real-form navigation | PASS | npx.cmd playwright test tests/e2e/e03.spec.ts --grep TC_E03S07_04:2/2 desktop/mobile, synthetic intercepted API. Unmocked session proxy warnings do not establish live authentication; test helper owns synthetic auth. No automatic prefilling claim. |
| N/A | Types/build/runtime | PASS | npm.cmd run typecheck and npm.cmd run build:both workspaces pass, existing Vite chunk advisory. npm.cmd run test:runtime:17/17 compiled API tests, no provider credentials. |
| N/A | Inventory | PASS | python scripts/tc_coverage_audit.py regenerated211/376 from merged tests. git diff --cached --check passes. |
| N/A | Repository tooling | FAIL | python scripts/check.py hygiene/env pass;163 tests retain3 failures/11 errors in Windows worktree fixtures. Full repository green is not claimed; Linux CI pending. |

Resolved API GET/POST dispatch by retaining both handlers. Routes retain both
live change-request and cancellation pages; remove both superseded mock exports.
Backend commands union both sides, artifact entries retained, inventory generated.
CI keeps existing30-minute cap rather than main25 after observed12m40 install.
Story remains partial: E10-S02/Session contract, SCRUM205/206 and formal integrated
human evidence remain open. Existing immutable records/screenshots unchanged.

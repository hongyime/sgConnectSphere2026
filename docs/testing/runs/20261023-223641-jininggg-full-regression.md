---
date: 2026-10-23T22:36:41+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 171026
database: real
commit: a5f5694
pr: 341
---

Le Xin review5628492414 follow-up ata5f5694 plus uncommitted read/permission/copy fixes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_02 | Paused list read permits concurrent Event writer | PASS | Real PostgreSQL regression pauses after request query while transaction is open; second connection acquires FOR UPDATE NOWAIT and commits title edit. Old exclusive read would fail55P03. Mutation Event locks remain unchanged. |
| TC_E10S01_01 | No assigned Coordinator permission | PASS | Read preserves history/current access but returns canSubmit=false; submit still409. |
| TC_E10S01_04 | Approval confirmation safe/arrangement/mixed | PASS |20/20 focused component tests; all three confirmation classifications asserted. Initial two runs17pass/3fail were new fixture bugs: damaged ellipsis lookup, then Organiser default route instead of Coordinator route. Corrected fixture, no product weakening. |
| N/A | Focused backend with coverage | PASS | node --env-file=<temporary-loopback-env> node_modules/c8/bin/c8.js --include=backend/src/modules/changeManagement/requests.ts --reporter=text node --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts:22/22 (17 real DB,5 units/HTTP),0 skips. Initial non-coverage22/22 also passed. |
| N/A | Focused frontend with coverage | PASS | npm.cmd run test:coverage --workspace frontend -- src/features/events/ChangeRequests.test.tsx --coverage.include=src/features/events/ChangeRequests.tsx --coverage.include=src/features/events/changeRequestsApi.ts --coverage.reporter=text:20/20,intercepted API. |
| N/A | Types/inventory | PASS | npm.cmd run typecheck:both workspaces pass. python scripts/tc_coverage_audit.py regenerated211/376 unchanged. git diff --check passes. |
| N/A | Repository tooling | FAIL | python scripts/check.py hygiene/env pass;163 tests retain3 failures/11 errors in Windows worktree fixtures. No full-green claim. |

Backend coverage99.65% statements/lines,99.5%branches,100%functions; existing
unexpected account-lock database-error rethrow line150 uncovered. Frontend97.72%
statements,92.05%branches,100%functions,99.25%lines; existing native datetime
invalid-date fallback line102 and defensive guards remain. No100% module claim.

E10-S02 owner proposal recorded in contract, not implemented from unpublished
code. Structured-field support, Session shape and published shared signature
remain integration gates. No new production/email/formal human acceptance claim.

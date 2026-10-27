---
date: 2026-10-22T19:44:03+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 5470919
---

SCRUM-203 frontend increment stacked on local SCRUM-202 commit 5470919 plus
uncommitted UI/read-contract changes. That SHA alone does not contain the UI.
The frontend uses intercepted APIs; database tests use native disposable
loopback PostgreSQL with fresh random schemas and current migrations. No human
browser run or actual email receipt is claimed. No production changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 | Selected fields, validation, date conversion, submit and draft retention | PASS | Final focused frontend 15/15 tests: selected-only body, deselection, positive whole-number attendance, Singapore local input to UTC, failed-save draft retention, private/query entry, disabled/duplicate submission and late response after navigation. Intercepted API, not real server/browser acceptance. |
| TC_E10S01_02 | Comparison and private reads | PASS | Current and requested values are displayed separately; empty/history/terminal views and load failure/retry are covered. Access refusal shows no form or private comparison. Final real PostgreSQL suite 11/11, zero skips, also asserts Event metadata and Organiser/Coordinator permission flags. |
| TC_E10S01_04 | Coordinator confirmation and actual returned state | PASS | Approve/cancel focus, inline stale refusal, Applied vs Approved-waiting result, hidden controls based on server permissions, optional note, duplicate decisions and late decision after route change. Arrangement application remains a dependency, not a completed Scenario 4. |
| TC_E10S01_05 | Decline state and note | PASS | Decline result and unchanged-detail acknowledgement; optional note trimmed in POST. Transactional decline/persistence checked in separate real-database service suite. |
| N/A | Frontend full regression | PASS | npm.cmd run test --workspace frontend: 453 passed across49 files on final product code. Two further tests were then added without product changes; final focused15 pass includes them. Not relabelled as a full455 run. Earlier452 full pass retained as development history. |
| N/A | Types and production build | PASS | npm.cmd run typecheck; npm.cmd run build: frontend/backend pass. Existing Vite chunk-size advisory remains. |
| N/A | Repository hygiene and env-template | PASS | python scripts/check.py passed hygiene/env checks; reported intentional secondary worktrees, left untouched. New/untracked files receive explicit pre-commit inspection before publication. |
| N/A | Repository tooling | FAIL | Same observed Windows worktree fixture category:158 tests,3 failures and11 errors. No new baseline run and no all-green repository claim. |

Commands for final focused verification:

```text
npm.cmd run test:coverage --workspace frontend -- src/features/events/ChangeRequests.test.tsx --coverage.include=src/features/events/ChangeRequests.tsx --coverage.include=src/features/events/changeRequestsApi.ts --coverage.reporter=text
node --env-file=<temporary-loopback-test-env> --import tsx --test backend/tests/changeRequests.integration.test.ts
```

Initial frontend run was10/11: a test incorrectly expected the shared403
Access refused screen to offer retry. Corrected the test to cover503 retry,
added a separate403 privacy assertion, and retained shared refusal behaviour.
Subsequent12,13 and final15 focused tests passed. No production behaviour or
assertion was weakened to hide the initial failure.

## Coverage and remaining gates

Final new frontend modules:100% lines/functions,98.13% statements,95.77% branches.
Remaining paths include the invalid-date fallback behind native datetime input
sanitisation, empty-value defensive fallbacks and confirmation callbacks guarded
by disabled controls. These are disclosed exceptions, not a100% statement/branch
claim. Changed existing workspace navigation is exercised by the full suite;
no100% whole-workspace coverage claim. Human code/test review is still required.

The E10-S02 apply/preview contract, structured Session/layout/registration fields,
SCRUM-205 prefilling, terminal-workflow integration and SCRUM-204 human evidence
remain separate. docs/testing/manual/E10-S01-change-requests.md is a planned
five-check guide only. Existing immutable records/screenshots were not edited.

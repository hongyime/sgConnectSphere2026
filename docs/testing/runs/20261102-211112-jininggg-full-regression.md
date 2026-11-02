---
date: 2026-11-02T21:11:12+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: "021126"
database: real
commit: b03b8bf
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04 | Session target submission, comparison, preview and application | PASS | Final request integration suite: 34 tests passed on disposable native loopback PostgreSQL. Includes multi-Session target scoping, changed-field snapshots, invalid dates/references, removed targets, stale revision rollback, older Approved application and requirement-only changes. Sole Sessions use Event-wide details; reducing the target to a sole Session refuses apply. |
| TC_E10S01_04 | Venue and crew reconfirmation after Session application | PASS | Actual request apply flags the selected booking and staffed support; the Event stays Planning after venue reconfirmation and re-enters Safety Review only after the crew reconfirms. Other Session and Event/publication details are retained. Failed final application notice rolls back values, request status, flags, lifecycle and audits. |
| TC_E10S01_01 / TC_E10S01_04 | New Session transaction module coverage | PASS | c8 over the 34-test real-database suite: sessionChanges.ts 100% statements, branches, functions and lines. This is combined service/database coverage, not unit-only SQL coverage. Independent reviewer must assess that justification; no blanket whole-file coverage claim for existing request/storage/UI modules. |
| MULTIPLE | Existing backend unit suite | PASS | `npm.cmd test --workspace backend`: 692 passed, one existing skip, zero failures before the final sole-Session guard. Shared Session storage and notification changes included. |
| MULTIPLE | Combined request/Session/support regression slice | PASS | 64 passed before the final sole-Session guard: request units/database, Session service/routes and support reconfirmation integration. Final guard verified separately by the 34-test suite above. |
| TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_03 / TC_E10S01_04 / TC_E10S01_05 / TC_E10S01_06 / TC_E10S01_07 | Real browser/API/PostgreSQL workflows | PASS | 22 desktop/mobile Playwright checks passed without response interception before the final sole-Session guard. Two Session-targeted desktop/mobile checks rerun after that guard also passed. Original Event, prefill, decline, terminal and structured apply flows retained. No human manual evidence claimed. |
| MULTIPLE | Unrestricted full frontend suite | FAIL | 779 passed, 18 failed across 74 files, with timeouts/async assertions during simultaneous build/browser load. This run is not presented as green. |
| MULTIPLE | Two-worker full frontend suite | FAIL | 792 passed, two RegisterForm failures and an organiser-navigation worker-startup timeout. 72 files passed; no clean single full-suite pass claimed. |
| TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04 / MULTIPLE | Final focused UI and full-run failure-file checks | PASS | One worker: ChangeRequests, ArrangementReview, SessionEditor, RegisterForm and Organiser.navigation; 59 tests passed after final code/fixture changes. This does not rewrite the earlier full-suite failures into PASS. |
| MULTIPLE | Build/type/documentation verification | PASS | Both workspace typechecks passed after final edits. Application build passed before the sole-Session guard, with existing Vite import/chunk warnings. Doc guard zero errors/156 warnings; inventory regenerated, new workbook Session variant and byte-identical alias checked; whitespace check passed. |

All runs used main HEAD b03b8bf plus this task's evolving working diff, not a clean final commit. No Supabase/production database writes, email-provider sends or account setup. Disposable random per-test schemas only. No manual screenshots or story completion claimed.

Commands:

- `node --import tsx --test backend/tests/changeRequests.integration.test.ts backend/tests/changeRequests.test.ts backend/tests/eventSessions.test.ts backend/tests/eventSessionsRoutes.integration.test.ts backend/tests/supportReconfirmation.integration.test.ts`
- `node node_modules/c8/bin/c8.js --reporter=text --reporter=json --include=backend/src/modules/changeManagement/sessionChanges.ts node --import tsx --test backend/tests/changeRequests.integration.test.ts`
- `npm.cmd test --workspace backend`
- `npm.cmd run test:e2e:auth -- tests/auth-e2e/changeRequests.spec.ts`; final guard check adds `--grep Session-targeted`.
- `npm.cmd run test --workspace frontend`; bounded rerun uses `vitest run --maxWorkers=2`; final focus uses `--maxWorkers=1` and the five files named above.
- `npm.cmd run typecheck --workspace backend`; `npm.cmd run typecheck --workspace frontend`; `npm.cmd run build`.
- `python scripts/tc_coverage_audit.py`; repository test-case exporter `--date 021126`; `python scripts/doc_guard.py`.

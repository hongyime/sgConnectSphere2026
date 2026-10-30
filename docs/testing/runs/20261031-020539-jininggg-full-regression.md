---
date: 2026-10-31T02:05:39+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 301026
database: real
commit: 85570c5
---

E10-S01 / SCRUM-70 layout/accessibility continuation on 85570c5 plus the
working branch diff. This is automated evidence, not a clean-base run, human
manual acceptance or external email receipt. Earlier session records are unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 TC_E10S01_02 TC_E10S01_03 TC_E10S01_04 TC_E10S01_05 TC_E10S01_06 TC_E10S01_07 | Real-stack request workflow | PASS | 20 desktop/mobile tests passed. The former deferred-layout guard now submits a mixed name/layout/accessibility request, previews venue layout/accessibility/capacity reasons with no saved changes, then verifies Applied, published name, persisted requirements, sole-Session layout sync, venue flag and no equipment flag. Remaining request flows retained. No response interception. |
| TC_E10S01_04 | Shared request/impact/preview/revision database and unit slice | PASS | 88 passed, zero failed/skipped. Includes null/empty clears, strict UUID/reference validation, ordinary direct-edit isolation, preview rollback, outbox-failure atomic rollback, venue staff notice, layout-capacity warning for 21 registrations/20 places with no removals, and preservation of individually authored multi-Session layouts. Synthetic SQL creates Session/booking/registration preconditions; it does not prove a Session editing UI. |
| TC_E10S01_04 TC_E10S02_03 | Focused frontend regression | PASS | 42 passed: ChangeRequests, ArrangementReview and CoordinatorEditing. New test verifies named layout/accessibility reasons are not rendered as headcount mismatch text. |
| MULTIPLE | Backend unit regression | PASS | 635 passed; one existing database-only skip; zero failed. |
| MULTIPLE | Types and production builds | PASS | Both workspace typechecks and builds completed. Existing Vite chunk/import warnings remain. PowerShell reports warning stderr separately even though both workspace builds complete. |
| MULTIPLE | Repository and documentation checks | PASS | check.py reports PASS with 186 tooling tests; doc_guard.py zero errors/154 existing front-matter warnings. Inventory regenerated: 291 active/379 cases. Staged whitespace check passed. |

Commands: `npm.cmd run typecheck`; `npm.cmd run build`;
`npm.cmd test --workspace backend`; frontend Vitest run naming
`src/features/events/ChangeRequests.test.tsx`, `ArrangementReview.test.tsx` and
`src/features/coordinator/CoordinatorEditing.test.tsx`, with `--maxWorkers=2`.
Database command: Node with disposable loopback test environment, `--import tsx
--test`, naming changeRequests.test.ts, changeRequests.integration.test.ts,
arrangementImpact.test.ts, arrangementImpact.integration.test.ts,
eventChangePreview.test.ts and eventChangeRevisionRoute.integration.test.ts.
Browser command: Playwright CLI `test --config=playwright.auth.config.ts
tests/auth-e2e/changeRequests.spec.ts`. Tooling: `python scripts/check.py`,
`python scripts/doc_guard.py`, virtual-environment Python running
`scripts/tc_coverage_audit.py`, and `git diff --cached --check`.

Development corrections: TypeScript exposed a query-result rowCount mismatch,
fixed to use rows.length before the passing tests. A Windows text-encoding
mistake in the new browser button selector caused a timeout; UTF-8 and LF were
restored before the final 20-pass run. Interrupted/development attempts are not
reported as passing sessions. No Supabase resets/writes occurred.

Coverage justification for review: SQL orchestration, reference locks, relation
replacement and rollback are exercised using real PostgreSQL rather than mocked
unit assertions. This run does not establish 100% changed-code unit coverage;
that gap/justification still requires the independent human review specified by
the DoD. No coverage exception is self-approved. Individual Session mutation
integration, the combined hand-executed TC_E10S01_01-07 run and PO/delegate
acceptance remain outstanding. T-16 is the basis for venue reconfirmation on
changed Event layout/accessibility; shared-path changes still need peer review.

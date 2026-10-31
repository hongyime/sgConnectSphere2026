---
date: 2026-10-31T01:08:47+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 301026
database: real
commit: 85570c5
---

E10-S01 / SCRUM-70 continuation after merged #380, on main 85570c5 plus
this branch's working implementation/test diff. This is automated evidence,
not clean-base execution or a human manual run. Earlier records are unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 TC_E10S01_02 TC_E10S01_03 TC_E10S01_04 TC_E10S01_05 TC_E10S01_06 TC_E10S01_07 | Real-stack change-request browser regression | PASS | 20 desktop/mobile checks; real sign-in/API/native loopback PostgreSQL, no response interception. Includes comparison, both prefill entry paths, safe approve/decline, arrangement preview/cancel/stale impact, date/attendance flags and notice ownership, older Approved application, explicit late-close consent, registration enablement with a null opening boundary, terminal Obsolete flows, and wholly unapplied mixed layout requests. Fixture SQL is a precondition, not proof of Session editing. |
| TC_E10S01_04 | Shared revision and registration application database regression | PASS | 70 tests passed in the combined request/preview/impact/revision-route/registration slice. Preview token equals shared revision. Approved enablement and nullable boundaries apply together; ordinary direct-edit validation still refuses null boundaries. |
| MULTIPLE | Frontend regression | PASS | Complete suite: 744 passed in 70 files. Focused request/direct-edit/Coordinator suite: 65 passed. |
| MULTIPLE | Backend unit regression | PASS | 634 passed; one existing database-only skip; zero failed. This run alone does not prove full changed-code unit coverage. |
| MULTIPLE | Application typecheck and build | PASS | Both typechecks passed; frontend production build and backend build passed. Existing Vite dynamic/static import warning remains. PowerShell treats warning stderr as an error stream, but both workspace build commands completed. |
| MULTIPLE | Repository hygiene and documentation mapping | PASS | check.py passed hygiene and 186 tooling tests. doc_guard.py: zero errors, 154 existing front-matter warnings; no docs freeze. Inventory regenerated: 291 active / 379 cases. |

Commands: `npm.cmd run typecheck`; `npm.cmd run build`;
`npm.cmd test --workspace frontend -- --run --maxWorkers=2`;
`npm.cmd test --workspace backend`; focused frontend run additionally names
ChangeRequests.test.tsx, EventEditForm.test.tsx and CoordinatorEditing.test.tsx.
Database command: Node with disposable local test environment, `--import tsx
--test`, naming changeRequests.test.ts, changeRequests.integration.test.ts,
eventChangePreview.test.ts, arrangementImpact.integration.test.ts,
eventChangeRevisionRoute.integration.test.ts, registrationPeriod.integration.test.ts
and attendeeRegistration.integration.test.ts. Browser command: Playwright CLI
`test --config=playwright.auth.config.ts tests/auth-e2e/changeRequests.spec.ts`.
Tooling: `python scripts/check.py`, `python scripts/doc_guard.py`, and the
repository virtual environment's `scripts/tc_coverage_audit.py`.

Initial sandbox browser/build worker spawning and pre-commit cache writes were
refused; permission-enabled retries passed. No database resets or committed
writes against Supabase occurred. Tooling output contains synthetic Jira test
fixtures; this task did not change Jira.

Coverage limitation: this continuation does not claim 100% changed-code unit
coverage or approve a coverage exception. Earlier scoped coverage measurements
are in the immutable 20261030 records and are not current-source measurements.
Layout/accessibility application and Session mutation integration remain open.
Combined human TC_E10S01_01-07 evidence, independent review and PO/delegate
acceptance remain required; no whole-story Done or external email receipt claim.

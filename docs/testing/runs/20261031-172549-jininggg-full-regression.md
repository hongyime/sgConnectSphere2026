---
date: 2026-10-31T17:25:49+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 301026
database: real
commit: 4da52a4
---

E10-S01 / SCRUM-70 non-blocking review follow-up to merged #383.
Source is 4da52a4 plus this working diff, not clean-base execution.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_04 | Shared labels and late-close consent | PASS | Focused Vitest: 64 passed across ChangeRequests, ArrangementReview and shared.test.tsx. Both Pending approval and older Approved application disable confirmation until consent, handle unticking, and refuse direct form submission without it. Shared ConfirmPanel also rejects busy submissions while Cancel remains available without consent. |
| TC_E10S01_01 TC_E10S01_02 TC_E10S01_03 TC_E10S01_04 TC_E10S01_05 TC_E10S01_06 TC_E10S01_07 | Real-stack request regression | PASS | 20 desktop/mobile checks passed using real sign-in/API/disposable native loopback PostgreSQL, no response interception. Readable impact labels retain actual headcount/capacity, and older Approved late-close confirmation is disabled before consent. Fixture SQL is a precondition, not a Session editing workflow or manual evidence. |
| MULTIPLE | Full frontend regression | PASS | 757 passed in 70 files. |
| MULTIPLE | Types and builds | PASS | Both workspace typechecks and builds completed. Existing Vite chunk/import warning remains. |
| MULTIPLE | Repository and documentation | PASS | check.py: hygiene and 186 tooling tests passed. doc_guard.py: zero errors, 155 existing front-matter warnings. Inventory regenerated and staged whitespace check passed. |

Commands: `npm.cmd run typecheck`; `npm.cmd run build`;
`npm.cmd test --workspace frontend -- --run --maxWorkers=2`;
focused Vitest command names `src/features/events/ChangeRequests.test.tsx`,
`src/features/events/ArrangementReview.test.tsx`, `src/shared/shared.test.tsx`,
with `--maxWorkers=2 --coverage --coverage.include=src/features/events/arrangementReasons.ts`.
Browser: Playwright CLI `test --config=playwright.auth.config.ts tests/auth-e2e/changeRequests.spec.ts`
with the disposable local test environment. Tooling: `python scripts/check.py`,
`python scripts/doc_guard.py`, virtual-environment Python running
`scripts/tc_coverage_audit.py`, and `git diff --cached --check`.

New shared formatter coverage: 100% statements (7/7), branches (9/9), functions
(2/2), lines (7/7). This is formatter-only coverage, not whole-file coverage of
the existing panels/forms. Guards and panel integration are behaviour-tested;
no blanket 100% changed-file coverage or self-approved exception is claimed.
No backend source changed, no Supabase writes, and no human manual PASS claimed.
Safety Review auto-reversion remains an unresolved PO policy question; no
lifecycle behaviour was changed. Combined human acceptance and Session-specific
integration remain separate from this UI follow-up.

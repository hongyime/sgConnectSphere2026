---
date: 2026-11-06T21:36:57+08:00
runner: xiangyingg
scope: backend/db
environment: local
run_type: regression
test_case_version: "061126"
database: real
commit: e404119
pr: 450
---

# Guardrail fix by retaining relevant regression coverage

Working diff on e404119. Retain assigned-Coordinator read tests and the existing
Lead queue/assignment/reassignment/oversight API tests instead of deleting both
files wholesale. Retired Coordinator-request and automatic-assignment tests are
not restored. No application authorization or guard-policy code changed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Focused Coordinator/Lead/audit regressions | PASS | `tsx --test` ran coordinatorAssignment.test.ts, coordinatorNotifications.integration.test.ts, activityLog.integration.test.ts, leadAssignment.test.ts, leadReassignment.test.ts and leadOversight.test.ts: 31 passed, zero failed/skipped/todo. DB-backed tests used guarded disposable native loopback PostgreSQL with random schemas; no Supabase or production writes. |
| MULTIPLE | Backend unit command | PASS | `npm test --workspace backend`: pretest 6/6 passed; main suite 726 passed, one intentional skip, zero failures (727 total). |
| MULTIPLE | Typechecks | PASS | `npm run typecheck`: frontend and backend passed. |
| MULTIPLE | Derived test inventory | PASS | `python scripts/tc_coverage_audit.py` regenerated tc-coverage.md: 371 automated, 3 known defect, 7 scaffold, 13 no test out of 394. This is inventory, not execution coverage or acceptance. |

Repository gates also passed: `python scripts/check.py` (207 tooling tests),
`python scripts/doc_guard.py` (zero errors / 188 existing metadata warnings),
and `git diff --check`. Local size check: 30 files / 721 additions / 1,468
deletions, within the unchanged policy.

Initial restoration run had two missing-import failures (9/11 passed), fixed
before the final run. A subsequent focused run had 27/31 passes because a static
repository import froze Origin configuration before the fixture set APP_URL.
Move that import inside the configured fixture test, then the final 31/31 run
passed. No assertions or authorization checks were weakened. CI is wired to run
the retained API integration file, and backend npm commands include both files.
The complete frontend/browser suites were not rerun for this test-only repair.

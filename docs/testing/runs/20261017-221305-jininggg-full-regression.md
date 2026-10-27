---
date: 2026-10-17T22:13:05+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 3c744d2
---

Focused E11-S01 / SCRUM-75 follow-up at HEAD plus working changes. This is
not an application-wide regression pass. Unit queries are mocked; integration
queries use isolated random schemas in the guarded disposable loopback database.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_11 | Initial unit runner attempt | FAIL | Windows sandbox blocked the Node test child process with spawn EPERM before assertions; rerun outside the sandbox below. |
| TC_E11S01_11 | Assignment caller units and coverage | PASS | `npx.cmd c8 --include=backend/src/modules/equipmentSupport/staffAssignments.ts --reporter=text node --import tsx --test backend/tests/staffAssignments.test.ts`: 20 passed; changed module 100% statements, branches, functions and lines. Self-action mutations commit without notification/outbox writes; existing colleague cases remain covered. |
| TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_11 | Actual staffing changes, rollback and inbox persistence | PASS | `node --env-file=<disposable-local-test-env> --import tsx --test backend/tests/staffAssignments.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/notificationInbox.integration.test.ts`: 16 passed, zero skipped. Self-actions silent; colleague assignment/removal each has one delivery. Injected outbox failures roll back both assignment and removal. Real inbox functions verify ordering, unread/read persistence and ownership; unrelated users remain silent. Existing concurrency test runs 25 rounds. |
| TC_E11S01_01 TC_E11S01_02 TC_E11S01_10 TC_E11S01_12 TC_E11S01_13 TC_E11S01_14 TC_E11S01_15 TC_E11S01_16 | Shared routing and inbox regression | PASS | Same 16-test database command covers atomic status/date edits, recipient snapshots, cancellation hook, assignments, deduplication and uncommitted visibility; eventless security notice exclusion and newest-100 cap also pass. Hooks do not implement missing owning workflows. |
| MULTIPLE | Backend type checking | PASS | `npm.cmd run typecheck --workspace backend`. |
| MULTIPLE | Test inventory regeneration and whitespace | PASS | `python scripts/tc_coverage_audit.py` regenerated the changed test titles; `git diff --check` passed. Inventory is traceability, not a test run. |

No website/API started, provider request, production change or actual mailbox
receipt. Manual script remains unexecuted. Equipment affected-role expansion
and notification preferences remain pending owner clarification. Prior session
records are preserved unchanged.

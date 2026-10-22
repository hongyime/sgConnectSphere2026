---
date: 2026-10-18T19:20:48+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 3c744d2
---

HEAD plus E11 integration and UI working changes. Human manual failures are
preserved in 20261018-154753-jininggg-frontend-e2e.md; these automated results
do not replace a human retest.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_01 TC_E11S01_07 TC_E11S01_11 | Focused UI regressions | PASS | `npm.cmd run test --workspace frontend -- src/features/shell/AppHeader.test.tsx src/features/notifications/NotificationInbox.test.tsx src/features/support/TechnicianStaffing.test.tsx`: 28 passed before adding the read-failure integration case. Covers immediate visible details, real header/inbox interaction after read, self-action wording, focused/scrolled confirmation and focus restoration on Cancel. |
| MULTIPLE | Full frontend suite and scoped coverage | PASS | `npm.cmd run test:coverage --workspace frontend -- --coverage.include=src/features/notifications/NotificationInbox.tsx --coverage.include=src/features/notifications/notificationsApi.ts --coverage.include=src/features/shell/AppHeader.tsx --coverage.include=src/features/support/TechnicianStaffing.tsx`: 434 passed across 47 files, including the additional read-failure case. |
| MULTIPLE | Frontend type check | PASS | `npm.cmd run typecheck --workspace frontend`. |
| MULTIPLE | Inventory and record validation | PASS | `python scripts/tc_coverage_audit.py` regenerated traceability. `python scripts/check_test_run_records.py`: 413 records validated before this record; `git diff --check` passed. |

Coverage for the four selected UI modules: 100% statements, functions and lines;
93.96% branches. Remaining branches include existing API error fallbacks, unread
badge presentation boundaries and session/DOM fallback alternatives; they are
not claimed 100% covered. New tests verify successful/failed read behaviour,
self/colleague wording and focus handling without weakening existing assertions.
Backend code was unchanged in this UI follow-up and its previous database runs
were not repeated. No automated screenshots substituted for human evidence.
No commit, push, production action or actual email send performed.

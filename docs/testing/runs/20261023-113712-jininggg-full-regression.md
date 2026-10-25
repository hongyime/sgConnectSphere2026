---
date: 2026-10-23T11:37:12+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 171026
database: mocked
commit: cbd43ea
pr: 299
---

Merge verification atcbd43ea plus staged main38ffa99 integration/conflict resolutions.
Not a clean checkout of that SHA alone. No actual #298 combined DB/manual run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| N/A | Backend unit regression | PASS | npm.cmd test --workspace backend exited0; combined scripts retain cancellation, withdrawal, primary and equipment-notification suites. No whole-codebase coverage claim. |
| N/A | Full frontend regression | FAIL | npm.cmd test --workspace frontend full output was truncated; captured repeat with --reporter=json --outputFile=../artifacts/frontend-merge-results.json:469 passed/3 failed of472. CoordinatorEditing test timed out5000ms; AppHeader unread link and VenueForm.conflicts inventory heading timed out/missing under concurrent suite load. No product test/assertion weakening. |
| TC_E06S03_07 | Booking/cancellation/activity/failed-file isolation | PASS | npm.cmd test --workspace frontend -- src/features/coordinator/CoordinatorEditing.test.tsx src/features/venue/VenueForm.conflicts.test.tsx src/features/venue/VenueBookingRequests.test.tsx src/features/events/ActivityLog.test.tsx src/features/events/EventCancellation.test.tsx:44/44 across5 files. |
| TC_E11S01_07 | Header isolated regression | PASS | npm.cmd test --workspace frontend -- AppHeader.test.tsx:8/8. Initial mistaken src/app/AppHeader.test.tsx filter found no files; corrected actual path is features/shell/AppHeader.test.tsx. No full-suite pass claim from isolated reruns. |
| N/A | Types/inventory | PASS | npm.cmd run typecheck:both workspaces pass. python scripts/tc_coverage_audit.py regenerated213/376. git diff --cached --check passes. |
| N/A | Repository tooling | FAIL | python scripts/check.py:hygiene/env pass;163 Windows tooling tests retain3 failures/11 errors in worktree fixtures. Linux CI remains required. |

Conflicts: .gitignore retains both review/cancellation artifacts; backend/package.json
unions both test/test:db lists without duplicate equipmentNotifications; generated
inventory regenerated from merged sources. Notification cancellation recipients and
Coordinator cancellation controls auto-merged; existing withdrawal routing retained.
No production operation, #298 merge, dependency-completion or fresh human evidence.

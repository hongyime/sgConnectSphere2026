---
date: 2026-10-22T21:48:41+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: 956e37c
pr: 299
---

Review follow-up at 956e37c plus uncommitted changes, not that SHA alone.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Primary lifecycle refusal and history preservation | PASS | node --env-file=<fresh-temporary-loopback-test-env> --import tsx --test backend/tests/bookingSubmission.integration.test.ts:20/20 real native PostgreSQL,0 skips. Added Completed/Cancelled refusal including replay and unchanged flags/audit; existing submission/withdrawal/primary regressions passed. Simulated decision-writer tests remain distinct from actual #298 integration. |
| TC_E06S03_07 | Primary service/withdrawal units | PASS | node node_modules/c8/bin/c8.js --include=backend/src/modules/venueBooking/bookingPrimary.ts --include=backend/src/modules/venueBooking/bookingWithdrawal.ts --reporter=text node --import tsx --test backend/tests/bookingPrimary.test.ts backend/tests/bookingWithdrawal.test.ts:9/9; both services100% statements/branches/functions/lines. Includes active-status allowlist and terminal/preapproval no-write/replay refusal. |
| TC_E06S03_07 | Booking controls and activity formatting | PASS | npm.cmd run test --workspace frontend -- src/features/venue/VenueBookingRequests.test.tsx src/features/events/ActivityLog.test.tsx:25/25 intercepted-API component tests; terminal controls absent. Activity formatter assertions do not prove read-query visibility before #298. |
| N/A | Types and generated inventory | PASS | npm.cmd run typecheck:both workspaces pass. python scripts/tc_coverage_audit.py:207/376, no content drift. git diff --check passes. |
| N/A | Repository check | FAIL | Initial isolated checkout lacked tooling link; linked existing tooling and reran python scripts/check.py. Hygiene/env passed;158 Windows tooling tests retain3 failures/11 errors in worktree fixtures. No hook bypass. |

Existing dependency links reused; attempted backend node_modules link found no
target and was unnecessary, as dependencies resolve through root. No dependency
install or lockfile change. An unintended documentation encoding rewrite was
caught in diff inspection and corrected before commit, preserving original UTF-8.
No fresh full application suite, formal manual screenshots, real #298 combined
suite, email receipt or production operation claimed. User's wait-for-#298 gate
remains; migration0020 is already applied and must not be reapplied.

---
date: 2026-10-22T21:56:01+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 161026
database: real
commit: e2d9d26
pr: 299
---

Post-main merge verification at e2d9d26; subsequent edits are evidence/PostPlan only.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Real PostgreSQL booking regression | PASS | node --env-file=<fresh-temporary-loopback-test-env> --import tsx --test backend/tests/bookingSubmission.integration.test.ts:20/20,0 skips. Includes terminal primary refusal, flags/audit preservation and existing submission/withdrawal cases. Not actual #298 combined-service evidence. |
| TC_E06S03_07 | Service and UI focused regression | PASS | node --import tsx --test backend/tests/bookingPrimary.test.ts backend/tests/bookingWithdrawal.test.ts:9/9. npm.cmd run test --workspace frontend -- src/features/venue/VenueBookingRequests.test.tsx src/features/events/ActivityLog.test.tsx:25/25 mocked API. |
| N/A | Types/inventory | PASS | npm.cmd run typecheck:both workspaces pass. Main10bef44 merged, sole conflict generated inventory regenerated208/376. |
| N/A | Repository check | FAIL | python scripts/check.py:hygiene/env pass;163 tests,3 failures/11 errors in Windows worktree fixtures. This is the post-merge count; earlier158 count retains its original tested checkout. Mocked Jira transition output belongs to tooling fixtures, not live Jira changes. |
| N/A | PostPlan | PASS | python scripts/check_postplan_html.py artifacts/pr299-review-followup.html passed. Playwright local rendering visually inspected by agent; not human product screenshots. Hosted https://so84l4vridjb.postplan.dev. |

Prior service coverage100% at956e37c plus review fixes remains in214841 record;
not rerun after this main merge. No formal manual run, production migration,
actual email receipt or live Jira mutation. #298a0f18b8 remains open; user wait
gate preserved. Fresh current-head human approval/CI and manual gaps remain.

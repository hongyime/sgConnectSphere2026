---
date: 2026-10-24T16:10:07+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 171026
database: real
commit: 181e1de
pr: 299
---

After-298 integration at181e1de plus staged main9c8a37f merge/resolutions.
Not an unchanged checkout of that SHA. Actual merged decisions.ts used untouched.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_10 | Actual-service ordering races | PASS | node --env-file=<fresh-native-loopback-env> --import tsx --test backend/tests/bookingDecisionIntegration.integration.test.ts:8/8,0 skips. Both approval/rejection vs withdrawal winning orders and automatic-primary/explicit-primary orders execute against actual merged #298. |
| N/A | Submission/decision persistence regression | PASS | Same Node command with backend/tests/bookingSubmission.integration.test.ts backend/tests/venueBookingDecisions.integration.test.ts:43/43,0 skips. |
| N/A | Exact CI booking command | PASS | npm.cmd run test:venue-booking-requests:db --workspace backend with temporary TEST_DATABASE_URL inherited:52/52,0 skips. Command now includes bookingDecisionIntegration so CI cannot silently omit the8 cases. Node wrapper only loads temporary env and spawns this unchanged command. |
| N/A | Full backend units | PASS | npm.cmd test --workspace backend:471/471,0 skips; combined test scripts preserve both sides. |
| TC_E06S03_07 | Booking/primary/Activity frontend | PASS | npm.cmd test --workspace frontend -- src/features/venue/VenueBookingRequests.test.tsx src/features/events/ActivityLog.test.tsx src/features/venue/BookingRequests.test.tsx:52/52,intercepted API. Primary fixture has venue_booking entity so generic formatter regression is exercised. No full frontend rerun claimed. |
| N/A | Initial typecheck fixture issue | FAIL | Added duplicate entity_type/venue_name to an already-realistic primary fixture, causing TS1117; removed duplicate fields, retained original fixture. No assertion weakening. Final types/build pass. |
| N/A | Types/build | PASS | npm.cmd run typecheck and npm.cmd run build:both workspaces pass; existing Vite chunk advisory. |
| N/A | Runtime suite | FAIL | npm.cmd run test:runtime:22 API assertions passed,1 after-hook failed. Dependency junction resolves outside worktree, so existing safe-cleanup containment assertion fails at line38. Guard retained; no suite-green claim. Linux CI must verify. |
| N/A | Repository check/inventory | FAIL | python scripts/check.py hygiene/env pass;163 Windows tooling tests retain3 failures/11 errors. Inventory regenerated229/376; git diff --cached --check passes. |

Conflicts .gitignore/backend test lists/runtime tests/generated inventory resolved
by union or regeneration. Auto-merge would route primary_venue through generic
booking status formatter; exclude it there so existing primary-name branch wins.
Production migration0020 already complete; no production action. No fresh human
manual/screenshots/mail receipt. Previously promised manual gaps remain open,
consolidated with fresh CI/review as next gates; do not mark whole story Done.

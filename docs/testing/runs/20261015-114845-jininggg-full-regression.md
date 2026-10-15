---
date: 2026-10-15T11:48:45+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 141026
database: real
commit: 382d1f2
---

Agent-run review-fix verification on behalf of the authenticated GitHub user.
HEAD is the PR baseline plus uncommitted status, suggested-venue and migration
0019 changes. This is not a human manual run or a whole-story completion claim.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Backend units | PASS | npm test --workspace backend: 394/394. |
| TC_E06S03_02 | Standard Planning status path | PASS | Real PostgreSQL submission suite asserts status_changed_at advances from an earlier Approved timestamp. Standard audit/notices stay in the transaction. |
| MULTIPLE | Suggested venue replacement and affected DB regression | PASS | Node --import tsx --test over bookingSubmission.integration.test.ts, venueBookingRequests.integration.test.ts and venueHolds.integration.test.ts: 16/16 using migration 0019 on disposable native loopback PostgreSQL. Rejection retained, matching suggestion required, one concurrent replacement, retry returns same row and unique index rejects a second replacement. |
| MULTIPLE | Submission module unit coverage | PASS | c8 over bookingSubmission.test.ts: 11/11; bookingSubmission.ts and bookingSubmissionHandler.ts measured 100% statements/branches/functions/lines. |
| MULTIPLE | Component checks and coverage | PASS | npm run test:coverage --workspace frontend with VenueBookingForm.test.tsx and VenueBookingRequests.test.tsx and matching include paths: 13/13; both components 100% in all four metrics. |
| MULTIPLE | Desktop/mobile browser submission and switch | PASS | npx playwright test tests/e2e/venue-booking-submission.spec.ts --workers=1: 8/8. Intercepted synthetic APIs; suggested-venue prefill screenshots inspected. Not live database E2E or human manual evidence. |
| MULTIPLE | Typecheck | PASS | npm run typecheck passed frontend and backend. |
| MULTIPLE | Coverage trace regeneration | PASS | scripts/tc_coverage_audit.py regenerated docs/testing/tc-coverage.md from combined test titles. |
| MULTIPLE | Repository check | FAIL | python scripts/check.py: hygiene/env checks passed; existing Windows tooling fixtures produced 3 failures and 11 errors among 128 tests. No hook bypass. |
| TC_E06S03_01 | Production default Venue Staff routing | SKIP | #272 remains unmerged. Submission now delegates requested-venue scope to captureEventAudience so its future default resolver is reused; no claim of actual default assignment delivery yet. |
| MULTIPLE | Human review-fix manual run | SKIP | New steps added to manual/E06-S03-click-through.md. Earlier 24 screenshots predate these fixes. |

Database runs loaded only the temporary local TEST_DATABASE_URL. An initial
connection-refused exploratory attempt was followed by restarting the existing
native server, then two successful affected-suite runs (the final one used 0019).
The agent stopped the server it restarted after testing. No Docker Desktop,
shared Supabase migration/reset/seed, provider delivery or Jira edits.
The broader database suite was not rerun; its previously recorded fixture failure
is not overridden by these focused successes. #245 owner coordination remains
with the user.

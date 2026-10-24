---
date: 2026-10-24T18:40:16+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 241026
database: real
commit: 124c484
pr: 299
---

AI-assisted technical review requested by Xiang Ying. Exact published head tested in an isolated checkout. No human browser execution, production operation, deployment or whole-story acceptance claimed. Completion time taken from final local command log modification time.

Commands: npx tsx --test backend/tests/bookingWithdrawal.test.ts backend/tests/bookingPrimary.test.ts backend/tests/eventNotifications.test.ts; npm run test:venue-booking-requests:db --workspace backend with guarded loopback TEST_DATABASE_URL; npx vitest run src/features/venue/VenueBookingRequests.test.tsx src/features/events/ActivityLog.test.tsx; npm run typecheck.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | PR299 independent targeted regression | PASS | 14 withdrawal/primary/notification unit tests,52 real-PostgreSQL booking selector tests (including8 actual-service races),28 booking-request/Activity components and both typechecks passed;0 skipped DB tests. |

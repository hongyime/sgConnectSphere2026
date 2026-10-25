---
date: 2026-10-24T12:01:02+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "171026"
database: real
commit: c035dc5
pr: 298
---

SCRUM-48 / E06-S04, evidence for the fixes to Ji Ning's #298 review, at
`c035dc5`. Native PostgreSQL on 127.0.0.1:5432 (no Docker Desktop), database
`connectsphere_notification_test`, with only `TEST_DATABASE_URL` in the
environment; each run builds fresh disposable schemas with every migration
applied. No shared Supabase database, reset or seeding. The `date` is when
the first command started.

1. From `backend/`: `npx c8 --include src/modules/venueBooking/decisions.ts npx tsx --test tests/venueBookingDecisions.integration.test.ts`
2. From the repository root: `npm run test:venue-booking-requests:db --workspace backend` (the booking selector CI runs)

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | a pending request on a Completed or Cancelled event is refused and leaves no trace | PASS | New regression for review point 1: for each status, approve and reject return 409; the booking stays Pending, no audit row and no notification are written, and the event keeps its status |
| MULTIPLE | task12: stale Venue Staff identity cannot decide after database account revocation | PASS | Review point 2, from #334 (Bryan): deactivated, role changed, five failed logins and locked accounts each get 403 with nothing written |
| MULTIPLE | `venueBookingDecisions.integration.test.ts` (23 tests) | PASS | Command 1: 23/23, zero skipped |
| MULTIPLE | booking selector (`venueBookingRequests`, `bookingSubmission`, `venueBookingDecisions` integration files) | PASS | Command 2: 34/34, zero skipped; includes the 23 above |

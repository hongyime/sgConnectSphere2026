---
date: 2026-11-03T20:01:29+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 021126
database: real
commit: 8858e4e
pr: 415
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Session, booking decision, venue unavailability, change request and attendee visibility database tests | PASS | 78 passed, 0 failed. `eventSessionsRoutes`, `venueBookingDecisions`, `venueUnavailability`, `changeRequests` and `attendeeVisibility` integration test files, on a throwaway local PostgreSQL database with `DATABASE_URL` and `DATABASE_POOLER_URL` empty. Not the whole of `npm run test:db`; CI runs that. |

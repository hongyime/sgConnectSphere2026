---
date: 2026-10-06T16:27:36+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 031026
database: real
commit: a26d8c1
pr: 222
---

E07-S06 technical support requests (SCRUM-145) against real PostgreSQL:
`npx tsx --test tests/supportRequests.integration.test.ts` in `backend/`,
with `TEST_DATABASE_URL` pointing at a disposable local PostgreSQL 17
container on the loopback interface (random schema per run, every migration
applied by the test helper; never the application database). 1/1 passed.
Code under test is identical to `730e275`; `a26d8c1` adds only the
unit-run record.

A real-database mutation check confirmed the test isn't hollow: changing
the code to notify one technician fewer made it fail; the code was restored
before this recorded run. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | PASS | Real database: one `tech_support_requests` row (required, open, requester, exact range); notifications for the two active technicians only, not the inactive one; two delivery rows |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | PASS | Real database: an approved event with no `venue_bookings` row accepts the request |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | PASS | Real database: a single `support_required = false` row after two calls; no new notifications; a later request replaces it; "none" is then refused (409) |
| MULTIPLE | Refusals leave nothing behind | PASS | Confirmed event refused (409) with no row written; another Coordinator refused (403), the conference still has one row, and the refusal is in `audit_logs` |

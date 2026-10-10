---
date: 2026-10-09T20:54:45+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 091026
database: real
commit: cc87ae4
---

`npx tsx --test tests/venueHolds.integration.test.ts
tests/venueCalendar.integration.test.ts tests/venueSearch.integration.test.ts
tests/venueCatalogue.integration.test.ts tests/venueBlocks.integration.test.ts`
in `backend/`, with `TEST_DATABASE_URL` pointing at a disposable local
PostgreSQL 17 container on the loopback interface (random schema per run,
never the application database): 12/12 passed. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_01 | Another Coordinator's overlapping hold is refused naming the hold | PASS | "This venue already has a tentative hold for EVT-TC Tech Conference 2027 from 10 Mar 2027, 9:00 am to 10 Mar 2027, 5:00 pm."; pending request and block also refused |
| TC_E06S05_03 | Hold on a free venue expires 48 hours after placing; Venue Staff extend it | PASS | Calendar shows Tentative; venue search shows it unavailable; extension logged with Venue Staff as actor and old/new expiry |
| TC_E06S05_04 | Converting makes it pending with no expiry | PASS | Venue stays unavailable |
| TC_E06S05_05 | An expired hold frees the venue; exact boundary | PASS | Free in search and calendar before the job runs; another Coordinator holds it; job at expiry minus 1 s leaves it tentative, at expiry marks it expired |
| TC_E06S05_06 | One notice at expiry, nothing on a second run | PASS | "Tentative hold expired" with venue, event and time; one email delivery row; second run 0 expired, 0 notified |
| TC_E06S05_07 | An expired hold cannot be extended or converted | PASS | 409 |
| MULTIPLE | Blocks and retirement see holds; simultaneous holds | PASS | Block notifies a live hold's Coordinator, not an expired one; retire refused with a live hold; 15 rounds of two simultaneous holds: one 201, one 409 each |
| MULTIPLE | Calendar, search, catalogue and block suites (fixtures now apply 0013) | PASS | Unchanged behaviour |

---
date: 2026-10-09T21:17:32+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 091026
database: real
commit: 700964f
---

`npx tsx --test tests/venueHolds.integration.test.ts
tests/venueCalendar.integration.test.ts tests/venueSearch.integration.test.ts
tests/venueCatalogue.integration.test.ts tests/venueBlocks.integration.test.ts`
in `backend/` on `700964f`, with `TEST_DATABASE_URL` pointing at a disposable
local PostgreSQL 17 container on the loopback interface (random schema per
run, never the application database): 12/12 passed. Supersedes
`20261009-205445` for the PR's current code. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_01 | Overlapping hold, pending request or block refused and named | PASS | Same sentences as before |
| TC_E06S05_03 | Hold on a free venue expires in 48 hours; Venue Staff extend it | PASS | A hold for the 11 March Gala placed on 10 March times is refused: "The hold must fall within the event, 11 Mar 2027, 9:00 am to 11 Mar 2027, 5:00 pm." |
| TC_E06S05_04 | Converting makes it pending with no expiry; a retry changes nothing | PASS | Second `convert_hold` returns the same body; one audit entry |
| TC_E06S05_05 | An expired hold frees the venue; exact boundary | PASS | Job at expiry minus 1 s leaves it tentative, at expiry marks it expired |
| TC_E06S05_06 | One notice at expiry, nothing on a second run | PASS | One email delivery row |
| TC_E06S05_07 | An expired hold cannot be extended or converted | PASS | 409 |
| MULTIPLE | Blocks, retirement, simultaneous holds; calendar, search, catalogue, block suites | PASS | 15 race rounds: one 201 and one 409 each |

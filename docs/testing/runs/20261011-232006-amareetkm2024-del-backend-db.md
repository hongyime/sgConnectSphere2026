---
date: 2026-10-11T23:20:06+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 091026
database: real
commit: a6a76ce
pr: 245
---

`npx tsx --test tests/venueHolds.integration.test.ts
tests/venueCalendar.integration.test.ts tests/venueSearch.integration.test.ts
tests/venueCatalogue.integration.test.ts tests/venueBlocks.integration.test.ts`
in `backend/` on `a6a76ce`, with `TEST_DATABASE_URL` pointing at a disposable
local PostgreSQL 17 container on the loopback interface (random schema per
run, never the application database): 13/13 passed. Run by Claude for Amareet.

Before committing, the new deadline-race test was run once against the
previous `holds.ts` (`e141413` logic): it failed with "Missing expected
rejection" (the late convert went through). With the fix it passes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_04 | Convert that waits on the hold lock past the expiry is refused | PASS | Another connection held the row lock for 1.2 s across a 1 s expiry; 409, hold left tentative |
| TC_E06S05_07 | Extend that waits on the venue lock past the expiry is refused | PASS | Extend still pending after 400 ms while the venue row was locked, then 409 |
| TC_E06S05_05 | A passed hold can't be released; the job then expires it and notifies | PASS | 409 on release; job expired 3 holds and sent 3 notices |
| MULTIPLE | Existing hold journeys, blocks, retirement, simultaneous holds; calendar, search, catalogue, block suites | PASS | 13/13 in total |

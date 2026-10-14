---
date: 2026-10-12T20:32:41+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 091026
database: real
commit: cf021bd
pr: 245
---

`npx tsx --test tests/venueHolds.integration.test.ts` in `backend/` with
`TEST_DATABASE_URL` pointing to a disposable loopback PostgreSQL 17 container
(each test uses a random schema): 6/6 passed on `cf021bd`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | Place a hold after waiting on the venue lock | PASS | Confirmed the 48-hour default from post-lock database time; a chosen expiry that fell below the 1-hour minimum during the wait returned 400 |
| MULTIPLE | Remaining venue-hold PostgreSQL scenarios | PASS | Existing hold, expiry, clash, block, retirement, simultaneous-hold, conversion and extension scenarios; 6/6 tests passed total |

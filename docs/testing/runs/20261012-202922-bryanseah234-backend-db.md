---
date: 2026-10-12T20:29:22+08:00
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
| TC_E06S05_03 | Place a hold after waiting on the venue lock | PASS | Default expiry stayed 48 hours from post-lock database time; an explicit expiry crossing below the 1-hour minimum returned 400 |
| MULTIPLE | Remaining venue-hold PostgreSQL scenarios | PASS | Existing hold, expiry, clash, block, retirement, simultaneous-hold, conversion and extension scenarios; 6/6 tests passed total |

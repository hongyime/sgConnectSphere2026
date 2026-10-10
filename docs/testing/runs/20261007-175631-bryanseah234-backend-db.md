---
date: 2026-10-07T17:56:31+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: manual
test_case_version: 011026
database: real
commit: 88059a5
pr: 231
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S05_01 | buffers saved on a venue are persisted and returned on detail | PASS | New in venueBufferConflicts.integration.test.ts; createVenue 201 returns 30/45, stored columns match, getVenue returns both |
| TC_E05S05_03 | a buffer edit flags the later of two newly-overlapping bookings, notifies once, keeps both | PASS | New; the old `vb`-alias query was proven to fail on this database with `missing FROM-clause entry for table "vb"` before the fix; after the fix the later booking is marked conflicting, the earlier stays confirmed, exactly one 'Booking conflict detected' notification |
| TC_E05S05_05 | a block ending before the advertised start but overlapping setup time is allowed silently | PASS | New; block 2027-01-05 over pending booking advertised 2027-01-06 00:30 (setup 60) returns 201 with notifiedEventCount 0 |
| TC_E05S01_01..TC_E05S02_08 | venue catalogue and layout scenarios against real PostgreSQL | PASS | Fixture now runs migration 0011 (was failing: createVenue referenced the buffer columns) |
| TC_E05S04_01..TC_E05S04_04 | maintenance block scenarios against real PostgreSQL | PASS | 5 tests incl. hours-preserving block fixture |
| TC_E05S03_01..TC_E05S03_05 | venue availability calendar against real PostgreSQL | PASS | Fixture now runs migration 0011 (was failing: calendar references occupied_window/buffer columns) |
| E02-S03 Scenario 3 | venue search excludes venues missing a recorded predefined accessibility requirement | PASS | Fixture now runs migration 0011 (was failing after the createVenue change) |
| TC_E06S01_01..TC_E06S01_04 | venue search integration (event requirements, near matches, range boundaries) | PASS | Fixture now runs migration 0011 (pre-existing failure on the branch before this fix) |

Command: `tsx --test tests/venueCatalogue.integration.test.ts tests/venueBlocks.integration.test.ts tests/venueCalendar.integration.test.ts tests/venueBufferConflicts.integration.test.ts tests/venueAccessibility.integration.test.ts tests/venueSearch.integration.test.ts` with `TEST_DATABASE_URL` pointing at a disposable local PostgreSQL 16.4 database (throwaway server on a unix socket; each file migrates a fresh random schema). Outcome: 12 tests, 12 pass, 0 fail.

Not run in this sitting: the remaining `npm run test:db` files. A full-suite run earlier in this session showed 54/57 passing; the 3 failures are pre-existing on the branch and unrelated to this change (eventVisibility/registration fixtures reference a `venue_requirements` column their hardcoded migration subset does not create; venueAccessibility's fixture has since been repaired above).

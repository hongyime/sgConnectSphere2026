---
date: 2026-10-16T19:32:01+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "161026"
database: real
commit: 7a9f13c
---

SCRUM-48 / E06-S04, PR evidence. `npm run test:db` in `backend/` at `7a9f13c`
with only `TEST_DATABASE_URL` set (loopback PostgreSQL 17, random disposable
schemas, every migration applied; no shared database): 136/138 passed. The two
failures also fail with the same errors on clean `main` 37cbb77 and are not
caused by this branch.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `venueBookingDecisions.integration.test.ts` (19 tests: TC_E06S04_01 to _06, the suggested-venue switch through `submitBooking`, primary venue incl. simultaneous approvals, Scenario 4 buffer clash, block and race) | PASS | 19/19 against real PostgreSQL |
| MULTIPLE | `eventVisibility.integration.test.ts` E01-S02 organisation isolation | FAIL | `column e.venue_requirements does not exist`; same on clean `main` 37cbb77 |
| MULTIPLE | `registration.db.test.ts` PostgreSQL defaults and uniqueness | FAIL | `relation "public.users" does not exist`; same on clean `main` 37cbb77 |
| MULTIPLE | rest of the real-database suite | PASS | 136/138 overall |

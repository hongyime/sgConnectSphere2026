---
date: 2026-10-14T13:55:25+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "131026"
database: real
commit: 3dcc5b6
---

SCRUM-189 (subtask of SCRUM-75, E11-S01).
`npx tsx --test tests/eventNotifications.integration.test.ts` in `backend/`
against a disposable local PostgreSQL 17 database (`TEST_DATABASE_URL` only,
random schema per run, every migration applied including
`0016_venue_staff_assignments.sql`): 10/10 passed. Combined with the unit
tests, c8 reports every changed line of `eventNotifications/service.ts`
covered (the one uncovered line, 142, is unchanged code). A full `npm run
test:db` the same session passed 76/78; the two failures,
`eventVisibility.integration` and `registration.db`, fail identically on
`main` (missing `venue_requirements` / `public.users` in their own setup).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_10 | assigned Venue Staff come from venue_staff_assignments only | PASS | With a current assignment, an ended one, an inactive account, a non-Venue Staff account and Venue Staff assigned only to another venue, only the current active assignee is in the audience; a booking_requested notice reaches exactly that user and no venue is reported unresolved. |
| TC_E11S01_13 | a venue whose only assignment has ended or is inactive stays unresolved | PASS | Ended, future-dated and inactive assignments resolve nobody; the venue is reported unresolved. |
| TC_E11S01_13 | decided_by and unrelated Venue Staff never stand in for assignments | PASS | With no assignment rows, the booking's decided_by user is not a recipient and the venue is reported unresolved. |
| MULTIPLE | other E11-S01 real-database cases (TC_E11S01_01, _02, _09, _12, _14, _15, _16) | PASS | Unchanged behaviour with the table-backed default resolver. |

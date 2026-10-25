---
date: 2026-10-17T00:24:34+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "161026"
database: real
commit: f097571
pr: 298
---

SCRUM-48 / E06-S04, PR evidence. `npm run test:db` in `backend/` at `f097571`
with only `TEST_DATABASE_URL` set (the local `connectsphere-db` PostgreSQL 17
container on 127.0.0.1, random disposable schemas, every migration applied; no
shared database): 138/140 passed. The two failures are the same ones that fail
on clean `main` (recorded in `20261016-193201-lexinphun2024-debug-backend-db.md`).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S02_04 | an unsuitable request is accepted, Venue Staff see its advisory unmet requirements, and can approve it | PASS | Real `submitBooking` into a 20-place venue, then the staff list, the request and the approval all carry the saved "Capacity 20 …" mismatch |
| MULTIPLE | `venueBookingDecisions.integration.test.ts` (21 tests) | PASS | 21/21 against real PostgreSQL |
| MULTIPLE | `eventVisibility.integration.test.ts` and `registration.db.test.ts` | FAIL | `column e.venue_requirements does not exist`; `relation "public.users" does not exist`; same on clean `main` |
| MULTIPLE | rest of the real-database suite | PASS | 138/140 overall |

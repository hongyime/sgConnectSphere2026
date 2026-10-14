---
date: 2026-10-09T21:44:53+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 091026
database: real
commit: a592b0a
---

Migration-only PR for E06-S05 (SCRUM-138): `0013_tentative_venue_holds.sql`
on top of `main` at `a592b0a`, against a disposable local PostgreSQL 17
container on the loopback interface (never the application database). Run by
Claude for Amareet. `commit` is the base; the only change on top is the
migration file itself (plus a comment).

1. `npx tsx src/database/cli.ts reset` on the local dev database: migrations
   0001 to 0013 applied, seed completed.
2. 0013 applied twice more by a throwaway script: no error both times. Read
   back: `booking_status` = pending, confirmed, rejected, released,
   conflicting, tentative, expired; `venue_bookings.expires_at` timestamptz,
   nullable; partial index `venue_bookings_expires_at_idx` present; ledger
   latest = `0013_tentative_venue_holds.sql`.
3. `main`'s full `test:db` list in `backend/` with 0013 present (each test
   applies every migration file): 63 passed, 2 failed. The 2 failures
   (`eventVisibility.integration.test.ts`, `registration.db.test.ts`) also fail
   on `main` without this file on this Windows machine and pass in CI.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| NONE | 0013 applies after 0001 to 0012 and seeds | PASS | Via `cli.ts reset` |
| NONE | 0013 is idempotent | PASS | Two re-runs, no error |
| NONE | Deployed code still works with 0013 applied | PASS | 63/65; the 2 failures are pre-existing local-only ones, unrelated |

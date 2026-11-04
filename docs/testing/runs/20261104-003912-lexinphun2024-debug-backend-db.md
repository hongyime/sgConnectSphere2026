---
date: 2026-11-04T00:39:12+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "031126"
scope: backend/db
database: real
commit: 19e6a29
---

From `backend/`, `npm run test:db` at `19e6a29` (#416 with `main` merged in:
#415, #412) against isolated schemas in the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker), with every migration applied. 349 tests: 348 passed, 1 failed. The
failure is `registration.db.test.ts` ("relation public.users does not exist"):
it needs a migrated public schema the local test database does not have; CI runs
it against one, and this PR does not touch it. TC_E10S02_15's case now also
checks the unmoved booking's Venue Staff and a registered Attendee (#416 review).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_15, TC_E10S02_10 | A Session move flags only the overlapping support, asks only its technician to reconfirm and sends everyone else (technician, Coordinator, Venue Staff, Attendee) the date notice (`eventSessionsRoutes.integration.test.ts`) | PASS | |
| TC_E10S02_16 | A Session layout change below its registrations is warned about and removes no one (`eventSessionsRoutes.integration.test.ts`) | PASS | |
| MULTIPLE | Event and Session save routes refuse a stale preview with the fresh list and the sentence (`eventChangeRevisionRoute.integration.test.ts`) | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 348 of 349 passed; the one failure is `registration.db.test.ts` (local schema, not this PR) |

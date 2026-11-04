---
date: 2026-11-03T21:19:09+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "031126"
scope: backend/db
database: real
commit: a4f8b1d
---

From `backend/`, `npm run test:db` at `a4f8b1d` against isolated schemas in the
loopback `connectsphere_notification_test` database (native PostgreSQL 17; no
Supabase, no Docker), with every migration applied. 343 tests: 342 passed, 1
failed. The failure is `registration.db.test.ts` ("relation public.users does
not exist"): it needs a migrated public schema the local test database does not
have; CI runs it against one, and this PR does not touch it. Deliberate breaks
on this code: without the Session date notice the TC_E10S02_15 case fails;
without the over-subscription data the TC_E10S02_16 case fails; without the
sentence the Session stale-check route case fails.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_15, TC_E10S02_10 | A Session move flags only the overlapping support, asks only its technician to reconfirm and sends everyone else the date notice (`eventSessionsRoutes.integration.test.ts`) | PASS | |
| TC_E10S02_16 | A Session layout change below its registrations is warned about and removes no one (`eventSessionsRoutes.integration.test.ts`) | PASS | |
| MULTIPLE | The Session save route refuses a stale preview with the fresh list and the Event edit's sentence (`eventChangeRevisionRoute.integration.test.ts`) | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 342 of 343 passed; the one failure is `registration.db.test.ts` (local schema, not this PR) |

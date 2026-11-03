---
date: 2026-11-03T00:49:31+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "031126"
scope: backend/db
database: real
commit: 1bc9ddf
---

From `backend/`, `npm run test:db` at `1bc9ddf` against isolated schemas in the
loopback `connectsphere_notification_test` database (native PostgreSQL 17; no
Supabase, no Docker), with every migration applied. 341 tests: 340 passed, 1
failed. The failure is `registration.db.test.ts` ("relation public.users does
not exist"): it needs a migrated public schema the local test database does not
have; CI runs it against one, and this PR does not touch it. The new Session
case fails with `main`'s notice code (the technician got 0 notices) and passes
with the fix.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_15, TC_E10S02_10 | A Session move on the Session screen flags only the overlapping support and tells its technician (`eventSessionsRoutes.integration.test.ts`) | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 340 of 341 passed; the one failure is `registration.db.test.ts` (local schema, not this PR) |

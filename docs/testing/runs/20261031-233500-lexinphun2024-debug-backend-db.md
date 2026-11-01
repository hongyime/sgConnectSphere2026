---
date: 2026-10-31T23:35:00+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "311026"
scope: backend/db
database: real
commit: 8cc4317
---

From `backend/`, `npm run test:db` at `8cc4317` against isolated schemas in the
loopback `connectsphere_notification_test` database (native PostgreSQL 17; no
Supabase, no Docker), with every migration including 0026 applied. 328 tests:
327 passed, 1 failed. The failure is `registration.db.test.ts` ("relation
public.users does not exist"): it needs a migrated public schema the local test
database does not have; CI runs it against one, and this PR does not touch it.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_05, TC_E10S02_06, TC_E10S02_08, TC_E10S02_10, TC_E10S02_11, TC_E10S02_12, TC_E10S02_13 | Technical Support flag and reconfirmation (`supportReconfirmation.integration.test.ts`, `arrangementImpact.integration.test.ts`) | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 327 of 328 passed; the one failure is `registration.db.test.ts` (local schema, not this PR) |

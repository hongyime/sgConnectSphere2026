---
date: 2026-10-31T21:09:50+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "311026"
database: real
commit: ec9c64d
---

From `backend/`, `npm run test:db` against isolated schemas in the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker), with every migration including `0026_support_reconfirmation.sql`
applied. `ec9c64d` is this branch after `main` (with #392 and #393) was merged in,
so it covers `reconfirm_range`, which the earlier record `20261031-190403`
predates. 313 tests: 312 passed, 1 failed. The failure is
`registration.db.test.ts` ("relation public.users does not exist"): it needs a
migrated public schema the local test database does not have; CI runs it
against one, and this branch does not touch it.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | 0026 adds a not-null reconfirmation flag to Technical Support requests, defaulting to false | PASS | |
| MULTIPLE | a request written as the deployed code writes it is unflagged, and the flag can be set and cleared but not emptied | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 310 of the other 311 passed; the one failure is `registration.db.test.ts` (local schema, not this branch) |

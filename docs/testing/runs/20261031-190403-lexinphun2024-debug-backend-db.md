---
date: 2026-10-31T19:04:03+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "311026"
database: real
commit: f9e4fcb
---

From `backend/`, `npm run test:db` against isolated schemas in the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker), with every migration including the new
`0026_support_reconfirmation.sql` applied. The run used the working tree that
was then committed unchanged as `f9e4fcb` (`main` plus migration 0026, its
schema test, `backend/package.json` and docs). 295 tests: 294 passed, 1
failed. The failure is `registration.db.test.ts`, which needs a migrated
public schema the local test database does not have; CI runs it against one,
and this branch does not touch it.

The new schema test was also run with the migration file removed: both tests
failed, then passed again once it was restored. Migration 0026 was applied
twice to the local `connectsphere_dev_stack`: "applied", then "already
applied"; its one existing request reads `false`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | 0026 adds a not-null reconfirmation flag to Technical Support requests, defaulting to false | PASS | |
| MULTIPLE | a request written as the deployed code writes it is unflagged, and the flag can be set and cleared but not emptied | PASS | |
| MULTIPLE | Remaining backend database suite | FAIL | 293 of the other 294 passed; the one failure is `registration.db.test.ts` (local schema, not this branch) |

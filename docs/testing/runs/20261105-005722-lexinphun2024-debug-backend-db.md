---
date: 2026-11-05T00:57:22+08:00
runner: lexinphun2024-debug
environment: local
run_type: automated
test_case_version: "041126"
scope: backend/db
database: real
commit: 444b0a0
---

From `backend/`, `npm run test:db` at `444b0a0`, the SCRUM-250 branch head
(E08-S04 follow-up; same application code as `c70c90c`), against the loopback
`connectsphere_notification_test` database (native PostgreSQL 17; no Supabase,
no Docker). Before this run the database's public schema was migrated
(`cli.ts migrate`, through 0026), which `registration.db.test.ts` needs: it was
the one failure in 20261105-004842 and earlier local runs, and CI's
application checks do not run it. 358 tests: 358 passed, 0 failed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S04_05 | After a real safety approval, a reverted and reconfirmed event goes back to the Safety Officer for a new check (`autoSafetyReview.integration.test.ts`) | PASS | |
| MULTIPLE | Registration defaults, concurrent uniqueness and internal roles (`registration.db.test.ts`) | PASS | passes once the public schema is migrated |
| MULTIPLE | Remaining backend database suite | PASS | 358/358 |

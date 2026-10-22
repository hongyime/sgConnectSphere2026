---
date: 2026-10-20T00:10:07+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: c17c243
---

E09 migration-only branch `chore/e09-registration-schema`: migrations
`0023_registration_review_statuses.sql` and `0024_registration_sessions.sql`
as committed on this branch, run against base commit `c17c243`. Run by the
coding agent on Amareet's behalf; not a human manual acceptance run.

Database: a disposable PostgreSQL 17 database created for this run in the
local `connectsphere-test-pg` container on loopback (127.0.0.1:55433) and
dropped afterwards. Each migration file was piped to `psql
--single-transaction`, the same one-transaction-per-file shape the migration
CLI uses. The CLI itself was not run, so `DATABASE_URL` was never read. No
Supabase or production connection, seeding, ledger inspection or migration
application. This is not `npm run test:db`; GitHub Actions runs the
repository suites on the PR.

The fixture and check scripts are in
`docs/testing/runs/evidence/20261020-001007-amareetkm2024-del-backend-db/`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Migrations 0001-0024 apply to an empty database | PASS | All 23 migration files applied in order, one transaction each, with no error. |
| MULTIPLE | 0023 and 0024 upgrade a populated 0022 database | PASS | `fixture.sql` added two Events, three extra Sessions and three registrations (registered, withdrawn, waitlisted) before 0023; both files then applied. Re-running 0023 skipped both values ("already exists"). |
| MULTIPLE | Behaviour checks in `checks.sql` | PASS | 19 of 19 PASS, 0 FAIL: enum order; backfill selects every Session of the registration's own Event; second active registration rejected (23505); the seed self-check pair (registered then waitlisted) still rejected (23505); re-registration after withdrawal and after rejection allowed; same Session twice rejected (23505); Session from another Event rejected both ways (23503); deleting a selected Session alone rejected (23503); `manually_added` set and defaulting to false; deactivation-style withdrawal works; withdrawn rows keep their Sessions; deleting a registration or a whole Event leaves no orphans. Supports TC_E09S01_03 and TC_E09S01_07 at the database level only. |

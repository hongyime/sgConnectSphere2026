---
date: 2026-10-24T18:41:56+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 7cdc07a
---

SCRUM-152 / E05-S06, evidence for the migration-only PR adding
`0025_venue_unavailability.sql`. Native PostgreSQL on 127.0.0.1:5432 (no
Docker Desktop), database `connectsphere_notification_test`, with only
`TEST_DATABASE_URL` in the environment; each suite builds fresh disposable
schemas with every repository migration applied, 0025 included. No shared
Supabase database, reset or seeding, and no production migration.

From `backend/`: `npx tsx --test` with the eleven files below. The `date` is
when the run started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | `venueUnavailabilitySchema.integration.test.ts` (5 tests, new) | PASS | Pre-0025 block insert still saves as maintenance; open-ended allowed, missing start refused; lifted block stops refusing bookings, open-ended block refuses later dates; restore columns accept only pending/confirmed/tentative; history append-only with per-action shape, actor cleared on user delete, rows removed with their venue |
| MULTIPLE | existing venue, hold, buffer, search, calendar, booking-request, submission, decision, cancellation and audit-immutability integration suites (66 tests) | PASS | Unchanged application code against the migrated schema: compatibility with the deployed app |
| MULTIPLE | all eleven files | PASS | 71/71, zero failed, cancelled or skipped |

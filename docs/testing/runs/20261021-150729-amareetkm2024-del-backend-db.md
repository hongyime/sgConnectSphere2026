---
date: 2026-10-21T15:07:29+08:00
runner: amareetkm2024-del
scope: backend/db
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 5321312
---

Branch `feature/SCRUM-207-e09-registration-backend` (E09-S01 backend, stacked on #322), uncommitted changes on base `5321312`, run by the coding agent on Amareet's behalf on Windows 11.

Disposable PostgreSQL 17 in the local `connectsphere-test-pg` container on loopback (127.0.0.1:55433), via `TEST_DATABASE_URL`; each test uses its own schema and drops it. No Supabase or production connection; `DATABASE_URL` in `.env` was not used.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S01_01 | Open Event registration reserves a place in each selected Session | PASS | One `registered` row with Sessions A and B; confirmation notification and email delivery written with the published name only. |
| TC_E09S01_03 | Second active registration prevented | PASS | Second attempt returned 409 with the first registration unchanged; one row for the account. A concurrent double-submit gave exactly one 201 and one 409. |
| TC_E09S01_04 | Missing required detail blocks registration | PASS | Account without a contact number: 400 naming "Contact number" (T-32, O-05); nothing written. |
| TC_E09S01_05 | Unconfirmed event refused | PASS | Planning event: form and registration both refused with 409. |
| TC_E09S01_06 | Event shows primary venue, Sessions show their own | PASS | Event: Grand Auditorium (primary booking); Sessions: Grand Auditorium and Seminar Room B. |
| TC_E09S01_07 | Multiple Sessions in one Event registration | PASS | Both Sessions linked to one registration; re-registration allowed after withdrawal. |
| MULTIPLE | Regression: `attendeeVisibility` and `eventSessionsMigration` integration tests | PASS | Run in the same command (`npx tsx --test` on three files): 3/3 passed. |

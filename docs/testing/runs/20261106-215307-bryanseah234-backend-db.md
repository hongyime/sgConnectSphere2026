---
date: 2026-11-06T21:53:07+08:00
runner: bryanseah234
scope: backend/db
environment: ci
run_type: automated
test_case_version: 061126
database: real
commit: f678f04
pr: 454
---

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-32 coordinator assignment PostgreSQL acceptance | PASS | `npx tsx --test tests/coordinatorAssignment.integration.test.ts tests/coordinatorNotifications.integration.test.ts` passed against the workflow's disposable PostgreSQL database. [Application Checks run 42229098345](https://github.com/hongyime/sgConnectSphere2026/actions/runs/42229098345). |
| MULTIPLE | T-72 fresh database migration and role sign-in verification | PASS | `tsx src/database/cli.ts reset` applied `0027_event_assignment_actor.sql`; `tsx src/database/verifyT72RoleSignins.ts` passed and confirmed the 27-file migration ledger. Both commands ran in the same disposable PostgreSQL service in CI. |

Session summary: PR #454 Application Checks passed, including migration 0027 on a disposable PostgreSQL database. No production database operation was run.

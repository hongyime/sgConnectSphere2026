# Production migration run — 0018_venue_staff_assignments.sql

- Started (UTC): 2026-10-16T02:03:04Z
- Operator: deploy owner
- Merged PR: #271 (SCRUM-189 migration-only PR)
- `main` commit: 7cd49c2
- Migration file: `backend/database/migrations/0018_venue_staff_assignments.sql`
- Pre-run ledger check: PASS — 18 entries; `0012_user_role_enum_additions.sql` appears once, 0018 was absent, and 0018 was the only pending migration. The expected users/venues UUID metadata, `venue_staff` role, public schema/search path, and required DDL privileges were present; project URL alignment passed.
- Command: `npx tsx src/database/cli.ts migrate --only 0018_venue_staff_assignments.sql` from `backend/`
- Outcome: PASS — CLI reported `applied migration 0018_venue_staff_assignments.sql`.
- Post-run ledger check: PASS — 19 entries; 0018 appears once, with no other migration applied and no migration files pending. The expected four columns, two foreign keys, primary key, active-period check, staff index, and table/column comments are present.
- Notes: The migration created schema only. No assignment or other application rows were queried or written; no reset, seed, other migration, deployment, or application configuration change was performed.

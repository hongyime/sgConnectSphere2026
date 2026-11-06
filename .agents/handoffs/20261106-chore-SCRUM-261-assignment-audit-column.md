# Add the Lead assignment actor column for SCRUM-261

Add the nullable `events.assigned_by` foreign key needed by the E03-S08 application PR #453. The repository's production release sequence requires this schema change to land in a migration-only PR before dependent application code is released.

## Done so far

- Created this branch from `origin/main` for the migration-only change.
- CI for #453 exposed the missing `assigned_by` column in the PostgreSQL acceptance tests.
- Added nullable `events.assigned_by` referencing `users(id)`; existing rows remain null because prior assignments were automatic.
- Updated `docs/db_schema.md` to identify migration 0027 as the source of the column.

## Next

- Push this branch and open a migration-only PR linked to #453.
- The production migration must be separately applied and verified after merge through the protected workflow; no production database operation is part of this task.

## Verification

- `python scripts/check.py` passed on `e46dcff`; repository checks passed and 207 tooling tests passed. The output warns that secondary worktrees are present.
- `python scripts/doc_guard.py` passed with 0 errors and 188 existing missing-front-matter warnings.
- CI Application Checks passed on `f678f04`; disposable PostgreSQL applied migration 0027 and verified its migration ledger. The run is recorded in `docs/testing/runs/20261106-215307-bryanseah234-backend-db.md`.
- No database suite or production database operation was run locally. The deploy owner must apply and verify the migration after merge through the protected workflow.

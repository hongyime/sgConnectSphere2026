# Add the Lead assignment actor column for SCRUM-261

Add the nullable `events.assigned_by` foreign key needed by the E03-S08 application PR #453. The repository's production release sequence requires this schema change to land in a migration-only PR before dependent application code is released.

## Done so far

- Created this branch from `origin/main` for the migration-only change.
- CI for #453 exposed the missing `assigned_by` column in the PostgreSQL acceptance tests.
- Added nullable `events.assigned_by` referencing `users(id)`; existing rows remain null because prior assignments were automatic.

## Next

- Run the repository checks, push, and open a migration-only PR linked to #453.
- The production migration must be separately applied and verified after merge through the protected workflow; no production database operation is part of this task.

## Verification

- `python scripts/check.py` and `python scripts/doc_guard.py` passed before the handoff-only first commit.
- Re-run both checks on the migration diff before committing it.

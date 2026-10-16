# Production migration 0012 run

Apply only the merged `0012_user_role_enum_additions.sql` migration after verifying the production target and live ledger, then record the actual result for review. This is an isolated `docs/production-migration-0012-run` branch based on current `origin/main`; do not apply any other migration.

## Status

Pre-run review confirmed PR #232 is merged at current `main` (`0379cb2`) and its exact migration file adds `event_coordinator_lead` and `safety_officer` using `IF NOT EXISTS`. The live production target and ledger have not yet been revalidated in this task.

## Next actions

1. Revalidate the `.env` production target identity without printing the URL or credentials.
2. Read the migration ledger and role enum metadata in a read-only transaction; compare ledger entries with current migration files.
3. If and only if 0012 is pending and both labels are absent, run the exact `--only 0012_user_role_enum_additions.sql` command once from `backend/`.
4. Re-read the ledger and role enum metadata; stop on any command failure or unexpected change.
5. Write and commit the UTC run record before any other production migration. Update this handoff with observed results, run `python scripts/check.py`, and open a scoped docs PR.

## Safety

No application rows are in scope. Do not run 0017, 0018, all-pending migrations, reset, seed, or any unrelated write. Never record target URLs, credentials, account IDs, personal data, or application rows.

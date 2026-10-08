# Handoff — docs/production-migrations

Goal: Document who applies production Supabase migrations after merge, the manual migrate and read-only verification steps, stop conditions, and the repository record for each attempt.

## Done so far

- Added `docs/ops/production-migrations.md` and linked it from the README guide list.
- The procedure assigns migration work to the deploy owner role, requires a pre-run `_connectsphere_migrations` check, applies migrations manually, verifies each migration, stops on failure, and requires a committed run record.
- Schema-dependent releases use a migration-only PR first, with backward-compatible SQL; the application-code PR stays unmerged until the post-run ledger check passes. Incompatible changes require a reviewed production deployment hold and resume control, which the current workflow does not provide.
- Documented the current CLI behavior observed in `backend/src/database/cli.ts`: it applies all files missing from the ledger, so the operator must stop if more than one file is pending.
- Committed the docs and initial T-65 run record as `ce70ff8`; the branch is pushed to `origin/docs/production-migrations`.
- No production database connection or migration was run for this documentation change.

## Next

- Push the review fixes and wait for required CI checks and human approval; `main` protection disables bypass.

## Verification

- `python scripts/check.py`: PASS — repository hygiene and 87 tooling tests; a T-65 tooling session record was added.
- No application build, runtime test, or production database operation was run.

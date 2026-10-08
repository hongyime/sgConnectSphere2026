# Handoff — docs/production-migrations

Goal: Document who applies production Supabase migrations after merge, the manual migrate and read-only verification steps, stop conditions, and the repository record for each attempt.

## Done so far

- Added `docs/ops/production-migrations.md` and linked it from the README guide list.
- The procedure names Bryan as deploy owner, requires a pre-run `_connectsphere_migrations` check, applies migrations manually, verifies each migration, stops on failure, and requires a committed run record.
- Documented the current CLI behavior observed in `backend/src/database/cli.ts`: it applies all files missing from the ledger, so the operator must stop if more than one file is pending.

## Next

- Commit the docs, handoff, and T-65 run record; push the branch and open a PR because `main` requires a reviewed PR.

## Verification

- `python scripts/check.py`: PASS — repository hygiene and tooling tests; 87 tests passed.
- No production database connection or migration was run for this documentation change.

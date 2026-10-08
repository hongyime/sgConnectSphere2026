# Handoff — docs/production-migrations

Goal: Document who applies production Supabase migrations after merge, the manual migrate and read-only verification steps, stop conditions, and the repository record for each attempt.

## Done so far

- Added `docs/ops/production-migrations.md` and linked it from the README guide list.
- The procedure names Bryan as deploy owner, requires a pre-run `_connectsphere_migrations` check, applies migrations manually, verifies each migration, stops on failure, and requires a committed run record.
- Documented the current CLI behavior observed in `backend/src/database/cli.ts`: it applies all files missing from the ledger, so the operator must stop if more than one file is pending.
- Committed the docs and initial T-65 run record as `ce70ff8`; the branch is pushed to `origin/docs/production-migrations`.
- `python scripts/check.py` passed on `ce70ff8` with 87 tooling tests; the run is recorded in the latest tooling session file under `docs/testing/runs/`.
- No production database connection or migration was run for this documentation change.

## Next

- Open the reviewed PR and wait for the required CI checks and one human approval; `main` protection disables bypass.

## Verification

- `python scripts/check.py`: PASS — repository hygiene and tooling tests; 87 tests passed.
- `python scripts/check_test_run_records.py`: PASS — all 160 records validated before this latest record was added.
- Staged-file hooks passed on `ce70ff8`.

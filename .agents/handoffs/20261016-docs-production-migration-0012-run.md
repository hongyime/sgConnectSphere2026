# Production migration 0012 run

Apply only the merged `0012_user_role_enum_additions.sql` migration after verifying the production target and live ledger, then record the actual result for review. This is an isolated `docs/production-migration-0012-run` branch based on current `origin/main`; do not apply any other migration.

## Completed

- Refreshed `origin/main`; PR #232 is merged at `0379cb2`. Its exact migration adds `event_coordinator_lead` and `safety_officer` using `IF NOT EXISTS`, and changes no application rows.
- Parsed `.env` values without shell evaluation. `DATABASE_URL` and `SUPABASE_URL` identified the same Supabase project; no URL or credential was printed or recorded.
- Read the live ledger and `user_role` metadata in read-only transactions. Before the run, there were 17 ledger entries, 0012 was pending, both labels were absent, every ledger entry had a corresponding migration file, and 0018 was the only other pending migration file on `main`.
- Ran exactly once from `backend/`: `npx tsx src/database/cli.ts migrate --only 0012_user_role_enum_additions.sql`. The CLI exited 0 and reported `applied migration 0012_user_role_enum_additions.sql`.
- The read-only postcheck found 18 entries, with 0012 as the sole addition at `2026-10-16T00:36:07.157Z`; both expected role labels are present. No 0017 migration file was present on this `main`; migration 0018 was not invoked.
- The sanitized run record is `docs/ops/production-migration-runs/20261016-0035-0012_user_role_enum_additions.md`. Commit that record promptly and before any later production migration.
- The production run record was committed as `c1a12ea` before any other production migration.
- An unauthenticated public health GET returned HTTP 200 with JSON `ok: true`; its automated runtime record is `docs/testing/runs/20261016-083919-bryanseah234-runtime.md`.
- `python scripts/check.py` passed repository hygiene and all 140 tooling tests and validated 326 test-run records. It warned about pre-existing secondary worktrees; none were removed. The final run record is `docs/testing/runs/20261016-084338-bryanseah234-tooling.md`; an earlier check is recorded in `docs/testing/runs/20261016-084013-bryanseah234-tooling.md`. These are repository/tooling results only, not application tests or a manual end-to-end run.

## Remaining

1. PR #284 is open as a draft on `docs/production-migration-0012-run`, based on `main` `51ab016`; its created head was `08d25fe` and GitHub reported it mergeable. Required checks were pending at handoff update.
2. The standalone PostPlan is published at https://22bmq2ghvwas.postplan.dev and linked in top-level PR comment https://github.com/hongyime/sgConnectSphere2026/pull/284#issuecomment-6205501765.
3. Wait for required checks on the final branch head, request teammate review from CODEOWNERS, and mark the PR ready when the normal review gate is met. Do not apply another production migration from this task.

## Safety

No application rows are in scope. Do not run 0017, 0018, all-pending migrations, reset, seed, or any unrelated write. Never record target URLs, credentials, account IDs, personal data, or application rows.

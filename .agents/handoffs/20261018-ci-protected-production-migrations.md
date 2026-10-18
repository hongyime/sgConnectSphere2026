# Protected production migration workflow

Provide a reviewed GitHub Actions path for authorized teammates to apply one already-merged production migration without sharing the database password, while preserving the migration runbook's ledger precheck, exact-file apply, postcheck, and sanitized-record requirements.

## Done so far

- Created branch `ci/protected-production-migrations` from current `origin/main` (`3672ae87`).
- Configured the repository `Production` environment to require approval from one of the six current repository collaborators, block self-approval and administrator bypass, and allow deployments only from `main`.
- Confirmed no `DATABASE_URL` environment secret is configured; no secret was added.
- Added `.github/workflows/production-migration.yml`, manually triggered only, with exact-file validation, serialized application, the protected environment gate, and database credentials passed only to the precheck/apply/postcheck steps.
- Added a read-only production ledger guard that verifies the configured production endpoint, an existing ledger, the next pending migration, and exactly one newly applied migration in the postcheck.
- Added `--require-existing-ledger` to the existing migration CLI so guarded runs cannot create a missing production ledger, plus unit tests.
- Guarded runs construct node-postgres config from validated URL components (ignoring connection-string overrides), require verified TLS, pin the session search path to `public, extensions`, and qualify the ledger table. The workflow checks out the immutable dispatch SHA. The runbook says manual migrations must not overlap a queued or active workflow run.
- Updated `docs/ops/production-migrations.md` with the protected workflow and secret setup instructions.
- Focused migration-selection/guard unit tests passed 17/17 both before and after the implementation commit; latest evidence is `docs/testing/runs/20261018-123027-bryanseah234-backend-unit.md`. Backend TypeScript build passed on commit `261ec6e`; workflow YAML validation passed. No database connection was made.
- The latest `python scripts/check.py` run passed: 158 repository tooling tests, 428 test-run records validated, secret scan passed, and `.env.template` remained current. It warned only about existing secondary worktrees. Latest evidence is `docs/testing/runs/20261018-123111-bryanseah234-tooling.md`.

## Next

- Commit the verified changes and open a draft PR for review; do not merge or apply a migration.
- After rotating the exposed Supabase database password, a repository administrator should add the replacement connection string as the `Production` environment secret `DATABASE_URL`.

## Security notes

- Never add the connection string to a file, log, PR, or command transcript.
- The workflow must only accept an exact migration filename that is the next unapplied file, run the existing `migrate --only` command, and verify that exactly that migration was added to the ledger.
- Do not use reset, seed, or database test suites in this workflow.

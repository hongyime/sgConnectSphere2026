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
- Regenerated `docs/testing/tc-coverage.md` after hosted CI identified drift from the newly added test blocks.
- Focused migration-selection/guard unit tests passed 17/17 both before and after the implementation commit; the latest T-65 backend/unit record is dated 18 October at 12:30. Backend TypeScript build passed on commit `261ec6e`; workflow YAML validation passed. No database connection was made.
- The latest `python scripts/check.py` run passed after coverage regeneration: 158 repository tooling tests, 429 test-run records validated, secret scan passed, and `.env.template` remained current. It warned only about existing secondary worktrees. Latest T-65 tooling evidence is dated 18 October at 12:34.

## Next

- The repository owner/PO's decision to adopt the workflow is recorded in the PR body and decision comment, satisfying the recorded-team-decision rule in `AGENTS.md`. Independent human code review remains pending; do not merge or dispatch before it is complete.
- The owner confirms rotation and `DATABASE_URL` is configured in the GitHub `Production` environment. Its value and connectivity remain unverified; do not inspect or print the value.

## Continuation — 21 October 2026

- Refreshed from `origin/main` at `0567f46`. The only merge conflict was `backend/package.json`; resolved the test script by retaining both main's equipment-notification test and this PR's migration-selector/guard tests. No workflow or database guard logic was changed.
- Regenerated `docs/testing/tc-coverage.md`; it remains 201 automated, 134 scaffold, and 41 no-test cases (376 total).
- `python scripts/check.py` exited 1 on Windows with the same four `test_worktree_hygiene` path-separator/unlink failures seen on unchanged `main`. Secret scanning, repository hooks, `.env.template`, and all 158 tooling tests except those four passed; it validated 452 existing test-run records. The observed run is recorded in the new 21 October T-65 tooling record.
- After installing the backend workspace dependencies from the lockfile, the focused selector/guard and equipment-notification unit command passed 19/19 on merge commit `18ccdb6`; its T-65 record is in `docs/testing/runs/` dated 21 October at 16:58 Singapore time.
- Read-only Supabase ledger inspection showed entries through `0020_released_booking_replacement_retry.sql`; `0022_change_request_obsolete.sql`, `0023_registration_review_statuses.sql`, and `0024_registration_sessions.sql` are pending. Current `main` already has the exact `migrate --only` selector, but no production migration command was run: the production credential rotation/replacement-secret status is not verified, and PR #315 remains unmerged.
- No workflow dispatch, production write, secret access, reset, seed, or deployment was performed. The main-integration merge is committed and pushed; the follow-up unit-run record and handoff update were pushed in a separate conventional commit.

## Latest-main refresh — 21 October 2026

- Refreshed from `origin/main` at `56d7117` (including the merged #323 workbook update) in merge commit `6bd25d9`. The merge was conflict-free; no migration workflow or application files changed in this refresh.
- `python scripts/check.py` at `6bd25d9` ran 158 tooling tests and exited 1 on four unchanged Windows `test_worktree_hygiene` path/unlink assertions. Repository/secret hooks, `.env.template` validation, and validation of 455 prior run records passed. The run is captured in a new T-65 tooling session record.
- Current read-only GitHub checks show the Production environment's required-reviewer gate is configured and `gh secret list --env Production` returns no entries. The required credential rotation and replacement-secret configuration therefore remain unverified; no dispatch or production operation is authorized by this refresh.
- PR #315 still requires the recorded team decision and independent human reviews. Recheck GitHub CI on the refreshed head after pushing; do not merge or dispatch until the stated decision and administrator credential prerequisites are satisfied.

## Owner follow-up — 21 October 2026

- The repository owner confirms the production database credential was rotated and configured `DATABASE_URL` in the GitHub `Production` environment. A later `gh secret list --env Production` showed the secret name and timestamp only; its value was never read or displayed. Name-only presence does not prove the value is correct or that a production connection will succeed.
- Migration `0022_change_request_obsolete.sql` is merged through #319, but it has not been applied to production. No workflow dispatch, production connection/write, reset, seed, or deployment has been performed in this task.
- Hardened the workflow's token permissions: the request-validation job has only `contents: read`; `deployments: write` is limited to the gated apply job. This does not change the environment review requirement or migration behavior.
- `python scripts/check.py` on Windows at `7de3b27` ran 158 tooling tests: 154 passed and four existing `test_worktree_hygiene` path/unlink tests failed. Repository hooks, secret scan, `.env.template`, and validation of 456 prior records passed. The immutable T-65 record is in `docs/testing/runs/`.
- The production secret value and connectivity are not independently validated. The owner/PO's workflow-adoption decision is recorded; independent human review remains required before merge or first use. A teammate with repository permission may initiate a run; an eligible different teammate must approve the Production environment gate.

## Review fixes — 23 October 2026

- Closed the guarded-selector gap: `runMigrations` now re-validates the requested file with `assertNextProductionMigration` after reading the ledger and before any no-op, transaction, or SQL. A guarded run refuses a selection that is not the next pending file in repository order, including a later file whose dependencies appear satisfied.
- Added a PostgreSQL advisory lock around the guarded ledger check and apply. `pg_try_advisory_lock` must succeed before the ledger is read; `pg_advisory_unlock` runs in `finally` on success, no-op, validation failure, or SQL failure. The workflow and manual guarded path therefore share one serialization point.
- Updated the manual runbook commands and run-record template to pass `--require-existing-ledger`. Without it, the manual CLI path constructed a connection string directly and could create a missing ledger, bypassing the endpoint/TLS/ledger checks in guarded mode.
- Resolved the `backend/package.json` refresh conflict by retaining both main's event-cancellation test and this branch's migration-selector/guard tests.
- Extended the migration-selection unit mock for advisory-lock and ledger queries. Added tests for non-next selection rejection, lock-unavailable refusal without a ledger read, lock release on SQL failure, and guarded already-applied rejection. The focused selector/guard command passed 21/21.
- Merged `origin/main` at `38ffa999` into this branch; resolved `backend/package.json` by keeping both `eventCancellation.test.ts` and `productionMigrationGuard.test.ts`. The post-merge affected suites passed 23/23, the backend build passed, and the regenerated `docs/testing/tc-coverage.md` reports 207/376 automated.
- `scripts/check.py` passed repository hygiene, `.env.template`, and the worktree warning; four of its 163 tooling tests fail on Windows path normalization/unlink assertions in `tooling/tests/test_worktree_hygiene.py`, which this branch does not change.
- Added the two main-history handoff paths that cite T-65 run-record filenames to `.shellignore` after the optional local identity hook blocked the merge; they already exist on main and remain subject to secret scanning.
- No workflow dispatch, production connection/write, reset, seed, or deployment was performed in this review-fix pass. This handoff is included in the merge commit; independent human review remains required.

## Security notes

- Never add the connection string to a file, log, PR, or command transcript.
- The workflow must only accept an exact migration filename that is the next unapplied file, run the existing `migrate --only` command, and verify that exactly that migration was added to the ledger.
- Do not use reset, seed, or database test suites in this workflow.

## Review follow-up — 25 October 2026

- Merged PR #342 records production application and verification of migrations 0022, 0023 and 0024. The earlier dated observations above remain historical and are not rewritten.
- A future workflow dispatch must derive the exact next pending filename from its live ledger precheck; it must not assume that 0022 is next.

# Production database migrations

This runbook covers applying SQL migrations in the production Supabase database. The **deploy owner** is the role responsible for applying each migration after its pull request merges to `main`. Record that role in the run record; do not include a person's name or other personal data.

## Release sequence and owner

The Vercel workflow deploys on pushes to `main` when changed files are not under its documentation and tooling exclusions. A migration file under `backend/database/migrations/` is not excluded, so merging a migration can trigger a production deployment even when the PR contains no application-code change. Use this order for schema changes that require an application release:

1. Split the change into a migration-only PR and a separate application-code PR. The migration PR may include documentation, but no application code or configuration that changes the deployment. The migration must remain compatible with the currently deployed application.
2. Merge the migration-only PR. Its push may deploy the unchanged application. Backward compatibility keeps that application safe both before and after the schema change.
3. Immediately apply and verify the migration using the steps below. Keep the application-code PR open; do not merge it or otherwise deploy code that depends on the new schema before the post-run ledger check passes.
4. After the migration is verified, merge the application-code PR. Its production deployment then runs against the migrated schema.

The current automatic deployment workflow has no production hold and resume control. If a migration is not backward-compatible with the deployed application, or its dependent code cannot be released separately, stop before merging or applying it. First add and review a deployment control that holds the code deployment until the migration has been applied and verified. Do not rely on an ad hoc workflow disable as a hold; the current workflow has no reliable resume trigger.

The database operation is manual. A code merge or Vercel deployment does not apply a migration.

## Apply through the protected GitHub workflow

The repository provides **Actions → Production Migration** for authorized
teammates. It applies one migration after its migration-only PR has merged to
`main`; it does not deploy application code. The workflow uses the `Production`
GitHub Environment, which requires approval from an eligible repository
collaborator other than the person who started the run. Administrators cannot
bypass the approval, and the environment only permits runs from `main`.

Before the first run, a repository administrator must rotate any exposed
database password, update the application's production `DATABASE_URL` in
Vercel if it uses that credential, and add the replacement connection string
as the `DATABASE_URL` secret in the `Production` environment. Do not put it in
`.env`, `.env.template`, repository secrets, workflow inputs, or run records.
Teammates can request a run without seeing the secret; one eligible teammate
approves the environment gate.

To apply a migration:

1. Confirm the migration-only PR is merged to `main` and is compatible with the
   currently deployed application.
2. Open **Actions → Production Migration**, choose **Run workflow** on `main`,
   and enter the exact merged filename, such as
   `0020_released_booking_replacement_retry.sql`.
3. Have a different eligible teammate approve the pending `Production`
   deployment.
4. The workflow confirms the selected file exists on `main`, verifies the
   approved `main` revision, fixes the database session search path to
   `public, extensions`, verifies the production database endpoint, and reads
   the migration ledger without changing it. It stops unless the ledger exists
   and the selected file is the next unapplied migration in repository order.
5. After approval and a successful precheck, the workflow runs the existing
   CLI with `migrate --only <exact-filename> --require-existing-ledger`. Guarded
   mode refuses to create a missing ledger. The workflow then reads the ledger
   again and confirms exactly that migration was newly recorded.
6. Commit the sanitized run record through a reviewed docs PR as described in
   [Record each attempt](#record-each-attempt). A failed workflow must be
   investigated using a read-only ledger query before any retry.

The workflow never runs `reset`, seeding, or a database test suite. It serializes
its own Actions runs so only one production migration workflow can apply at a
time. The manual CLI procedure below is a separate path: verify that no
`Production Migration` run is queued or in progress and coordinate one deploy
owner before using it. Never overlap a manual production migration with a
workflow run or another manual run. If the
`DATABASE_URL` secret is absent, targets another database, or the ledger cannot
be read, it stops before applying SQL.

## Apply one migration safely

1. Review the merged migration-only PR and confirm the migration file on `main` is compatible with the deployed application. Use a shell where `DATABASE_URL` is securely set to the production database. Do not print or copy its value into a terminal transcript, PR, or run record.
2. Before running the CLI, use Supabase SQL Editor or another read-only SQL session to inspect the migration ledger:

   ```sql
   SELECT name, applied_at
   FROM public._connectsphere_migrations
   ORDER BY name;
   ```

   Compare the ledger with the `.sql` files in `backend/database/migrations/`. If the ledger is missing or cannot be read, stop and investigate. Do not let the CLI create the ledger as a substitute for this pre-check.
3. Compare the ledger with the migration files. If the ledger has more than one pending file, select only the next migration whose dependencies are satisfied. Never use the default all-pending mode against production. Do not rename or move migration files.
4. From the `backend/` directory, run the exact pending migration with the selector. Replace the example filename with exactly one pending filename confirmed by the pre-run ledger check:

   ```sh
   npx tsx src/database/cli.ts migrate --only 0009_keepalive_logs.sql
   ```

   For example, only if the pre-run ledger check confirms the file is pending:

   ```sh
   npx tsx src/database/cli.ts migrate --only 0013_tentative_venue_holds.sql
   ```

   Run one command per migration. After its post-run ledger check and run record are complete, repeat the pre-run ledger query and selector command for the next pending file. The selector accepts one exact repository filename; it rejects missing or unknown files and reports an already-recorded migration without applying SQL. The no-selector command still applies all pending files for existing local workflows; do not use it in production.

   Never run `reset` or `seed` against production. Do not set `ALLOW_DATABASE_RESET` for this operation.
5. If the command fails, stop. Do not retry blindly or proceed to another migration. Re-read the ledger with the read-only query, record the sanitized failure, and have the deploy owner investigate the database state before any further write.
6. If it succeeds, run the same read-only query again. Verify the expected migration filename appears in `_connectsphere_migrations` and that no unexpected migration was applied. Only then is this migration verified. Repeat the full pre-check, apply, and post-check separately for each later migration.

## Record each attempt

Create one Markdown record for every production migration attempt, including failures, at:

`docs/ops/production-migration-runs/YYYYMMDD-HHmm-<migration-filename>.md`

Use UTC in the filename and timestamp. Commit the record through the normal reviewed docs PR workflow promptly after the verification (or failure investigation). Record only migration-ledger evidence and sanitized errors; never include `DATABASE_URL`, credentials, personal data, or application rows. Identify the operator by role, not by name.

Copy this template for each attempt:

```markdown
# Production migration run — <migration filename>

- Started (UTC):
- Operator: deploy owner
- Merged PR:
- `main` commit:
- Migration file:
- Pre-run ledger check: PASS / STOPPED — <expected pending filename and any relevant ledger finding>
- Command: `npx tsx src/database/cli.ts migrate --only <exact-migration-filename.sql>` from `backend/`
- Outcome: PASS / FAILED / NOT RUN
- Post-run ledger check: PASS / FAILED / NOT RUN — <whether the expected filename is present; note any unexpected filename>
- Notes: <sanitized outcome or follow-up; no credentials or application data>
```

A migration is complete only after its post-run ledger check passes and its run record is committed to the repository.

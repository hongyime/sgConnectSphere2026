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

## Apply one migration safely

1. Review the merged migration-only PR and confirm the migration file on `main` is compatible with the deployed application. Use a shell where `DATABASE_URL` is securely set to the production database. Do not print or copy its value into a terminal transcript, PR, or run record.
2. Before running the CLI, use Supabase SQL Editor or another read-only SQL session to inspect the migration ledger:

   ```sql
   SELECT name, applied_at
   FROM public._connectsphere_migrations
   ORDER BY name;
   ```

   Compare the ledger with the `.sql` files in `backend/database/migrations/`. If the ledger is missing or cannot be read, stop and investigate. Do not let the CLI create the ledger as a substitute for this pre-check.
3. Confirm exactly one migration file is pending, and that it is the migration from the merged PR. The current CLI applies **every** migration file absent from `_connectsphere_migrations`, in filename order; it has no per-file selector. If more than one file is pending, stop. Do not run the CLI, rename or move migration files, or try to work around the CLI. Arrange a supported one-at-a-time path before proceeding.
4. From the `backend/` directory, run only the migrate command:

   ```sh
   npx tsx src/database/cli.ts migrate
   ```

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
- Command: `npx tsx src/database/cli.ts migrate` from `backend/`
- Outcome: PASS / FAILED / NOT RUN
- Post-run ledger check: PASS / FAILED / NOT RUN — <whether the expected filename is present; note any unexpected filename>
- Notes: <sanitized outcome or follow-up; no credentials or application data>
```

A migration is complete only after its post-run ledger check passes and its run record is committed to the repository.

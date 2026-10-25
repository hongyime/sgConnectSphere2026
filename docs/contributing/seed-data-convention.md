# Seed data and credential-sharing convention

## Seed script location

The seed logic lives in `backend/src/database/cli.ts`, **not** in `scripts/`.
Run it from the repository root:

```text
npm run db:seed:test --workspace backend   # truncate managed tables + seed
npm run db:reset --workspace backend       # drop schema + migrate + seed
npm run db:validate --workspace backend    # migrate + seed + constraint checks
```

The seed inserts deterministic data using `stableUuid()` (SHA-1-based), so
re-seeding produces identical UUIDs. The account inventory is 15 users: 3 Event
Organisers, 2 Event Coordinators, 2 Venue Staff, 2 Technical Support Staff,
4 Attendees, 1 Event Coordinator Lead and 1 Safety Officer. `cli.ts` is
authoritative for the complete fixture set. These are local/CI seed profiles,
not a count of live Supabase accounts; do not infer other fixture counts from
this guide's older inventory.

## Credentials

All seeded accounts share one password, defined by the `seedCredential`
constant in `backend/src/database/cli.ts`. The seed hashes that same value
for every account, so they all change together.

There is no environment-variable override. Setting `SEED_PASSWORD` has no
effect, because no code reads it -- an earlier version of this guide
described such a variable and a fallback default, and neither ever existed.
`tests/seed/SEED_DATA.md` documents the named fixtures. Its additional staff
profiles refer to `seedCredential`; the CLI remains authoritative for the
actual current profiles and credential. The archived scaffold copy is historical.

The value is suitable only for local development and disposable test
databases. Treat any environment seeded with it as having publicly known
credentials, because the constant is committed to this repository.

The only approved production account exception is provisioning the one existing
Safety Officer demo profile when a read-only precheck confirms it is missing,
under `docs/ops/demo-account-provisioning.md` and T-97. This narrow operation
does not authorize general production seeding or resetting, shared-database
tests that commit writes, or other account creation. Local and CI resets remain
confined to their intended disposable environments.

**Rules:**

1. **Never commit real passwords, API tokens, or Supabase service-role keys.**
   Use `.env` (gitignored) or a shared secret store. `.env.template` documents
   the variable names with empty values.
2. When inserting real test users into the shared Supabase database, **announce
   in the team group chat first** with:
   - the email addresses being inserted,
   - the purpose (e.g. "E03-S01 coordinator assignment testing"),
   - whether the insertion replaces existing seed data.
3. Use `TEST_DATABASE_URL` for integration tests. It must point to a loopback
   address (`127.0.0.1` or `localhost`) only — the test harness in
   `backend/tests/helpers/loginDatabase.ts` enforces this.
4. The CI workflow (`application-checks.yml`) provisions its own disposable
   PostgreSQL 17 + Redis services. No shared credentials are used in CI.

## Local developer setup for integration tests

Add to your `.env` (not committed):

```text
TEST_DATABASE_URL=postgresql://postgres:your-local-password@127.0.0.1:5432/connectsphere_notification_test  # pragma: allowlist secret
```

Create the database if it doesn't exist:

```text
createdb connectsphere_notification_test
```

Then run:

```text
npm run test:auth:db --workspace backend
npm run test:notifications --workspace backend
```

Each test creates a random UUID schema, runs migrations into it, executes
assertions, and `DROP SCHEMA … CASCADE` on teardown. No cleanup is needed.

## Local database runtime

Docker Desktop is not part of the local database-test workflow. Local suites that need disposable data use a native PostgreSQL installation and a loopback TEST_DATABASE_URL. The existing Supabase test schema supports only the rollback-based deactivation test; see docs/testing/supabase-test-schema.md before using it. Never reset, seed, or run a database suite that commits writes against the shared Supabase project.

GitHub Actions provisions its own PostgreSQL and Redis service containers in CI. No Docker Desktop setup is required on contributor machines.

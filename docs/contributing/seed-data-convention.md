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
re-seeding produces identical UUIDs. Current fixture set: 2 client orgs,
13 users (3 organisers, 2 coordinators, 2 venue staff, 2 tech support,
4 attendees), 3 room layouts, 2 venues, 2 equipment items, 5 events.

## Credentials

All seeded accounts use the password defined in the `SEED_PASSWORD`
environment variable. If `SEED_PASSWORD` is not set, the seed falls back to
a hardcoded default suitable only for local development.

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

## Docker

Docker is **not used** anywhere in this repository. The CI PostgreSQL and Redis
services are provisioned by GitHub Actions service containers
(`.github/workflows/application-checks.yml`). The team action item to
"document why Docker is used" is closed as N/A — there is nothing to document.

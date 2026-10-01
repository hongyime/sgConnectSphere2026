# Running database tests against the Supabase `test` schema

This explains how to run database-backed tests without installing or
containerising PostgreSQL locally, by using the `test` schema inside the shared
Supabase project. It also states plainly which tests can use it today and which
cannot, so nobody assumes more coverage than exists.

Background decision: BDR **T-59**, "use a test schema in the same Supabase DB
instead of a separate test project", confirmed 2026-09-18. Tracking ticket:
**SCRUM-109**.

## Which schema do I use?

`test`. There is exactly one, it already exists, and you do not create it.

It mirrors the application tables under `test.<table>` alongside the live
`public.<table>`. Provisioned 2026-09-30 by applying all ten files in
`backend/database/migrations/` with `search_path = test, extensions, public`.

Verified state at provisioning:

| Property | Value |
| --- | --- |
| Base tables in `test` | 32 |
| Enum types in `test` | 13 |
| Rows in `test` | 0 |
| Base tables in `public` | 34, unchanged |
| Foreign keys in `test` pointing outside `test` | none |

That last row is the one that matters for safety. Every constraint defined in
`test` resolves inside `test`, so no test fixture can reach a production row
through a foreign key.

The two tables present in `public` but absent from `test` at provisioning time
were `_connectsphere_migrations`, which is the migration ledger rather than an
application table, and `keepalive_logs`, which no migration created because it
had been made by hand. That gap is now closed: migration
`0009_keepalive_logs.sql` creates it, and `test` carries it too, so `test` holds
33 base tables as of that migration.

## Honest scope: one test uses this today

**`backend/tests/deactivation.integration.test.ts` works against Supabase now,
with no code change.** It is the only test written to the T-59 pattern.

Confirmed by running it:

```text
npm run test:deactivation:db --workspace backend
✔ PostgreSQL: retention, time boundaries, capacity count, session revocation,
  coordinator statuses and rollback (4125ms)
ℹ pass 1   ℹ fail 0
```

After that run, `public` was still at 34 tables, `test` still at 32, `test` held
0 rows, no stray schemas existed, and `public.users` still held its 13 accounts.
The rollback is real.

**Not every other database test refuses a Supabase URL.** Suites that go
through `backend/tests/helpers/loginDatabase.ts` do. That helper asserts a
loopback host and a database named `connectsphere_notification_test`, then
creates a fresh schema per run. `registration.db.test.ts` and
`profile.integration.test.ts` assert loopback themselves.

Seven files in `npm run test:db` do neither. They only check that
`TEST_DATABASE_URL` is set, then connect and commit:

- `attendeeVisibility.integration.test.ts`
- `coordinatorAssignment.integration.test.ts`
- `eventLifecycle.integration.test.ts`
- `eventVisibility.integration.test.ts`
- `venueAccessibility.integration.test.ts`
- `venueCalendar.integration.test.ts`
- `venueCatalogue.integration.test.ts`

None of those seven calls `loginDatabase()`. Three of them set `search_path`
with `SET` on each pooled connection: `venueAccessibility`, `venueCalendar`,
and `venueCatalogue`. The other four set up a scratch schema with `SET`, then
point the code under test at a `DATABASE_URL` that carries
`options=-c search_path=…`:

- `attendeeVisibility.integration.test.ts`
- `eventVisibility.integration.test.ts`
- `coordinatorAssignment.integration.test.ts`
- `eventLifecycle.integration.test.ts`

The pooler drops that startup option. `venueCatalogue.integration.test.ts`
notes that this once let writes land in the real `public` schema. Pointed at
Supabase, the code under test in those four reads and writes production
`public`, not the scratch schema. The warning in "How to run" is the only
real protection for all seven. Adding the same loopback and
`current_schema()` checks that `registration.db.test.ts` already has is
[SCRUM-128](https://theprawnworkspace.atlassian.net/browse/SCRUM-128), under
E00 (`SCRUM-127`). SCRUM-109 is Done and does not hold this follow-up.

## Why the two patterns differ

`deactivation.integration.test.ts` wraps everything in one transaction:

```text
BEGIN
SET LOCAL search_path = test, public
  ... fixtures, assertions ...
ROLLBACK          -- even the fixture DDL is undone
```

It also checks `to_regclass('test.users')` first and only applies migrations if
the tables are missing. Because the schema is now provisioned, that branch is
skipped, so the test is both faster and no longer performs DDL against the
shared database.

`loginDatabase()` instead owns a private schema for the duration of the run.
That gives stronger isolation and is what concurrency-sensitive tests need, for
example the advisory-lock assignment tests and the registration race in
`registration.db.test.ts`. Transaction-rollback isolation cannot express those,
because the concurrent sessions would not see each other's uncommitted rows.
Neither pattern is wrong; they serve different needs.

## How to run the supported test against Supabase

Set the variable for the single command only, so it cannot leak into the rest of
the shell session:

```powershell
$env:TEST_DATABASE_URL = "<DATABASE_POOLER_URL from your .env>"
npm run test:deactivation:db --workspace backend
Remove-Item Env:TEST_DATABASE_URL
```

The test also falls back through `DATABASE_POOLER_URL` then `DATABASE_URL`, so
any one of the three is enough.

**Do not run any other database suite while `TEST_DATABASE_URL` points at
Supabase.** Only `deactivation.integration.test.ts` rolls back. The others
commit, and a commit against this URL is a write to production. Clear the
variable as shown above rather than relying on remembering.

That warning is what actually covers every suite. A loopback assertion exists
only in `loginDatabase.ts`, in `registration.db.test.ts`, and in
`profile.integration.test.ts`. `registration.db.test.ts` also asserts that
`current_schema()` is its disposable schema before it writes. Pointed at the
pooler it stops with `Use a loopback test database; this test commits and
cannot be rolled back`, having written nothing. The seven suites listed above
have neither check.

The transaction pooler on port 6543 is fine **for the deactivation test**,
because `SET LOCAL search_path` is scoped to the transaction and transaction
pooling supports exactly that. A pooler discards `search_path` supplied as a
connection *startup option*. That is the `options=-c search_path=…` query
parameter the four suites above put on `DATABASE_URL`. Pointed at Supabase,
their code under test resolves to `public`. The three venue suites avoid that
particular drop by running `SET` from `pool.on('connect')` instead. They
still commit, so the warning above covers them too.

## Do not do these

- Do not run `npm run db:migrate` against the Supabase URL while intending to
  affect `test`. The runner reads `DATABASE_URL` and has no `--schema` flag; it
  applies to whatever `search_path` resolves to, which is `public`.
- `db:reset` is already protected here, and must stay that way.
  `isSafeResetTarget()` accepts only a loopback host or a database whose name
  contains `test` or `dev`. Supabase's host is remote and its database is named
  `postgres`, so the guard **refuses** the shared project. Never set
  `ALLOW_DATABASE_RESET=I_UNDERSTAND` against it: that override is the one thing
  standing between `db:reset` and dropping the production `public` schema.
- Do not add `CREATE EXTENSION` calls aimed at the shared project. `pgcrypto`
  (in `extensions`) and `btree_gist` (in `public`) are already installed.
  `CREATE EXTENSION IF NOT EXISTS ... WITH SCHEMA public` is a harmless no-op
  there, but provisioning extensions is not a test's job.
- Do not point CI at Supabase. See below.

## Keeping `test` in step with new migrations

**Whoever adds a migration applies it to `test` in the same pull request.** The
schema does not update itself, and nothing currently fails if it drifts: the
deactivation test only checks `to_regclass('test.users')`, so a missing later
migration is invisible until a test happens to need the new column.

**That apply is a write to the production Supabase project.** `test` lives in
the same database as `public`. Run the SQL only in a session whose
`search_path` starts with `test`, and only with a repeatable migration. A
wrong schema, or `npm run db:migrate` with no schema flag, writes to
production `public`.

Apply a new migration to `test` by running it with the schema in front of the
search path, for example through the Supabase SQL editor:

```sql
SET search_path = test, extensions, public;
-- paste the new migration file here
```

Write migrations so this is safe to repeat: `CREATE TABLE IF NOT EXISTS`, and
guard `CREATE POLICY` on `pg_policies` because it has no `IF NOT EXISTS` form.
`0009_keepalive_logs.sql` is the worked example, and it also guards every
`GRANT` on the role existing, because `anon` and `authenticated` are
Supabase-only and absent from local and CI databases.

This is a documented duty rather than an enforced one, which is a real weakness.
The stronger fix is for the test harness to assert that every file in
`backend/database/migrations/` is present in `test` and fail loudly when one is
not. Both that check and the loopback guards for the seven suites above are
[SCRUM-128](https://theprawnworkspace.atlassian.net/browse/SCRUM-128), not
SCRUM-109.

## CI deliberately stays on a service container

`.github/workflows/application-checks.yml` provisions `postgres:17` as a GitHub
Actions service container and injects a loopback `TEST_DATABASE_URL`. That stays
as it is, on purpose:

- It is free, and it does not consume Supabase connections or storage.
- It is fast, being a local socket rather than a network round trip.
- It is perfectly isolated per run, so concurrent CI jobs cannot collide.
- It already passes.

The Supabase `test` schema exists to remove a local prerequisite for
developers, not to replace CI's database.

## On Docker

Docker is not configured anywhere in this repository, and
`docs/contributing/seed-data-convention.md` says so explicitly. When a
contributor or an AI agent reads "requires a disposable PostgreSQL 17 database
on loopback" and reaches for a container, that is a reasonable reading of the
instruction rather than a mistake — a container is one legitimate way to obtain
loopback PostgreSQL. A native local install is another, and for
`deactivation.integration.test.ts` the Supabase `test` schema is now a third.

Pick whichever suits your machine. What matters is that `TEST_DATABASE_URL`
never points at a database whose loss would matter, and that no test writes to
`public`.

## References

- `docs/bdr/B-team-decisions.md` — T-59, the original decision.
- `backend/tests/deactivation.integration.test.ts` — the reference
  implementation of the pattern.
- `backend/tests/helpers/loginDatabase.ts` — the schema-per-run helper the
  other tests use.
- `.github/workflows/application-checks.yml` — the CI service container.
- `docs/contributing/seed-data-convention.md` — why Docker is absent.
- SCRUM-109 — provisioning ticket. It is Done; new follow-ups do not go there.
- SCRUM-128 — guard the seven unguarded database suites, and assert that every
  migration is present in `test`.

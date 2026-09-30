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

**Every other database test still needs a local PostgreSQL.** There are twelve
of them under `npm run test:db`, plus the auth, profile, venue-search and
notification suites. They go through `backend/tests/helpers/loginDatabase.ts`,
which does three things incompatible with the shared project:

1. It asserts the host is loopback (`loginDatabase.ts:12`), so a Supabase
   hostname fails immediately and by design.
2. It asserts the database is named `connectsphere_notification_test`
   (`loginDatabase.ts:13`), whereas Supabase's is `postgres`.
3. It creates a **fresh random schema per run** and applies all ten migrations
   into it, then drops it. Against the shared project that would mean repeated
   DDL churn in the production database and a much slower run over the network.

So the design gap is real and is not closed by the schema existing. Converting
those tests is tracked as a follow-up on SCRUM-109 rather than assumed done,
which is the mistake that ticket made the first time it was marked complete.

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

Two guards now make that failure loud rather than silent. The suites that build
a schema per run assert a loopback address, and
`registration.db.test.ts` additionally asserts that `current_schema()` really is
its disposable schema before it writes anything. Pointed at the pooler it now
stops with `Use a loopback test database; this test commits and cannot be rolled
back`, having written nothing.

The transaction pooler on port 6543 is fine **for the deactivation test**,
because `SET LOCAL search_path` is scoped to the transaction and transaction
pooling supports exactly that. The wider caveat is the reason for the second
guard: a pooler discards `search_path` supplied as a connection *startup
option*, which is how `options: '-c search_path=...'` can silently resolve to
`public`. Several integration tests therefore set it through a
`pool.on('connect')` handler instead.

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
not. That is recorded as a follow-up on SCRUM-109.

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
- SCRUM-109 — provisioning ticket, with the follow-up to widen test support.

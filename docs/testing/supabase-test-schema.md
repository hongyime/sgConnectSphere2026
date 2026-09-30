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

The two tables present in `public` but absent from `test` are
`_connectsphere_migrations`, which is the migration ledger rather than an
application table, and `keepalive_logs`, which no migration creates because it
was made by hand. The `keepalive_logs` gap is a separate open item: a fresh
database built purely from migrations will not have it.

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

```bash
# PowerShell
$env:TEST_DATABASE_URL = "<DATABASE_POOLER_URL from your .env>"
npm run test:deactivation:db --workspace backend
```

The test already falls back through `TEST_DATABASE_URL`,
`DATABASE_POOLER_URL`, then `DATABASE_URL`, so setting any one of them is
enough.

The transaction pooler on port 6543 is fine **for this test**, because
`SET LOCAL search_path` is scoped to the transaction and transaction pooling
supports exactly that. Be aware of the wider caveat: a pooler drops
`search_path` supplied as a connection *startup option*, which is why several
integration tests set it through a `pool.on('connect')` handler instead. If you
ever point a schema-per-run test at a pooler, that difference will bite.

## Do not do these

- Do not run `npm run db:migrate` or `db:reset` against the Supabase URL while
  intending to affect `test`. The runner reads `DATABASE_URL` and has no
  `--schema` flag; it applies to whatever `search_path` resolves to, which is
  `public`. `db:reset` drops and recreates `public`, and
  `isSafeResetTarget()` permits it when the database name contains `test` —
  Supabase's database is literally named `postgres`, so this is not a
  protection you should lean on.
- Do not add `CREATE EXTENSION` calls aimed at the shared project. `pgcrypto`
  (in `extensions`) and `btree_gist` (in `public`) are already installed.
  `CREATE EXTENSION IF NOT EXISTS ... WITH SCHEMA public` is a harmless no-op
  there, but provisioning extensions is not a test's job.
- Do not point CI at Supabase. See below.

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

# Recovery Release Request, 21 October 2026

**REQUEST ONLY. Authorization PENDING. No production migration was attempted.**
The deploy owner must separately approve each exact file, target and compatibility
assessment below. This document, the recovery plan and passing local suites aren't
approval. No production migration run record or application receipt is created here.

## Authority And Observed State

Follow the [production migration runbook](production-migrations.md),
[one-at-a-time decision](../decisions/0015-one-at-a-time-production-migrations.md),
[shared-test safety rules](../testing/supabase-test-schema.md) and
[source authority](../source-of-truth.md). This request supplements the
[recovery view](../plans/recovery-2026-10-21.md); it doesn't change requirements,
sprint commitments, estimates or historical Done flags.

Current remote `main` was read as `56d7117a38f80310f0528cd9bcb4a2088a9ba1fd`.
The metadata observation started at **2026-10-21T12:51:36.062Z** in one dedicated
`pg.Client` transaction: `BEGIN READ ONLY`, five-second statement timeout, ledger
names and catalog enum/column reads only, then acknowledged `ROLLBACK` and connection
close. Credentials were read privately by environment-variable name; no values or
application rows were recorded. Task-17 local JSON/text evidence preserves the
queries' scope and sanitized results, not an application receipt.

Public ledger: 21 names, with the three exact files below absent. Catalog evidence
agrees: `public.change_status` lacks `obsolete`; `public.registration_status` lacks
`pending` and `rejected`; the four `event_registration_sessions` columns and
`event_registrations.manually_added` are absent. These are dated observations,
not assumptions that the earlier task-4 snapshot remains current. Recheck immediately
before any authorized operation. A ledger name alone never establishes type state
or proves which bytes were previously applied.

## Exact-File Requests

Target for each request: **shared production database, `public` schema**. Operator:
**deploy owner**. The future approved execution shell uses `DATABASE_URL`, resolved
privately to that target. The read-only observation used `DATABASE_POOLER_URL`;
that doesn't authorize reusing any connection for writes. Don't record hostnames,
URLs, credentials or personal data. Confirm schema resolution before approving.

All paths below are under `backend/database/migrations/` on the exact `main` above.
Git blob SHA identifies repository content; SHA-256 identifies file bytes.

| Exact file | Git blob SHA | File SHA-256 | Approval |
| --- | --- | --- | --- |
| `0022_change_request_obsolete.sql` | `eb0d28de085515de206a8cff30dd9f61435d645a` | `e4c9cc03d1e2161a2cddf58457b849bb30c308d211333e88225c337c1183149e` | PENDING, deploy owner, this file only |
| `0023_registration_review_statuses.sql` | `1d16d853a07714781c28d726d861f91b51ecf0a8` | `10444cfc24a0863317e3b0a8494e6b1b6dac8d1a2f2629f98fd6b5817fd5e8fa` | PENDING, separate exact-file approval |
| `0024_registration_sessions.sql` | `6a31f9a87a5db243b512ac26cc39f3cb6057000a` | `0e62eddea26fbdb9bd0e7be130681d9f5472dea583c00f278d7008d995b2ff10` | PENDING, separate exact-file approval after 0023 |

1. **0022 / merged #319:** additive enum prerequisite for SCRUM-73 / E10-S04
   cancellation code. Deploy owner must confirm the deployed code tolerates the
   added value and no dependent transaction uses it before commit. The unmerged
   #308 `0021_venue_approval_conflict.sql` proposal isn't a pending main file and
   isn't an automatic dependency of 0022. Number gaps don't authorize it.
2. **0023 / merged #322:** enum additions only. Confirm current deployed reads and
   writes remain compatible. Commit and verify this operation separately before
   approving 0024, which uses the new `rejected` enum value in a predicate.
3. **0024 / merged #322:** Session selection relation, composite keys, historical
   registration backfill, `manually_added`, and replacement active-registration
   uniqueness predicate. Require 0014 Session schema and committed, corroborated
   0023. Deploy owner must review backfill/constraint compatibility, lock impact
   and deployed registration/deactivation behavior before approval. This isn't
   merely an enum change and isn't covered by approval of 0023.

## Release Order And Stop Policy

Use **compatible migration-only merge, authorized exact-file apply, committed
ledger plus catalog verification, then dependent code merge/deploy**. Migration-only
merges can themselves deploy unchanged application code, because a push to `main`
can trigger production deployment. A merge doesn't apply database migrations.
The already merged migration files don't authorize applying them now.

Keep cancellation-dependent code held until public 0022 is verified and its actual
attempt record is published, or until a separately reviewed reliable deployment
hold/resume control is adopted. Open #315 isn't an adopted control. If backward
compatibility or separation can't be demonstrated, STOP before merge or apply;
don't disable a workflow ad hoc. Apply the same sequencing to registration code
depending on 0023/0024. Local task-14 proof isn't a production release gate receipt.

STOP on changed hashes/main contents, wrong target/search path, missing owner
approval, missing/unreadable ledger, unexpected ledger entries, inconsistent
ledger/catalog state, unmet prerequisites, unknown failure or uncertain deployment
compatibility. Never retry blindly, skip to another file, rename a migration,
reset, seed, set `ALLOW_DATABASE_RESET`, or invoke default all-pending mode.
After failure, preserve sanitized diagnostics, re-read metadata and have the deploy
owner investigate before any further write. If a later read finds a filename
already recorded, don't reapply: corroborate its catalog effect and seek the
existing attempt record. Observation isn't a fabricated historical application receipt.

## Pre- And Post-Operation SQL

These are **documentation only**. Repeat this read-only pre-check immediately before
each approved file and after its separate committed operation. Compare the complete
ledger with exact main filenames, including names outside this three-file request.
No application-row queries are required or authorized by this request.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = 5000;
SHOW transaction_read_only;
SELECT current_schema(), current_setting('search_path');
SELECT name, applied_at FROM public._connectsphere_migrations ORDER BY name;
SELECT n.nspname, t.typname, e.enumlabel
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public'
  AND t.typname IN ('change_status', 'registration_status')
ORDER BY t.typname, e.enumsortorder;
SELECT table_name, column_name, data_type, udt_schema, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sessions', 'event_registrations', 'event_registration_sessions')
ORDER BY table_name, ordinal_position;
SELECT c.relname, k.conname, k.convalidated,
       pg_catalog.pg_get_constraintdef(k.oid)
FROM pg_catalog.pg_constraint k
JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sessions', 'event_registrations', 'event_registration_sessions')
ORDER BY c.relname, k.conname;
SELECT tablename, indexname, indexdef FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('event_registrations', 'event_registration_sessions')
ORDER BY tablename, indexname;
ROLLBACK;
```

Post-0022: exact ledger name plus `public.change_status.obsolete` must exist.
Post-0023: its exact ledger name plus both review labels in
`public.registration_status` must exist. Post-0024: exact ledger name, the four
typed relation columns, boolean `manually_added`, same-Event composite foreign keys,
new unique keys and indexes must match the exact SQL. Its active index excludes
`withdrawn` and `rejected`, with the old lifetime uniqueness constraint removed.
Any discrepancy is STOP, not partial success. Metadata checks don't establish
application acceptance or prove backfill data correctness; any deeper validation
requires separately scoped authorization without exposing application rows.

**DOCUMENTATION ONLY, NOT EXECUTED:** from `backend/`, only after the matching
approval and fresh pre-check, choose one command, never a combined batch:

```sh
npx tsx src/database/cli.ts migrate --only 0022_change_request_obsolete.sql
```

```sh
npx tsx src/database/cli.ts migrate --only 0023_registration_review_statuses.sql
```

```sh
npx tsx src/database/cli.ts migrate --only 0024_registration_sessions.sql
```

For an actual future attempt, follow the runbook and create a sanitized UTC record
at `docs/ops/production-migration-runs/YYYYMMDD-HHmm-<migration-filename>.md`, including
exact merged commit/file/hash, deploy-owner role, explicit authorization reference,
pre-check, command, observed outcome, post-ledger/catalog check and failure notes.
Don't create this record for the unperformed operation described here.

## Shared-Test Remediation Handoff

Separately observed at the timestamp above: shared `test` has **40 expected column
gaps/type differences**, including missing Session and venue-staff structures,
venue buffers, booking contract fields and registration Session columns. It also
lacks `change_status.obsolete` and both registration review labels. Public's ledger
isn't test-schema migration history. Earlier task-4 index/guard findings remain
dated evidence; this narrower refresh didn't re-read those catalogs or declare
them repaired. No repair or shared-test writes are authorized.

Schema/migration owner and deploy owner must scope any shared-test repair separately,
review schema-qualified SQL and cross-schema risks, agree exact files and get
explicit authorization. Don't run the public migration CLI to target `test`.
General database suites, reset and seed belong only on disposable native loopback
PostgreSQL. The documented rollback-based deactivation test remains the only
supported shared-test suite, not a blanket permission to execute it now. No
provider, roster, scheduler, Docker Desktop or deployment-secret change is included.

## Evidence And Remaining Gates

Task-13 leaves canonical double-booking cases 01/02/03/05/06 BLOCKED; proposed #308
guard exceptions aren't adopted. Task-14 parent verification proves the bounded
automated cancellation/release surface on a disposable local database, including
28 DB, 21 focused component, two default-bootstrap auth cases and 11 config-import
guard probes. Its parent cleanup sidecar supersedes stale HOT fields: all owned
PG/API/UI/auth ports are STOPPED; don't start a stack for this request.

TC_E06S04_07 / #298 still needs independent human code/test review, actual human
T-93 manual evidence and PO/delegate acceptance. Task-16's 64-story readiness view
and 13 unknown owners aren't a delivery claim or new capacity commitment. Public
deployment isn't part of the [course Definition of Done](../../CONTRIBUTING.md#definition-of-done).
Keep operational safety gates distinct from course/story acceptance.

The task-17 offline validator rejects wrong hash, missing ledger or type evidence,
wrong target, absent approval, all-pending migrate, reset, seed and missing
compatibility before any connection. Its synthetic positive control means
**VALID REQUEST, production still NOT AUTHORIZED**, not a deploy permission.
Source/hash/link and repository-tooling checks apply only to this request package;
they don't claim application acceptance. Publishing tasks 18/19 must add the
applicable T-65 record before committing cited test evidence. No stage, commit,
push, Jira/PR mutation, migration attempt or shared-test repair occurred here.

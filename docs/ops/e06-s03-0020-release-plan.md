# E06-S03 migration 0020 release arrangement

SCRUM-47 / E06-S03; release dependency for application PR #299, following
[the production migration runbook](production-migrations.md).
This is a plan, not an application/verification run record.

## Migration-only review

This branch adds `0020_released_booking_replacement_retry.sql` and documentation/
evidence. After merging main on 18 October, main's reviewed Organiser save-alert
test correction supersedes the earlier local test-only synchronization fix;
there is no longer a frontend test difference from main. It contains no dependent
application code or deployment configuration. SQL is identical to the version reviewed in #299: replace only
`venue_booking_replacement_idx` with the unique index on `replaces_booking_id`
where the reference is non-null and status is not Released. Applied 0019 is
unchanged; no application rows are updated/deleted and no new status is added.

This relaxes the unique index only for Released rows while retaining the
non-Released/rejected replacement guard. Current main's request service still
rejects any existing replacement, so loading the relaxed constraint does not
itself expose the new retry action before #299. Review compatibility against
the then-deployed version before production application; this reasoning is not
a live production compatibility inspection.

## Order and responsibility

1. Human reviewer approves and merges this migration-only PR first. Its merge
   may deploy main's unchanged application; it does not apply SQL automatically.
2. Deploy owner checks the actual production ledger and prerequisites, including
   0019 and the existing index. Reconfirm migration numbering and file contents
   at the merged main commit. If another pending migration exists, use only
   the exact selector after checking dependencies; never reset/seed production.
3. Deploy owner applies exactly `0020_released_booking_replacement_retry.sql`
   using the documented CLI from backend: `npx tsx src/database/cli.ts migrate
   --only 0020_released_booking_replacement_retry.sql`. Stop on failure and
   investigate; do not continue to dependent application deployment.
4. Deploy owner verifies the post-run ledger, unique index definition/predicate
   and absence of unexpected migration application, and commits the sanitized
   run record under `docs/ops/production-migration-runs/` through reviewed PR.
   Do not include account data, connection strings or secrets in that record.
5. Only after the production application/verification record is available,
   complete #299's required checks/current-head review and merge its application
   changes. Merge main into #299 to remove the already-merged SQL from its diff.
   Integrate #298 separately, preserving test lists and dependency disclosures.

The deploy owner is the accountable execution role. PR creation/approval is
not permission to run a production write in this task. No production ledger,
data, migration, deployment setting or email was inspected or changed here.

## Post-run metadata verification

Alongside the runbook ledger query, inspect only the expected index metadata:

```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'venue_bookings'
  AND indexname = 'venue_booking_replacement_idx';
```

Require a unique index over `replaces_booking_id` with non-null reference and
`status <> 'released'` predicate (PostgreSQL may display enum casts).
Do not mark verified from a code diff, CI or an isolated local test alone.

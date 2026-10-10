# E06-S05 migration 0013, on its own (SCRUM-138)

Goal: ship `0013_tentative_venue_holds.sql` as a migration-only PR, as
`docs/ops/production-migrations.md` (#241) requires, so the deploy owner can
apply and verify it on production before the hold code in #245 merges.

## Done

- The migration from #245, unchanged except for a header comment pointing at
  #245: adds `tentative` and `expired` to `booking_status`, nullable
  `venue_bookings.expires_at`, and a partial index on it.
- Backward-compatible with the deployed app: the current code never reads the
  new column or writes the new statuses, and every existing status query lists
  its statuses explicitly, so nothing changes until #245.

## Next

1. Review and merge. The merge deploys the unchanged app (migration files are
   not in the deploy workflow's ignore list).
2. Deploy owner applies it per the runbook. **Production is at 0008**, so
   0009, 0010 (and 0011/0012 if merged first) are also pending, and the
   runbook says to stop when more than one file is pending; the catch-up path
   is the open follow-up from the #241 review.
3. Only after the post-run ledger check passes: merge #245.

## Commands

See `docs/testing/runs/20261009-214453-amareetkm2024-del-backend-db.md`.

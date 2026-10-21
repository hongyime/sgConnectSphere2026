# Production migration run — 0020_released_booking_replacement_retry.sql

- Started (UTC): 2026-10-18 11:58 (minute precision)
- Operator: deploy owner
- Merged PR: [#306](https://github.com/hongyime/sgConnectSphere2026/pull/306)
- `main` commit: `3672ae87ca2bdeb7530db150408f1cd9abc016b0`
- Migration file: `backend/database/migrations/0020_released_booking_replacement_retry.sql`
- Pre-run ledger check: PASS — the ledger was readable; `0019_venue_bookings_contract.sql` was the latest recorded migration and `0020_released_booking_replacement_retry.sql` was the only migration file not recorded.
- Command: `npx tsx src/database/cli.ts migrate --only 0020_released_booking_replacement_retry.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0020_released_booking_replacement_retry.sql` is recorded with `applied_at` `2026-10-18 11:58:17.843041+00`; no unexpected migration was applied.
- Notes: The replacement index exists with the predicate `replaces_booking_id IS NOT NULL AND status <> 'released'`. A read-only post-check found zero conflicting groups.

# Production migration run — 0019_venue_bookings_contract.sql

- Started (UTC): 2026-10-15T10:02:18Z
- Operator: deploy owner
- Merged PR: #274 (application PR containing the migration; no separate migration-only PR)
- `main` commit: 8e052b1
- Migration file: `backend/database/migrations/0019_venue_bookings_contract.sql`
- Pre-run ledger check: PASS — 16 entries; 0019 was pending. `venue_bookings` and `users` existed; none of the nine new columns, two constraints, or three indexes already existed.
- Command: `npx tsx src/database/cli.ts migrate --only 0019_venue_bookings_contract.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0019_venue_bookings_contract.sql` appears at `2026-10-15T10:02:33.287Z`; all nine columns, two constraints, and three indexes are present; total 17 entries. No other migration was invoked.
- Notes: 0017 and 0018 were not applied; their migration files are not on `main`. The 0019 SQL uses the existing `venue_bookings` and `users` tables and has no dependency on those migrations. No application rows were queried or changed.

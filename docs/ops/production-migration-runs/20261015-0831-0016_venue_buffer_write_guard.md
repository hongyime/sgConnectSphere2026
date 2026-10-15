# Production migration run — 0016_venue_buffer_write_guard.sql

- Started (UTC): 2026-10-15T08:31:30Z
- Operator: deploy owner
- Merged PR: #261
- `main` commit: 9799d84 (0016 was merged in PR #261 alongside 0011)
- Migration file: `backend/database/migrations/0016_venue_buffer_write_guard.sql`
- Pre-run ledger check: PASS — 15 migrations applied (0001–0011, 0013, 0014); 0016 was pending
- Command: `npx tsx src/database/cli.ts migrate --only 0016_venue_buffer_write_guard.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0016_venue_buffer_write_guard.sql` appears in ledger at `2026-10-15T08:31:39.153Z`; no unexpected migrations applied; total 16 entries
- Notes: Adds `buffer_conflict` column to `venue_bookings` and `guard_venue_buffer_overlap()` trigger. Depends on `occupied_window()` function added by 0011. Migration applied successfully on first run. DATABASE_URL sourced from the deploy owner's local `.env` (gitignored). This record was written retrospectively from the recorded migration and ledger output. The exact time of the post-run ledger inspection relative to completion of the previous migration was not recorded, so that ordering cannot be independently confirmed.

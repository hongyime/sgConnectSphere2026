# Production migration run — 0016_venue_buffer_write_guard.sql

- Started (UTC): 2026-10-15T08:31:30Z
- Operator: deploy owner (bryanseah234)
- Merged PR: #261
- `main` commit: 5c22e26 (0016 was merged in PR #261 alongside 0011)
- Migration file: `backend/database/migrations/0016_venue_buffer_write_guard.sql`
- Pre-run ledger check: PASS — 15 migrations applied (0001–0011, 0013, 0014); 0016 was pending
- Command: `npx tsx src/database/cli.ts migrate --only 0016_venue_buffer_write_guard.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0016_venue_buffer_write_guard.sql` appears in ledger at `2026-10-15T08:31:39.153Z`; no unexpected migrations applied; total 16 entries
- Notes: Adds `buffer_conflict` column to `venue_bookings` and `guard_venue_buffer_overlap()` trigger. Depends on `occupied_window()` function added by 0011. Migration applied successfully on first run after 0011 and 0014 confirmed. DATABASE_URL sourced from local `.env` (gitignored).

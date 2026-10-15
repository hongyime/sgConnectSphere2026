# Production migration run — 0011_venue_setup_turnaround_buffers.sql

- Started (UTC): 2026-10-15T08:31:00Z
- Operator: deploy owner (bryanseah234)
- Merged PR: #261
- `main` commit: 5c22e26
- Migration file: `backend/database/migrations/0011_venue_setup_turnaround_buffers.sql`
- Pre-run ledger check: PASS — 13 migrations applied (0001–0010, 0013); 0011 was pending
- Command: `npx tsx src/database/cli.ts migrate --only 0011_venue_setup_turnaround_buffers.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0011_venue_setup_turnaround_buffers.sql` appears in ledger at `2026-10-15T08:31:18.337Z`; no unexpected migrations applied; total 14 entries
- Notes: Adds `setup_time_minutes` and `turnaround_time_minutes` columns to `venues` table and `occupied_window()` function. Migration applied successfully on first run. DATABASE_URL sourced from local `.env` (gitignored).

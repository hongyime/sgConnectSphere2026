# Production migration run — 0011_venue_setup_turnaround_buffers.sql

- Started (UTC): 2026-10-15T08:31:00Z
- Operator: deploy owner
- Merged PR: #261
- `main` commit: 9799d84
- Migration file: `backend/database/migrations/0011_venue_setup_turnaround_buffers.sql`
- Pre-run ledger check: PASS — 13 migrations applied (0001–0010, 0013); 0011 was pending
- Command: `npx tsx src/database/cli.ts migrate --only 0011_venue_setup_turnaround_buffers.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0011_venue_setup_turnaround_buffers.sql` appears in ledger at `2026-10-15T08:31:18.337Z`; no unexpected migrations applied; total 14 entries
- Notes: Adds `setup_time_minutes` and `turnaround_time_minutes` columns to `venues` table and `occupied_window()` function. Migration applied successfully on first run. DATABASE_URL sourced from the deploy owner's local `.env` (gitignored). This record was written retrospectively from the recorded migration and ledger output. The exact time of the post-run ledger inspection relative to the next migration command was not recorded, so that ordering cannot be independently confirmed.

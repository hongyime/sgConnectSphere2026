# Production migration run — 0013_tentative_venue_holds.sql

- Started (UTC): 2026-10-13T18:53:10Z
- Operator: deploy owner
- Merged PR: #246
- `main` commit: `8f246ae`
- Migration file: `backend/database/migrations/0013_tentative_venue_holds.sql`
- Pre-run ledger check: PASS — 0009 and 0010 were present; 0013 was the sole pending file among 13 migration files.
- Command: `npx tsx src/database/cli.ts migrate` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — 0013 is present with `applied_at` `2026-10-13T18:53:10.865Z`; all 13 migration files are represented, with no pending or unexpected migration.
- Notes: The command exited successfully and reported only `0013_tentative_venue_holds.sql` as applied. The pre-run and post-run ledger reads were read-only. No application rows were queried or included.

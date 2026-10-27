# Production migration run — 0025_venue_unavailability.sql

- Started (UTC): 2026-10-26T01:50Z
- Operator: deploy owner
- Merged PR: #345
- `main` commit: `653fdda`
- Migration file: `0025_venue_unavailability.sql`
- Pre-run ledger check: PASS — `0024_registration_sessions.sql` was the latest applied entry and `0025_venue_unavailability.sql` was the single next pending migration.
- Command: `npx tsx src/database/cli.ts migrate --only 0025_venue_unavailability.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0025_venue_unavailability.sql` is recorded as the newest applied migration; no unexpected migration appeared.
- Notes: Applied once using the production `DATABASE_URL` environment variable. No reset, seed, or all-pending migration command was used.

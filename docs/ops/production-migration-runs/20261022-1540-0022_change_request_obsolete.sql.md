# Production migration run — 0022_change_request_obsolete.sql

- Started (UTC): 2026-10-22 15:40
- Operator: deploy owner
- Merged PR: [#319](https://github.com/hongyime/sgConnectSphere2026/pull/319)
- `main` commit: `10bef4406b0eeb36b214bef0c7017e67f2098c8f`
- Migration file: `backend/database/migrations/0022_change_request_obsolete.sql`
- Pre-run ledger check: PASS — ledger was readable; the latest recorded migration was `0020_released_booking_replacement_retry.sql` at `2026-10-18T11:58:17.843Z`; `0022_change_request_obsolete.sql` was absent.
- Command: `npx tsx src/database/cli.ts migrate --only 0022_change_request_obsolete.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0022_change_request_obsolete.sql` is recorded at `2026-10-22T15:40:23.031Z`; the ledger contains 22 rows and no unexpected migration was applied.
- Notes: Added `obsolete` to `public.change_status`; verified the live enum contains it. No application code was released with this run.

# Production migration run — 0023_registration_review_statuses.sql

- Started (UTC): 2026-10-22 15:43
- Operator: deploy owner
- Merged PR: [#322](https://github.com/hongyime/sgConnectSphere2026/pull/322)
- `main` commit: `10bef4406b0eeb36b214bef0c7017e67f2098c8f`
- Migration file: `backend/database/migrations/0023_registration_review_statuses.sql`
- Pre-run ledger check: PASS — ledger was readable; the latest recorded migration was `0022_change_request_obsolete.sql` at `2026-10-22T15:40:23.031Z`; `0023_registration_review_statuses.sql` was absent.
- Command: `npx tsx src/database/cli.ts migrate --only 0023_registration_review_statuses.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0023_registration_review_statuses.sql` is recorded at `2026-10-22T15:43:41.558Z`; the ledger contains 23 rows and no unexpected migration was applied.
- Notes: Added `pending` and `rejected` to `public.registration_status`; verified the live enum order is `registered`, `waitlisted`, `pending`, `rejected`, `withdrawn`. No application code was released with this run.

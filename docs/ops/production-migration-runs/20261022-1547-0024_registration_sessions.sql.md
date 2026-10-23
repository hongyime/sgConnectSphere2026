# Production migration run — 0024_registration_sessions.sql

- Started (UTC): 2026-10-22 15:47
- Operator: deploy owner
- Merged PR: [#322](https://github.com/hongyime/sgConnectSphere2026/pull/322)
- `main` commit: `10bef4406b0eeb36b214bef0c7017e67f2098c8f`
- Migration file: `backend/database/migrations/0024_registration_sessions.sql`
- Pre-run ledger check: PASS — ledger was readable; the latest recorded migration was `0023_registration_review_statuses.sql` at `2026-10-22T15:43:41.558Z`; `0024_registration_sessions.sql` was absent. Data preflight also passed: 8 registrations, 0 duplicate active pairs, 0 null `registered_at`, 0 registrations without sessions, expected backfill 8; the old unique constraint was present and the new objects were absent.
- Command: `npx tsx src/database/cli.ts migrate --only 0024_registration_sessions.sql` from `backend/`
- Outcome: PASS
- Post-run ledger check: PASS — `0024_registration_sessions.sql` is recorded at `2026-10-22T15:47:05.679Z`; the ledger contains 24 rows and no unexpected migration was applied.
- Notes: Created `event_registration_sessions` with 8 backfilled selections, both composite foreign keys, and the session lookup index. Added `event_registrations.manually_added` as `boolean NOT NULL DEFAULT false`, replaced the old unique constraint with `event_registrations_id_event_id_key` plus the partial `event_registrations_one_active_idx`, and verified zero duplicate active pairs, zero registrations without selections, and zero orphan links. No application code was released with this run.

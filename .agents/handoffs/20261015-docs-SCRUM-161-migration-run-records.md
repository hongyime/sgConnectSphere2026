# SCRUM-161 — Production Migration Run Records

Applied production migrations 0011, 0014, and 0016 to the live Supabase database as a follow-up to PR #261 (venue setup and turnaround buffers).

## Goal

Record and commit the three production migration run records required by team decision T-65 and the ops runbook.

## What was done

1. Sourced `DATABASE_URL` from the deploy owner's local `.env` (gitignored); no path or connection string is recorded here.
2. Ran the pre-run ledger check — confirmed 13 migrations applied, 0011 / 0014 / 0016 pending.
3. Applied in order:
   - `0011_venue_setup_turnaround_buffers.sql` — PASS (2026-10-15T08:31:18Z UTC)
   - `0014_event_sessions.sql` — PASS (2026-10-15T08:31:28Z UTC)
   - `0016_venue_buffer_write_guard.sql` — PASS (2026-10-15T08:31:39Z UTC)
4. The recorded outputs report each migration in the ledger with no unexpected entries. The records were written retrospectively. Although the preserved migration timestamps are ordered, exact times of the individual post-run ledger inspections relative to the next migration command were not retained and cannot be independently verified.
5. Created three run records in `docs/ops/production-migration-runs/`.

## Files changed

- `docs/ops/production-migration-runs/20261015-0831-0011_venue_setup_turnaround_buffers.md`
- `docs/ops/production-migration-runs/20261015-0831-0014_event_sessions.md`
- `docs/ops/production-migration-runs/20261015-0831-0016_venue_buffer_write_guard.md`
- `.agents/handoffs/20261015-docs-SCRUM-161-migration-run-records.md` (this file)

## Attribution and chronology corrections

- Migration 0014 belongs to PR #263, whose GitHub merge commit is `4eec943`. The recorded checkout's `main` commit is `9799d84`; these identify different things and are both retained explicitly in the run record.
- All three records identify the checked-out `main` commit as `9799d84`. PR #261 is identified separately as the migration source for 0011 and 0016.
- The `Started (UTC)` and ledger `applied_at` dates/times remain as observed. No historical timestamp was changed or inferred for the record-creation time or post-run checks.
- Operator attribution is by role (`deploy owner`) only, per `docs/ops/production-migrations.md`.

## Status

The existing run evidence reports all three migrations applied and ledger checks passed; PR #277 remains open for review. `python scripts/check.py` passed on PR head `c581205`: repository hygiene passed, 140 tooling tests passed and 320 existing run records validated. The checker warned about existing secondary worktrees; none were removed. T-65 record: `docs/testing/runs/20261016-075100-bryanseah234-tooling.md`. This documentation correction did not connect to a database, apply a migration, reset or seed data, or edit a merged run record.

## References

- PR #261 (merged): feat(e05): venue setup and turnaround buffers (SCRUM-161)
- PR #273: click-through test script E05-S05 (separate docs branch)
- Runbook: `docs/ops/production-migrations.md`
- Team decision T-65: `docs/bdr/B-team-decisions.md`

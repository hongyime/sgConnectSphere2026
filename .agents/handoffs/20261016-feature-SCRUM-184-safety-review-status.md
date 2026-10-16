# SCRUM-184: Safety Review event status (migration 0017)

Goal: add the `safety_review` value to `event_status` (E08-S03, C-70, T-71) in
a migration-only PR, so it can be merged and applied in production before the
E08-S03 code (SCRUM-60, `feature/SCRUM-60-confirm-event`) that uses it.

## Merge order (agreed for SCRUM-60)

1. **This PR merges first.**
2. The deploy owner's step for 0017 is done by us (Bryan asked, 2026-10-14):
   read-only ledger check, `npx tsx src/database/cli.ts migrate --only
   0017_event_safety_review_status.sql` from `backend/`, ledger recheck, then a
   run record in `docs/ops/production-migration-runs/` through a docs PR.
3. #232's 0012 (Safety Officer role) is applied by the deploy owner.
4. Only then does the SCRUM-60 story PR merge.

Why: a merge that touches `backend/` deploys, but migrations are applied by
hand. The story code names `'safety_review'` in read filters such as
`status IN (...)`, and PostgreSQL rejects an unknown enum value even there, so
merging the code first would break existing equipment and support pages
(shown in check MIG0017_04 of the run record).

## Done so far

- `backend/database/migrations/0017_event_safety_review_status.sql`:
  `ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'safety_review' AFTER
  'planning';` and nothing else. A new enum value can't be used in the
  transaction that adds it (as 0013).
- `docs/db_schema.md`: a 0017 line in the Week 7 migration sequence.
  `main` already recorded "reserved 0017 safety review" (from #274).
- Checked on a disposable PostgreSQL 17: full reset with seed; `--only 0017` on
  a database at production's state (every other file on `main` applied one at
  a time); a rerun is a no-op; the selector unit tests pass. Record:
  `docs/testing/runs/20261016-020537-Bl0oper-backend-db.md`.

## Not done / next step

- Teammate approval, merge, then the production apply and its run record.

## Decisions taken without team sign-off

- None beyond the number: 0017 was claimed in prose on 2026-10-15 after 0015
  was taken by #263's booking-contract note; `main`'s `db_schema.md` records
  it, and #271 took 0018.

## Learnings

- Adding an enum value is backward-compatible with the deployed app, but code
  that names the value is not, even in a read-only filter. Keep the two in
  separate PRs and apply the migration in between.

# SCRUM-161 — Production migration 0019 run record

Apply merged migration 0019 from PR #274 to production and commit the required pre-run and post-run ledger evidence through a reviewed docs PR, following T-65 and `docs/ops/production-migrations.md`.

## Done so far

- Read the production migration runbook and confirmed the production ledger before applying anything.
- Applied only `0019_venue_bookings_contract.sql` from `main` commit `8e052b1` using the exact-file CLI selector.
- Post-run ledger has 17 entries and records 0019 at `2026-10-15T10:02:33.287Z`; all nine columns, two constraints, and three indexes were confirmed.
- Added the production run record and tooling execution record.
- Opened draft PR #278 at commit `cdeaa1c`; required checks passed. It is ready for human review.

## Decision and limits

0017 and 0018 are not present on `main`. The 0019 SQL depends on existing `venue_bookings` and `users` tables, not on the changes assigned to 0017 or 0018, so 0019 was applied alone. This sequencing judgment is documented for review. No other migration was applied.

## Next step

Obtain human review and merge PR #278 through the merge queue. Do not apply 0017 or 0018 until their exact migration files are merged and a fresh production-ledger check confirms each pending filename.

## References

- PR #278: run records for migration 0019 and tooling check
- PR #274: event-based booking request submission and migration 0019
- PR #271: staff-assignment migration still requires renumbering/review; no 0018 file is on `main`
- Runbook: `docs/ops/production-migrations.md`

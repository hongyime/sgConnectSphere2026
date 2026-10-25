# E05-S06 venue unavailability schema (migration 0025)

Goal: migration-only PR for E05-S06 "Mark a venue temporarily unavailable over existing bookings" (Jira SCRUM-152), merged and applied to production before any application code, per `docs/ops/production-migrations.md`. It references SCRUM-152 but does not complete it; the branch and title carry no Jira key, following #322.

## Done

- `backend/database/migrations/0025_venue_unavailability.sql`, following the `VENUE_BLOCKS` / `VENUE_BLOCK_HISTORY` design already in `docs/db_schema.md`:
  - `venue_blocks.reason_category` (`unavailability_reason`: maintenance, equipment_failure, renovation, safety_concern, other), default `maintenance`; `reason` stays the note.
  - Required start, optional end (T-80).
  - `lifted_at` / `lifted_by` so a lift keeps the row (T-91).
  - `venue_block_history`, append-only like `audit_logs` (0010): created/edited/lifted snapshots of range, category and note with actor and time. Foreign-key actions may still clear the actor or remove rows with their venue.
  - `venue_bookings.status_before_conflict` and `conflict_block_id` to restore a booking or unexpired hold when the unavailability is shortened or lifted (C-111, C-122).
  - The 0016 write guard ignores lifted unavailability.
- `backend/tests/venueUnavailabilitySchema.integration.test.ts` (5 tests), added to `test:db` and to `test:venue-booking-requests:db`, the booking selector the Application Checks workflow runs (CI lists database suites explicitly and does not run `test:db`).
- `docs/db_schema.md` and `docs/class-diagram.md`: category history columns, the two booking columns, an ERD relationship and a migration note.

## Compatibility with the deployed app

Existing code inserts blocks without a category (defaults to maintenance), lists blocks with a bounded upper range, deletes blocks (no history rows exist until the new code ships) and never sets the booking columns. The existing venue, hold, buffer, search, calendar, booking-request, decision and cancellation suites pass against the migrated schema.

## Next

1. Review and merge this PR.
2. The deploy owner applies `0025_venue_unavailability.sql` with `--only`, with pre- and post-run ledger checks, and commits the run record.
3. The application PR (branch `feature/SCRUM-152-venue-unavailable-backend`, built on this one) merges only after that.

## Decisions taken without team sign-off (reviewer please check)

- `previous_category` / `new_category` added to `VENUE_BLOCK_HISTORY` beyond the documented columns, because T-91 history should show a category change too.
- `status_before_conflict` / `conflict_block_id` are new columns not in the earlier ERD; documented in this PR.
- 25 Oct (`049c389`): 0025 also widens 0019's `venue_bookings_primary_confirmed` to Confirmed **or Conflicting**. A real local run of TC_E05S06_02 failed because E06-S04 makes the first Confirmed booking primary, so setting it Conflicting broke the check. Chosen by the story owner (option A) over clearing and restoring the flag. Readers that show or publish the venue must still require Confirmed (#347 does). Schema test + `db_schema.md` + booking contract updated; booking selector 58/58 (`20261025-144128-lexinphun2024-debug-backend-db.md`). Knock-on for SCRUM-74: an approved replacement is not auto-primary while the lost booking still holds the flag.

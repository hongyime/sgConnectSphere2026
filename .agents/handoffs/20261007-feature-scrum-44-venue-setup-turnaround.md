# SCRUM-44: E05-S05 Venue Setup and Turnaround Time

## Goal

Implement configurable setup_time_minutes and turnaround_time_minutes for venues, applying these buffers to every availability and conflict check. Bookings that become conflicting due to buffer changes must be FLAGGED, not removed.

## Context

- **Story**: E05-S05 — Apply setup and turnaround time
- **Sprint**: Sprint 3
- **Points**: 5
- **BDR references**: C-65, T-66, T-73, T-74, O-20, O-21, O-22

Each venue needs two new columns:
- `setup_time_minutes` (int, ≥0, default 0)
- `turnaround_time_minutes` (int, ≥0, default 0)

Example: A booking from 10:00-12:00 with 30min setup and 45min turnaround occupies 09:30-12:45.

## Implementation Approach

1. Add migration to alter venues table
2. Update seed data to include buffer columns
3. Update availability/conflict checking logic to compute buffered occupancy windows
4. Implement conflict flagging instead of deletion when buffers change

## Acceptance Criteria Coverage

- [x] Scenario 1: Buffers recorded on the venue
- [ ] Scenario 2: Occupancy window computed from the buffers
- [ ] Scenario 3: Calendar shows the buffered window
- [ ] Scenario 4: Conflicts created by buffer change are identified, not removed
- [ ] Scenario 5: Buffers do not apply against maintenance blocks
- [ ] Scenario 6: Adjacent buffered windows do not conflict
- [ ] Scenario 7: Buffered occupancy excludes a venue from search

## Progress

### 2026-10-07 Session Start

- The current task branch is `feature/SCRUM-44-venue-setup-turnaround`.
- Read venue table schema from migration 0001
- Identified venues table structure
- Launched explore agent to find availability/conflict checking logic
- Created handoff file

### 2026-10-07 Continuation: shared occupancy SQL

- This pass is limited to the requested migration renumbering and extraction of
  the buffered booking range into the PostgreSQL `occupied_window()` function.
- `origin/main` currently ends its numbered migrations at 0010. This branch's
  venue buffer migration is being renamed from 0014 to 0011.
- The SQL callers to update are `search.ts`, `calendar.ts`, `blocks.ts`, and
  `catalogue.ts` under `backend/src/modules/venueBooking/`.
- The user requested a commit and push to this branch, with no pull request.

## Next Steps

- Finish the migration and four caller updates, run `python scripts/check.py`,
  then commit and push the scoped changes. Preserve the session-start edits to
  `.agents/STATE.md` and `.agents/JOURNAL.md`; do not stage them.

## 2026-10-07 review-response pass (PR #231, xiangyingg CHANGES_REQUESTED)

Branch `pr-231` was rebased onto `origin/main` (`git rebase --onto origin/main cb0406a pr-231`),
dropping the 6 inherited protected-file-guard commits that were polluting this PR's diff.
The branch now holds only the 4 SCRUM-44 commits. Push with `--force-with-lease` to
`feature/SCRUM-44-venue-setup-turnaround` (the PR head).

Fixes for the four review points:

1. **Buffer edits fail (SQL alias bug)** — `detectAndMarkBufferConflicts` in
   `backend/src/modules/venueBooking/catalogue.ts` selected `vb.id` / `vb.booking_range`
   with only `vb1`/`vb2` in scope; PostgreSQL raised `missing FROM-clause entry for
   table "vb"` and rolled the edit back (reproduced against real PG 16.4). Fixed to use
   `vb2` (the later booking) consistently for the identifier, event join, and notification,
   plus `DISTINCT` so a booking paired against several earlier bookings is marked and
   notified exactly once.
2. **Create/read omit buffers** — `venueProjection` and `VenueRecord` now include
   `setup_time_minutes` / `turnaround_time_minutes`; `createVenue` persists them on
   insert (default 0); `createVenue`/`updateVenue`/`getVenue`/`searchVenues` return them.
3. **Maintenance rule (Scenario 5)** — `blocks.ts` no longer wraps the booking range in
   `occupied_window()` for either the block-creation conflict check or the coordinator
   notification query; both compare the raw advertised `booking_range`. The now-unused
   `venues` join was removed from both queries.
4. **Calendar scope** — backend-only subtask: documented in the PR body's Follow-ups;
   SCRUM-44 stays open and the calendar's setup/turnaround visual distinction is a
   follow-up. No frontend changes in this PR.

Tests:

- Unit (`backend/tests/venueCatalogue.test.ts`): buffer validation, createVenue persists
  + returns buffers (incl. zero defaults), updateVenue returns updated buffers.
- Unit (`backend/tests/venueBlocks.test.ts`): block-creation conflict + notification SQL
  shapes contain no `occupied_window`.
- Unit (`backend/tests/venueCalendar.test.ts`): fixed the `booking()` stub to include
  `buffered_start`/`buffered_end` (the branch's earlier calendar change broke 2 tests;
  pre-existing failure, fixed here).
- Integration (`backend/tests/venueBufferConflicts.integration.test.ts`, new, wired into
  `npm run test:db`): TC_E05S05_01 (persist + detail), TC_E05S05_03 (buffer edit flags the
  later booking, notifies once, keeps both — the alias-bug regression), TC_E05S05_05
  (block ending before the advertised start but overlapping setup time is allowed, no
  notification).
- Repaired test fixtures: `venueCatalogue.integration.test.ts`,
  `venueCalendar.integration.test.ts`, `venueAccessibility.integration.test.ts` and
  `venueSearch.integration.test.ts` now also run migration 0011 (they previously ran
  only 0001/0002 while the code already referenced the buffer columns).
- `docs/testing/tc-coverage.md` regenerated (TC_E05S05_01/03/05 now automated).
- Local verification used a throwaway PostgreSQL 16.4 on a unix socket;
  TEST_DATABASE_URL pointed at a disposable database. See `docs/testing/runs/` records.

### Incident note (2026-10-07 ~10:00 UTC)

While this work was uncommitted, another agent working in the same clone on the
seeded-account-names docs branch (`docs-seeded-account-names-tmp`, ex-`pr-230`)
ran `git reset --hard e2c9a9f` on this working tree, discarding all of the
above uncommitted changes (the stash had already been dropped). Everything was
reconstructed from the session record and re-verified before committing. If two
agents must share one clone, serialize branch checkouts or use separate
worktrees.

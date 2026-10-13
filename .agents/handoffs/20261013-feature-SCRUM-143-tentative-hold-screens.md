# E06-S05 tentative holds: screens (SCRUM-143)

Goal: the frontend for E06-S05 "Hold a venue tentatively" (story SCRUM-49,
subtask SCRUM-143), on the API from #245. Stacked on
`feature/SCRUM-138-tentative-hold-backend`: draft PR into `main`, merges only
after #245 does.

## Done

- `frontend/src/features/venue/holdsApi.ts`: the hold endpoints, with the
  server's sentences repeated so forms can say what's wrong first.
- `frontend/src/features/coordinator/VenueHolds.tsx`:
  - `VenueHoldsCard` on the Coordinator's event page (approved, planning,
    confirmed): each hold with venue, period and "Tentative · expires …" or
    "Expired …"; Submit booking request (convert) and Release (asks first).
  - `HoldVenueForm` at `/coordinator/events/:eventCode/venues/:venueId/hold`:
    period defaults to the event's; expiry 48 hours by default or a chosen
    time (1 hour to 14 days). Clashes show the server's sentence.
- `frontend/src/features/venue/TentativeHolds.tsx` at `/venue/holds` (new
  "Tentative holds" link for Venue Staff): live holds, soonest expiry first,
  with Change expiry.
- Venue search (event-scoped): "Hold this venue" on available venues only.
- The calendar already shows a live hold as Tentative (backend, #245).
- Tests: `VenueHolds.test.tsx` and `TentativeHolds.test.tsx` (100% of the
  three new files), a search-link test, `tests/e2e/venueHolds.spec.ts` (mocked,
  desktop and Pixel 7). The E06-S05 placeholder in `e06.spec.ts` points there.
- Older event-page tests (`TechnicalSupport.test.tsx`,
  `CoordinatorEditing.test.tsx`) stub the new holds call.

## SCRUM-144 (tests) added to this PR (option A agreed with Amareet)

- `tests/auth-e2e/venueHolds.spec.ts`: real sessions, API and PostgreSQL:
  hold from search, another Coordinator refused naming the hold, Venue Staff
  extend (audit actor checked, activity log shows "Hold expiry: … → …"),
  convert, release, and a passed hold reading Expired.
- `docs/testing/manual/E06-S05-click-through.md`: 16 steps on the seeded stack
  (`coord_a`, `venue_a`, EVT-3003). Dry-run by Claude on a fresh seed; every
  quoted message was copied from the screens.
- Activity log: hold entries now read "Hold expires …" / "Hold expiry: … → …"
  instead of raw ISO times or booking ids (`ActivityLog.tsx`).
- Add `Closes SCRUM-144` to the PR body only once Amareet's manual run record
  is committed, so Jira doesn't close it early.

## Next

1. Latest `main` (`8f246ae`) and the updated #245 branch (`84ffaa2`) are merged
   cleanly in this worktree. Keep this PR draft until #245 lands; then fetch
   `main` again, confirm it has no newer commits, and mark ready only after
   required checks and review are clear.
2. SCRUM-144: Amareet's manual run is still required before Sprint Review.
3. SCRUM-142 (buffers) depends on replacement PR #261; PR #231 closed during
   the branch rename.

## Integration status (14 October 2026)

- The stack now includes the latest main architecture/docs and #245's
  production-migration note. There were no merge conflicts. The #245 run record
  says migration 0013 was applied once and the post-check found all 13
  migrations applied with none pending; see PR #260.
- T-73 keeps the existing Sprint 3 hold acceptance through 17 October, so these
  screens continue to follow T-92. T-84 and the Session-linked hold model are
  post-sprint follow-up work; the Week 9 impact register leaves their
  migrations and application behavior to story-sized implementation PRs.
- This branch remains draft and has no review requests yet. The current-head
  checks must run after its integration commit is pushed. The SCRUM-144 manual
  run is also pending; do not add `Closes SCRUM-144` to Jira before its record
  exists.
- SCRUM-141's scheduler cadence and secret are still a separate owner
  decision. No trigger or deployment secret was added.

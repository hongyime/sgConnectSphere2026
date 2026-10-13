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

1. Merge `main` in after #245 lands, then mark this PR ready.
2. SCRUM-144: real-stack Playwright journey and Amareet's manual run.
3. SCRUM-142 (buffers) after #231.

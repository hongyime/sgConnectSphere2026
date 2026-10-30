# SCRUM-242 E08-S04 Scenario 4 — reconfirm a booking, then Safety Review starts automatically

Finish E08-S04 "Revert a confirmed event to planning" (story SCRUM-61, owner
Le Xin) after Bryan's #377 delivered Scenarios 1 to 3 (SCRUM-233, SCRUM-234,
both Done). Build Scenario 4 (C-132, T-82): Venue Staff can reconfirm a
Confirmed booking flagged `requires_reconfirmation`, and once a reverted event
has every required venue and technical arrangement confirmed again it enters
Safety Review automatically, the Safety Officer is notified, and the earlier
safety decision stays in history without being reused. Then close the test
gaps (TC_E08S04_03, _05, _06) and run the manual acceptance run (SCRUM-235).
Backend subtask SCRUM-242; the frontend subtask is created when that work starts.

## Plan

1. Branch, handoff, Jira subtask SCRUM-242 (this commit).
2. Questions for the team, posted neutrally; built meanwhile with the answers below.
3. Backend: Venue Staff reconfirm a flagged Confirmed booking (clears the flag,
   audit row, Coordinator told; only that venue's staff).
4. Backend: after a venue reconfirmation or an equipment re-reservation, an
   event that was Confirmed before and is now in Planning with no readiness
   blockers enters Safety Review through the existing submission path and the
   Safety Officer is notified; a new approval is required.
5. Frontend (new Frontend subtask): Venue Staff list of bookings to reconfirm
   with a Reconfirm action; the Coordinator sees the move to Safety Review.
6. Playwright: TC_E08S04_05 live, TC_E08S04_06 titled test, TC_E08S04_03's
   stub models a Technical Support failure; regenerate `tc-coverage.md`.
7. Docs: `docs/api-changes-week7.md`, contracts, this handoff.
8. Click-through guide, preconditions SQL, automated real local run.
9. Le Xin's manual T-65/T-93 run (SCRUM-235).
10. PR when a review slot is free (team limit of two open PRs), Jira.

## Decisions taken without team sign-off (reviewer please check)

Built with these answers while the questions are open; each is a small change
if the team disagrees.

- Scenario 4 is automatic, as the AC, C-132 and T-82 say. TC_E08S04_05 in
  `docs/testing/cases/E08.md` also carries an older second version (the
  Coordinator clicks "Submit for safety check"); its test-case owner should
  keep only the automatic version.
- Only events that were Confirmed before and came back to Planning (deliberate
  reversion or venue loss) move automatically. A first-time Planning event
  keeps E08-S03's manual "Submit for safety check".
- The Venue Staff reconfirm action is built here. It also closes the
  reconfirmation follow-up raised on #376 (E10-S02): nothing cleared
  `venue_bookings.requires_reconfirmation` before.

## Known gaps on main (from #377's handoff)

- TC_E08S04_03's Playwright stub models a venue conflict, not a Technical
  Support failure.
- TC_E08S04_06 (venue loss returns the event to Planning) works on `main` via
  E05-S06 (`venueBooking/blocks.ts`) but has no TC-titled test.
- TC_E08S04_04 signs in as a System Administrator, a role the app does not
  have; case wording for its owner, not this branch.
- PO acceptance of SCRUM-61 is Bryan's (#330).

## Next step

Task 2/3: draft the team questions, then build the Venue Staff reconfirm action.

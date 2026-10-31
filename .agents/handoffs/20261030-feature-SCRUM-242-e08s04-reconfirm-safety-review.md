# SCRUM-242 E08-S04 Scenario 4 — reconfirm a booking, then Safety Review starts automatically

Finish E08-S04 "Revert a confirmed event to planning" (story SCRUM-61, owner
Le Xin) after Bryan's #377 delivered Scenarios 1 to 3 (SCRUM-233, SCRUM-234,
both Done). Build Scenario 4 (C-132, T-82): Venue Staff can reconfirm a
Confirmed booking flagged `requires_reconfirmation`, and once a reverted event
has every required venue and technical arrangement confirmed again it enters
Safety Review automatically, the Safety Officer is notified, and the earlier
safety decision stays in history without being reused. Then close the test
gaps (TC_E08S04_03, _05, _06) and run the manual acceptance run (SCRUM-235).
Backend subtask SCRUM-242, frontend subtask SCRUM-243.

## Plan

1. Branch, handoff, Jira subtask SCRUM-242. Done.
2. Questions for the team, posted neutrally. Drafted; not posted (Le Xin to decide where).
3. Backend: Venue Staff reconfirm a flagged booking. Done (04059cf).
4. Backend: automatic Safety Review. Done (5324c3a).
5. Frontend (SCRUM-243): Bookings to reconfirm section. Done (d4fdd33).
6. TC_E08S04_03, _05, _06 live; venue-loss gap closed. Done (995057b).
7. Docs and this handoff. Done (this commit).
8. Click-through guide, preconditions SQL, automated real local run. Done
   (c568d28, record 20261031-142715).
9. Le Xin's manual T-65/T-93 run (SCRUM-235). Done: 6/6 PASS on 2d4410b,
   record 20261031-173321, 25 screenshots.
10. PR when a review slot is free (team limit of two open PRs), Jira.

## Done so far

- Reconfirm: `POST /api/venues { action: 'reconfirm', booking_id }` and
  `GET /api/venues?bookings=reconfirm` (`venueBooking/decisions.ts`). The booking
  moves to its Session's current time (the Event's without a Session), like an
  equipment re-reservation; clash, block and the 0016 guard are checked; the flag
  is cleared, `Booking Reconfirmed` is audited and the Coordinator is told.
- Automatic Safety Review: `eventReadiness/autoSafetyReview.ts`
  `enterSafetyReviewIfReady`, run inside booking approval and reconfirmation,
  equipment reserve and change, Technical Support assignment, and
  `cancel_lost_booking`. Planning + a status change to Confirmed in the history
  + no readiness blockers -> `safety_review`, audited as `Entered Safety Review
  after reconfirmation`; Organiser, Coordinator and every Safety Officer told.
  The old approval stays in history; only a Safety Officer can confirm again.
- Screen: Venue Staff Booking requests page, "Bookings to reconfirm" section
  (`frontend/src/features/venue/BookingReconfirmation.tsx`).
- Tests: unit, PostgreSQL (`venueReconfirmation`, `venueReconfirmationRoute`,
  `autoSafetyReview`, `e08s04Arrangements` integration files), Vitest and
  Playwright TC_E08S04_03 and _05. Deliberate breaks for every piece.
- Docs: `docs/api-changes-week7.md` (delivered note under Change 6),
  `docs/contracts/venue-bookings.md`, `docs/contracts/change-requests.md` (the
  #376 reconfirmation follow-up is closed).

## Decisions taken without team sign-off (reviewer please check)

Built with these answers while the questions are open; each is a small change
if the team disagrees.

- Scenario 4 is automatic, as the AC, C-132 and T-82 say.
- Only events that were Confirmed before and came back to Planning (deliberate
  reversion or venue loss) move automatically. A first-time Planning event
  keeps E08-S03's manual "Submit for safety check".
- Test cases aligned to the ACs before the manual run (31 October): the old
  leftover second version of TC_E08S04_05 (Coordinator clicks "Submit for
  safety check") is removed and the case now checks the history is kept;
  TC_E08S04_03 also checks "Revert to Planning" is still offered (Scenario 3);
  TC_E08S04_04 reads the Coordinator's Activity log (no System Administrator
  role exists). Bryan wrote these cases; PO to see in the PR.
- The Venue Staff reconfirm action is built here; any active Venue Staff member
  may reconfirm, as for booking decisions.
- Reconfirming moves the booking to its Session's current time.
- `cancelLostVenueBooking` (Ji Ning's E10-S05 `lostVenueRecovery.ts`) also runs
  the check: a lost booking is released only after its replacement is
  confirmed, so that release is the last venue step after a venue loss. Le Xin
  approved closing this gap on 31 October; Ji Ning to review.

## Found on the way

- A reconfirm list reply without `bookings` crashed the whole Venue Staff
  Booking requests page (10 E06-S04 Playwright tests timed out); it now counts
  as empty, with a Vitest test. No existing test was changed.
- `registration.db.test.ts` needs a migrated public schema; the local native
  test database has none, so `npm run test:db` shows 1 failure locally that CI
  does not. Not touched by this branch.
- TC_E08S04_01 (Bryan's, #377) makes 9 requests its Playwright fake does not
  answer; it still passes.

## Follow-ups (not in this branch)

- Technical Support staffing is not flagged by a date change (found in the
  manual run): EVT-1082 moved to 12 Dec but its support request kept 5 Dec,
  `staffed`, and counted as Ready, so the event entered Safety Review.
  `tech_support_requests` has no reconfirmation flag and E10-S02's ACs name only
  venue bookings and equipment. Question for the PO; a fix needs a migration.
- Small display points from the manual run (no case failed): this story's
  "Booking reconfirmed" Activity log row reads "True → False" (it could show the
  old and new times); the automatic move reads "By" whoever's save triggered it;
  the equipment save message does not mention Safety Review.
- Readiness wording: a flagged booking always reads "needs review: its capacity
  is now below the expected attendance", which is wrong for an E10-S02 date
  change. A neutral "needs reconfirmation" is a one-line change in
  `eventReadiness/readiness.ts` plus E08-S03's test expectations. Le Xin chose
  not to include it here.
- E08-S06 will add the safety decision record; the Change 6 plan rows in
  `docs/api-changes-week7.md` describe it. Three things for its builder:
  approval must still be written through `applyEventStatusChange` (the
  "Confirmed before" check reads that history); the new decision record must
  not carry over after a reversion; and its Scenario 4 "request changes" says
  the Coordinator resubmits through E08-S03, but on an event that was Confirmed
  before, `enterSafetyReviewIfReady` moves it back to Safety Review by itself
  once the flagged arrangements are reconfirmed. E08-S06 decides which wins.
- PO acceptance of SCRUM-61 is Bryan's (#330).

## Next step

Task 10: push and open the PR when a review slot is free (no open PRs on
31 October), with the AC-to-evidence table, the test-case changes for Bryan and
the Technical Support finding; post the PO question where Le Xin decides; Jira.

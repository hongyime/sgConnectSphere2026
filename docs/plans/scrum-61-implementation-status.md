# SCRUM-61 / E08-S04 implementation status

Revert a confirmed event to planning. This file records what was built, which
test proves each acceptance criterion and the runs of those tests, so the
Product Owner's acceptance (CONTRIBUTING.md, Definition of Done) can point at
one place.

## Scope

From `docs/backlog/release-1/E08-readiness-confirmation.md`, E08-S04 Scenarios
1 to 5 and the checklist (BDR C-48, T-03, T-28, C-70, T-71, C-120, T-81, C-132,
T-82). Test cases `docs/testing/cases/E08.md` TC_E08S04_01 to TC_E08S04_06.
Owner: Le Xin. The release and product backlog views of the story are identical.

## What was built, and where

| Subtask | What | PR |
| --- | --- | --- |
| SCRUM-233, SCRUM-234 (Bryan) | Scenarios 1 to 3: the Coordinator's "Revert to Planning" with a reason, the Organiser's and registered Attendees' notices, the Activity log entry; other broken arrangements stay flagged | #377 |
| SCRUM-242, SCRUM-243 | Scenario 4: Venue Staff reconfirm a flagged booking ("Bookings to reconfirm"); `enterSafetyReviewIfReady` moves a reverted event to Safety Review on its last confirmed arrangement and notifies the Safety Officer, Organiser and Coordinator | #392 |
| SCRUM-235 | Manual acceptance run of sections A to E, 6/6 PASS | #393 |
| SCRUM-250 | Scenario 4 with E08-S06's real Safety Officer decision (#412, #413); a flagged booking reads "needs reconfirmation by Venue Staff"; click-through section F | this branch |

Scenario 5 (venue loss returns the event to Planning) is E05-S06's block path
(#348, #349); E08-S04 tests it as TC_E08S04_06. The automatic step also runs on
E10-S02's Technical Support reconfirmation (#399) and E10-S05's lost-booking
release.

## Acceptance criteria to evidence

| Scenario | Cases | Automated tests | Manual run |
| --- | --- | --- | --- |
| 1. Manual reversion records a reason | TC_E08S04_01, _04 | `eventReversion.test.ts`, `eventReadinessRoutes.integration.test.ts`, `ActivityLog.test.tsx`, `tests/e2e/e08.spec.ts` | 20261031-173321 (A) |
| 2. Registered Attendees notified | TC_E08S04_02 | `eventReversion.test.ts`, `eventReadinessRoutes.integration.test.ts`, `tests/e2e/e08.spec.ts` | 20261031-173321 (A) |
| 3. Other broken arrangements stay flagged | TC_E08S04_03 | `e08s04Arrangements.integration.test.ts`, `tests/e2e/e08.spec.ts` | 20261031-173321 (B) |
| 4. Reconfirmed arrangements start Safety Review | TC_E08S04_05 | `autoSafetyReview.integration.test.ts` (including the real `decideSafetyReview` chain), `venueReconfirmation*.integration.test.ts`, `e08s04Arrangements.integration.test.ts`, `tests/e2e/e08.spec.ts` | 20261031-173321 (C, E); 20261105-003100 (F, real Safety Officer check) |
| 5. Venue loss returns the event to Planning | TC_E08S04_06 | `e08s04Arrangements.integration.test.ts`; E05-S06's `tests/e2e/e05.spec.ts` | 20261031-173321 (D) |

Real-database runs: 20261031-175517, 20261031-191251 and, for SCRUM-250,
20261104-014643; automated real-stack click-throughs 20261031-142715 (A to E)
and 20261104-014530 (F). The SCRUM-250 records name `e8d78d4`, the commit before
this branch was rebased onto `main`; the same changes are `79231d9`.

## Decisions taken in this story (for the reviewer)

- Only an event that was Confirmed before moves automatically; a first-time
  Planning event keeps E08-S03's "Submit for safety check" (#392).
- An event the Safety Officer sent back (request changes or reject) waits for
  its Coordinator (D118, added by E08-S06 in #412 and approved by Le Xin).
- Any active Venue Staff member may reconfirm; the booking takes its Session's
  current time (#392).

## Known gaps and follow-ups

- Only the Venue Staff and Technical Support reconfirm screens say "the event is
  now in Safety Review"; equipment re-reservation, staff assignment, booking
  approval and lost-venue release move the event but don't say so. Not an
  acceptance criterion.
- Display points from the 31 October run: "Booking reconfirmed" reads
  "True → False" instead of the old and new times; the automatic move reads
  "By" whoever's save triggered it.
- Sections A to E were run by hand before E08-S06 merged; the database tests
  above cover the same paths on the current code.

## Acceptance

PO acceptance of SCRUM-61 is Bryan's (#330), after this branch merges.

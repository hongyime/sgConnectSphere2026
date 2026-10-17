# feature/SCRUM-50-prevent-double-booking

Goal: E06-S06 Prevent double-booking of a venue (Jira SCRUM-50, 5 points,
owner Le Xin). A venue is never committed to two events over the same
buffered period, conflicts are per venue, and competing requests are settled
first-come, first-served. Scope: `docs/backlog/release-1/E06-venue-search-booking.md`
(5 scenarios), cases TC_E06S06_01 to _07 in `docs/testing/cases/E06.md`.

## Status: paused 17 Oct 2026, carries to Sprint 4

Not finished in Sprint 3; no application code written yet. Reason for the
Sprint 3 Review: E06-S06 changes the approval code that E06-S04 adds
(`decideBooking` in `backend/src/modules/venueBooking/decisions.ts`, PR #298,
not on `main`). #298 is held until E10-S04 Cancel an event (SCRUM-73,
Sprint 4) because the PO decided on 17 Oct that TC_E06S04_07 stays in
E06-S04; merging earlier would move SCRUM-48 to Done through `jira-sync`, and
Done cannot be undone. E06-S06 therefore cannot merge before #298. Paused
under the PO's group-chat guidance for an existing mid-sprint story: pause,
and document the reason at the Sprint Review.

Order: E10-S04 → TC_E06S04_07 passes → #298 merges → E06-S06 merges.

## Why the test cases needed a decision

Migration 0016 (`venue_buffer_write_guard`) treats Pending, Confirmed and
unexpired Tentative bookings as occupying the venue, and refuses any write
whose buffered window overlaps one. So a second request that clashes is
refused when it is submitted, not when Venue Staff approve. As written:

| Case | Checks | Runs as written? |
| --- | --- | --- |
| TC_01 | approval blocked by an existing confirmed booking | No: refused at submission |
| TC_02 | approve one of two clashing requests, the other flagged | No: two clashing requests cannot both be submitted |
| TC_03 | two staff approve clashing requests at once | No: same reason |
| TC_04 | back-to-back bookings allowed | Yes |
| TC_05 | 1-minute overlap blocked | Blocked at submission, not approval |
| TC_06 | clash only through setup/turnaround time | Only after staff lengthen a venue's buffers (`buffer_conflict`) |
| TC_07 | one event, two venues, same period | Yes |

Two clashing requests can exist only when Venue Staff lengthen a venue's
buffers after both were submitted. In #298 today, `approvalClash` and the
0016 guard then refuse approving either one until one is rejected.

## PO decisions (Bryan, 17 Oct 2026)

- "Should E06-S06's test cases be rewritten to match how clashes are blocked
  today?" **Yes.** Rewrite TC_01, _02, _03 and _05 to check that a clashing
  request is refused when it is submitted.
- "When two requests clash only after a venue's setup time changes, should
  staff have to reject one before approving the other?" **No**, with: check
  the client documents and the story to see whether the first should be kept
  and the second rejected.
  - Client clarification **C-46** (`docs/bdr/A-customer-clarifications.md`):
    "Venue allocation is handled strictly on a first-come, first-served
    basis." Story Scenario 2 also says the other request "is flagged as
    conflicting and cannot be approved until the conflict is resolved".
  - Reading for implementation: the request **submitted first** keeps the
    venue. Approving it marks the later overlapping Pending request(s)
    `conflicting`; approving a later request while an earlier overlapping
    one is Pending is refused, naming the earlier one. This matches the
    team's buffer rule (contract: the later booking is the one flagged).
    Not "whichever approval is clicked first". Write this reasoning in the
    PR so reviewers see it comes from C-46.
- "Should E06-S06 move to Sprint 4?" **No** ("complete them, still got
  time"), answered before the dependency on #298 was raised. The dependency
  is the documented reason it carries over anyway.

## Plan for Sprint 4

1. Sync this branch with `main` and with #298 (or rebase after it merges).
   `backend/src/modules/venueBooking/approvalConflicts.ts` (type-only
   scaffold, 14 Oct) predates #298's `approvalClash`; reuse or delete it.
2. Rewrite TC_E06S06_01, _02, _03, _05 (submission refusal) and _06
   (submitted-first wins) in `docs/testing/cases/E06.md`; regenerate the
   test-case workbook (`scripts/export_testcases_xlsx.py`) and
   `docs/testing/tc-coverage.md`.
3. In `decideBooking`: on approve, find overlapping active requests by
   `occupied_window`; if an earlier-submitted one is Pending, refuse and name
   it; otherwise set later overlapping Pending requests to `conflicting`
   (which frees the 0016 guard) in the same transaction, with an audit row
   each, then confirm. `NOT_DECIDABLE.conflicting` already explains the
   state to Venue Staff. Keep the event → venue → booking lock order.
4. Tests: unit (100% of changed code); real-database for TC_01 to _07,
   including simultaneous approvals (TC_03, TC_06) and per-venue (TC_07);
   replace the `test.fixme` entries in `tests/e2e/e06.spec.ts`.
5. Manual run by Le Xin with hand-taken screenshots (T-93); T-65 records;
   PR with PostPlan; human review of code and test cases.

## Verification

- 14 Oct (Bryan): `python scripts/check.py` PASS at base f542803; T-65
  record `docs/testing/runs/20261014-080123-bryanseah234-tooling.md`.
- 17 Oct: notes only, no code. No application tests run on this branch.

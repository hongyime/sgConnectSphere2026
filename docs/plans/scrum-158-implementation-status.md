# SCRUM-158 / E08-S06 implementation status

Conduct the Operational Safety Check as the Safety Officer. This file
records what was built, which test proves each acceptance criterion, and
**every run of those tests**, so each result can be traced back to the
exact code it ran against.

## Scope

From `docs/backlog/product/E08-readiness-confirmation.md`, E08-S06
Scenarios 1-10 and the checklist (BDR C-70, C-101, C-131 to C-135, T-71,
T-72, T-82, T-103; O-39 to O-43, all closed). Test cases
`docs/testing/cases/E08.md` TC_E08S06_01 to TC_E08S06_06.

Already on `main` before this branch: the `safety_review` status
(migration 0017) and its transitions, the Safety Officer-only confirm
check, automatic entry into Safety Review, the reconfirmation flags on
venue bookings, equipment reservations and Technical Support requests, and
Scenario 9's tracker and deactivation behaviour.

**Who wrote what.**
- Bryan built the first version on `feature/SCRUM-158-safety-officer-check`
  (1 November, no PR): the seven-factor decision check, the review detail
  and decision endpoints, the Activity log row with the checklist, the
  notices, the re-review flags and an inline review control. His commits
  `2058ede` and `83dc389` are cherry-picked here.
- Bryan's SCRUM-157 commit `fe9c4ef` (the Safety Officer role, landing
  route and queue) is carried here until his SCRUM-157 PR merges.
- This branch (Aaron, with Claude) finishes the story: see Known gaps.

## Rules this story applies

| Rule | Test case |
|---|---|
| The queue lists every Event in Safety Review, oldest entry first, with what the check needs | TC_E08S06_01 |
| Every one of the seven factors is marked satisfactory or not, with a comment, before deciding | TC_E08S06_02 |
| Approval with every factor satisfactory confirms the Event and notifies Organiser and Coordinator | TC_E08S06_02 |
| Request changes returns the Event to Planning, names the items and flags the affected arrangements | TC_E08S06_03 |
| Rejection returns the Event to Planning with a visible flag and reason, never cancelling it | TC_E08S06_04 |
| Reject and request changes need a reason; only a Safety Officer decides | TC_E08S06_05 |
| Events confirmed earlier are untouched; tracker and deactivation treat Safety Review as active | TC_E08S06_06 |
| Every decision is one immutable Activity log row with the checklist | TC_E08S06_02 to _05 |

"What the user sees" for each rule is added once the screens are final.

## Known gaps (from Bryan's version, to close on this branch)

- The queue orders by event date, not by time entered Safety Review.
- Accessibility shows only the free-text note, not the Event's features.
- No visible "safety arrangement rejected" flag.
- Notices carry no confirmed details or list of unsatisfactory factors.
- The page pre-marks every factor as satisfactory; the review sits in a
  table cell.
- The equipment flag also marks released reservations.
- Tests cover only the decision parser and one role refusal.

## Test gates

To be filled with the gates before the PR (unit, real-database, coverage,
typecheck, Vitest, Playwright, repository checks).

## Known limits

None recorded yet.

## Run log

| When (SGT) | Commit | Gate | TC IDs | Command | Where | Result | What was seen | Run by |
|---|---|---|---|---|---|---|---|---|
